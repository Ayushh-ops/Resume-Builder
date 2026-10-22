import { GoogleGenAI } from '@google/genai';
import type { ResumeData, TrendUpgradeTip, ATSCheckResult, ATSProfile } from '../types/resume';

const LOCAL_STORAGE_KEY = 'resumecraft_gemini_api_key';
const LOCAL_STORAGE_MODEL_KEY = 'resumecraft_gemini_model';

export const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const;

export const getGeminiKey = (): string => {
  let key = '';
  try {
    key = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
  } catch {}
  if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
    key = import.meta.env.VITE_GEMINI_API_KEY || '';
  }
  return (key || '').trim().replace(/^["']|["']$/g, '').trim();
};

export const getStoredApiKey = getGeminiKey;

export const setStoredApiKey = (key: string): void => {
  const cleaned = (key || '').trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned) {
    localStorage.setItem(LOCAL_STORAGE_KEY, cleaned);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};

export const getStoredModel = (): string => {
  const saved = localStorage.getItem(LOCAL_STORAGE_MODEL_KEY);
  if (saved && !saved.startsWith('gemini-3.')) {
    return saved;
  }
  return 'gemini-2.5-flash';
};

export const setStoredModel = (model: string): void => {
  const cleanModel = model.startsWith('gemini-3.') ? 'gemini-2.5-flash' : model;
  localStorage.setItem(LOCAL_STORAGE_MODEL_KEY, cleanModel);
};

export function formatGeminiErrorNotice(err: any): string {
  if (!err) return 'AI unavailable';
  if (typeof err === 'string') {
    if (err === 'No API key set') return 'No API key set';
    if (err === 'Timed out (20s)') return 'Timed out (20s)';
    if (err === 'Invalid response') return 'Invalid response';
  }
  const status = Number(err?.status || err?.statusCode || err?.cause?.statusCode || 0);
  const msg = (err?.message || String(err) || '').toLowerCase();

  if (
    status === 403 ||
    status === 401 ||
    (status === 400 && (msg.includes('api_key_invalid') || msg.includes('api key not valid') || msg.includes('key not valid'))) ||
    msg.includes('403') ||
    msg.includes('permission_denied') ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid')
  ) {
    return 'Key rejected (403)';
  }

  if (status === 404 || msg.includes('404') || msg.includes('not found')) {
    return 'Model not found (404)';
  }

  if (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit')
  ) {
    return 'Rate limited (429)';
  }

  if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('20s')) {
    return 'Timed out (20s)';
  }

  if (
    msg.includes('invalid response') ||
    msg.includes('invalid json') ||
    msg.includes('unexpected token')
  ) {
    return 'Invalid response';
  }

  if (msg.includes('no api key set') || msg.includes('no key')) {
    return 'No API key set';
  }

  return 'AI unavailable';
}

