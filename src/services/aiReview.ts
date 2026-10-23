import type { ResumeData } from '../types/resume';
import { generate } from '../lib/gemini';

export interface AIReviewSuggestion {
  id: string;
  section: 'summary' | 'experience' | 'skills';
  targetType: 'summary' | 'bullet' | 'skill';
  title: string;
  before: string;
  after: string;
  explanation: string;
  expIdx?: number;
  bulletIdx?: number;
  skillName?: string;
}

export interface AIReviewValidationResult {
  valid: boolean;
  reason?: string;
}

export interface AIReviewResult {
  accepted: AIReviewSuggestion[];
  rejected: { suggestion: any; reason: string }[];
}

export const AI_REVIEW_SCHEMA = {
  type: 'OBJECT',
  properties: {
    suggestions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          section: { type: 'STRING' },
          targetType: { type: 'STRING' },
          title: { type: 'STRING' },
          before: { type: 'STRING' },
          after: { type: 'STRING' },
          explanation: { type: 'STRING' },
          expIdx: { type: 'INTEGER' },
          bulletIdx: { type: 'INTEGER' },
          skillName: { type: 'STRING' },
        },
        required: ['section', 'targetType', 'title', 'before', 'after'],
      },
    },
  },
  required: ['suggestions'],
};

/**
 * Validates a single AI review suggestion:
 * - Rejects any placeholders (e.g. [X], [Metric], [Company], [Domain]).
 * - Rejects hallucinated years/dates that do not exist in the source resume.
 * - Rejects empty or identical changes.
 * - Validates length (summary 20-90 words, bullet <= 60 words, skill <= 4 words).
 */
export function validateAIReviewSuggestion(
  suggestion: Partial<AIReviewSuggestion>,
  sourceResume: ResumeData
): AIReviewValidationResult {
  if (!suggestion || !suggestion.after || !suggestion.after.trim()) {
    return { valid: false, reason: 'Empty proposed text' };
  }

  const after = suggestion.after.trim();
  const before = (suggestion.before || '').trim();

  // 1. Check for placeholders like [X], [Metric], [Domain], etc.
  if (/\[[a-zA-Z0-9_\s%]+\]/.test(after)) {
    return { valid: false, reason: 'Contains placeholder brackets like [X]' };
  }

  // 2. Reject no-op changes
  if (before && after.toLowerCase() === before.toLowerCase()) {
    return { valid: false, reason: 'Proposed text identical to current text' };
  }

  // 3. Hallucination check for dates/years
  const sourceText = JSON.stringify(sourceResume);
  const yearsInProposed = after.match(/\b(19\d\d|20\d\d)\b/g) || [];
  for (const year of yearsInProposed) {
    if (!sourceText.includes(year)) {
      return { valid: false, reason: `Hallucinated year/date (${year}) not present in source resume` };
    }
  }

  // 4. Section-specific bounds
  const section = suggestion.section || suggestion.targetType;
  if (section === 'summary' || suggestion.targetType === 'summary') {
    const wordCount = after.split(/\s+/).length;
    if (wordCount < 20 || wordCount > 90) {
      return { valid: false, reason: `Summary word count (${wordCount}) outside 20-90 words limit` };
    }
  } else if (section === 'skills' || suggestion.targetType === 'skill') {
    const wordCount = after.split(/\s+/).length;
    if (wordCount > 4) {
      return { valid: false, reason: `Skill phrase (${wordCount} words) exceeds 4 words limit` };
    }
  } else {
    // Bullet points
    const wordCount = after.split(/\s+/).length;
    if (wordCount > 60) {
      return { valid: false, reason: `Bullet point (${wordCount} words) exceeds 60 words limit` };
    }
  }

  return { valid: true };
}

/**
 * Executes AI resume review:
 * - Produces 3-5 concrete suggestions across summary, bullets, and skills.
 * - Validates each suggestion and filters out invalid or hallucinated entries.
 */
export async function reviewResumeWithAI(
  resume: ResumeData,
  signal?: AbortSignal
): Promise<AIReviewResult> {
  const jobTitle = resume.personalInfo?.jobTitle || 'Professional';
  const summary = resume.summary || '';
  const skillsList = resume.skills?.flatMap((s) => s.skills) || [];
  const experiences = (resume.experience || []).map((e, idx) => ({
    expIdx: idx,
    company: e.company,
    position: e.position,
    highlights: e.highlights || [],
  }));

  const prompt = `You are an expert executive resume reviewer. Analyze this candidate's resume and generate 3 to 5 concrete, high-impact improvements.

Candidate Target Title: ${jobTitle}
Current Summary:
"${summary}"

Skills:
${skillsList.slice(0, 20).join(', ')}

Experience:
${JSON.stringify(experiences, null, 2)}

Requirements:
1. Provide concrete improvements across summary, experience bullets, and skills.
2. For experience bullets: refer to the exact expIdx and bulletIdx. The 'before' text MUST match the existing bullet verbatim.
3. For summary: improve clarity and metric impact. 'before' must match current summary.
4. For skills: propose a high-demand relevant skill to add if missing from candidate's skills.
5. NEVER invent fictional employers, new degree years, or placeholders like [X] or [Metric]. Keep all facts truthful.
6. Output raw JSON adhering to the provided schema.`;

  const res = await generate(prompt, {
    signal,
    responseMimeType: 'application/json',
    responseSchema: AI_REVIEW_SCHEMA,
  });

  if (!res.ok || !res.text) {
    throw new Error(res.message || 'AI review failed');
  }

  let parsed: any;
  try {
    const cleanJson = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(cleanJson);
  } catch (err: any) {
    throw new Error('Failed to parse AI review JSON: ' + err.message);
  }

  const rawSuggestions: any[] = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  const accepted: AIReviewSuggestion[] = [];
  const rejected: { suggestion: any; reason: string }[] = [];

  rawSuggestions.forEach((s, idx) => {
    const suggestion: AIReviewSuggestion = {
      id: `ai-rev-${Date.now()}-${idx}`,
      section: s.section === 'summary' ? 'summary' : s.section === 'skills' ? 'skills' : 'experience',
      targetType: s.targetType === 'summary' ? 'summary' : s.targetType === 'skill' ? 'skill' : 'bullet',
      title: s.title || 'AI Improvement',
      before: s.before || '',
      after: s.after || '',
      explanation: s.explanation || 'Enhanced for ATS impact and clarity.',
      expIdx: typeof s.expIdx === 'number' ? s.expIdx : undefined,
      bulletIdx: typeof s.bulletIdx === 'number' ? s.bulletIdx : undefined,
      skillName: s.skillName || (s.targetType === 'skill' ? s.after : undefined),
    };

    const validation = validateAIReviewSuggestion(suggestion, resume);
    if (validation.valid) {
      accepted.push(suggestion);
    } else {
      rejected.push({ suggestion, reason: validation.reason || 'Validation failed' });
    }
  });

  return { accepted, rejected };
}
