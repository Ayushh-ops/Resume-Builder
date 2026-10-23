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
});

describe('AI Review Validator Unit Tests', () => {
  const dummyResume: any = {
    personalInfo: { fullName: 'Sachin Verma', jobTitle: 'Data Analyst Intern' },
    summary: 'Data Analyst Intern with proven experience in Python, SQL, and predictive machine learning models.',
    experience: [
      {
        company: 'Unified Mentor',
        position: 'Data Analyst Intern',
        startDate: 'Jan 2024',
        endDate: 'Jan 2028',
        highlights: ['Developed predictive machine learning models reducing processing time by 20%.'],
      },
    ],
    skills: [{ name: 'Data Analytics', skills: ['Python', 'SQL', 'Tableau'] }],
  };

  it('rejects suggestions containing placeholders like [X] or [Metric]', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Old text',
        after: 'Architected pipeline resulting in [X]% improvement in [Metric].',
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
      },
      dummyResume
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Hallucinated year/date');
  });

  it('accepts valid, truthful enhancements', async () => {
    const { validateAIReviewSuggestion } = await import('../src/services/aiReview');
    const result = validateAIReviewSuggestion(
      {
        section: 'experience',
        targetType: 'bullet',
        before: 'Developed predictive machine learning models reducing processing time by 20%.',
        after: 'Engineered predictive machine learning models with Python and SQL, reducing data processing latency by 20%.',
      },
      dummyResume
    );
    expect(result.valid).toBe(true);
  });
});

