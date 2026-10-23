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
  modelUsed?: string;
}

export const FLUFF_PHRASES = [
  'proven track record',
  'results-driven',
  'results driven',
  'performance-driven',
  'performance driven',
  'dynamic',
  'passionate',
  'seasoned',
  'expert',
  'world-class',
  'world class',
  'cutting-edge',
  'cutting edge',
  'spearheaded',
] as const;

export const KNOWN_TECH_KEYWORDS = [
  'docker', 'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'graphql', 'kafka', 'redis',
  'terraform', 'vue', 'vue.js', 'angular', 'pytorch', 'tensorflow', 'jenkins', 'ci/cd',
  'golang', 'rust', 'c++', 'c#', 'ruby', 'rails', 'django', 'flask', 'fastapi',
  'snowflake', 'bigquery', 'hadoop', 'spark', 'elasticsearch', 'ansible', 'linux',
  'tableau', 'power bi', 'excel', 'pandas', 'numpy', 'scikit-learn', 'react', 'react.js',
  'node', 'node.js', 'express', 'express.js', 'mongodb', 'mysql', 'postgresql', 'sql',
  'python', 'javascript', 'typescript', 'java', 'html', 'css', 'tailwind', 'git', 'github'
];

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

function countSentences(text: string): number {
  return text
    .trim()
    .split(/[.!?]+(?:\s+|$)/)
    .filter((s) => s.trim().length > 0).length;
}

/**
 * Strict validator for AI review suggestions:
 * - Reject if "after" contains any number not in full resume text.
 * - Reject if "after" contains technology/tool, employer, institution or title word not in resume text.
 * - Reject if upgrades role/seniority: if resume has "Intern", "Undergraduate", or "Student",
 *   "after" must not drop them, must not add Analyst/Engineer/Developer/Senior/Lead as standalone,
 *   and must not claim years of experience.
 * - Reject if contains fluff phrases not in original:
 *   proven track record, results-driven, performance-driven, dynamic, passionate, seasoned,
 *   expert, world-class, cutting-edge, spearheaded.
 * - Reject if changes summary sentence count by more than 1.
 * - Reject placeholders like [X], [Metric].
 */