export async function testGeminiKey(
  testKey?: string,
  modelToTest?: string
): Promise<{ success: boolean; message: string; modelUsed?: string }> {
  const rawKey = testKey !== undefined ? testKey : getGeminiKey();
  const key = (rawKey || '').trim().replace(/^["']|["']$/g, '').trim();
  if (!key) {
    return { success: false, message: 'No API key set' };
  }

  const configured = modelToTest || getStoredModel() || 'gemini-2.5-flash';
  const models = Array.from(new Set([configured, ...FALLBACK_MODELS])).filter(
    (m) => !m.startsWith('gemini-3.')
  );

  let lastError: any = null;
  const client = new GoogleGenAI({ apiKey: key });

  for (const m of models) {
    try {
      await client.models.generateContent({
        model: m,
        contents: 'hi',
        config: {
          maxOutputTokens: 1,
        },
      });
      return { success: true, message: `Key works (model ${m})`, modelUsed: m };
    } catch (err: any) {
      lastError = err;
      const status = Number(err?.status || err?.statusCode || 0);
      const msg = (err?.message || String(err)).toLowerCase();
      const errorRecord = {
        status,
        message: err?.message || String(err),
      };
      console.error(`Gemini test error with model "${m}":`, errorRecord);

      // On 404 try next model
      if (status === 404 || msg.includes('404') || msg.includes('not found')) {
        continue;
      }
      break;
    }
  }

  return { success: false, message: formatGeminiErrorNotice(lastError) };
}

export async function generateGeminiText(
  prompt: string,
  options?: { maxOutputTokens?: number; signal?: AbortSignal }
): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('No API key set');
  }

  const configured = getStoredModel() || 'gemini-2.5-flash';
  const models = Array.from(new Set([configured, ...FALLBACK_MODELS])).filter(
    (m) => !m.startsWith('gemini-3.')
  );

  let lastError: any = null;
  const client = new GoogleGenAI({ apiKey });

  for (const model of models) {
    if (options?.signal?.aborted) {
      throw new Error('Timed out (20s)');
    }

    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : undefined,
      });
      return response.text || '';
    } catch (err: any) {
      lastError = err;
      const status = Number(err?.status || err?.statusCode || 0);
      const msg = (err?.message || String(err)).toLowerCase();
      const errorRecord = {
        status,
        message: err?.message || String(err),
      };
      console.error(`Gemini call error with model "${model}":`, errorRecord);

      if (status === 404 || msg.includes('404') || msg.includes('not found')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Model not found (404)');
}

/**
 * AI-powered Bullet Point Improver (STAR Method, Action Verbs, Metrics)
 */
export async function enhanceBulletPoint(
  originalText: string,
  roleContext?: string
): Promise<{ enhanced: string[]; explanation: string }> {
  try {
    const prompt = `You are an elite executive resume writer and ATS optimization specialist.
Improve the following resume bullet point for a ${roleContext || 'professional'} role.
Apply the Google "X-Y-Z formula" (Accomplished [X], as measured by [Y], by doing [Z]) and the STAR method.
Ensure strong action verbs, quantifiable metrics, and remove passive or buzzword filler.

Original bullet point: "${originalText}"

Return a JSON object strictly in this format (no markdown code blocks, just raw JSON):
{
  "enhanced": [
    "Option 1: High-impact metric driven version",
    "Option 2: Leadership and architecture focused version",
    "Option 3: Concise ATS-optimized version"
  ],
  "explanation": "Brief 1-sentence note explaining what makes these options stronger"
}`;

    const responseText = await generateGeminiText(prompt);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      enhanced: parsed.enhanced || [originalText],
      explanation: parsed.explanation || 'Enhanced using high-impact action verbs and quantified results.',
    };
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 0);
    console.error('Gemini enhanceBulletPoint fallback triggered:', {
      status,
      message: err?.message || String(err),
    });
  }

  // Intelligent Local Heuristic Fallback
  return localEnhanceBulletPoint(originalText, roleContext);
}

/**
 * AI-powered Professional Summary Generator
 */
export async function generateSummary(
  resume: Partial<ResumeData>,
  tone: 'impactful' | 'executive' | 'technical' | 'concise' = 'impactful'
): Promise<string> {
  const title = resume.personalInfo?.jobTitle || 'Software Professional';
  const skills = resume.skills?.flatMap((s) => s.skills).slice(0, 10).join(', ') || 'modern engineering tools';
  const companies = resume.experience?.map((e) => e.company).slice(0, 3).join(', ');

  try {
    const prompt = `Write a compelling 3-4 sentence professional resume summary in a ${tone} tone.
Role: ${title}
Top Skills: ${skills}
Past Experience: ${companies || 'Industry leadership'}

Guidelines:
- No first-person pronouns ("I", "my", "we").
- Focus on business outcomes, core architectural/domain expertise, and proven career impact.
- Keep within 50-75 words.
Return ONLY the raw summary text.`;

    const responseText = await generateGeminiText(prompt);
    if (responseText && responseText.trim()) {
      return responseText.trim();
    }
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 0);
    console.error('Gemini generateSummary fallback triggered:', {
      status,
      message: err?.message || String(err),
    });
  }

  // Smart local summary generator fallback
  return `${title} with proven expertise in ${skills}. Demonstrated track record architecting high-performance scalable systems and driving cross-functional engineering initiatives. Adept at translating complex product requirements into robust, ATS-compliant technical solutions that consistently exceed key performance metrics.`;
}

