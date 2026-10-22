import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import type { ResumeData } from '../types/resume';
import {
  getGeminiKey,
  getStoredModel,
  FALLBACK_MODELS,
  formatGeminiErrorNotice,
} from './geminiService';

// Set up pdf.js worker URL for browser environments
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch {
    // Ignore worker initialization errors in non-standard environments
  }
}

export type ParseMethod = 'pdf' | 'docx' | 'json' | 'txt';

export interface ParseResult {
  rawText: string;
  method: ParseMethod;
  jsonData?: Partial<ResumeData>;
}

export interface ParsedResumeResult {
  data: Partial<ResumeData>;
  confidence: Record<string, number>;
  rawText: string;
  method: ParseMethod;
  fallbackNotice?: string;
  isAiFallback?: boolean;
}

export interface StructureResult {
  data: Partial<ResumeData>;
  fallbackNotice?: string;
  isAiFallback?: boolean;
}

/**
 * Extracts raw text or structured JSON from a user-uploaded resume file.
 */
export async function parseResumeFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'json' || file.type === 'application/json') {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed.personalInfo) {
        return { rawText: text, method: 'json', jsonData: parsed };
      }
    } catch (e) {
      console.warn('Invalid JSON file format, fallback to text parsing', e);
    }
    return { rawText: text, method: 'json' };
  }

  if (extension === 'pdf' || file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        fullText += pageText + '\n';
      }

      return { rawText: fullText.trim(), method: 'pdf' };
    } catch (err) {
      console.error('Failed to extract text from PDF via pdfjs-dist:', err);
      throw new Error('Could not parse PDF content. Please ensure the file is not password-protected.');
    }
  }

  if (
    extension === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { rawText: result.value.trim(), method: 'docx' };
    } catch (err) {
      console.error('Failed to extract text from DOCX via mammoth:', err);
      throw new Error('Could not parse Word document content.');
    }
  }

  // Fallback for TXT and other text formats
  const text = await file.text();
  return { rawText: text.trim(), method: 'txt' };
}

/**
 * Structures raw resume text into ResumeData schema using Gemini, with a local regex fallback.
 * Uses an AbortController with a 20s timeout, tries configured model then 'gemini-2.5-flash',
 * and falls back to regex parser with a notice if anything fails or times out.
 */
