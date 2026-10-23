import type { ResumeData } from '../types/resume';
import {
  extractLinesFromPdf,
  extractLinesFromDocx,
  extractLinesFromPlainText,
} from '../lib/import/extract';
import { groupLinesIntoSections } from '../lib/import/sections';
import {
  parseHeader,
  parseExperience,
  parseEducation,
  parseSkills,
  parseProjects,
  parseCertifications,
} from '../lib/import/parse';
import { calculateConfidenceAndCounts } from '../lib/import/confidence';
import { generate, RESUME_DATA_RESPONSE_SCHEMA, getKey } from '../lib/gemini';
import type { Line, ParsedImportResult } from '../lib/import/types';

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
  extractedLines?: Line[];
}

export type ParsedResumeResult = ParsedImportResult;

export interface StructureResult {
  data: Partial<ResumeData>;
  fallbackNotice?: string;
  isAiFallback?: boolean;
  modelUsed?: string;
}

/**
 * Extracts lines and text from a user-uploaded resume file.
 */
export async function parseResumeFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'json' || file.type === 'application/json') {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed.personalInfo || parsed.experience || parsed.education || parsed.skills) {
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
      const lines = await extractLinesFromPdf(arrayBuffer);
      const rawText = lines.map((l) => l.text).join('\n').trim();
      return { rawText, method: 'pdf', extractedLines: lines };
    } catch (err) {
      console.error('Failed to extract text from PDF:', err);
      throw new Error('Could not parse PDF content. Please ensure the file is not password-protected.');
    }
  }

  if (
    extension === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const lines = await extractLinesFromDocx(arrayBuffer);
      const rawText = lines.map((l) => l.text).join('\n').trim();
      return { rawText, method: 'docx', extractedLines: lines };
    } catch (err) {
      console.error('Failed to extract text from DOCX:', err);
      throw new Error('Could not parse Word document content.');
    }
  }

  // Fallback for TXT and other text formats
  const text = await file.text();
  const lines = extractLinesFromPlainText(text);
  return { rawText: text.trim(), method: 'txt', extractedLines: lines };
}

/**
 * Pure offline parser combining section grouping and dedicated parsers.
 */
export function fallbackRegexParser(
  rawText: string,
  _fileName?: string,
  extractedLines?: Line[]
): Partial<ResumeData> {
  const lines = extractedLines && extractedLines.length > 0 ? extractedLines : extractLinesFromPlainText(rawText);
  const sections = groupLinesIntoSections(lines);

  const personalInfo = parseHeader(sections.header, sections.rawText);
  const summary = sections.summary.map((l) => l.text).join(' ').trim();
  const experience = parseExperience(sections.experience);
  const education = parseEducation(sections.education);
  const skills = parseSkills(sections.skills);
  const projects = parseProjects(sections.projects);
  const certifications = parseCertifications(sections.certifications);

  // If personalInfo didn't detect target job title, fallback to latest experience title
  if (!personalInfo.jobTitle && experience.length > 0 && experience[0].position) {
    personalInfo.jobTitle = experience[0].position;
  }

  return {
    personalInfo,
    summary,
    experience,
    education,
    skills,
    projects,
    certifications,
    customSections: [],
  };
}

/**
 * Merges AI data into offline data: AI wins per field only if it passes validators;
 * offline result fills the rest.
 */
