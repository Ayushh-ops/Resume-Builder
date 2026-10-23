import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  filterAndSortModels,
  generate,
  EXCLUDED_KEYWORDS,
  FALLBACK_MODELS,
  setSelectedModel,
  clearSelectedModel,
  clearCachedModels,
} from '../src/lib/gemini';

// The exact 46 models retrieved from Google's v1beta ModelService
const DIAGNOSIS_MODELS = [
  { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-pro-preview-tts', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemma-4-26b-a4b-it', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemma-4-31b-it', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-flash-lite-latest', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-pro-latest', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3-flash-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-pro-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-pro-preview-customtools', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-lite-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3-pro-image-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/nano-banana-pro-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-image-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-lite-image', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-nano-banana-2.1', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-omni-flash-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-omni-1.1-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.5-transcribe', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.7-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-4-argon', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/lyria-3-clip-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/lyria-3-pro-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/lyria-3.5', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-tts-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.8-flash-tts', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.8-flash-lite-tts', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-robotics-er-2-preview', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-2.5-computer-use-preview-10-2025', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/antigravity-preview-05-2026', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/antigravity-preview-09-2026', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/antigravity-preview-latest', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/deep-research-max-preview-04-2026', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/deep-research-preview-04-2026', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/deep-research-pro-preview-12-2025', supportedGenerationMethods: ['generateContent'] },
];

describe('Gemini Dynamic Model Discovery & Filtering', () => {
  it('filters 46-model list, keeping only clean flash/flash-lite models and sorting descending', () => {
    const filtered = filterAndSortModels(DIAGNOSIS_MODELS);

    // Must include the expected models
    expect(filtered).toContain('gemini-3.8-flash');
    expect(filtered).toContain('gemini-3.7-flash');
    expect(filtered).toContain('gemini-3.6-flash');
    expect(filtered).toContain('gemini-3.5-flash');
    expect(filtered).toContain('gemini-3.5-flash-lite');

    // Must exclude all forbidden token models
    for (const model of filtered) {
      for (const kw of EXCLUDED_KEYWORDS) {
        expect(model.toLowerCase()).not.toContain(kw);
      }
      expect(model).toMatch(/^gemini-\d+(\.\d+)?-flash(-lite)?$/);
    }

    // Must be sorted by version descending, flash before flash-lite
    const idx38 = filtered.indexOf('gemini-3.8-flash');
    const idx37 = filtered.indexOf('gemini-3.7-flash');
    const idx36 = filtered.indexOf('gemini-3.6-flash');
    const idx35 = filtered.indexOf('gemini-3.5-flash');
    const idx35lite = filtered.indexOf('gemini-3.5-flash-lite');

    expect(idx38).toBeLessThan(idx37);
    expect(idx37).toBeLessThan(idx36);
    expect(idx36).toBeLessThan(idx35);
    expect(idx35).toBeLessThan(idx35lite);
  });
});

describe('Gemini Resilience & Fallback Tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearCachedModels();
    clearSelectedModel();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearCachedModels();
    clearSelectedModel();
    vi.restoreAllMocks();
  });

  it('re-picks model and retries when encountering HTTP 404', async () => {
    const fetchCalls: { url: string; body: any }[] = [];

    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      const body = init?.body ? JSON.parse(init.body as string) : null;
      fetchCalls.push({ url: urlStr, body });

      // First generateContent call with gemini-3.5-flash returns 404
      if (urlStr.includes('gemini-3.5-flash:generateContent') && !urlStr.includes('probe')) {
        return new Response(JSON.stringify({ error: { code: 404, message: 'Model not found' } }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Probing candidate models during pickModel
      if (urlStr.includes('gemini-3.5-flash-lite:generateContent')) {
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'ok' }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Default mock for listModels or generateContent
      if (urlStr.includes('/models?')) {
        return new Response(JSON.stringify({ models: DIAGNOSIS_MODELS }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Fallback success' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    setSelectedModel('gemini-3.5-flash');
    const result = await generate('test prompt', { apiKey: 'dummy-key-test' });

    expect(result.ok).toBe(true);
    expect(result.modelUsed).not.toBe('gemini-3.5-flash');
    // Confirms fetch was called again after 404
    expect(fetchCalls.length).toBeGreaterThan(1);
  });

  it('retries without thinkingConfig when receiving HTTP 400', async () => {
    const payloadsSent: any[] = [];

    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : null;
      payloadsSent.push(body);

      // If thinkingConfig is present, return HTTP 400
      if (body?.generationConfig?.thinkingConfig) {
        return new Response(
          JSON.stringify({
            error: { code: 400, message: 'Invalid thinkingConfig: budget 0 not allowed' },
          }),
          { status: 400, statusText: 'Bad Request', headers: { 'Content-Type': 'application/json' } }
        );
      }

      // If thinkingConfig is omitted, succeed with 200
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Success without thinkingConfig' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    setSelectedModel('gemini-3.5-flash');
    const res = await generate('hello test', { apiKey: 'dummy-key-test' });

    expect(res.ok).toBe(true);
    expect(res.text).toBe('Success without thinkingConfig');
    // First request had thinkingConfig, second request omitted it
    expect(payloadsSent.length).toBe(2);
    expect(payloadsSent[0].generationConfig.thinkingConfig).toBeDefined();
    expect(payloadsSent[1].generationConfig.thinkingConfig).toBeUndefined();
  });

  it('selectMainModel uses main non-lite model if available, and falls back to lite only if all main models fail', async () => {
    const { selectMainModel } = await import('../src/lib/gemini');

    // Case 1: gemini-3.8-flash succeeds
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/models?')) {
        return new Response(JSON.stringify({ models: DIAGNOSIS_MODELS }), { status: 200 });
      }
      if (urlStr.includes('gemini-3.8-flash:generateContent')) {
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: { code: 429, message: 'Quota exceeded' } }), { status: 429 });
    }) as any;

    const res1 = await selectMainModel('dummy-key', undefined, true);
    expect(res1.chosenModel).toBe('gemini-3.8-flash');
    expect(res1.isLite).toBe(false);

    // Case 2: All non-lite models return 429, lite model succeeds
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/models?')) {
        return new Response(JSON.stringify({ models: DIAGNOSIS_MODELS }), { status: 200 });
      }
      if (urlStr.includes('-lite:generateContent')) {
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: { code: 429, message: 'Quota exceeded' } }), { status: 429 });
    }) as any;

    const res2 = await selectMainModel('dummy-key', undefined, true);
    expect(res2.isLite).toBe(true);
    expect(res2.chosenModel).toBe('gemini-3.5-flash-lite');
    expect(res2.statusMessage).toContain('Every non-lite model failed');
  });
});