export async function structureResumeWithGemini(
  rawText: string,
  externalSignal?: AbortSignal
): Promise<StructureResult> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    const fallbackData = fallbackRegexParser(rawText);
    return {
      data: fallbackData,
      fallbackNotice: 'No API key set',
      isAiFallback: true,
    };
  }

  const configuredModel = getStoredModel() || 'gemini-2.5-flash';
  const modelsToTry = Array.from(new Set([configuredModel, ...FALLBACK_MODELS])).filter(
    (m) => !m.startsWith('gemini-3.')
  );

  let lastError: any = null;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error('Timed out (20s)'));
  }, 20000);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(new Error('Request aborted by user'));
    } else {
      externalSignal.addEventListener('abort', () => {
        controller.abort(new Error('Request aborted by user'));
      });
    }
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const prompt = `You are a professional resume parser. Parse the following raw resume text and extract all information into a structured JSON matching the ResumeData schema.

ResumeData schema fields:
- personalInfo: { fullName, jobTitle, email, phone, location, website, linkedin, github }
- summary: string (3-4 sentences summarizing background and skills)
- experience: array of { id, company, position, location, startDate, endDate, current (boolean), highlights (array of bullet strings) }
- education: array of { id, institution, degree, fieldOfStudy, location, startDate, endDate, grade }
- projects: array of { id, name, description, technologies (array of strings), link, githubLink, highlights (array of bullet strings) }
- skills: array of { id, name (category like "Languages", "Frameworks", "Cloud & DevOps"), skills (array of strings) }
- certifications: array of { id, name, issuer, date, credentialId, url }

Raw Resume Text:
${rawText}

Return strictly a valid JSON object matching this schema. No markdown formatting or code fences. Raw JSON only.`;

    for (const model of modelsToTry) {
      if (controller.signal.aborted) break;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const onAbort = () => {
            reject(timedOut ? new Error('Timed out (20s)') : new Error('Aborted'));
          };
          if (controller.signal.aborted) {
            onAbort();
          } else {
            controller.signal.addEventListener('abort', onAbort);
          }
        });

        const apiCall = client.models.generateContent({
          model,
          contents: prompt,
        });

        const response: any = await Promise.race([apiCall, timeoutPromise]);
        const responseText = response?.text || response?.output_text || '';
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        let parsed: any = null;
        try {
          parsed = JSON.parse(cleanJson);
        } catch {
          throw new Error('Invalid response');
        }

        if (parsed && (parsed.personalInfo || parsed.experience || parsed.education || parsed.skills)) {
          clearTimeout(timeoutId);
          return {
            data: normalizeParsedData(parsed),
            isAiFallback: false,
          };
        } else {
          throw new Error('Invalid response');
        }
      } catch (err: any) {
        lastError = err;
        const status = Number(err?.status || err?.statusCode || 0);
        const msg = (err?.message || String(err)).toLowerCase();
        const errorRecord = {
          status,
          message: err?.message || String(err),
        };
        console.error(`Gemini structuring failed with model "${model}":`, errorRecord);

        if (controller.signal.aborted && timedOut) {
          lastError = new Error('Timed out (20s)');
          break;
        }

        // On 404 try next model
        if (status === 404 || msg.includes('404') || msg.includes('not found')) {
          continue;
        }
        break;
      }
    }
  } catch (outerErr: any) {
    lastError = outerErr;
    const status = Number(outerErr?.status || outerErr?.statusCode || 0);
    console.error('Gemini structuring encountered outer error:', {
      status,
      message: outerErr?.message || String(outerErr),
    });
  } finally {
    clearTimeout(timeoutId);
  }

  // Fallback: offline regex parser automatically with real error reason
  const fallbackNotice = formatGeminiErrorNotice(lastError);
  const fallbackData = fallbackRegexParser(rawText);
  return {
    data: fallbackData,
    fallbackNotice,
    isAiFallback: true,
  };
}

function normalizeParsedData(parsed: any): Partial<ResumeData> {
  return {
    personalInfo: {
      fullName: parsed.personalInfo?.fullName || '',
      jobTitle: parsed.personalInfo?.jobTitle || '',
      email: parsed.personalInfo?.email || '',
      phone: parsed.personalInfo?.phone || '',
      location: parsed.personalInfo?.location || '',
      website: parsed.personalInfo?.website || '',
      linkedin: parsed.personalInfo?.linkedin || '',
      github: parsed.personalInfo?.github || '',
    },
    summary: parsed.summary || '',
    experience: Array.isArray(parsed.experience)
      ? parsed.experience.map((e: any, idx: number) => ({
          id: e.id || `exp-${Date.now()}-${idx}`,
          company: e.company || '',
          position: e.position || '',
          location: e.location || '',
          startDate: e.startDate || '',
          endDate: e.endDate || '',
          current: Boolean(e.current),
          highlights: Array.isArray(e.highlights) ? e.highlights : [],
        }))
      : [],
    education: Array.isArray(parsed.education)
      ? parsed.education.map((ed: any, idx: number) => ({
          id: ed.id || `edu-${Date.now()}-${idx}`,
          institution: ed.institution || '',
          degree: ed.degree || '',
          fieldOfStudy: ed.fieldOfStudy || '',
          location: ed.location || '',
          startDate: ed.startDate || '',
          endDate: ed.endDate || '',
          grade: ed.grade || '',
        }))
      : [],
    projects: Array.isArray(parsed.projects)
      ? parsed.projects.map((p: any, idx: number) => ({
          id: p.id || `proj-${Date.now()}-${idx}`,
          name: p.name || '',
          description: p.description || '',
          technologies: Array.isArray(p.technologies) ? p.technologies : [],
          link: p.link || '',
          githubLink: p.githubLink || '',
          highlights: Array.isArray(p.highlights) ? p.highlights : [],
        }))
      : [],
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.map((s: any, idx: number) => ({
          id: s.id || `skill-${Date.now()}-${idx}`,
          name: s.name || 'Core Skills',
          skills: Array.isArray(s.skills) ? s.skills : [],
        }))
      : [],
    certifications: Array.isArray(parsed.certifications)
      ? parsed.certifications.map((c: any, idx: number) => ({
          id: c.id || `cert-${Date.now()}-${idx}`,
          name: c.name || '',
          issuer: c.issuer || '',
          date: c.date || '',
          credentialId: c.credentialId || '',
          url: c.url || '',
        }))
      : [],
    customSections: [],
  };
}

