// Plain fetch REST client for Google Gemini API (no SDK)

export const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
] as const;

export type CandidateModel = (typeof CANDIDATE_MODELS)[number];

const LOCAL_STORAGE_KEY = 'resumecraft_gemini_api_key';
const LOCAL_STORAGE_MODEL_KEY = 'resumecraft_gemini_model';
const SESSION_CACHE_KEY = 'rc_gemini_models_v1';

export function getKey(): string {
  let key = '';
  try {
    key = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
  } catch {}
  if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
    key = import.meta.env.VITE_GEMINI_API_KEY || '';
  }
  return (key || '').trim().replace(/^["']|["']$/g, '').trim();
}

export function setKey(key: string): void {
  const cleaned = (key || '').trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned) {
    localStorage.setItem(LOCAL_STORAGE_KEY, cleaned);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

export function getSelectedModel(): string {
  const saved = localStorage.getItem(LOCAL_STORAGE_MODEL_KEY);
  if (saved && CANDIDATE_MODELS.includes(saved as any)) {
    return saved;
  }
  return CANDIDATE_MODELS[0];
}

export function setSelectedModel(model: string): void {
  localStorage.setItem(LOCAL_STORAGE_MODEL_KEY, model.replace(/^models\//, ''));
}

export interface GeminiModelInfo {
  name: string; // e.g. "models/gemini-2.5-flash"
  cleanName: string; // e.g. "gemini-2.5-flash"
  displayName?: string;
  supportedGenerationMethods?: string[];
}

/**
 * Lists models using plain fetch with a dedicated 5s AbortController.
 */
export async function listModels(apiKey?: string): Promise<GeminiModelInfo[]> {
  const key = apiKey || getKey();
  if (!key) {
    throw new Error('No API key set');
  }

  const cacheKey = `${SESSION_CACHE_KEY}_${key.slice(-6)}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const status = res.status;
      let errMsg = res.statusText;
      try {
        const errJson = await res.json();
        errMsg = errJson?.error?.message || errMsg;
      } catch {}
      const err: any = new Error(errMsg);
      err.status = status;
      throw err;
    }

    const data = await res.json();
    const modelsList: any[] = data?.models || [];
    const contentModels = modelsList
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => ({
        name: m.name,
        cleanName: (m.name || '').replace(/^models\//, ''),
        displayName: m.displayName || m.name,
        supportedGenerationMethods: m.supportedGenerationMethods,
      }));

    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(contentModels));
    } catch {}

    return contentModels;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      const timeoutErr: any = new Error('listModels timed out (5s)');
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  }
}

/**
 * From the live list choose first existing of CANDIDATE_MODELS.
 */
export async function pickModel(apiKey?: string, preferredModel?: string): Promise<{ picked: string; fallbackList: string[] }> {
  let liveModels: GeminiModelInfo[] = [];
  try {
    liveModels = await listModels(apiKey);
  } catch (err) {
    console.warn('Could not list models via REST, using default candidate list:', err);
    return {
      picked: preferredModel || CANDIDATE_MODELS[0],
      fallbackList: [...CANDIDATE_MODELS],
    };
  }

  const liveCleanNames = liveModels.map((m) => m.cleanName);
  const candidateOrder: string[] = [];

  for (const c of CANDIDATE_MODELS) {
    if (liveCleanNames.some((l) => l === c || l.endsWith(c)) && !candidateOrder.includes(c)) {
      candidateOrder.push(c);
    }
  }

  if (candidateOrder.length === 0) {
    const flashFallback = liveCleanNames.find((name) => name.toLowerCase().includes('flash'));
    if (flashFallback) {
      candidateOrder.push(flashFallback);
    }
  }

  if (candidateOrder.length === 0) {
    throw new Error('No usable model for this key');
  }

  return {
    picked: candidateOrder[0],
    fallbackList: candidateOrder,
  };
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
    (status === 400 && (msg.includes('api_key_invalid') || msg.includes('key not valid') || msg.includes('api key not valid'))) ||
    msg.includes('403') ||
    msg.includes('permission_denied')
  ) {
    return 'Key rejected (403)';
  }

  if (status === 404 || msg.includes('404') || msg.includes('not found')) {
    return `Model not found (404)${triedStr}`;
  }

  if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
    return 'Rate limited (429)';
  }

  if (status === 408 || msg.includes('timeout') || msg.includes('timed out') || msg.includes('40s')) {
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

/**
 * Executes generateContent using plain REST fetch:
 * - Uses the model selected in Settings first.
 * - Call listModels only if the first generate returns 404, then pick first available of candidate list.
 * - generationConfig: responseMimeType: "application/json", temperature: 0.1, thinkingConfig: { thinkingBudget: 0 }.
 * - Timeout 40s for generate, 5s for listModels, separate controllers.
 */
export async function generate(
  prompt: string,
  options?: { apiKey?: string; preferredModel?: string; signal?: AbortSignal; responseMimeType?: string }
): Promise<GenerateResult> {
  const key = options?.apiKey || getKey();
  if (!key) {
    console.error('Gemini generate: No API key set');
    return { ok: false, status: 0, message: 'No API key set' };
  }

  // 1. Initial model from settings or preferred option
  const initialModel = (options?.preferredModel || getSelectedModel() || CANDIDATE_MODELS[0]).replace(/^models\//, '');
  const triedModels: string[] = [initialModel];

  // Helper to execute single generate call with 40s timeout
  const executeGenerate = async (modelName: string): Promise<{ ok: boolean; status: number; text?: string; errorMsg?: string; isTimeout?: boolean }> => {
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

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
      const payload: any = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: options?.responseMimeType !== undefined ? options.responseMimeType : 'application/json',
          temperature: 0.1,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortListener);
      }

      if (!res.ok) {
        let errorMsg = res.statusText;
        try {
          const errData = await res.json();
          errorMsg = errData?.error?.message || errorMsg;
        } catch {}
        console.error(`Gemini REST error (${res.status}) on model ${modelName}:`, errorMsg);
        return { ok: false, status: res.status, errorMsg };
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') {
        return { ok: false, status: 200, errorMsg: 'Invalid response' };
      }

      return { ok: true, status: 200, text };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortListener);
      }
      console.error(`Gemini generate exception on model ${modelName}:`, err);
      if (isTimedOut || err?.name === 'AbortError') {
        return { ok: false, status: 408, isTimeout: true, errorMsg: 'AI timed out, used basic parsing' };
      }
      const status = Number(err?.status || 0);
      const msg = err?.message || String(err);
      return { ok: false, status, errorMsg: msg };
    }
  };

  // Attempt with selected model first
  const firstAttempt = await executeGenerate(initialModel);
  if (firstAttempt.ok && firstAttempt.text) {
    return {
      ok: true,
      text: firstAttempt.text,
      modelUsed: initialModel,
    };
  }

  if (firstAttempt.isTimeout || firstAttempt.status === 408) {
    return {
      ok: false,
      status: 408,
      message: 'AI timed out, used basic parsing',
      modelUsed: initialModel,
    };
  }

  // If first attempt returned 404, call listModels and try first candidate available
  if (firstAttempt.status === 404) {
    try {
      const pickedInfo = await pickModel(key, initialModel);
      const fallbackCandidates = pickedInfo.fallbackList.filter((m) => m !== initialModel);
      if (fallbackCandidates.length > 0) {
        const nextModel = fallbackCandidates[0];
        triedModels.push(nextModel);
        const secondAttempt = await executeGenerate(nextModel);
        if (secondAttempt.ok && secondAttempt.text) {
          return {
            ok: true,
            text: secondAttempt.text,
            modelUsed: nextModel,
          };
        }
        if (secondAttempt.isTimeout || secondAttempt.status === 408) {
          return {
            ok: false,
            status: 408,
            message: 'AI timed out, used basic parsing',
            modelUsed: nextModel,
          };
        }
        return {
          ok: false,
          status: secondAttempt.status,
          message: formatGeminiError(secondAttempt.status, secondAttempt.errorMsg || '', triedModels),
          modelUsed: nextModel,
        };
      }
    } catch (listErr: any) {
      console.error('Gemini listModels fallback failed after 404:', listErr);
    }
  }

  return {
    ok: false,
    status: firstAttempt.status,
    message: formatGeminiError(firstAttempt.status, firstAttempt.errorMsg || '', triedModels),
    modelUsed: initialModel,
  };
}
