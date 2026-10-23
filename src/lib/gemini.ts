// Plain fetch REST client for Google Gemini API (no SDK)

export const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
] as const;

export const CANDIDATE_MODELS = FALLBACK_MODELS;
export type CandidateModel = (typeof CANDIDATE_MODELS)[number];

const LOCAL_STORAGE_KEY = 'resumecraft_gemini_api_key';
const LOCAL_STORAGE_MODEL_KEY = 'resumecraft_gemini_model';
const CACHE_KEY = 'resumecraft_gemini_models_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const EXCLUDED_KEYWORDS = [
  'tts',
  'image',
  'audio',
  'transcribe',
  'robotics',
  'computer-use',
  'deep-research',
  'antigravity',
  'omni',
  'latest',
  'preview',
  'customtools',
  'nano',
  'lyria',
  'pro',
] as const;

export function getKey(): string {
  let key = '';
  try {
    key = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
  } catch {}
  if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
    key = import.meta.env.VITE_GEMINI_API_KEY || '';
  }
  if (!key) {
    const proc = (globalThis as any).process;
    if (proc && proc.env) {
      key = proc.env.VITE_GEMINI_API_KEY || '';
    }
  }
  return (key || '').trim().replace(/^["']|["']$/g, '').trim();
}

export function getKeySource(): 'Settings' | '.env' | 'none' {
  let localKey = '';
  try {
    localKey = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
  } catch {}
  if (localKey.trim()) return 'Settings';
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY?.trim()) {
    return '.env';
  }
  const proc = (globalThis as any).process;
  if (proc?.env?.VITE_GEMINI_API_KEY?.trim()) {
    return '.env';
  }
  return 'none';
}

export function setKey(key: string): void {
  const cleaned = (key || '').trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned) {
    localStorage.setItem(LOCAL_STORAGE_KEY, cleaned);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

export function clearSavedKey(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {}
}

export function getSelectedModel(): string {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_MODEL_KEY);
    if (saved) return saved;
  } catch {}
  return FALLBACK_MODELS[0];
}

export function setSelectedModel(model: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_MODEL_KEY, model.replace(/^models\//, ''));
  } catch {}
}

export function clearSelectedModel(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_MODEL_KEY);
  } catch {}
}

export function getCachedModels(): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.models) && typeof parsed.timestamp === 'number') {
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.models.length > 0) {
        return parsed.models;
      }
    }
  } catch {}
  return null;
}

export function setCachedModels(models: string[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), models }));
  } catch {}
}