export function isSectionHeadingOrKeyword(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  // All-caps heading line of 2+ chars
  if (/^[A-Z\s&:/-]{2,}$/.test(trimmed) && trimmed.replace(/[^A-Z]/g, '').length >= 3) {
    return true;
  }
  const headingKeywords = [
    'skills?',
    'technical\\s+skills?',
    'core\\s+competencies',
    'experience',
    'work\\s+experience',
    'work\\s+history',
    'employment',
    'education',
    'academics?',
    'academic\\s+background',
    'projects?',
    'technical\\s+projects?',
    'personal\\s+projects?',
    'summary',
    'professional\\s+summary',
    'profile',
    'about(?:\\s+me)?',
    'objective',
    'contact(?:\\s+info(?:rmation)?)?',
    'certifications?',
    'licenses?',
    'awards?',
    'technologies',
    'languages',
  ];
  const regex = new RegExp(`^(?:${headingKeywords.join('|')})[:\\s]*$`, 'i');
  if (regex.test(trimmed)) return true;

  const words = trimmed.toLowerCase().split(/\s+/);
  const reservedWords = new Set([
    'skills', 'technical', 'experience', 'education', 'projects',
    'summary', 'contact', 'work', 'history', 'certifications',
    'awards', 'objective', 'profile', 'curriculum', 'vitae', 'resume',
  ]);
  if (words.every((w) => reservedWords.has(w))) return true;

  return false;
}

function normalizeResumeText(text: string): string {
  let normalized = text;

  // Rejoin words broken with hyphens at line ends (e.g. imple-\nmented -> implemented)
  normalized = normalized.replace(/([a-zA-Z]+)-\s*\r?\n\s*([a-zA-Z]+)/g, '$1$2');

  // Insert newline before known headings (summary, experience, work history, education, skills, projects, certifications, awards) case-insensitive
  const headings = [
    'work\\s+experience',
    'work\\s+history',
    'experience',
    'employment',
    'education',
    'skills',
    'technical\\s+skills',
    'projects',
    'certifications?',
    'awards?',
    'summary',
    'objective',
  ];
  const headingPattern = new RegExp(`(?:^|[^\\n])\\s*\\b(${headings.join('|')}):?\\s*(?=[\\nA-Z0-9•·\\u2022*\\-])`, 'gi');
  normalized = normalized.replace(headingPattern, '\n$1\n');

  // Insert newline before bullet chars (•, -, *, \u2022)
  normalized = normalized.replace(/(?:^|[^\n])\s*([•\u2022·⁃◦*]|-\s+)/g, '\n$1');

  return normalized;
}