describe('AI Review Validator Unit Tests', () => {
  const dummyResume: any = {
    personalInfo: { fullName: 'Sachin Verma', jobTitle: 'Data Analyst Intern' },
    summary: 'Data Analyst Intern with experience in Python, SQL, and predictive machine learning models across 1,000+ records.',
    education: [
      {
        institution: 'Chandigarh University',
        degree: 'Bachelor of Engineering',
        startDate: 'Jan 2024',
        endDate: 'Jan 2028',
        gpa: '8.4',
      },
    ],
    experience: [
      {
        company: 'Unified Mentor',
        position: 'Data Analyst Intern',
        startDate: 'Jan 2024',
        endDate: 'Jan 2028',
        highlights: ['Developed predictive machine learning models reducing processing time by 20% across 10,000+ user interactions.'],
      },
    ],
    skills: [{ name: 'Data Analytics', skills: ['Python', 'SQL', 'Tableau'] }],
  };

  it('rejects suggestions with missing or invalid issue type', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const resultMissing = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Old text',
        after: 'Optimized data pipeline with Python.',
      },
      dummyResume
    );
    expect(resultMissing.valid).toBe(false);
    expect(resultMissing.reason).toMatch(/missing or invalid issue type/i);

    const resultInvalid = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Old text',
        after: 'Optimized data pipeline with Python.',
        issue: 'random_invalid' as any,
      },
      dummyResume
    );
    expect(resultInvalid.valid).toBe(false);
    expect(resultInvalid.reason).toMatch(/missing or invalid issue type/i);
  });

  it('rejects near-synonym swaps (e.g. Built -> Constructed)', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Built automated reporting pipeline using Python.',
        after: 'Constructed automated reporting pipeline using Python.',
        issue: 'weak_verb',
      },
      dummyResume
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/near-synonym swap/i);
  });

  it('rejects suggestions containing placeholders like [X] or [Metric]', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Old text',
        after: 'Architected pipeline resulting in [X]% improvement in [Metric].',
        issue: 'vague',
      },
      dummyResume
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('placeholder');
  });

  it('rejects suggestions with hallucinated dates or years', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Old text',
        after: 'Completed multi-million enterprise migration project in 2019.',
        issue: 'vague',
      },
      dummyResume
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Hallucinated year/date');
  });

  it('rejects previously accepted summary rewrite with fluff and role inflation', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'summary',
        targetType: 'summary',
        before: dummyResume.summary,
        after: 'Performance-driven MERN Stack Developer and Data Analyst with proven experience. Proven track record delivering machine learning models.',
        issue: 'weak_verb',
      },
      dummyResume
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/fluff|role upgrade|standalone role claim|seniority dropped/i);
  });

  it('rejects invented technology or tool not present in the resume', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: dummyResume.experience[0].highlights[0],
        after: 'Deployed predictive machine learning models using Docker, Kubernetes, and AWS infrastructure.',
        issue: 'vague',
      },
      dummyResume
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/technology\/tool|not present/i);
  });

  it('rejects invented number not present in the resume and prints the offending token', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: dummyResume.experience[0].highlights[0],
        after: 'Developed predictive machine learning models reducing processing time by 45%.',
        issue: 'no_metric',
      },
      dummyResume
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/number \(45%?\)|not present in source resume/i);
    expect(result.reason).toContain('45%');
  });

  it('rejects seniority inflation or dropping intern status (Intern -> Analyst)', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'summary',
        targetType: 'summary',
        before: 'Data Analyst Intern with proven experience in Python, SQL, and predictive machine learning models.',
        after: 'Data Analyst with proven experience in Python, SQL, and predictive machine learning models.',
        issue: 'weak_verb',
      },
      dummyResume
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/seniority dropped|role upgrade/i);
  });

  it('accepts faithful summary rewrite keeping "8.4", "10,000+", and "1,000+"', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'summary',
        targetType: 'summary',
        before: dummyResume.summary,
        after: 'Data Analyst Intern maintaining an 8.4 CGPA and analyzing 1,000+ records and 10,000+ interactions using Python and SQL predictive workflows.',
        issue: 'vague',
      },
      dummyResume
    );
    expect(result.valid).toBe(true);
  });

  it('accepts valid, truthful bullet enhancements', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Developed predictive machine learning models reducing processing time by 20%.',
        after: 'Engineered predictive machine learning models with Python and SQL, reducing data processing latency by 20%.',
        issue: 'weak_verb',
      },
      dummyResume
    );
    expect(result.valid).toBe(true);
  });

  it('accepts grammatical tense consistency fixes without treating them as near-synonym swaps', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Lead the team and organize weekly technical workshops.',
        after: 'Led the team and organized weekly technical workshops.',
        issue: 'tense',
      },
      dummyResume
    );
    expect(result.valid).toBe(true);
  });

  it('verifies tests/data/weak-resume.json has 6 intentionally weak bullets', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const fixturePath = path.resolve(process.cwd(), 'tests/data/weak-resume.json');
    expect(fs.existsSync(fixturePath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    expect(data.experience).toHaveLength(1);
    expect(data.experience[0].highlights).toHaveLength(6);
    expect(data.experience[0].highlights[0]).toMatch(/^Lead the/);
    expect(data.experience[0].highlights[1]).toMatch(/^Responsible for/);
  });

  it('correctly parses 429 RetryInfo and detects daily vs transient quotas', async () => {
    const { parse429Error } = await import('../src/lib/gemini');

    // 1. Transient per-minute rate limit (<90s)
    const transientBody = JSON.stringify({
      error: {
        code: 429,
        message: 'Resource exhausted. Please retry in 18.5s.',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '18s',
          },
        ],
      },
    });
    const transientParsed = parse429Error(transientBody);
    expect(transientParsed.isQuota).toBe(true);
    expect(transientParsed.isDaily).toBe(false);
    expect(transientParsed.retryDelaySeconds).toBe(18);

    // 2. Daily quota limit (>=90s or per-day description)
    const dailyBody = JSON.stringify({
      error: {
        code: 429,
        message: 'Generate content requests per day limit exceeded on Free Tier. Please retry in 13h38m12s.',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '49092s',
          },
        ],
      },
    });
    const dailyParsed = parse429Error(dailyBody);
    expect(dailyParsed.isQuota).toBe(true);
    expect(dailyParsed.isDaily).toBe(true);
    expect(dailyParsed.retryDelaySeconds).toBe(49092);
  });

  it('reuses cached working model without probing candidate models', async () => {
    const { selectMainModel, setWorkingModel, clearWorkingModel } = await import(
      '../src/lib/gemini'
    );
    clearWorkingModel();
    setWorkingModel('gemini-3.8-flash');

    const result = await selectMainModel('dummy-key');
    expect(result.chosenModel).toBe('gemini-3.8-flash');
    expect(result.probeTable).toHaveLength(0); // Did not probe
    expect(result.statusMessage).toContain('Using cached model');
  });
});

