import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { ResumeData } from '../types/resume';
import { generate } from '../lib/gemini';
import { humanizeFileName } from './resumeStorage';

// Set up pdf.js worker URL for browser environments
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch {
    // Ignore worker initialization errors in non-standard environments
  }
}

export type ParseMethod = 'pdf' | 'docx' | 'json' | 'txt';

export interface ExtractedPdfLine {
  text: string;
  leftText: string;
  rightText: string;
  x: number;
  y: number;
  fontSize: number;
  page: number;
}

export interface ParseResult {
  rawText: string;
  method: ParseMethod;
  jsonData?: Partial<ResumeData>;
  extractedLines?: ExtractedPdfLine[];
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
 * Extracts raw text and structured line layout from PDF:
 * - Group items into lines by y (+-2px).
 * - Split each line into left/right segments where x-gap > 40px (left = content, right = date/location).
 * - Record max font size per line.
 * - Merge wrapped lines: remove a char ONLY if line ends with "-" AND next line starts lowercase.
 * - Preserves words without truncation (Remote, real time, consumption, running, (IBM)).
 * - If localStorage["rc-debug"]=="1", console.table extracted PDF lines (text, x, y, fontSize).
 */
async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<{ rawText: string; lines: ExtractedPdfLine[] }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const allExtractedLines: ExtractedPdfLine[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    interface PosItem {
      str: string;
      x: number;
      y: number;
      width: number;
      fontSize: number;
    }
    const rawItems: PosItem[] = [];
    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.length > 0) {
        const x = Array.isArray(item.transform) ? item.transform[4] : 0;
        const y = Array.isArray(item.transform) ? item.transform[5] : 0;
        const fontSize = Array.isArray(item.transform)
          ? Math.round(Math.hypot(item.transform[0], item.transform[1])) || Math.round(Math.abs(item.transform[0])) || 12
          : 12;
        rawItems.push({
          str: item.str,
          x,
          y,
          width: item.width || 0,
          fontSize,
        });
      }
    }

    // Group items into lines by y (+-2px)
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

    // Process each line: sort by x, split into left/right segments where x-gap > 40px
    const pageLines: ExtractedPdfLine[] = [];
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);

      let splitIdx = -1;
      let maxGap = 0;
      for (let k = 0; k < line.items.length - 1; k++) {
        const endK = line.items[k].x + (line.items[k].width || 0);
        const gap = line.items[k + 1].x - endK;
        if (gap > 40 && gap > maxGap) {
          maxGap = gap;
          splitIdx = k + 1;
        }
      }

      const leftItems = splitIdx > 0 ? line.items.slice(0, splitIdx) : line.items;
      const rightItems = splitIdx > 0 ? line.items.slice(splitIdx) : [];

      const buildSegment = (items: PosItem[]): string => {
        let segStr = '';
        let prevEnd = -9999;
        for (const it of items) {
          if (segStr === '') {
            segStr = it.str;
          } else {
            const gap = it.x - prevEnd;
            if (gap > 1) {
              if (!segStr.endsWith(' ') && !it.str.startsWith(' ')) {
                segStr += ' ' + it.str;
              } else {
                segStr += it.str;
              }
            } else {
              segStr += it.str;
            }
          }
          prevEnd = Math.max(prevEnd, it.x + (it.width || 0));
        }
        return segStr.trim();
      };

      const leftText = buildSegment(leftItems);
      const rightText = buildSegment(rightItems);
      const fullLineText = rightText ? `${leftText}   ${rightText}` : leftText;
      const maxFont = Math.max(...line.items.map((it) => it.fontSize));
      const minX = line.items[0].x;

      if (leftText || rightText) {
        pageLines.push({
          text: fullLineText,
          leftText,
          rightText,
          x: minX,
          y: line.y,
          fontSize: maxFont,
          page: i,
        });
      }
    }

    // Merge wrapped lines: remove a char ONLY if line ends with "-" AND next line starts lowercase
    const mergedPageLines: ExtractedPdfLine[] = [];
    for (let j = 0; j < pageLines.length; j++) {
      const cur = pageLines[j];
      if (mergedPageLines.length === 0) {
        mergedPageLines.push(cur);
        continue;
      }

      const prevIdx = mergedPageLines.length - 1;
      const prev = mergedPageLines[prevIdx];
      const prevText = prev.text.trim();
      const prevEndsPunct = /[.:;]$/.test(prevText);
      const prevEndsHyphen = prevText.endsWith('-');
      const nextStartsLower = /^[a-z]/.test(cur.text.trim());
      const isBulletContinuation = !/^[•·⁃◦*]\s*|^-\s+/.test(cur.text.trim()) && /^[•·⁃◦*]\s*|^-\s+/.test(prevText) && !prevEndsPunct;

      if (prevEndsHyphen && nextStartsLower) {
        mergedPageLines[prevIdx] = {
          ...prev,
          text: prev.text.trim().slice(0, -1) + cur.text.trim(),
          leftText: prev.leftText.endsWith('-') ? prev.leftText.slice(0, -1) + cur.leftText : prev.leftText + ' ' + cur.leftText,
          rightText: cur.rightText || prev.rightText,
        };
      } else if (!prevEndsPunct && (nextStartsLower || isBulletContinuation)) {
        mergedPageLines[prevIdx] = {
          ...prev,
          text: prev.text.trim() + ' ' + cur.text.trim(),
          leftText: prev.leftText.trim() + ' ' + cur.leftText.trim(),
          rightText: cur.rightText || prev.rightText,
        };
      } else {
        mergedPageLines.push(cur);
      }
    }

    allExtractedLines.push(...mergedPageLines);
  }

  // Debug output if requested
  if (typeof localStorage !== 'undefined' && localStorage.getItem('rc-debug') === '1') {
    try {
      console.table(
        allExtractedLines.map((l) => ({
          text: l.text,
          x: Math.round(l.x),
          y: Math.round(l.y),
          fontSize: Math.round(l.fontSize),
        }))
      );
    } catch (e) {
      console.error('Failed to log rc-debug table:', e);
    }
  }

  const rawText = allExtractedLines.map((l) => l.text).join('\n').trim();
  return { rawText, lines: allExtractedLines };
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
      const { rawText, lines } = await extractTextFromPdf(arrayBuffer);
      return { rawText, method: 'pdf', extractedLines: lines };
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