function fallbackRegexParser(rawText: string): Partial<ResumeData> {
  const normalizedText = normalizeResumeText(rawText);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Email
  const emailMatch = normalizedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Phone
  const phoneMatch = normalizedText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Location heuristic (City, State / City, Country)
  let location = '';
  const locationMatch = normalizedText.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]+))\b/);
  if (locationMatch && !locationMatch[0].includes('University') && !locationMatch[0].includes('Company')) {
    location = locationMatch[0].trim();
  }

  // LinkedIn
  const linkedinMatch = normalizedText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  const linkedin = linkedinMatch ? linkedinMatch[0] : '';

  // GitHub
  const githubMatch = normalizedText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  const github = githubMatch ? githubMatch[0] : '';

  // Website / Portfolio
  const websiteMatch = normalizedText.match(/(?:https?:\/\/)(?:www\.)?[a-zA-Z0-9-]+\.(?:com|io|dev|org|net|me)/i);
  const website = websiteMatch ? websiteMatch[0] : '';

  // Name: prefer text before email/phone, must never be a section heading
  let fullName = '';
  const contactIndex = normalizedText.search(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  );

  if (contactIndex > 0) {
    const textBefore = normalizedText.slice(0, contactIndex).trim();
    const beforeLines = textBefore.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const bLine of beforeLines) {
      if (/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(bLine)) continue;
      if (isSectionHeadingOrKeyword(bLine)) continue;
      const words = bLine.split(/\s+/).filter(Boolean);
      const isAllAlpha = words.every((w) => /^[a-zA-Z.'-]+$/.test(w));
      if (words.length >= 2 && words.length <= 4 && isAllAlpha && bLine.length < 50) {
        fullName = bLine;
        break;
      }
    }
  }

  if (!fullName) {
    for (const line of lines) {
      if (/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(line)) continue;
      if (isSectionHeadingOrKeyword(line)) continue;
      const words = line.split(/\s+/).filter(Boolean);
      const isAllAlpha = words.every((w) => /^[a-zA-Z.'-]+$/.test(w));
      if (words.length >= 2 && words.length <= 4 && isAllAlpha && line.length < 50) {
        fullName = line;
        break;
      }
    }
  }

  if (fullName && isSectionHeadingOrKeyword(fullName)) {
    fullName = '';
  }

  // Target role: line right after fullName or near header, empty if not found
  let jobTitle = '';
  if (fullName) {
    const nameIdx = lines.indexOf(fullName);
    if (nameIdx !== -1 && nameIdx + 1 < lines.length) {
      const candidateLine = lines[nameIdx + 1];
      if (
        !/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(candidateLine) &&
        !isSectionHeadingOrKeyword(candidateLine)
      ) {
        const words = candidateLine.split(/\s+/).filter(Boolean);
        if (words.length >= 1 && words.length <= 6 && candidateLine.length < 60) {
          jobTitle = candidateLine;
        }
      }
    }
  }

  // Detect section headings and group lines
  const headingDetectors: { key: string; regex: RegExp }[] = [
    { key: 'summary', regex: /^(?:professional\s+)?(?:summary|profile|about(?:\s+me)?|objective)$/i },
    { key: 'experience', regex: /^(?:work\s+)?(?:experience|employment|work\s+history|professional\s+experience)$/i },
    { key: 'education', regex: /^(?:education|academic(?:\s+background)?|academics)$/i },
    { key: 'projects', regex: /^(?:projects|personal\s+projects|key\s+projects|technical\s+projects)$/i },
    { key: 'skills', regex: /^(?:skills|technical\s+skills|core\s+competencies|technologies)$/i },
    { key: 'certifications', regex: /^(?:certifications?|licenses?|credentials?)$/i },
  ];

  type SecKey = 'header' | 'summary' | 'experience' | 'education' | 'projects' | 'skills' | 'certifications';
  const sectionBuckets: Record<SecKey, string[]> = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
  };

  let activeSection: SecKey = 'header';
  for (const line of lines) {
    const matched = headingDetectors.find((h) => h.regex.test(line));
    if (matched) {
      activeSection = matched.key as SecKey;
    } else {
      sectionBuckets[activeSection].push(line);
    }
  }

  // Summary
  const summary = sectionBuckets.summary.length > 0 ? sectionBuckets.summary.join(' ').slice(0, 500) : '';

  // Experience parsing with date range anchors
  const DATE_RANGE_REGEX = /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\.?,?\s*)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:present|current|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\.?,?\s*)?(?:19|20)\d{2})\b/i;

  const experience: any[] = [];
  if (sectionBuckets.experience.length > 0) {
    let currentExp: any = null;
    for (const expLine of sectionBuckets.experience) {
      const isBullet = /^[•·⁃◦*]\s*|^\-\s+/.test(expLine);
      const hasDateRange = DATE_RANGE_REGEX.test(expLine);

      if (hasDateRange || (!isBullet && !currentExp)) {
        const dateMatch = expLine.match(DATE_RANGE_REGEX);
        const dateStr = dateMatch ? dateMatch[0] : '';
        const titleCandidate = expLine.replace(DATE_RANGE_REGEX, '').replace(/^[|•·⁃◦*-]\s*/, '').trim();

        currentExp = {
          id: `exp-${Date.now()}-${experience.length}`,
          company: titleCandidate || '',
          position: jobTitle || '',
          location: '',
          startDate: dateStr ? dateStr.split(/[-–—to]+/i)[0].trim() : '',
          endDate: dateStr ? (dateStr.split(/[-–—to]+/i)[1] || 'Present').trim() : 'Present',
          current: /present|current/i.test(dateStr),
          highlights: [],
        };
        experience.push(currentExp);
      } else if (isBullet && currentExp) {
        currentExp.highlights.push(expLine.replace(/^[•·⁃◦*]\s*|^\-\s+/, '').trim());
      } else if (currentExp && currentExp.highlights.length > 0) {
        // Rejoin wrapped bullet lines
        const lastIdx = currentExp.highlights.length - 1;
        currentExp.highlights[lastIdx] = (currentExp.highlights[lastIdx] + ' ' + expLine.trim()).trim();
      } else if (currentExp) {
        currentExp.highlights.push(expLine.trim());
      }
    }
  }

  // Education parsing with degree keywords (B.Tech, B.E., BSc, MSc, MBA, Bachelor, Master, Diploma, 12th, 10th)
  const DEGREE_KEYWORD_REGEX = /\b(b\.?tech|b\.?e\.?|b\.?sc|m\.?sc|mba|bachelor(?:'s)?|master(?:'s)?|diploma|12th|10th|associate|ph\.?d|bba|bca|mca)\b/i;

  const education: any[] = [];
  if (sectionBuckets.education.length > 0) {
    let currentEdu: any = null;
    for (const eduLine of sectionBuckets.education) {
      const hasDegree = DEGREE_KEYWORD_REGEX.test(eduLine);
      const isSchoolOrCollege = /(?:university|college|institute|school|academy)/i.test(eduLine);

      if (hasDegree || isSchoolOrCollege || !currentEdu) {
        const degreeMatch = eduLine.match(DEGREE_KEYWORD_REGEX);
        currentEdu = {
          id: `edu-${Date.now()}-${education.length}`,
          institution: isSchoolOrCollege ? eduLine : '',
          degree: degreeMatch ? degreeMatch[0] : (hasDegree ? eduLine : ''),
          fieldOfStudy: '',
          location: '',
          startDate: '',
          endDate: '',
        };
        education.push(currentEdu);
      } else if (currentEdu && !currentEdu.degree && hasDegree) {
        currentEdu.degree = eduLine;
      } else if (currentEdu && isSchoolOrCollege) {
        currentEdu.institution = eduLine;
      }
    }
  }

  // Projects parsing
  const projects: any[] = [];
  if (sectionBuckets.projects.length > 0) {
    let currentProj: any = null;
    for (const projLine of sectionBuckets.projects) {
      const isBullet = /^[•·⁃◦*]\s*|^\-\s+/.test(projLine);
      if (!isBullet && !currentProj) {
        currentProj = {
          id: `proj-${Date.now()}-${projects.length}`,
          name: projLine.replace(/^[•·⁃◦*]\s*|^\-\s+/, '').trim(),
          description: '',
          technologies: [],
          highlights: [],
        };
        projects.push(currentProj);
      } else if (isBullet && currentProj) {
        currentProj.highlights.push(projLine.replace(/^[•·⁃◦*]\s*|^\-\s+/, '').trim());
      } else if (currentProj && currentProj.highlights.length > 0) {
        // Rejoin wrapped bullet lines
        const lastIdx = currentProj.highlights.length - 1;
        currentProj.highlights[lastIdx] = (currentProj.highlights[lastIdx] + ' ' + projLine.trim()).trim();
      } else if (currentProj) {
        currentProj.highlights.push(projLine.trim());
      }
    }
  }

  // Skills parsing
  const skills: any[] = [];
  const extractedSkillItems: string[] = [];
  if (sectionBuckets.skills.length > 0) {
    for (const sLine of sectionBuckets.skills) {
      const tokens = sLine.split(/[,|•·⁃◦*\-\n/]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 35);
      extractedSkillItems.push(...tokens);
    }
  }
  const commonTech = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Go', 'Docker',
    'Kubernetes', 'AWS', 'GCP', 'SQL', 'PostgreSQL', 'MongoDB', 'Git', 'CI/CD',
    'Machine Learning', 'PyTorch', 'REST', 'GraphQL'
  ];
  const detectedSkills = commonTech.filter((tech) =>
    new RegExp(`\\b${tech}\\b`, 'i').test(rawText)
  );
  const finalSkills = Array.from(new Set([...extractedSkillItems, ...detectedSkills])).slice(0, 20);

  if (finalSkills.length > 0) {
    skills.push({
      id: `skill-${Date.now()}-1`,
      name: 'Technical Skills',
      skills: finalSkills,
    });
  }

  return {
    personalInfo: {
      fullName,
      jobTitle,
      email,
      phone,
      location,
      website,
      linkedin,
      github,
    },
    summary,
    experience,
    education,
    projects,
    skills,
    certifications: [],
    customSections: [],
  };
}

