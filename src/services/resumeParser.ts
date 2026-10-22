import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { ResumeData } from '../types/resume';
import { generate } from '../lib/gemini';

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
 * Extracts raw text from PDF grouping items into lines by y (tolerance ~2px),
 * sorting by x, joining with space only when gap > ~1px, and merging wrapped lines.
 */
async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pageLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    interface PosItem {
      str: string;
      x: number;
      y: number;
      width: number;
    }
    const rawItems: PosItem[] = [];
    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.length > 0) {
        const x = Array.isArray(item.transform) ? item.transform[4] : 0;
        const y = Array.isArray(item.transform) ? item.transform[5] : 0;
        rawItems.push({
          str: item.str,
          x,
          y,
          width: item.width || 0,
        });
      }
    }

    // Group items into lines by y (tolerance ~2px)
    // Sort descending by y first (top of page has higher y in PDF coords)
    rawItems.sort((a, b) => b.y - a.y);

    interface LineGroup {
      y: number;
      items: PosItem[];
    }
    const lines: LineGroup[] = [];
    for (const it of rawItems) {
      const matchedLine = lines.find((l) => Math.abs(l.y - it.y) <= 2);
      if (matchedLine) {
        matchedLine.items.push(it);
      } else {
        lines.push({ y: it.y, items: [it] });
      }
    }

    // Process each line: sort by x, join with space only when gap > ~1px
    const processedLines: string[] = [];
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
      let lineStr = '';
      let prevEnd = -9999;
      for (const it of line.items) {
        if (lineStr === '') {
          lineStr = it.str;
        } else {
          const gap = it.x - prevEnd;
          if (gap > 1) {
            // gap > ~1px: insert space if needed
            if (!lineStr.endsWith(' ') && !it.str.startsWith(' ')) {
              lineStr += ' ' + it.str;
            } else {
              lineStr += it.str;
            }
          } else {
            // gap <= ~1px: keep whole, no extra space (e.g. "Re" + "mote" -> "Remote")
            lineStr += it.str;
          }
        }
        prevEnd = Math.max(prevEnd, it.x + (it.width || 0));
      }

      const trimmed = lineStr.trim();
      if (trimmed) {
        processedLines.push(trimmed);
      }
    }

    // Merge wrapped lines (line not ending . : ; and next line starts lowercase or is a bullet continuation)
    const mergedLines: string[] = [];
    for (let j = 0; j < processedLines.length; j++) {
      const cur = processedLines[j];
      if (mergedLines.length === 0) {
        mergedLines.push(cur);
        continue;
      }

      const prevIdx = mergedLines.length - 1;
      const prev = mergedLines[prevIdx];
      const prevEndsPunct = /[.:;]$/.test(prev.trim());
      const nextStartsLower = /^[a-z]/.test(cur);
      const isBulletContinuation = !/^[•·⁃◦*]\s*|^-\s+/.test(cur) && /^[•·⁃◦*]\s*|^-\s+/.test(prev) && !prevEndsPunct;

      if (!prevEndsPunct && (nextStartsLower || isBulletContinuation)) {
        mergedLines[prevIdx] = prev + ' ' + cur;
      } else {
        mergedLines.push(cur);
      }
    }

    pageLines.push(...mergedLines);
  }

  return pageLines.join('\n').trim();
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
      const extractedText = await extractTextFromPdf(arrayBuffer);
      return { rawText: extractedText, method: 'pdf' };
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
 * Structures raw resume text into ResumeData schema using Gemini REST client,
 * with a local regex fallback.
 */
export async function structureResumeWithGemini(
  rawText: string,
  externalSignal?: AbortSignal,
  fileName?: string
): Promise<StructureResult> {
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

  const res = await generate(prompt, {
    signal: externalSignal,
    responseMimeType: 'application/json',
  });

  if (res.ok && res.text) {
    try {
      const cleanJson = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed && (parsed.personalInfo || parsed.experience || parsed.education || parsed.skills)) {
        return {
          data: normalizeParsedData(parsed),
          isAiFallback: false,
        };
      }
    } catch (err) {
      console.error('Failed to parse Gemini JSON output:', err);
    }
  }

  const fallbackNotice = res.ok ? 'Invalid response' : (res.message || 'AI unavailable');
  const fallbackData = fallbackRegexParser(rawText, fileName);
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
  normalized = normalized.replace(/([a-zA-Z]+)-\s*\r?\n\s*([a-zA-Z]+)/g, '$1$2');

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
  normalized = normalized.replace(/(?:^|[^\n])\s*([•\u2022·⁃◦*]|-\s+)/g, '\n$1');

  return normalized;
}