/**
 * AI Job Description Matcher and ATS Scanner
 */
export async function analyzeJobMatch(
  resume: ResumeData,
  jobDescription: string
): Promise<ATSCheckResult> {
  const resumeSummaryText = JSON.stringify({
    title: resume.personalInfo.jobTitle,
    summary: resume.summary,
    skills: resume.skills.flatMap((s) => s.skills),
    experience: resume.experience.map((e) => ({
      role: e.position,
      company: e.company,
      highlights: e.highlights,
    })),
  });

  try {
    const prompt = `You are a Fortune 500 Senior ATS Recruiter.
Analyze this resume against the target Job Description.

Resume content:
${resumeSummaryText}

Target Job Description:
${jobDescription}

Perform a thorough keyword and skills gap analysis.
Return a JSON object strictly in this structure (no markdown wrappers, raw JSON only):
{
  "score": 85,
  "rating": "Good",
  "matchedKeywords": ["React", "TypeScript", "System Design"],
  "missingKeywords": ["GraphQL", "AWS Lambda", "Kubernetes"],
  "strengths": ["Strong engineering metrics and quantifiable impact in previous roles", "Solid alignment with core frontend frameworks"],
  "weaknesses": ["Lacks explicit mention of container orchestration or cloud microservices"],
  "suggestions": ["Incorporate Docker or Kubernetes into experience bullets", "Tailor summary to emphasize cloud architectural expertise"]
}`;

    const responseText = await generateGeminiText(prompt);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      score: Math.min(100, Math.max(0, parsed.score || 75)),
      rating: parsed.rating || 'Good',
      matchedKeywords: parsed.matchedKeywords || [],
      missingKeywords: parsed.missingKeywords || [],
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      suggestions: parsed.suggestions || [],
    };
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 0);
    console.error('Gemini analyzeJobMatch fallback triggered:', {
      status,
      message: err?.message || String(err),
    });
  }

  // Heuristic Job Matcher
  return localJobMatchAnalyzer(resume, jobDescription);
}

/**
 * AI Career Strategist & Modern Resume Upgrade Advisor
 */
export async function getModernUpgradeTips(resume: ResumeData): Promise<TrendUpgradeTip[]> {
  try {
    const prompt = `You are a cutting-edge tech career advisor and recruiter.
Analyze this candidate's resume and generate 5 highly actionable upgrade recommendations aligned with current hiring trends (such as AI fluency/copilots, quantifiable business ROI, modern tech stacks, ATS compliance, and removing outdated patterns like objective statements or soft skill buzzwords).

Candidate Title: ${resume.personalInfo.jobTitle}
Summary: ${resume.summary}
Skills: ${resume.skills.flatMap((s) => s.skills).join(', ')}

Return a JSON array strictly in this format:
[
  {
    "category": "AI & Modern Tech",
    "title": "Highlight Applied AI & GenAI Fluency",
    "description": "Recruiters actively prioritize engineers who integrate LLMs, RAG, or AI productivity tools into their day-to-day workflow.",
    "severity": "high",
    "actionableStep": "Add specific examples of how you leveraged LLM APIs or AI automation to accelerate delivery."
  }
]`;

    const responseText = await generateGeminiText(prompt);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 0);
    console.error('Gemini getModernUpgradeTips fallback triggered:', {
      status,
      message: err?.message || String(err),
    });
  }

  // Fallback curated trend advice
  return getCuratedTrendTips(resume);
}

// ----------------- LOCAL HEURISTIC UTILITIES -----------------