export function validateAIReviewSuggestion(
  suggestion: Partial<AIReviewSuggestion>,
  sourceResume: ResumeData
): AIReviewValidationResult {
  if (!suggestion || !suggestion.after || !suggestion.after.trim()) {
    return { valid: false, reason: 'Empty proposed text' };
  }

  const after = suggestion.after.trim();
  const afterLower = after.toLowerCase();
  const before = (suggestion.before || '').trim();
  const beforeLower = before.toLowerCase();

  const sourceText = JSON.stringify(sourceResume);
  const sourceLower = sourceText.toLowerCase();

  // 1. Check for placeholders like [X], [Metric], [Domain], etc.
  if (/\[[a-zA-Z0-9_\s%]+\]/.test(after)) {
    return { valid: false, reason: 'Contains placeholder brackets like [X]' };
  }

  // 2. Reject no-op changes
  if (before && afterLower === beforeLower) {
    return { valid: false, reason: 'Proposed text identical to current text' };
  }

  // 3. Reject fluff phrases not present in original before text
  for (const phrase of FLUFF_PHRASES) {
    if (afterLower.includes(phrase) && !beforeLower.includes(phrase)) {
      return { valid: false, reason: `Contains fluff phrase not in original: "${phrase}"` };
    }
  }

  // 4. Numbers check: Any number in "after" must appear in the full resume text
  const numbersInAfter = after.match(/\b\d+(?:[.,]\d+)?%?\b/g) || [];
  for (const numToken of numbersInAfter) {
    const rawDigits = numToken.replace(/[^0-9]/g, '');
    if (rawDigits && !sourceText.includes(rawDigits)) {
      const isYear = /^(?:19|20)\d{2}$/.test(rawDigits);
      return {
        valid: false,
        reason: isYear
          ? `Hallucinated year/date (${numToken}) not present in source resume`
          : `Contains number (${numToken}) not present in source resume`,
      };
    }
  }

  // 5. Seniority and role upgrade check
  const hasIntern = /\bintern(?:ship)?\b/i.test(sourceLower);
  const hasUndergrad = /\bundergraduate\b/i.test(sourceLower);
  const hasStudent = /\bstudent\b/i.test(sourceLower);

  if (hasIntern || hasUndergrad || hasStudent) {
    // If original before text had seniority qualifier, "after" must not drop it
    if (/\bundergraduate\b/i.test(beforeLower) && !/\bundergraduate\b/i.test(afterLower)) {
      return { valid: false, reason: 'Seniority dropped: "undergraduate" removed in rewrite' };
    }
    if (/\bintern(?:ship)?\b/i.test(beforeLower) && !/\bintern(?:ship)?\b/i.test(afterLower)) {
      return { valid: false, reason: 'Seniority dropped: "intern" removed in rewrite' };
    }
    if (/\bstudent\b/i.test(beforeLower) && !/\bstudent\b/i.test(afterLower)) {
      return { valid: false, reason: 'Seniority dropped: "student" removed in rewrite' };
    }

    // Must not add Analyst / Engineer / Developer / Senior / Lead as a standalone role claim
    // unless accompanied by intern/undergraduate/student
    const standaloneRoleClaim = /\b(?:senior|lead)\b/i.test(afterLower) ||
      (/\b(?:mern stack developer|data analyst|software engineer|frontend developer|backend developer|full stack developer)\b/i.test(afterLower) &&
       !/\b(?:intern|undergraduate|student)\b/i.test(afterLower));

    if (standaloneRoleClaim && !beforeLower.includes('senior') && !beforeLower.includes('lead')) {
      return { valid: false, reason: 'Role upgrade: inflated role title or standalone role claim without intern/student qualification' };
    }

    // Must not claim years of experience (e.g. "[X] years of experience", "2+ years of experience")
    if (/\b\d+\+?\s+years?(?:\s+of)?\s+experience\b/i.test(afterLower) && !beforeLower.includes('years of experience')) {
      return { valid: false, reason: 'Unsubstantiated years of experience claim for student/intern' };
    }
  }

  // 6. Technology / tool name check: Any known tech word in "after" must appear in the resume
  for (const tech of KNOWN_TECH_KEYWORDS) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const techRegex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:$|[^a-zA-Z0-9_])`, 'i');
    if (techRegex.test(afterLower) && !techRegex.test(sourceLower)) {
      return { valid: false, reason: `Contains technology/tool (${tech}) not present in source resume` };
    }
  }

  // 7. Summary sentence count check: sentence count must not change by more than 1
  const isSummary = suggestion.section === 'summary' || suggestion.targetType === 'summary';
  if (isSummary && before) {
    const beforeSentences = countSentences(before);
    const afterSentences = countSentences(after);
    if (Math.abs(afterSentences - beforeSentences) > 1) {
      return {
        valid: false,
        reason: `Summary sentence count changed by ${Math.abs(afterSentences - beforeSentences)} (from ${beforeSentences} to ${afterSentences}, max allowed diff is 1)`,
      };
    }
  }

  // 8. General length sanity bounds
  if (isSummary) {
    const wordCount = after.split(/\s+/).length;
    if (wordCount < 20 || wordCount > 90) {
      return { valid: false, reason: `Summary word count (${wordCount}) outside 20-90 words limit` };
    }
  } else if (suggestion.section === 'skills' || suggestion.targetType === 'skill') {
    const wordCount = after.split(/\s+/).length;
    if (wordCount > 4) {
      return { valid: false, reason: `Skill phrase (${wordCount} words) exceeds 4 words limit` };
    }
  } else {
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
 * - Strictly keeps seniority words, no title inflation, no fluff phrases.
 * - Validates each suggestion and filters out invalid, hallucinated, or inflated entries.
 */
export async function reviewResumeWithAI(
  resume: ResumeData,
  signal?: AbortSignal
): Promise<AIReviewResult> {
  const jobTitle = resume.personalInfo?.jobTitle || '';
  const summary = resume.summary || '';
  const skillsList = resume.skills?.flatMap((s) => s.skills) || [];
  const experiences = (resume.experience || []).map((e, idx) => ({
    expIdx: idx,
    company: e.company,
    position: e.position,
    highlights: e.highlights || [],
  }));

  const prompt = `You are a strict, truth-enforcing executive resume editor.
Analyze the candidate's resume and generate 3 to 5 high-impact improvements.

STRICT CONSTRAINTS (Violations will be programmatically rejected):
1. NO SENIORITY INFLATION: If the candidate is an "Intern", "Undergraduate", or "Student", YOU MUST KEEP those exact qualifying words. NEVER claim standalone titles like "Developer", "Engineer", "Data Analyst", "Lead", or "Senior".
2. NO YEARS OF EXPERIENCE: Do NOT invent or claim years of experience (e.g., "with 2+ years of experience").
3. NO FLUFF: Absolutely forbidden words/phrases: "proven track record", "results-driven", "performance-driven", "dynamic", "passionate", "seasoned", "expert", "world-class", "cutting-edge", "spearheaded".
4. FACTS ONLY: Every number, metric, technology, tool, employer, and degree MUST come strictly from the provided resume text below. Do NOT introduce unmentioned tools (e.g., Docker, AWS, Kubernetes).
5. SENTENCE COUNT: For summaries, the sentence count must be within +-1 of the original sentence count.
6. FORMAT: For experience bullets, 'before' must match an existing bullet verbatim. Propose active, truthful refinements.

Candidate Target Title: ${jobTitle}
Current Summary:
"${summary}"

Skills in Resume:
${skillsList.join(', ')}

Experience in Resume:
${JSON.stringify(experiences, null, 2)}

Output raw JSON strictly matching the schema.`;

  const res = await generate(prompt, {
    signal,
    responseMimeType: 'application/json',
    responseSchema: AI_REVIEW_SCHEMA,
  });

  if (!res.ok || !res.text) {
    const modelTag = res.modelUsed ? `[${res.modelUsed}] ` : '';
    throw new Error(`${modelTag}${res.message || 'AI review failed'}`);
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
      explanation: s.explanation || 'Enhanced for metric impact and clarity.',
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

  return { accepted, rejected, modelUsed: res.modelUsed };
}