export function clearCachedModels(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export interface GeminiModelInfo {
  name: string;
  cleanName: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

/**
 * Filters and sorts raw API models:
 * - Must support generateContent.
 * - Matches /^gemini-\d+(\.\d+)?-flash(-lite)?$/
 * - Excludes tts, image, audio, transcribe, robotics, computer-use, deep-research, antigravity, omni, latest, preview, customtools, nano, lyria, pro.
 * - Sorts by version number descending, "flash" before "flash-lite".
 */
export function filterAndSortModels(
  rawModels: Array<{ name: string; supportedGenerationMethods?: string[] }>
): string[] {
  const matched: { name: string; version: number; isLite: boolean }[] = [];

  for (const m of rawModels) {
    if (
      !m ||
      !Array.isArray(m.supportedGenerationMethods) ||
      !m.supportedGenerationMethods.includes('generateContent')
    ) {
      continue;
    }

    const clean = (m.name || '').replace(/^models\//, '').trim();
    const lower = clean.toLowerCase();

    if (EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw))) {
      continue;
    }

    const match = clean.match(/^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/);
    if (!match) {
      continue;
    }

    const version = parseFloat(match[1]);
    const isLite = Boolean(match[2]);
    matched.push({ name: clean, version, isLite });
  }

  matched.sort((a, b) => {
    if (b.version !== a.version) {
      return b.version - a.version;
    }
    return (a.isLite ? 1 : 0) - (b.isLite ? 1 : 0);
  });

  return matched.map((m) => m.name);
}

/**
 * Fetches models from Google API with 24h caching in localStorage.
 * Force-refresh when requested (e.g. on Settings open or after 404).
 */
export async function listModels(
  apiKey?: string,
  forceRefresh: boolean = false
): Promise<string[]> {
  const key = apiKey || getKey();
  if (!key) {
    return [...FALLBACK_MODELS];
  }

  if (!forceRefresh) {
    const cached = getCachedModels();
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Gemini REST] listModels failed with status ${res.status}`);
      return [...FALLBACK_MODELS];
    }

    const data = await res.json();
    const modelsList: any[] = data?.models || [];
    const filtered = filterAndSortModels(modelsList);

    if (filtered.length > 0) {
      setCachedModels(filtered);
      return filtered;
    }
    return [...FALLBACK_MODELS];
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('[Gemini REST] listModels exception, falling back:', err?.message || err);
    return [...FALLBACK_MODELS];
  }
}

/**
 * Probes a candidate model with a 1-token request (8s timeout).
 */
export async function probeModel(
  modelName: string,
  apiKey?: string
): Promise<{ ok: boolean; status: number; elapsedMs: number; errorMsg?: string }> {
  const key = apiKey || getKey();
  if (!key) {
    return { ok: false, status: 0, elapsedMs: 0, errorMsg: 'No API key set' };
  }

  const cleanName = modelName.replace(/^models\//, '');
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanName}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ok' }] }] }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const elapsedMs = Date.now() - startTime;

    if (res.ok) {
      return { ok: true, status: res.status, elapsedMs };
    }

    let errorMsg = res.statusText;
    try {
      const errJson = await res.json();
      errorMsg = errJson?.error?.message || errorMsg;
    } catch {}
    return { ok: false, status: res.status, elapsedMs, errorMsg };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const elapsedMs = Date.now() - startTime;
    const isTimeout = err?.name === 'AbortError';
    return {
      ok: false,
      status: isTimeout ? 408 : Number(err?.status || 0),
      elapsedMs,
      errorMsg: isTimeout ? 'Probe timed out (8s)' : err?.message || String(err),
    };
  }
}

/**
 * Pick the model:
 * - User's saved choice if it is still in the candidate list and not excluded.
 * - Else probe candidates in order with a 1-token request (8s timeout each)
 *   and use the first that returns 200; save it as the working model.
 */
export async function pickModel(
  apiKey?: string,
  forceRefresh: boolean = false,
  excludeModel?: string
): Promise<{ picked: string; fallbackList: string[] }> {
  let candidates = await listModels(apiKey, forceRefresh);
  if (excludeModel) {
    candidates = candidates.filter((c) => c !== excludeModel);
  }

  const saved = getSelectedModel();
  if (saved && saved !== excludeModel && candidates.includes(saved)) {
    return { picked: saved, fallbackList: candidates };
  }

  // Probe candidates in order
  for (const candidate of candidates) {
    const probe = await probeModel(candidate, apiKey);
    if (probe.ok) {
      setSelectedModel(candidate);
      return { picked: candidate, fallbackList: candidates };
    }
  }

  // Fallback to first available candidate
  const fallback =
    candidates[0] ||
    (excludeModel === FALLBACK_MODELS[0] ? FALLBACK_MODELS[1] : FALLBACK_MODELS[0]);
  setSelectedModel(fallback);
  return { picked: fallback, fallbackList: candidates };
}

export interface GenerateResult {
  ok: boolean;
  text?: string;
  modelUsed?: string;
  status?: number;
  message?: string;
}

export function formatGeminiError(
  status: number,
  rawMessage: string,
  triedModels: string[] = []
): string {
  const msg = (rawMessage || '').toLowerCase();
  const triedStr = triedModels.length > 0 ? `: tried ${triedModels.join(', ')}` : '';

  if (
    status === 403 ||
    status === 401 ||
    (status === 400 &&
      (msg.includes('api_key_invalid') ||
        msg.includes('key not valid') ||
        msg.includes('api key not valid'))) ||
    msg.includes('403') ||
    msg.includes('permission_denied')
  ) {
    return 'Key rejected (403)';
  }

  if (status === 404 || status === 410 || msg.includes('404') || msg.includes('not found')) {
    return `Model not found (${status || 404})${triedStr}`;
  }

  if (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted')
  ) {
    return 'Rate limited (429)';
  }

  if (
    status === 408 ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('40s')
  ) {
    return 'AI timed out, used basic parsing';
  }

  if (msg.includes('no api key set')) {
    return 'No API key set';
  }

  if (msg.includes('invalid response') || msg.includes('unexpected token') || msg.includes('json')) {
    return 'Invalid response';
  }

  return rawMessage || 'AI unavailable';
}

export const RESUME_DATA_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    personalInfo: {
      type: 'OBJECT',
      properties: {
        fullName: { type: 'STRING' },
        jobTitle: { type: 'STRING' },
        email: { type: 'STRING' },
        phone: { type: 'STRING' },
        location: { type: 'STRING' },
        website: { type: 'STRING' },
        linkedin: { type: 'STRING' },
        github: { type: 'STRING' },
      },
    },
    summary: { type: 'STRING' },
    experience: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          company: { type: 'STRING' },
          position: { type: 'STRING' },
          location: { type: 'STRING' },
          startDate: { type: 'STRING' },
          endDate: { type: 'STRING' },
          current: { type: 'BOOLEAN' },
          highlights: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
      },
    },
    education: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          institution: { type: 'STRING' },
          degree: { type: 'STRING' },
          fieldOfStudy: { type: 'STRING' },
          location: { type: 'STRING' },
          startDate: { type: 'STRING' },
          endDate: { type: 'STRING' },
          grade: { type: 'STRING' },
        },
      },
    },
    skills: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          skills: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
      },
    },
    projects: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          description: { type: 'STRING' },
          technologies: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          link: { type: 'STRING' },
          githubLink: { type: 'STRING' },
          highlights: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
      },
    },
    certifications: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          issuer: { type: 'STRING' },
          date: { type: 'STRING' },
        },
      },
    },
  },
};

/**
 * Executes generateContent using plain REST fetch:
 * - Dynamically determines model; re-picks and retries if 404/410.
 * - Omits responseMimeType when empty/undefined; for JSON calls uses application/json with responseSchema.
 * - Keeps thinkingConfig { thinkingBudget: 0 } but retries once without it on HTTP 400.
 * - Timeout 40s.
 * - Logs request status, elapsed ms, first 300 chars of any error.
 */
export async function generate(
  prompt: string,
  options?: {
    apiKey?: string;
    preferredModel?: string;
    signal?: AbortSignal;
    responseMimeType?: string;
    responseSchema?: any;
  }
): Promise<GenerateResult> {
  const key = options?.apiKey || getKey();
  if (!key) {
    console.error('Gemini generate: No API key set');
    return { ok: false, status: 0, message: 'No API key set' };
  }

  let currentModel = (
    options?.preferredModel ||
    getSelectedModel() ||
    FALLBACK_MODELS[0]
  ).replace(/^models\//, '');

  const triedModels: string[] = [];

  const executeOnce = async (
    modelName: string,
    useThinkingConfig: boolean
  ): Promise<{ ok: boolean; status: number; text?: string; errorMsg?: string; isTimeout?: boolean }> => {
    const controller = new AbortController();
    let isTimedOut = false;
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, 40000);

    const externalSignal = options?.signal;
    const abortListener = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', abortListener);
      }
    }

    const startTime = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
      const payload: any = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      };

      const genConfig: any = {
        temperature: 0.1,
      };

      if (useThinkingConfig) {
        genConfig.thinkingConfig = {
          thinkingBudget: 0,
        };
      }

      if (options?.responseMimeType && options.responseMimeType.trim()) {
        genConfig.responseMimeType = options.responseMimeType.trim();
      }

      if (options?.responseSchema) {
        genConfig.responseSchema = options.responseSchema;
      }

      payload.generationConfig = genConfig;

      const bodyString = JSON.stringify(payload);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortListener);
      }

      const elapsedMs = Date.now() - startTime;
      const resText = await res.text();
      const first300 = resText.slice(0, 300);

      if (!res.ok) {
        console.warn(
          `[Gemini REST] model=${modelName} status=${res.status} elapsed=${elapsedMs}ms error="${first300.replace(/\s+/g, ' ')}"`
        );
        let errorMsg = res.statusText;
        try {
          const errData = JSON.parse(resText);
          errorMsg = errData?.error?.message || errorMsg;
        } catch {}
        return { ok: false, status: res.status, errorMsg };
      }

      console.log(
        `[Gemini REST] model=${modelName} status=${res.status} elapsed=${elapsedMs}ms bodySnippet="${first300.replace(/\s+/g, ' ')}"`
      );

      let parsed: any;
      try {
        parsed = JSON.parse(resText);
      } catch {
        return { ok: false, status: 200, errorMsg: 'Invalid response JSON' };
      }

      const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') {
        return { ok: false, status: 200, errorMsg: 'Invalid response content' };
      }

      return { ok: true, status: 200, text };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortListener);
      }
      const elapsedMs = Date.now() - startTime;
      console.error(`[Gemini REST] exception on model=${modelName} elapsed=${elapsedMs}ms:`, err);
      if (isTimedOut || err?.name === 'AbortError') {
        return { ok: false, status: 408, isTimeout: true, errorMsg: 'AI timed out, used basic parsing' };
      }
      const status = Number(err?.status || 0);
      const msg = err?.message || String(err);
      return { ok: false, status, errorMsg: msg };
    }
  };

  const attemptWithThinkingRetry = async (
    modelName: string
  ): Promise<{ ok: boolean; status: number; text?: string; errorMsg?: string; isTimeout?: boolean }> => {
    triedModels.push(modelName);
    // 1. Try with thinkingBudget: 0
    let attempt = await executeOnce(modelName, true);
    // 2. Retry once without thinkingConfig on HTTP 400
    if (!attempt.ok && attempt.status === 400) {
      console.log(`[Gemini REST] HTTP 400 on model=${modelName}, retrying without thinkingConfig...`);
      attempt = await executeOnce(modelName, false);
    }
    return attempt;
  };

  // First attempt with current working model
  let result = await attemptWithThinkingRetry(currentModel);
  if (result.ok && result.text) {
    return {
      ok: true,
      status: 200,
      text: result.text,
      modelUsed: currentModel,
    };
  }

  // If 404, 410, or 503 (high demand): drop model from cache, re-pick automatically, then retry once
  if (result.status === 404 || result.status === 410 || result.status === 503) {
    console.warn(`[Gemini REST] model ${currentModel} returned ${result.status}, re-picking dynamically...`);
    clearCachedModels();
    clearSelectedModel();

    try {
      const pickedInfo = await pickModel(key, true, currentModel);
      const nextModel = pickedInfo.picked;
      if (nextModel && nextModel !== currentModel) {
        currentModel = nextModel;
        result = await attemptWithThinkingRetry(currentModel);
        if (result.ok && result.text) {
          return {
            ok: true,
            status: 200,
            text: result.text,
            modelUsed: currentModel,
          };
        }
      }
    } catch (rePickErr) {
      console.error('[Gemini REST] re-picking model failed:', rePickErr);
    }
  }

  return {
    ok: false,
    status: result.status,
    message: formatGeminiError(result.status, result.errorMsg || '', triedModels),
    modelUsed: currentModel,
  };
}
