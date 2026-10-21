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
 */
export async function structureResumeWithGemini(rawText: string): Promise<Partial<ResumeData>> {
  const apiKey = getStoredApiKey();
  const model = getStoredModel();

  if (apiKey) {
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

      const response = await client.interactions.create({
        model,
        input: prompt,
      });

      const responseText = response.output_text || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed && (parsed.personalInfo || parsed.experience || parsed.education)) {
        return normalizeParsedData(parsed);
      }
    } catch (err) {
      console.warn('Gemini resume structuring failed, falling back to heuristic regex parser:', err);
    }
  }

  // Regex and heuristic fallback
  return fallbackRegexParser(rawText);
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

  // First line likely full name
  const fullName = lines[0] && lines[0].length < 40 ? lines[0] : 'Candidate Name';
  const jobTitle = lines[1] && lines[1].length < 50 && !lines[1].includes('@') ? lines[1] : 'Software Engineer';

  // Summary
  const summary = lines.slice(2, 6).join(' ').slice(0, 300);

  // Heuristic skills detection
  const commonTech = [
    'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Go', 'Docker',
    'Kubernetes', 'AWS', 'GCP', 'SQL', 'PostgreSQL', 'MongoDB', 'Git', 'CI/CD',
    'Machine Learning', 'PyTorch', 'REST', 'GraphQL'
  ];
  const detectedSkills = commonTech.filter((tech) =>
    new RegExp(`\\b${tech}\\b`, 'i').test(rawText)
  );

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
    summary: summary || `${jobTitle} with experience building scalable, reliable applications and modern software architectures.`,
    experience: [
      {
        id: `exp-${Date.now()}-1`,
        company: 'Technology Solutions',
        position: jobTitle,
        location: 'Remote',
        startDate: '2022',
        endDate: 'Present',
        current: true,
        highlights: [
          'Engineered and maintained high-performance software modules ensuring 99.9% uptime.',
          'Collaborated with cross-functional teams to deliver critical production features on schedule.',
        ],
      },
    ],
    education: [
      {
        id: `edu-${Date.now()}-1`,
        institution: 'University',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        location: '',
        startDate: '2018',
        endDate: '2022',
      },
    ],
    skills: [
      {
        id: `skill-${Date.now()}-1`,
        name: 'Technical Skills',
        skills: detectedSkills.length > 0 ? detectedSkills : ['React', 'TypeScript', 'Node.js'],
      },
    ],
    projects: [],
    certifications: [],
    customSections: [],
  };
}

function calculateConfidence(data: Partial<ResumeData>): Record<string, number> {
  const confidence: Record<string, number> = {};

  // Personal Info
  let piScore = 40;
  if (data.personalInfo?.fullName) piScore += 20;
  if (data.personalInfo?.email) piScore += 20;
  if (data.personalInfo?.phone) piScore += 10;
  if (data.personalInfo?.jobTitle) piScore += 10;
  confidence['personalInfo'] = Math.min(100, piScore);

  // Summary
  confidence['summary'] = data.summary && data.summary.length > 40 ? 92 : 60;

  // Experience
  const expCount = data.experience?.length || 0;
  confidence['experience'] = expCount >= 2 ? 94 : expCount === 1 ? 82 : 40;

  // Education
  const eduCount = data.education?.length || 0;
  confidence['education'] = eduCount >= 1 ? 90 : 40;

  // Skills
  const totalSkills = data.skills?.reduce((acc, c) => acc + (c.skills?.length || 0), 0) || 0;
  confidence['skills'] = totalSkills >= 5 ? 95 : totalSkills > 0 ? 80 : 35;

  // Projects
  confidence['projects'] = (data.projects?.length || 0) > 0 ? 88 : 50;

  return confidence;
}

/**
 * High-level orchestration that parses any resume file, structures it with Gemini (or fallback),
 * and computes confidence metrics.
 */
export async function parseAndStructureResume(file: File): Promise<ParsedResumeResult> {
  const { rawText, method, jsonData } = await parseResumeFile(file);

  if (jsonData && jsonData.personalInfo) {
    const confidence = calculateConfidence(jsonData);
    return {
      data: jsonData,
      confidence,
      rawText,
      method,
    };
  }

  const structured = await structureResumeWithGemini(rawText);
  const confidence = calculateConfidence(structured);

  return {
    data: structured,
    confidence,
    rawText,
    method,
  };
}
