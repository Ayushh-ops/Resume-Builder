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

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`;
  const res = await fetch(url);
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
}

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

  // If user preferred model exists in live list, prioritize it
  const pref = (preferredModel || getSelectedModel()).replace(/^models\//, '');
  const candidateOrder: string[] = [];
  if (pref && liveCleanNames.includes(pref)) {
    candidateOrder.push(pref);
  }

  for (const c of CANDIDATE_MODELS) {
    if (liveCleanNames.some((l) => l === c || l.endsWith(c)) && !candidateOrder.includes(c)) {
      candidateOrder.push(c);
    }
  }

  if (candidateOrder.length === 0) {
    // take the first listed model whose name contains "flash"
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
    const tried = triedModels.length > 0 ? `, tried ${triedModels.join(', ')}` : '';
    return `Model not found (404${tried})`;
  }

  if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
    return 'Rate limited (429)';
  }

  if (status === 408 || msg.includes('timeout') || msg.includes('timed out') || msg.includes('20s')) {
    return 'Timed out (20s)';
  }

  if (msg.includes('invalid response') || msg.includes('unexpected token') || msg.includes('json')) {
    return 'Invalid response';
  }

  if (msg.includes('no api key set')) {
    return 'No API key set';
  }

  return rawMessage || 'AI unavailable';
}

/**
 * Executes generateContent using plain REST fetch with 20s AbortController.
 * On 404 retry once with the next candidate.
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

  let candidates: string[] = [];
  try {
    const pickedInfo = await pickModel(key, options?.preferredModel);
    candidates = pickedInfo.fallbackList;
  } catch (err: any) {
    console.error('Gemini generate pickModel failed:', err);
    return {
      ok: false,
      status: Number(err?.status || 0),
      message: err?.message || 'No usable model for this key',
    };
  }

  const triedModels: string[] = [];
  // Try up to 2 candidates (the picked one and a retry on 404)
  const modelsToAttempt = candidates.slice(0, 2);

  for (let i = 0; i < modelsToAttempt.length; i++) {
    const model = modelsToAttempt[i];
    triedModels.push(model);

    const controller = new AbortController();
    let isTimedOut = false;
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, 20000);

    // Forward external abort if present
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const payload: any = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      };

      // Default responseMimeType is application/json as specified in instructions
      const mimeType = options?.responseMimeType !== undefined ? options.responseMimeType : 'application/json';
      if (mimeType) {
        payload.generationConfig = { responseMimeType: mimeType };
      }

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

        console.error(`Gemini REST error (${res.status}) on model ${model}:`, errorMsg);

        // On 404 retry once with the next candidate
        if (res.status === 404 && i === 0 && modelsToAttempt.length > 1) {
          continue;
        }

        const formatted = formatGeminiError(res.status, errorMsg, triedModels);
        return {
          ok: false,
          status: res.status,
          message: formatted,
          modelUsed: model,
        };
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') {
        return {
          ok: false,
          status: 200,
          message: 'Invalid response',
          modelUsed: model,
        };
      }

      return {
        ok: true,
        text,
        modelUsed: model,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortListener);
      }

      console.error(`Gemini generate exception on model ${model}:`, err);
      if (isTimedOut || err?.name === 'AbortError') {
        return {
          ok: false,
          status: 408,
          message: 'Timed out (20s)',
          modelUsed: model,
        };
      }

      const status = Number(err?.status || 0);
      const msg = err?.message || String(err);
      return {
        ok: false,
        status,
        message: formatGeminiError(status, msg, triedModels),
        modelUsed: model,
      };
    }
  }

  return {
    ok: false,
    status: 404,
    message: formatGeminiError(404, 'Model not found', triedModels),
  };
}
