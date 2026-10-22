import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import type { ResumeData } from '../types/resume';
import { getStoredApiKey, getStoredModel } from './geminiService';

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
  const apiKey = getStoredApiKey();
  const configuredModel = getStoredModel() || 'gemini-3.8-flash';
  const modelsToTry = Array.from(new Set([configuredModel, 'gemini-2.5-flash']));

  if (apiKey) {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error('Gemini API call timed out after 20s'));
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
            if (controller.signal.aborted) {
              reject(timedOut ? new Error('Gemini call timed out after 20s') : new Error('Aborted'));
            } else {
              controller.signal.addEventListener('abort', () => {
                reject(timedOut ? new Error('Gemini call timed out after 20s') : new Error('Aborted'));
              });
            }
          });

          const apiCall = client.interactions.create(
            {
              model,
              input: prompt,
            },
            { signal: controller.signal } as any
          );

          const response: any = await Promise.race([apiCall, timeoutPromise]);
          const responseText = response?.output_text || '';
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          if (parsed && (parsed.personalInfo || parsed.experience || parsed.education)) {
            clearTimeout(timeoutId);
            return {
              data: normalizeParsedData(parsed),
              isAiFallback: false,
            };
          } else {
            throw new Error('Invalid JSON structure returned by model');
          }
        } catch (err: any) {
          console.error(`Gemini structuring failed with model "${model}":`, err);
          if (controller.signal.aborted && timedOut) {
            console.error('Gemini request exceeded 20s timeout limit.');
            break;
          }
        }
      }
    } catch (outerErr: any) {
      console.error('Gemini structuring encountered error:', outerErr);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Fallback: offline regex parser automatically
  const fallbackData = fallbackRegexParser(rawText);
  return {
    data: fallbackData,
    fallbackNotice: 'AI unavailable, imported with basic parsing',
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

function fallbackRegexParser(rawText: string): Partial<ResumeData> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Email
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Phone
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // LinkedIn
  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  const linkedin = linkedinMatch ? linkedinMatch[0] : '';

  // GitHub
  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  const github = githubMatch ? githubMatch[0] : '';

  // Website / Portfolio
  const websiteMatch = rawText.match(/(?:https?:\/\/)(?:www\.)?[a-zA-Z0-9-]+\.(?:com|io|dev|org|net|me)/i);
  const website = websiteMatch ? websiteMatch[0] : '';

  // Name: first non-empty line that is 2-4 words, no digits/@/url; if none, leave empty
  let fullName = '';
  for (const line of lines) {
    if (/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(line)) {
      continue;
    }
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4 && line.length < 50) {
      fullName = line;
      break;
    }
  }

  const SECTION_HEADING_REGEX = /^(?:professional\s+)?(?:summary|profile|about(?:\s+me)?|objective|work\s+experience|experience|employment|work\s+history|education|academic(?:\s+background)?|academics|projects|personal\s+projects|key\s+projects|skills|technical\s+skills|core\s+competencies|certifications?|licenses?)$/i;

  // Target role: line right after fullName or near header, empty if not found
  let jobTitle = '';
  if (fullName) {
    const nameIdx = lines.indexOf(fullName);
    if (nameIdx !== -1 && nameIdx + 1 < lines.length) {
      const candidateLine = lines[nameIdx + 1];
      if (
        !/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(candidateLine) &&
        !SECTION_HEADING_REGEX.test(candidateLine)
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

  // Experience parsing
  const experience: any[] = [];
  if (sectionBuckets.experience.length > 0) {
    let currentExp: any = null;
    for (const expLine of sectionBuckets.experience) {
      const isBullet = /^[•\-*]\s*/.test(expLine);
      const isDateLine = /(?:19|20)\d{2}/.test(expLine);

      if (!isBullet && (!currentExp || isDateLine || currentExp.highlights.length > 0)) {
        currentExp = {
          id: `exp-${Date.now()}-${experience.length}`,
          company: expLine,
          position: jobTitle || 'Role',
          location: '',
          startDate: '',
          endDate: 'Present',
          current: true,
          highlights: [],
        };
        experience.push(currentExp);
      } else if (currentExp) {
        currentExp.highlights.push(expLine.replace(/^[•\-*]\s*/, '').trim());
      }
    }
  }

  // Education parsing
  const education: any[] = [];
  if (sectionBuckets.education.length > 0) {
    let currentEdu: any = null;
    for (const eduLine of sectionBuckets.education) {
      const isDegreeOrSchool = /(?:university|college|institute|school|bachelor|master|b\.s|b\.a|m\.s|ph\.d|degree|diploma)/i.test(eduLine);
      if (isDegreeOrSchool || !currentEdu) {
        currentEdu = {
          id: `edu-${Date.now()}-${education.length}`,
          institution: eduLine,
          degree: '',
          fieldOfStudy: '',
          location: '',
          startDate: '',
          endDate: '',
        };
        education.push(currentEdu);
      } else if (currentEdu && !currentEdu.degree) {
        currentEdu.degree = eduLine;
      }
    }
  }

  // Projects parsing (Detect Projects heading)
  const projects: any[] = [];
  if (sectionBuckets.projects.length > 0) {
    let currentProj: any = null;
    for (const projLine of sectionBuckets.projects) {
      const isBullet = /^[•\-*]\s*/.test(projLine);
      if (!isBullet && (!currentProj || currentProj.highlights.length > 0)) {
        currentProj = {
          id: `proj-${Date.now()}-${projects.length}`,
          name: projLine.replace(/^[•\-*]\s*/, '').trim(),
          description: '',
          technologies: [],
          highlights: [],
        };
        projects.push(currentProj);
      } else if (currentProj) {
        currentProj.highlights.push(projLine.replace(/^[•\-*]\s*/, '').trim());
      }
    }
  }

  // Skills parsing
  const skills: any[] = [];
  const extractedSkillItems: string[] = [];
  if (sectionBuckets.skills.length > 0) {
    for (const sLine of sectionBuckets.skills) {
      const tokens = sLine.split(/[,|•\-\n/]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 35);
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
      location: '',
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

  // Personal Info: 0% if empty, <50% if only partial
  const pi = data.personalInfo;
  if (!pi || (!pi.fullName && !pi.email && !pi.phone && !pi.jobTitle)) {
    confidence['personalInfo'] = 0;
  } else {
    let filled = 0;
    if (pi.fullName) filled++;
    if (pi.email) filled++;
    if (pi.phone) filled++;
    if (pi.jobTitle) filled++;
    if (filled === 1) confidence['personalInfo'] = 25;
    else if (filled === 2) confidence['personalInfo'] = 45;
    else if (filled === 3) confidence['personalInfo'] = 75;
    else confidence['personalInfo'] = 95;
  }

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