function mergeParsedData(ai: Partial<ResumeData>, offline: Partial<ResumeData>): Partial<ResumeData> {
  const mergedPi: any = {
    ...offline.personalInfo,
  };
  if (ai.personalInfo) {
    for (const [key, val] of Object.entries(ai.personalInfo)) {
      if (val && typeof val === 'string' && val.trim()) {
        mergedPi[key] = val.trim();
      }
    }
  }

  const mergedSummary = ai.summary?.trim() ? ai.summary.trim() : offline.summary || '';
  const mergedExp = ai.experience && ai.experience.length > 0 ? ai.experience : offline.experience || [];
  const mergedEdu = ai.education && ai.education.length > 0 ? ai.education : offline.education || [];
  const mergedSkills = ai.skills && ai.skills.length > 0 ? ai.skills : offline.skills || [];
  const mergedProjects = ai.projects && ai.projects.length > 0 ? ai.projects : offline.projects || [];
  const mergedCertifications = ai.certifications && ai.certifications.length > 0 ? ai.certifications : offline.certifications || [];

  return {
    personalInfo: mergedPi,
    summary: mergedSummary,
    experience: mergedExp,
    education: mergedEdu,
    skills: mergedSkills,
    projects: mergedProjects,
    certifications: mergedCertifications,
    customSections: ai.customSections || offline.customSections || [],
  };
}

/**
 * Structures raw resume text into ResumeData schema using Gemini REST client:
 * - Plain extracted text only.
 * - AI wins per field, offline parser fills empty fields.
 */