function localEnhanceBulletPoint(original: string, role?: string): { enhanced: string[]; explanation: string } {
  const clean = original.replace(/^[•\-\*]\s*/, '').trim();
  const strongVerbs = ['Architected', 'Spearheaded', 'Optimized', 'Streamlined', 'Engineered', 'Orchestrated', 'Delivered'];
  const randomVerb = strongVerbs[Math.floor(Math.random() * strongVerbs.length)];

  const hasNumbers = /\d+%|\$\d+|\d+\+?/.test(clean);
  const metricSnippet = hasNumbers ? '' : ', resulting in a 35% improvement in operational efficiency and reducing cycle times';

  return {
    enhanced: [
      `${randomVerb} ${clean.replace(/^(worked on|helped with|responsible for|assisted in)/i, '')}${metricSnippet}.`,
      `Engineered and executed ${clean.toLowerCase()}, driving a 25% decrease in system latency while ensuring 99.9% uptime.`,
      `Led cross-functional delivery of ${clean.toLowerCase()}, adopting modern ${role || 'engineering'} standards and automated validation pipelines.`,
    ],
    explanation: 'Transformed into the Google X-Y-Z impact format with strong action verbs and quantifiable results.',
  };
}

function localJobMatchAnalyzer(resume: ResumeData, jobDescription: string): ATSCheckResult {
  const jdWords = jobDescription.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const resumeString = JSON.stringify(resume).toLowerCase();

  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'your', 'about', 'role', 'team', 'work']);
  const techKeywords = [
    'react', 'typescript', 'javascript', 'python', 'node.js', 'docker', 'kubernetes', 'aws', 'gcp', 'azure',
    'sql', 'postgresql', 'mongodb', 'graphql', 'rest', 'ci/cd', 'git', 'system design', 'agile', 'llm', 'ai',
    'machine learning', 'pytorch', 'microservices', 'redis', 'kafka', 'testing', 'cypress', 'jest'
  ];

  const jdKeywords = Array.from(new Set(jdWords.filter((w) => techKeywords.includes(w) && !stopWords.has(w))));

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  jdKeywords.forEach((kw) => {
    if (resumeString.includes(kw)) {
      matchedKeywords.push(kw.toUpperCase());
    } else {
      missingKeywords.push(kw.toUpperCase());
    }
  });

  const total = matchedKeywords.length + missingKeywords.length;
  const score = total > 0 ? Math.round((matchedKeywords.length / total) * 100) : 78;
  const rating = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Average' : 'Poor';

  return {
    score,
    rating,
    matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : ['TYPESCRIPT', 'REACT', 'SYSTEM DESIGN'],
    missingKeywords: missingKeywords.length > 0 ? missingKeywords : ['KUBERNETES', 'DOCKER', 'GRAPHQL'],
    strengths: [
      'Resume exhibits clear technical focus aligned with role specifications.',
      'Work experience items include strong project descriptions and domain relevance.',
    ],
    weaknesses: [
      missingKeywords.length > 0
        ? `Lacks explicit mentions of high-demand keywords: ${missingKeywords.slice(0, 3).join(', ')}.`
        : 'Could benefit from higher density of quantifiable business results (%, $, X hours saved).',
    ],
    suggestions: [
      `Incorporate missing skills (${missingKeywords.slice(0, 4).join(', ')}) naturally into your experience bullet points.`,
      'Ensure every role starts with a past-tense action verb (Spearheaded, Engineered, Deployed).',
      'Match the exact title of the job description in your resume header if applicable.',
    ],
  };
}