function mergeWithAiData(
  offline: Partial<ResumeData>,
  ai: Partial<ResumeData>
): Partial<ResumeData> {
  const mergedPi: ResumeData['personalInfo'] = {
    fullName: offline.personalInfo?.fullName || '',
    jobTitle: offline.personalInfo?.jobTitle || '',
    email: offline.personalInfo?.email || '',
    phone: offline.personalInfo?.phone || '',
    location: offline.personalInfo?.location || '',
    website: offline.personalInfo?.website || '',
    linkedin: offline.personalInfo?.linkedin || '',
    github: offline.personalInfo?.github || '',
  };
  if (ai.personalInfo) {
    // Only accept non-empty valid strings
    if (ai.personalInfo.fullName && ai.personalInfo.fullName.trim().split(/\s+/).length >= 2) {
      mergedPi.fullName = ai.personalInfo.fullName.trim();
    }
    if (ai.personalInfo.jobTitle && ai.personalInfo.jobTitle.trim()) {
      mergedPi.jobTitle = ai.personalInfo.jobTitle.trim();
    }
    if (ai.personalInfo.email && ai.personalInfo.email.includes('@')) {
      mergedPi.email = ai.personalInfo.email.trim();
    }
    if (ai.personalInfo.phone && ai.personalInfo.phone.trim()) {
      mergedPi.phone = ai.personalInfo.phone.trim();
    }
    if (ai.personalInfo.location && ai.personalInfo.location.trim()) {
      mergedPi.location = ai.personalInfo.location.trim();
    }
    if (ai.personalInfo.website && ai.personalInfo.website.trim()) {
      mergedPi.website = ai.personalInfo.website.trim();
    }
    if (ai.personalInfo.linkedin && ai.personalInfo.linkedin.trim()) {
      mergedPi.linkedin = ai.personalInfo.linkedin.trim();
    }
    if (ai.personalInfo.github && ai.personalInfo.github.trim()) {
      mergedPi.github = ai.personalInfo.github.trim();
    }
  }

  const mergedSummary = (ai.summary && ai.summary.trim().length > 30) ? ai.summary.trim() : (offline.summary || '');

  let mergedExp = offline.experience || [];
  if (Array.isArray(ai.experience) && ai.experience.length > 0) {
    const validAiExp = ai.experience.filter((e) => e.company?.trim() && e.position?.trim());
    if (validAiExp.length >= mergedExp.length) {
      mergedExp = validAiExp.map((e, idx) => ({
        id: e.id || `exp-ai-${idx}`,
        company: e.company.trim(),
        position: e.position.trim(),
        location: e.location?.trim() || '',
        startDate: e.startDate?.trim() || '',
        endDate: e.endDate?.trim() || '',
        current: Boolean(e.current),
        highlights: Array.isArray(e.highlights) ? e.highlights.filter(Boolean) : [],
      }));
    }
  }

  let mergedEdu = offline.education || [];
  if (Array.isArray(ai.education) && ai.education.length > 0) {
    const validAiEdu = ai.education.filter((ed) => ed.institution?.trim() || ed.degree?.trim());
    if (validAiEdu.length >= mergedEdu.length) {
      mergedEdu = validAiEdu.map((ed, idx) => ({
        id: ed.id || `edu-ai-${idx}`,
        institution: ed.institution?.trim() || '',
        degree: ed.degree?.trim() || '',
        fieldOfStudy: ed.fieldOfStudy?.trim() || '',
        location: ed.location?.trim() || '',
        startDate: ed.startDate?.trim() || '',
        endDate: ed.endDate?.trim() || '',
        grade: ed.grade?.trim() || '',
      }));
    }
  }

  let mergedSkills = offline.skills || [];
  if (Array.isArray(ai.skills) && ai.skills.length > 0) {
    const validAiSkills = ai.skills
      .map((s, idx) => ({
        id: s.id || `skill-ai-${idx}`,
        name: s.name?.trim() || 'Core Skills',
        skills: Array.isArray(s.skills)
          ? s.skills.filter((sk) => typeof sk === 'string' && sk.trim() && sk.split(/\s+/).length <= 4)
          : [],
      }))
      .filter((s) => s.skills.length > 0);
    if (validAiSkills.length > 0) {
      mergedSkills = validAiSkills;
    }
  }

  let mergedProjects = offline.projects || [];
  if (Array.isArray(ai.projects) && ai.projects.length > 0) {
    const validAiProjects = ai.projects.filter((p) => p.name?.trim());
    if (validAiProjects.length >= mergedProjects.length) {
      mergedProjects = validAiProjects.map((p, idx) => ({
        id: p.id || `proj-ai-${idx}`,
        name: p.name.trim(),
        description: p.description?.trim() || '',
        technologies: Array.isArray(p.technologies) ? p.technologies.filter(Boolean) : [],
        link: p.link?.trim() || '',
        githubLink: p.githubLink?.trim() || '',
        highlights: Array.isArray(p.highlights) ? p.highlights.filter(Boolean) : [],
      }));
    }
  }

  let mergedCerts = offline.certifications || [];
  if (Array.isArray(ai.certifications) && ai.certifications.length > 0) {
    const validCerts = ai.certifications.filter((c) => c.name?.trim());
    if (validCerts.length > 0) {
      mergedCerts = validCerts.map((c, idx) => ({
        id: c.id || `cert-ai-${idx}`,
        name: c.name.trim(),
        issuer: c.issuer?.trim() || '',
        date: c.date?.trim() || '',
        credentialId: '',
        url: '',
      }));
    }
  }

  return {
    personalInfo: mergedPi,
    summary: mergedSummary,
    experience: mergedExp,
    education: mergedEdu,
    skills: mergedSkills,
    projects: mergedProjects,
    certifications: mergedCerts,
    customSections: [],
  };
}