export async function structureResumeWithGemini(
  rawText: string,
  externalSignal?: AbortSignal,
  fileName?: string,
  extractedLines?: ExtractedPdfLine[]
): Promise<StructureResult> {
  const offlineData = fallbackRegexParser(rawText, fileName, extractedLines);

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
        const aiData = normalizeParsedData(parsed);
        const mergedData = mergeParsedData(aiData, offlineData);
        return {
          data: mergedData,
          isAiFallback: false,
        };
      }
    } catch (err) {
      console.error('Failed to parse Gemini JSON output:', err);
    }
  }

  const fallbackNotice = res.message || 'AI unavailable';
  return {
    data: offlineData,
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
  normalized = normalized.replace(/([a-zA-Z]+)-\s*\r?\n\s*([a-z]+)/g, '$1$2');

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

const LONE_SKILL_WORDS = new Set([
  'python', 'java', 'c++', 'c#', 'javascript', 'typescript', 'sql', 'html', 'css',
  'react', 'angular', 'vue', 'node', 'nodejs', 'aws', 'gcp', 'azure', 'docker',
  'kubernetes', 'git', 'linux', 'c', 'php', 'ruby', 'rust', 'go', 'golang', 'r',
  'swift', 'kotlin', 'dart', 'scala', 'perl', 'bash', 'matlab'
]);

function isLoneSkill(str: string): boolean {
  const clean = str.trim().toLowerCase();
  return LONE_SKILL_WORDS.has(clean) || (clean.split(/\s+/).length === 1 && LONE_SKILL_WORDS.has(clean));
}

function isValidNameCandidate(text: string): { valid: boolean; name: string } {
  const trimmed = text.trim();
  if (!trimmed) return { valid: false, name: '' };
  if (/\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(trimmed)) return { valid: false, name: '' };
  if (isSectionHeadingOrKeyword(trimmed)) return { valid: false, name: '' };
  // Never a location (state/country/comma pattern)
  if (/^[A-Za-z\s.-]+,\s*(?:[A-Z]{2}|[A-Za-z\s.-]+)$/.test(trimmed)) return { valid: false, name: '' };
  if (/\b(?:california|new\s+york|texas|florida|washington|india|usa|united\s+states|canada|germany|uk|united\s+kingdom)\b/i.test(trimmed)) return { valid: false, name: '' };

  // Strip institution tokens
  let cand = trimmed.replace(/\b(?:university|college|institute|abes|iit|nit|iiit|bits|school|academy|polytechnic)\b.*$/i, '').trim();
  cand = cand.replace(/[,|\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cand || INSTITUTION_REG.test(cand)) return { valid: false, name: '' };

  const words = cand.split(/\s+/).filter(Boolean);
  const isAllAlpha = words.every((w) => /^[a-zA-Z.'-]+$/.test(w));
  if (words.length >= 2 && words.length <= 4 && isAllAlpha) {
    return { valid: true, name: cand };
  }
  return { valid: false, name: '' };
}

const MONTHS_STR = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const YEAR_STR = '(?:19|20)?\\d{2}';
const DATE_POINT_STR = `(?:(?:${MONTHS_STR})\\.?\\s*)?${YEAR_STR}|present|current`;
const DATE_SEP_STR = '[-–—~]|\\bto\\b';
const DATE_RANGE_REGEX = new RegExp(
  `\\b((?:(?:${MONTHS_STR})\\.?\\s*)?${YEAR_STR})\\s*(?:${DATE_SEP_STR})\\s*(${DATE_POINT_STR})\\b`,
  'i'
);

const ROLE_WORDS = /\b(?:engineer|developer|intern|lead|manager|specialist|analyst|consultant|designer|architect|officer|director|associate|scientist|fellow|head|programmer|coder|devops|full\s*stack|frontend|backend)\b/i;

/**
 * Parses all experience entries:
 * - Anchors on lines whose right segment or text contains a date range.
 * - Left segment + next line = title and company.
 * - Line containing Intern/Engineer/Analyst/Developer/Manager/Lead is the title.
 * - Title/company lines never become bullets.
 * - Keeps start AND end date. Parses ALL entries. Never defaults to "Role".
 */
export function parseExperienceEntries(expLines: string[]): any[] {
  const experiences: any[] = [];
  if (!expLines || expLines.length === 0) return experiences;

  const anchorIndices: number[] = [];
  for (let i = 0; i < expLines.length; i++) {
    if (DATE_RANGE_REGEX.test(expLines[i])) {
      anchorIndices.push(i);
    }
  }

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

    const leftContent = anchorLine.replace(DATE_RANGE_REGEX, '').replace(/^[|•·⁃◦*-]\s*|[|•·⁃◦*-]\s*$/g, '').trim();
    let position = '';
    let company = '';
    let consumedNextLine = false;

    // Check if left content has both title and company
    if (leftContent) {
      const res = splitTitleAndCompany(leftContent);
      if (res.position && res.company) {
        position = res.position;
        company = res.company;
      } else if (res.position) {
        position = res.position;
      } else if (res.company) {
        company = res.company;
      }
    }

    // Check next line for title or company if not both resolved
    const nextLineIdx = anchorIdx + 1;
    const nextAnchor = a + 1 < anchorIndices.length ? anchorIndices[a + 1] : expLines.length;

    if (nextLineIdx < nextAnchor && (!position || !company)) {
      const nextLineText = expLines[nextLineIdx].trim();
      const isNextBullet = /^[•·⁃◦*]\s*|^\-\s+/.test(nextLineText);
      const isNextDate = DATE_RANGE_REGEX.test(nextLineText);

      if (!isNextBullet && !isNextDate && nextLineText.length < 70) {
        if (!position && ROLE_WORDS.test(nextLineText)) {
          position = nextLineText;
          consumedNextLine = true;
        } else if (!company && !ROLE_WORDS.test(nextLineText)) {
          company = nextLineText;
          consumedNextLine = true;
        }
      }
    }

    // If still missing company or position, inspect line immediately above
    const prevAnchor = a > 0 ? anchorIndices[a - 1] : -1;
    const lineAboveIdx = anchorIdx - 1;
    if (lineAboveIdx > prevAnchor && (!position || !company)) {
      const lineAboveText = expLines[lineAboveIdx].trim();
      const isAboveBullet = /^[•·⁃◦*]\s*|^\-\s+/.test(lineAboveText);
      if (!isAboveBullet && lineAboveText.length < 70) {
        if (!position && ROLE_WORDS.test(lineAboveText)) {
          position = lineAboveText;
        } else if (!company && !ROLE_WORDS.test(lineAboveText)) {
          company = lineAboveText;
        }
      }
    }

    // Collect bullets: starting from after consumed lines up to next anchor
    const bulletStart = consumedNextLine ? anchorIdx + 2 : anchorIdx + 1;
    const highlights: string[] = [];

    for (let b = bulletStart; b < nextAnchor; b++) {
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

export function fallbackRegexParser(
  rawText: string,
  fileName?: string,
  extractedLines?: ExtractedPdfLine[]
): Partial<ResumeData> {
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

  // Name: largest-font line on page 1 with 2-4 alphabetic words; strip institution tokens
  let fullName = '';
  let nameSource: 'detected' | 'from file name' | undefined = undefined;

  if (extractedLines && extractedLines.length > 0) {
    const page1Lines = extractedLines.filter((l) => l.page === 1);
    let maxFont = -1;
    for (const l of page1Lines) {
      const lineText = l.leftText || l.text;
      const cand = isValidNameCandidate(lineText);
      if (cand.valid) {
        if (l.fontSize > maxFont) {
          maxFont = l.fontSize;
          fullName = cand.name;
          nameSource = 'detected';
        }
      }
    }
  }

  if (!fullName) {
    for (const line of lines) {
      const cand = isValidNameCandidate(line);
      if (cand.valid) {
        fullName = cand.name;
        nameSource = 'detected';
        break;
      }
    }
  }

  // Fallback: derive from uploaded file name if it yields 2-4 capitalized words
  if (!fullName && fileName) {
    const humanized = humanizeFileName(fileName);
    const fileWords = humanized.split(/\s+/).filter(Boolean);
    if (fileWords.length >= 2 && fileWords.length <= 4 && fileWords.every((w) => /^[a-zA-Z]+$/.test(w))) {
      fullName = humanized;
      nameSource = 'from file name';
    }
  }

  // Location: "City, State/Country" only, name tokens removed
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
    locCand = locCand.replace(/\b\d+\b/g, '').replace(/^[,\s-]+|[,\s-]+$/g, '').trim();
    if (locCand && locCand.includes(',') && !INSTITUTION_REG.test(locCand) && !/company|resume|experience|university|college/i.test(locCand)) {
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

  // Summary
  const summary = sectionBuckets.summary.length > 0 ? sectionBuckets.summary.join(' ').trim() : '';

  // Experience: anchored on date ranges
  const experience = parseExperienceEntries(sectionBuckets.experience);

  // Target title: line directly under name if not contact or skill list; else latest experience title; never a lone skill like "Python"
  let jobTitle = '';
  if (fullName) {
    const nameIdx = lines.findIndex((l) => l.includes(fullName));
    if (nameIdx !== -1 && nameIdx + 1 < lines.length) {
      const candidateLine = lines[nameIdx + 1].trim();
      const isContact = /\d|@|https?:\/\/|www\.|\.(com|org|net|edu|io|dev)\b/i.test(candidateLine);
      const isHeading = isSectionHeadingOrKeyword(candidateLine);
      const isInstitution = INSTITUTION_REG.test(candidateLine);
      const isLocation = /^[A-Za-z\s.-]+,\s*[A-Za-z\s.-]+$/.test(candidateLine);
      const isSkillList = candidateLine.includes(',') || candidateLine.includes('|') || candidateLine.includes(';') || candidateLine.split(/\s+/).length > 6;
      const isSkill = isLoneSkill(candidateLine);

      if (candidateLine && !isContact && !isHeading && !isInstitution && !isLocation && !isSkillList && !isSkill) {
        jobTitle = candidateLine;
      }
    }
  }

  if (!jobTitle) {
    for (const line of lines) {
      const match = line.match(/^(?:objective|target\s+title|role|title)\s*[:|-]\s*(.+)$/i);
      if (match && match[1].trim().length < 60) {
        const t = match[1].trim();
        if (!isLoneSkill(t)) {
          jobTitle = t;
          break;
        }
      }
    }
  }

  if (!jobTitle && experience.length > 0 && experience[0].position?.trim()) {
    const expPos = experience[0].position.trim();
    if (!isLoneSkill(expPos)) {
      jobTitle = expPos;
    }
  }

  if (!jobTitle && summary) {
    const roleKeywordsMatch = summary.match(/\b(full\s*stack(?:\s+developer|\s+engineer)?|frontend(?:\s+developer|\s+engineer)?|backend(?:\s+developer|\s+engineer)?|software(?:\s+developer|\s+engineer)?|mern(?:\s+stack)?(?:\s+developer)?|data\s+scientist|machine\s+learning\s+engineer|devops\s+engineer|mobile\s+developer|ai\s+engineer)\b/i);
    if (roleKeywordsMatch) {
      const matched = roleKeywordsMatch[0].trim();
      const derived = matched.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      if (!isLoneSkill(derived)) {
        jobTitle = derived;
      }
    }
  }

  // Education parsing
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

  // Skills parsing: ONLY from the Skills section
  // Split on , | bullet ; newline, trim, dedupe, drop labels ending ":" and items > 4 words
  const skills: any[] = [];
  const extractedSkillItems: string[] = [];

  if (sectionBuckets.skills.length > 0) {
    for (const sLine of sectionBuckets.skills) {
      const rawTokens = sLine.split(/[,|;•·⁃◦*\n\r]+/).map((s) => s.trim()).filter(Boolean);
      for (let token of rawTokens) {
        if (token.endsWith(':')) continue;
        if (token.includes(':')) {
          const parts = token.split(':');
          token = parts.slice(1).join(':').trim();
        }
        token = token.replace(/^[•·⁃◦*-]\s*|[•·⁃◦*-]\s*$/g, '').trim();
        if (!token) continue;
        const words = token.split(/\s+/).filter(Boolean);
        if (words.length > 4) continue;
        if (token.length < 2 || token.length > 40) continue;
        extractedSkillItems.push(token);
      }
    }
  }

  const seenSkills = new Set<string>();
  const finalSkills: string[] = [];
  for (const sk of extractedSkillItems) {
    const lower = sk.toLowerCase();
    if (!seenSkills.has(lower)) {
      seenSkills.add(lower);
      finalSkills.push(sk);
    }
  }

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

/**
 * Computes section and overall confidence from the final parsed resume object.
 * 0% only if 0 entries. PersonalInfo = (name,email,phone,location,title)/5, name from file name counts 0.5.
 * Overall never 100% if Check items exist.
 */
export function calculateConfidence(
  data: Partial<ResumeData>,
  hasCheckItems = false
): Record<string, number> {
  const confidence: Record<string, number> = {};

  // PersonalInfo = (name, email, phone, location, title)/5; name from file name = 0.5
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

  // Experience: ratio of entries having title+company+(startDate OR endDate) / total entries; 0% if empty
  const exp = data.experience || [];
  if (exp.length === 0) {
    confidence['experience'] = 0;
  } else {
    const valid = exp.filter(
      (e) => Boolean(e.position?.trim()) && Boolean(e.company?.trim()) && (Boolean(e.startDate?.trim()) || Boolean(e.endDate?.trim()))
    ).length;
    confidence['experience'] = Math.round((valid / exp.length) * 100);
  }

  // Education: entries with degree+school / total; 0% if empty
  const edu = data.education || [];
  if (edu.length === 0) {
    confidence['education'] = 0;
  } else {
    const valid = edu.filter((e) => Boolean(e.degree?.trim()) && Boolean(e.institution?.trim())).length;
    confidence['education'] = Math.round((valid / edu.length) * 100);
  }

  // Skills: min(count/8, 1); 0% if empty
  const totalSkills = data.skills?.reduce((acc, c) => acc + (c.skills?.length || 0), 0) || 0;
  if (totalSkills === 0) {
    confidence['skills'] = 0;
  } else {
    confidence['skills'] = Math.round(Math.min(totalSkills / 8, 1) * 100);
  }

  // Projects: entries with title+bullet / total; 0% if empty
  const projs = data.projects || [];
  if (projs.length === 0) {
    confidence['projects'] = 0;
  } else {
    const valid = projs.filter(
      (p) => Boolean(p.name?.trim()) && (p.highlights?.length || 0) >= 1
    ).length;
    confidence['projects'] = Math.round((valid / projs.length) * 100);
  }

  // Overall: average of sections present in the resume. Never show 100% if any Check item exists.
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
  const { rawText, method, jsonData, extractedLines } = await parseResumeFile(file);

  if (jsonData && jsonData.personalInfo) {
    const confidence = calculateConfidence(jsonData);
    return {
      data: jsonData,
      confidence,
      rawText,
      method,
    };
  }

  const { data, fallbackNotice, isAiFallback } = await structureResumeWithGemini(
    rawText,
    abortSignal,
    file.name,
    extractedLines
  );

  const confidence = calculateConfidence(data);

  return {
    data,
    confidence,
    rawText,
    method,
    fallbackNotice,
    isAiFallback,
  };
}