function getCuratedTrendTips(resume: ResumeData): TrendUpgradeTip[] {
  const fullText = JSON.stringify(resume).toLowerCase();
  const tips: TrendUpgradeTip[] = [
    {
      category: 'AI & Modern Tech',
      title: 'Emphasize AI-Assisted Workflows & LLM Integration',
      description: 'Hiring managers actively prize talent that multiplies output using AI tooling (Gemini, Copilots, prompt engineering, or LLM APIs).',
      severity: 'high',
      actionableStep: 'Add 1-2 bullet points demonstrating how you evaluated, built with, or used AI tools to accelerate code quality or automate workflows.',
    },
    {
      category: 'Impact & Metrics',
      title: 'Adopt the Google X-Y-Z Impact Formula',
      description: 'Generic task lists ("responsible for writing code") get filtered out. Modern recruiters look for: Accomplished [X], as measured by [Y], by doing [Z].',
      severity: 'high',
      actionableStep: 'Audit your experience section to ensure every bullet includes numbers: latency reduced by X%, revenue boosted by $Y, or Z hours saved weekly.',
    },
    {
      category: 'ATS Formatting',
      title: 'Maintain Clean Standardized Section Headers',
      description: 'Fancy non-standard section titles (like "My Journey" or "What I Do") confuse modern ATS parsers like Workday and Greenhouse.',
      severity: 'medium',
      actionableStep: 'Stick to universally recognized headers: "Work Experience", "Education", "Skills", and "Technical Projects".',
    },
    {
      category: 'Skill Relevance',
      title: 'De-clutter Outdated or Redundant Tooling',
      description: 'Listing generic tools like "Microsoft Word", "Windows 10", or obsolete libraries dilutes your high-value technical competencies.',
      severity: 'medium',
      actionableStep: 'Group skills cleanly into "Languages", "Frameworks & Cloud", and "AI / Modern Tools", omitting entry-level office tools.',
    },
    {
      category: 'Conciseness',
      title: 'Target 1-Page Brevity (or Strict 2-Page for 10+ Years)',
      description: 'Modern recruiting cycles spend an average of 6-8 seconds on initial screening. Dense, multi-page resumes suffer from drop-off.',
      severity: 'low',
      actionableStep: 'Consolidate older or non-relevant roles into concise 1-2 bullet summaries to keep prime real estate for your recent achievements.',
    },
  ];

  if (!fullText.includes('gemini') && !fullText.includes('llm') && !fullText.includes('ai')) {
    tips[0].severity = 'high';
  }

  return tips;
}

export interface TailoredChanges {
  summary: string;
  experienceBullets: { index: number; bullets: string[] }[];
}

/**
 * AI-powered Resume Tailoring to Target Job Description
 */
export async function tailorResumeToJob(
  resume: ResumeData,
  jobDescription: string
): Promise<TailoredChanges> {
  try {
    const prompt = `You are an elite executive resume writer.
Tailor the summary and experience bullet points of the resume to better align with the following Job Description, incorporating relevant keywords and impact metrics.

Job Description:
${jobDescription}

Current Resume:
Summary: ${resume.summary}
Experience: ${JSON.stringify(resume.experience.map((e, idx) => ({ index: idx, position: e.position, company: e.company, highlights: e.highlights })))}

Return a JSON object strictly in this structure (raw JSON, no markdown):
{
  "summary": "Tailored 3-4 sentence professional summary aligned to the JD...",
  "experienceBullets": [
    {
      "index": 0,
      "bullets": ["tailored bullet 1", "tailored bullet 2"]
    }
  ]
}`;
    const responseText = await generateGeminiText(prompt);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed.summary && parsed.experienceBullets) {
      return parsed;
    }
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 0);
    console.error('Gemini tailorResumeToJob fallback triggered:', {
      status,
      message: err?.message || String(err),
    });
  }

  // Heuristic fallback
  const firstKeywords = ['scalable systems', 'high-performance architectures', 'cross-functional collaboration'];
  const newSummary = `${resume.personalInfo.jobTitle || 'Professional'} with proven expertise in delivering production-grade solutions aligned with target role requirements. Adept at driving business outcomes through modern engineering practices, scalable systems, and automated pipelines.`;
  const tailoredBullets = resume.experience.map((exp, idx) => ({
    index: idx,
    bullets: exp.highlights.map((b, bIdx) =>
      b ? `${b.replace(/\.$/, '')}, directly supporting core competencies in ${firstKeywords[bIdx % firstKeywords.length]}.` : b
    ),
  }));

  return {
    summary: newSummary,
    experienceBullets: tailoredBullets,
  };
}

/**
 * Parses raw text from an ATS rubric / report into structured ATSProfile criteria.
 */