/**
 * Structures resume with Gemini AI if API key is present; otherwise returns offline data.
 */
export async function structureResumeWithGemini(
  rawText: string,
  externalSignal?: AbortSignal,
  fileName?: string,
  extractedLines?: Line[]
): Promise<StructureResult> {
  const offlineData = fallbackRegexParser(rawText, fileName, extractedLines);

  const apiKey = getKey();
  if (!apiKey) {
    return {
      data: offlineData,
      fallbackNotice: 'No API key set',
      isAiFallback: true,
    };
  }

  const prompt = `You are a professional resume parser. Extract information from the following resume text into a JSON object matching the schema.

Resume Text:
${rawText}`;

  const res = await generate(prompt, {
    signal: externalSignal,
    responseMimeType: 'application/json',
    responseSchema: RESUME_DATA_RESPONSE_SCHEMA,
  });

  if (res.ok && res.text) {
    try {
      const cleanJson = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedAi = JSON.parse(cleanJson);
      const merged = mergeWithAiData(offlineData, parsedAi);
      return {
        data: merged,
        isAiFallback: false,
        modelUsed: res.modelUsed,
      };
    } catch (e) {
      console.error('Failed to parse Gemini response JSON:', e);
    }
  }

  return {
    data: offlineData,
    fallbackNotice: res.message || 'AI unavailable',
    isAiFallback: true,
    modelUsed: res.modelUsed,
  };
}

/**
 * Main entry point: Parses and structures a resume file (combines extraction, parsing, AI fallback, confidence).
 */
export async function parseAndStructureResume(
  file: File,
  signal?: AbortSignal
): Promise<ParsedResumeResult> {
  const parseResult = await parseResumeFile(file);

  if (parseResult.method === 'json' && parseResult.jsonData) {
    const { confidence, counts } = calculateConfidenceAndCounts(parseResult.jsonData);
    return {
      data: parseResult.jsonData,
      confidence,
      counts,
      rawText: parseResult.rawText,
      lines: parseResult.extractedLines || [],
      method: 'json',
    };
  }

  const structureResult = await structureResumeWithGemini(
    parseResult.rawText,
    signal,
    file.name,
    parseResult.extractedLines
  );

  const { confidence, counts } = calculateConfidenceAndCounts(structureResult.data);

  return {
    data: structureResult.data,
    confidence,
    counts,
    rawText: parseResult.rawText,
    lines: parseResult.extractedLines || [],
    method: parseResult.method,
    fallbackNotice: structureResult.fallbackNotice,
    isAiFallback: structureResult.isAiFallback,
    modelUsed: structureResult.modelUsed,
  };
}

export function calculateConfidence(
  data: Partial<ResumeData>,
  _hasCheckItems?: boolean
): Record<string, number> {
  return calculateConfidenceAndCounts(data).confidence;
}