const INSTITUTION_REG = /\b(?:university|college|institute|abes|iit|nit|iiit|bits|school|academy|polytechnic|engineering|technology)\b/i;

function cleanNameCandidate(raw: string): string {
  let cleaned = raw.replace(/\b(?:university|college|institute|abes|iit|nit|iiit|bits|school|academy|polytechnic)\b.*$/i, '').trim();
  cleaned = cleaned.replace(/[,|\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned;
}

export function parseExperienceEntries(expLines: string[]): any[] {
  const experiences: any[] = [];
  if (!expLines || expLines.length === 0) return experiences;

  const MONTHS_STR = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const YEAR_STR = '(?:19|20)?\\d{2}';
  const DATE_POINT_STR = `(?:(?:${MONTHS_STR})\\.?\\s*)?${YEAR_STR}|present|current`;
  const DATE_SEP_STR = '[-–—~]|\\bto\\b';
  const DATE_RANGE_REGEX = new RegExp(
    `\\b((?:(?:${MONTHS_STR})\\.?\\s*)?${YEAR_STR})\\s*(?:${DATE_SEP_STR})\\s*(${DATE_POINT_STR})\\b`,
    'i'
  );

  const anchorIndices: number[] = [];
  for (let i = 0; i < expLines.length; i++) {
    if (DATE_RANGE_REGEX.test(expLines[i])) {
      anchorIndices.push(i);
    }
  }

  const ROLE_WORDS = /\b(?:engineer|developer|intern|lead|manager|specialist|analyst|consultant|designer|architect|officer|director|associate|scientist|fellow|head|programmer|coder|devops|full\s*stack|frontend|backend)\b/i;

  const splitTitleAndCompany = (text: string): { position: string; company: string } => {
    const clean = text.replace(/^[|•·⁃◦*-]\s*|[|•·⁃◦*-]\s*$/g, '').trim();
    if (!clean) return { position: '', company: '' };

    const parts = clean.split(/\s+at\s+|\s*[|–—]\s*|\s+-\s+|\s*,\s*/i).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (ROLE_WORDS.test(parts[0]) && !ROLE_WORDS.test(parts[1])) {
        return { position: parts[0], company: parts[1] };
      } else if (ROLE_WORDS.test(parts[1]) && !ROLE_WORDS.test(parts[0])) {
        return { position: parts[1], company: parts[0] };
      } else {
        return { position: parts[0], company: parts[1] };
      }
    } else if (parts.length === 1) {
      if (ROLE_WORDS.test(parts[0])) {
        return { position: parts[0], company: '' };
      } else {
        return { position: '', company: parts[0] };
      }
    }
    return { position: '', company: '' };
  };

  if (anchorIndices.length === 0) {
    let currentExp: any = null;
    for (const expLine of expLines) {
      const isBullet = /^[•·⁃◦*]\s*|^\-\s+/.test(expLine);
      if (!isBullet) {
        const { position, company } = splitTitleAndCompany(expLine);
        currentExp = {
          id: `exp-${Date.now()}-${experiences.length}`,
          company: company || '',
          position: position || '',
          location: '',
          startDate: '',
          endDate: 'Present',
          current: true,
          highlights: [],
        };
        experiences.push(currentExp);
      } else if (isBullet && currentExp) {
        currentExp.highlights.push(expLine.replace(/^[•·⁃◦*]\s*|^\-\s+/, '').trim());
      }
    }
    return experiences;
  }

  for (let a = 0; a < anchorIndices.length; a++) {
    const anchorIdx = anchorIndices[a];
    const anchorLine = expLines[anchorIdx];
    const dateMatch = anchorLine.match(DATE_RANGE_REGEX);
    const startDate = dateMatch ? dateMatch[1].trim() : '';
    const rawEndDate = dateMatch ? dateMatch[2].trim() : 'Present';
    const isCurrent = /present|current/i.test(rawEndDate);
    const endDate = isCurrent ? 'Present' : rawEndDate;

    const beside = anchorLine.replace(DATE_RANGE_REGEX, '').replace(/^[|•·⁃◦*-]\s*|[|•·⁃◦*-]\s*$/g, '').trim();
    let position = '';
    let company = '';

    if (beside) {
      const res = splitTitleAndCompany(beside);
      position = res.position;
      company = res.company;
    }

    const prevAnchor = a > 0 ? anchorIndices[a - 1] : -1;
    const line1Above = anchorIdx - 1 > prevAnchor ? expLines[anchorIdx - 1] : '';
    const line2Above = anchorIdx - 2 > prevAnchor ? expLines[anchorIdx - 2] : '';

    if (!position || !company) {
      if (line1Above && !/^[•·⁃◦*]\s*|^\-\s+/.test(line1Above)) {
        const res1 = splitTitleAndCompany(line1Above);
        if (res1.position && res1.company) {
          position = position || res1.position;
          company = company || res1.company;
        } else if (res1.position && !position) {
          position = res1.position;
        } else if (res1.company && !company) {
          company = res1.company;
        }

        if ((!position || !company) && line2Above && !/^[•·⁃◦*]\s*|^\-\s+/.test(line2Above)) {
          const res2 = splitTitleAndCompany(line2Above);
          if (res2.position && !position) position = res2.position;
          if (res2.company && !company) company = res2.company;
        }
      }
    }

    const nextAnchor = a + 1 < anchorIndices.length ? anchorIndices[a + 1] : expLines.length;
    let bulletEndLimit = nextAnchor;
    if (a + 1 < anchorIndices.length) {
      if (bulletEndLimit - 1 >= 0 && !/^[•·⁃◦*]\s*|^\-\s+/.test(expLines[bulletEndLimit - 1])) {
        bulletEndLimit--;
      }
      if (bulletEndLimit - 1 >= 0 && !/^[•·⁃◦*]\s*|^\-\s+/.test(expLines[bulletEndLimit - 1])) {
        bulletEndLimit--;
      }
    }

    const highlights: string[] = [];
    for (let b = anchorIdx + 1; b < Math.max(anchorIdx + 1, bulletEndLimit); b++) {
      const bLine = expLines[b];
      const isBullet = /^[•·⁃◦*]\s*|^\-\s+/.test(bLine);
      const cleanBullet = bLine.replace(/^[•·⁃◦*]\s*|^\-\s+/, '').trim();
      if (isBullet && cleanBullet) {
        highlights.push(cleanBullet);
      } else if (highlights.length > 0 && cleanBullet) {
        highlights[highlights.length - 1] = highlights[highlights.length - 1] + ' ' + cleanBullet;
      } else if (cleanBullet) {
        highlights.push(cleanBullet);
      }
    }

    experiences.push({
      id: `exp-${Date.now()}-${experiences.length}`,
      position: position || '',
      company: company || '',
      location: '',
      startDate,
      endDate,
      current: isCurrent,
      highlights,
    });
  }

  return experiences;
}

export function fallbackRegexParser(rawText: string, fileName?: string): Partial<ResumeData> {
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

  // Name: first line before email/phone with 2-4 alphabetic words; drop trailing institution tokens
  let fullName = '';
  let nameSource: 'detected' | 'from file name' | undefined = undefined;

  const contactIndex = normalizedText.search(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  );

  if (contactIndex > 0) {
    const textBefore = normalizedText.slice(0, contactIndex).trim();
    const beforeLines = textBefore.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const bLine of beforeLines) {
      if (/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(bLine)) continue;
      if (isSectionHeadingOrKeyword(bLine)) continue;
      const cand = cleanNameCandidate(bLine);
      if (!cand || INSTITUTION_REG.test(cand)) continue;
      const words = cand.split(/\s+/).filter(Boolean);
      const isAllAlpha = words.every((w) => /^[a-zA-Z.'-]+$/.test(w));
      if (words.length >= 2 && words.length <= 4 && isAllAlpha) {
        fullName = cand;
        nameSource = 'detected';
        break;
      }
    }
  }

  if (!fullName) {
    for (const line of lines) {
      if (/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(line)) continue;
      if (isSectionHeadingOrKeyword(line)) continue;
      const cand = cleanNameCandidate(line);
      if (!cand || INSTITUTION_REG.test(cand)) continue;
      const words = cand.split(/\s+/).filter(Boolean);
      const isAllAlpha = words.every((w) => /^[a-zA-Z.'-]+$/.test(w));
      if (words.length >= 2 && words.length <= 4 && isAllAlpha) {
        fullName = cand;
        nameSource = 'detected';
        break;
      }
    }
  }

  // Fallback: derive from uploaded file name if it yields 2-3 capitalized words
  if (!fullName && fileName) {
    const cleanBase = fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/\b(resume|cv)\b/gi, ' ')
      .replace(/[\d_.-]+/g, ' ')
      .trim();
    const fileWords = cleanBase.split(/\s+/).filter(Boolean);
    if (
      fileWords.length >= 2 &&
      fileWords.length <= 3 &&
      fileWords.every((w) => /^[a-zA-Z]+$/.test(w))
    ) {
      fullName = fileWords
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      nameSource = 'from file name';
    }
  }

  // Location: remove name tokens, accept only "City, State/Country"
  let location = '';
  const locationMatch = normalizedText.match(/\b([A-Z][a-zA-Z\s.-]+),\s*([A-Z]{2}|[A-Z][a-zA-Z\s.-]+)\b/);
  if (locationMatch) {
    let locCand = locationMatch[0].trim();
    if (fullName) {
      for (const nw of fullName.split(/\s+/).filter(Boolean)) {
        locCand = locCand.replace(new RegExp(`\\b${nw}\\b`, 'gi'), '').trim();
      }
      locCand = locCand.replace(/^[,\s-]+|[,\s-]+$/g, '').trim();
    }
    if (locCand && locCand.includes(',') && !INSTITUTION_REG.test(locCand) && !/company|resume/i.test(locCand)) {
      location = locCand;
    }
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

  // Summary (no slice/truncation)
  const summary = sectionBuckets.summary.length > 0 ? sectionBuckets.summary.join(' ').trim() : '';

  // Experience: anchor entries on date ranges
  const experience = parseExperienceEntries(sectionBuckets.experience);

  // Target title: line directly under name, else Objective/Title line, else recent experience title, else MERN/role keywords from summary, else empty
  let jobTitle = '';
  if (fullName) {
    const nameIdx = lines.findIndex((l) => l.includes(fullName));
    if (nameIdx !== -1 && nameIdx + 1 < lines.length) {
      const candidateLine = lines[nameIdx + 1].trim();
      if (
        candidateLine &&
        !/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(candidateLine) &&
        !isSectionHeadingOrKeyword(candidateLine) &&
        !INSTITUTION_REG.test(candidateLine)
      ) {
        const words = candidateLine.split(/\s+/).filter(Boolean);
        if (words.length >= 1 && words.length <= 6 && candidateLine.length < 60) {
          jobTitle = candidateLine;
        }
      }
    }
  }

  if (!jobTitle) {
    for (const line of lines) {
      const match = line.match(/^(?:objective|target\s+title|role|title)\s*[:|-]\s*(.+)$/i);
      if (match && match[1].trim().length < 60) {
        jobTitle = match[1].trim();
        break;
      }
    }
  }

  if (!jobTitle && experience.length > 0 && experience[0].position?.trim()) {
    jobTitle = experience[0].position.trim();
  }

  if (!jobTitle && summary) {
    const roleKeywordsMatch = summary.match(/\b(full\s*stack(?:\s+developer|\s+engineer)?|frontend(?:\s+developer|\s+engineer)?|backend(?:\s+developer|\s+engineer)?|software(?:\s+developer|\s+engineer)?|mern(?:\s+stack)?(?:\s+developer)?|data\s+scientist|machine\s+learning\s+engineer|devops\s+engineer|mobile\s+developer|ai\s+engineer)\b/i);
    if (roleKeywordsMatch) {
      const matched = roleKeywordsMatch[0].trim();
      jobTitle = matched.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  // Education parsing with degree keywords
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
        const lastIdx = currentProj.highlights.length - 1;
        currentProj.highlights[lastIdx] = (currentProj.highlights[lastIdx] + ' ' + projLine.trim()).trim();
      } else if (currentProj) {
        currentProj.highlights.push(projLine.trim());
      }
    }
  }

  // Skills parsing (no slice truncation)
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
  const finalSkills = Array.from(new Set([...extractedSkillItems, ...detectedSkills]));

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
      nameSource,
    } as any,
    summary,
    experience,
    education,
    projects,
    skills,
    certifications: [],
    customSections: [],
  };
}

export function calculateConfidence(
  data: Partial<ResumeData>,
  hasCheckItems = false
): Record<string, number> {
  const confidence: Record<string, number> = {};

  // PersonalInfo = (name, email, phone, location, title detected)/5, name from file name counts 0.5;
  const pi = data.personalInfo;
  let piDetectedCount = 0;
  if (pi?.fullName?.trim()) {
    if ((pi as any).nameSource === 'from file name') {
      piDetectedCount += 0.5;
    } else {
      piDetectedCount += 1.0;
    }
  }
  if (pi?.email?.trim()) piDetectedCount += 1.0;
  if (pi?.phone?.trim()) piDetectedCount += 1.0;
  if (pi?.location?.trim()) piDetectedCount += 1.0;
  if (pi?.jobTitle?.trim()) piDetectedCount += 1.0;
  confidence['personalInfo'] = Math.round((piDetectedCount / 5) * 100);

  // Summary: 1.0 if 30-90 words, 0.5 if >0 words, 0 if empty
  const sum = (data.summary || '').trim();
  const sumWords = sum ? sum.split(/\s+/).filter(Boolean).length : 0;
  if (sumWords === 0) {
    confidence['summary'] = 0;
  } else if (sumWords >= 30 && sumWords <= 90) {
    confidence['summary'] = 100;
  } else {
    confidence['summary'] = 50;
  }

  // Experience = entries having title+company+(startDate OR endDate) / total entries; 0% if empty
  const exp = data.experience || [];
  if (exp.length === 0) {
    confidence['experience'] = 0;
  } else {
    const valid = exp.filter(
      (e) => Boolean(e.position?.trim()) && Boolean(e.company?.trim()) && (Boolean(e.startDate?.trim()) || Boolean(e.endDate?.trim()))
    ).length;
    confidence['experience'] = Math.round((valid / exp.length) * 100);
  }

  // Education = entries with degree+school / total; 0% if empty
  const edu = data.education || [];
  if (edu.length === 0) {
    confidence['education'] = 0;
  } else {
    const valid = edu.filter((e) => Boolean(e.degree?.trim()) && Boolean(e.institution?.trim())).length;
    confidence['education'] = Math.round((valid / edu.length) * 100);
  }

  // Skills = min(count/8, 1); 0% if empty
  const totalSkills = data.skills?.reduce((acc, c) => acc + (c.skills?.length || 0), 0) || 0;
  if (totalSkills === 0) {
    confidence['skills'] = 0;
  } else {
    confidence['skills'] = Math.round(Math.min(totalSkills / 8, 1) * 100);
  }

  // Projects = entries with title+bullet / total; 0% if empty
  const projs = data.projects || [];
  if (projs.length === 0) {
    confidence['projects'] = 0;
  } else {
    const valid = projs.filter(
      (p) => Boolean(p.name?.trim()) && (p.highlights?.length || 0) >= 1
    ).length;
    confidence['projects'] = Math.round((valid / projs.length) * 100);
  }

  // Overall: average of sections present in the resume. Never show 100% if the Check list has any items.
  const presentScores: number[] = [];
  if (data.personalInfo && Object.values(data.personalInfo).some(Boolean)) presentScores.push(confidence['personalInfo']);
  if (data.summary?.trim()) presentScores.push(confidence['summary']);
  if ((data.experience || []).length > 0) presentScores.push(confidence['experience']);
  if ((data.education || []).length > 0) presentScores.push(confidence['education']);
  if ((data.skills || []).length > 0) presentScores.push(confidence['skills']);
  if ((data.projects || []).length > 0) presentScores.push(confidence['projects']);

  const avg = presentScores.length > 0
    ? Math.round(presentScores.reduce((a, b) => a + b, 0) / presentScores.length)
    : 0;
  confidence['overall'] = hasCheckItems ? Math.min(avg, 95) : avg;

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
    abortSignal,
    file.name
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