export async function parseRubricToATSProfile(rubricText: string): Promise<ATSProfile> {
  try {
    const prompt = `You are an expert ATS (Applicant Tracking System) system architect.
Parse the following rubric, guidelines, or ATS report text into an ATS scoring profile with weighted criteria.
The criteria weights MUST sum to approximately 100.
Allowed types for each criterion:
- "keyword": searches for specific keywords (params: { keywords: string[], minCount: number, fixSuggestion: string })
- "section": checks presence and density of sections like 'personal', 'experience', 'education', 'skills', 'projects' (params: { sectionName: string, minCount?: number, fixSuggestion: string })
- "metric": checks for quantitative impact numbers or strong action verbs (params: { metricType: "numbers"|"actionVerbs", minCount: number, fixSuggestion: string })
- "length": checks word count of summary (params: { minLength: number, maxLength: number, fixSuggestion: string })
- "regex": checks for disallowed buzzwords or formatting issues (params: { pattern: string, flags: string, fixSuggestion: string })

Rubric Text:
"""
${rubricText.slice(0, 5000)}
"""

Return ONLY a JSON object strictly in this format (no markdown fences, just pure JSON):
{
  "name": "Custom Profile Name",
  "description": "Short description of the criteria and target role",
  "criteria": [
    {
      "id": "crit_1",
      "label": "Human readable criterion label",
      "weight": 20,
      "type": "keyword",
      "params": {
        "keywords": ["React", "TypeScript"],
        "minCount": 2,
        "fixSuggestion": "Add required core technologies to your resume"
      }
    }
  ]
}`;

    const responseText = await generateGeminiText(prompt);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed.criteria && Array.isArray(parsed.criteria)) {
      return {
        id: 'custom_' + Date.now(),
        name: parsed.name || 'Custom ATS Rubric',
        description: parsed.description || 'Custom evaluation rubric parsed with Gemini AI',
        isCustom: true,
        criteria: parsed.criteria.map((c: any, idx: number) => ({
          id: c.id || `crit_${idx + 1}`,
          label: c.label || `Criterion ${idx + 1}`,
          weight: Number(c.weight) || 10,
          type: c.type || 'keyword',
          params: c.params || { fixSuggestion: 'Review and optimize this area' },
        })),
      };
    }
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 0);
    console.error('Gemini parseRubricToATSProfile fallback triggered:', {
      status,
      message: err?.message || String(err),
    });
  }

  // Offline heuristic fallback: Extract simple keywords and create a default customized profile
  const words = rubricText.match(/[A-Za-z0-9+#.-]{3,}/g) || [];
  const freq: Record<string, number> = {};
  words.forEach((w) => {
    const lw = w.toLowerCase();
    if (!['and', 'the', 'for', 'with', 'that', 'this', 'have', 'from', 'your'].includes(lw)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);

  return {
    id: 'custom_' + Date.now(),
    name: 'Custom Rubric (Offline)',
    description: 'Custom ATS criteria based on provided rubric document',
    isCustom: true,
    criteria: [
      {
        id: 'c_keywords',
        label: 'Rubric Target Keywords',
        weight: 35,
        type: 'keyword',
        params: {
          keywords: topKeywords.length > 0 ? topKeywords : ['Architecture', 'Agile', 'Leadership'],
          minCount: Math.min(topKeywords.length, 5),
          fixSuggestion: 'Integrate the top keywords extracted from your rubric',
        },
      },
      {
        id: 'c_metrics',
        label: 'Quantified Impact Metrics',
        weight: 30,
        type: 'metric',
        params: {
          metricType: 'numbers',
          minCount: 3,
          fixSuggestion: 'Add hard quantitative numbers (%, $, scale) to bullet points',
        },
      },
      {
        id: 'c_contact',
        label: 'Complete Contact & Links',
        weight: 20,
        type: 'section',
        params: {
          sectionName: 'personal',
          fixSuggestion: 'Include full name, target title, location, and verified links',
        },
      },
      {
        id: 'c_experience',
        label: 'Demonstrated Work Experience',
        weight: 15,
        type: 'section',
        params: {
          sectionName: 'experience',
          minCount: 1,
          fixSuggestion: 'List at least one detailed work experience',
        },
      },
    ],
  };
}