function calculateConfidence(data: Partial<ResumeData>): Record<string, number> {
  const confidence: Record<string, number> = {};

  // Personal Info = detected fields / 4 (name, email, phone, location)
  // Name heading = not detected
  const pi = data.personalInfo;
  let piFields = 0;
  const isNameValid = Boolean(pi?.fullName?.trim() && !isSectionHeadingOrKeyword(pi.fullName));
  if (isNameValid) piFields++;
  if (pi?.email?.trim()) piFields++;
  if (pi?.phone?.trim()) piFields++;
  if (pi?.location?.trim()) piFields++;
  confidence['personalInfo'] = Math.round((piFields / 4) * 100);

  // Summary: 0% if empty, <50% if only partial
  const sum = (data.summary || '').trim();
  if (!sum) {
    confidence['summary'] = 0;
  } else if (sum.length < 50) {
    confidence['summary'] = 40;
  } else if (sum.length < 120) {
    confidence['summary'] = 70;
  } else {
    confidence['summary'] = 92;
  }

  // Experience: 0% if empty, <50% if only partial
  const exp = data.experience || [];
  if (exp.length === 0) {
    confidence['experience'] = 0;
  } else {
    const withBullets = exp.filter((e) => (e.highlights?.length || 0) > 0);
    if (withBullets.length === 0) {
      confidence['experience'] = 35;
    } else if (withBullets.length === 1) {
      confidence['experience'] = 75;
    } else {
      confidence['experience'] = 94;
    }
  }

  // Education: 0% if empty, <50% if only partial
  const edu = data.education || [];
  if (edu.length === 0) {
    confidence['education'] = 0;
  } else {
    const valid = edu.filter((e) => e.institution || e.degree);
    if (valid.length === 0) {
      confidence['education'] = 30;
    } else {
      confidence['education'] = 90;
    }
  }

  // Skills: 0% if empty, <50% if only partial
  const totalSkills = data.skills?.reduce((acc, c) => acc + (c.skills?.length || 0), 0) || 0;
  if (totalSkills === 0) {
    confidence['skills'] = 0;
  } else if (totalSkills < 4) {
    confidence['skills'] = 40;
  } else if (totalSkills < 8) {
    confidence['skills'] = 75;
  } else {
    confidence['skills'] = 95;
  }

  // Projects: 0% if empty, <50% if only partial
  const projs = data.projects || [];
  if (projs.length === 0) {
    confidence['projects'] = 0;
  } else {
    const valid = projs.filter((p) => p.name);
    if (valid.length === 0) {
      confidence['projects'] = 30;
    } else {
      confidence['projects'] = 88;
    }
  }

  return confidence;
}

/**
 * High-level orchestration that parses any resume file, structures it with Gemini (or fallback),
 * and computes confidence metrics.
 */
export async function parseAndStructureResume(
  file: File,
  abortSignal?: AbortSignal
): Promise<ParsedResumeResult> {
  const { rawText, method, jsonData } = await parseResumeFile(file);

  if (jsonData && jsonData.personalInfo) {
    const confidence = calculateConfidence(jsonData);
    return {
      data: jsonData,
      confidence,
      rawText,
      method,
      isAiFallback: false,
    };
  }

  const { data: structured, fallbackNotice, isAiFallback } = await structureResumeWithGemini(
    rawText,
    abortSignal
  );
  const confidence = calculateConfidence(structured);

  return {
    data: structured,
    confidence,
    rawText,
    method,
    fallbackNotice,
    isAiFallback,
  };
}
