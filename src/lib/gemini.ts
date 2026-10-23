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
const WORKING_MODEL_KEY = 'resumecraft_gemini_working_model';
const REQUEST_LOG_KEY = 'resumecraft_gemini_request_log';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fallback in-memory store for environments where localStorage is not available (e.g. Node tests)
const inMemoryStore = new Map<string, string>();

export function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {}
  return inMemoryStore.get(key) || null;
}

export function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(key, value);
    }
  } catch {}
  inMemoryStore.set(key, value);
}

export function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      localStorage.removeItem(key);
    }
  } catch {}
  inMemoryStore.delete(key);
}

// Minimum 2-second gap tracker between consecutive Gemini API requests
let lastGeminiCallEndTime = 0;

export async function ensureCallGap(): Promise<void> {
  const proc = (globalThis as any).process;
  if (proc && (proc.env?.VITEST || proc.env?.NODE_ENV === 'test')) {
    return;
  }
  const now = Date.now();
  const elapsed = now - lastGeminiCallEndTime;
  if (elapsed < 2000) {
    const delay = 2000 - elapsed;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export function recordCallEndTime(): void {
  lastGeminiCallEndTime = Date.now();
}

/**
 * Global Request Counter:
 * Tracks requests per minute (cpm) and per day (cpd) per model in dev logs.
 */
interface RequestRecord {
  timestamp: number;
  model: string;
}

export function recordGeminiRequest(model: string): { cpm: number; cpd: number } {
  const now = Date.now();
  let log: RequestRecord[] = [];
  try {
    const raw = getStorageItem(REQUEST_LOG_KEY);
    if (raw) log = JSON.parse(raw);
  } catch {}
  if (!Array.isArray(log)) log = [];

  // Retain records within the last 24h
  log = log.filter((r) => now - r.timestamp < 24 * 60 * 60 * 1000);
  log.push({ timestamp: now, model });
  setStorageItem(REQUEST_LOG_KEY, JSON.stringify(log));

  const modelLogs = log.filter((r) => r.model === model);
  const cpm = modelLogs.filter((r) => now - r.timestamp <= 60 * 1000).length;
  const cpd = modelLogs.length;

  console.log(`[Gemini Request Counter] model=${model} | ${cpm} calls/min | ${cpd} calls today`);
  return { cpm, cpd };
}

export function getGeminiRequestStats(model?: string): { cpm: number; cpd: number; text: string } {
  const now = Date.now();
  let log: RequestRecord[] = [];
  try {
    const raw = getStorageItem(REQUEST_LOG_KEY);
    if (raw) log = JSON.parse(raw);
  } catch {}
  if (!Array.isArray(log)) log = [];

  const targetModel = (model || getSelectedModel() || FALLBACK_MODELS[0]).replace(/^models\//, '');
  const modelLogs = log.filter((r) => r.model === targetModel);
  const cpm = modelLogs.filter((r) => now - r.timestamp <= 60 * 1000).length;
  const cpd = modelLogs.filter((r) => now - r.timestamp <= 24 * 60 * 60 * 1000).length;

  return {
    cpm,
    cpd,
    text: `${cpm} call${cpm === 1 ? '' : 's'}/min, ${cpd} call${cpd === 1 ? '' : 's'} today (${targetModel})`,
  };
}

/**
 * Working model cache (with timestamp) to avoid probing 4 models on every review.
 */
export function getWorkingModel(): { model: string; timestamp: number } | null {
  try {
    const raw = getStorageItem(WORKING_MODEL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.model === 'string' && typeof parsed.timestamp === 'number') {
      return parsed;
    }
  } catch {}
  return null;
}

export function setWorkingModel(model: string): void {
  setStorageItem(
    WORKING_MODEL_KEY,
    JSON.stringify({ model: model.replace(/^models\//, ''), timestamp: Date.now() })
  );
}

export function clearWorkingModel(): void {
  removeStorageItem(WORKING_MODEL_KEY);
}

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
  let key = getStorageItem(LOCAL_STORAGE_KEY) || '';
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
  const localKey = getStorageItem(LOCAL_STORAGE_KEY) || '';
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
    setStorageItem(LOCAL_STORAGE_KEY, cleaned);
  } else {
    removeStorageItem(LOCAL_STORAGE_KEY);
  }
}

export function clearSavedKey(): void {
  removeStorageItem(LOCAL_STORAGE_KEY);
}

export function getSelectedModel(): string {
  const saved = getStorageItem(LOCAL_STORAGE_MODEL_KEY);
  if (saved) return saved;
  return FALLBACK_MODELS[0];
}

export function setSelectedModel(model: string): void {
  setStorageItem(LOCAL_STORAGE_MODEL_KEY, model.replace(/^models\//, ''));
}

export function clearSelectedModel(): void {
  removeStorageItem(LOCAL_STORAGE_MODEL_KEY);
}

export function getCachedModels(): string[] | null {
  try {
    const raw = getStorageItem(CACHE_KEY);
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
  setStorageItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), models }));
}

export function clearCachedModels(): void {
  removeStorageItem(CACHE_KEY);
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

export interface Parsed429Info {
  isQuota: boolean;
  isDaily: boolean;
  retryDelaySeconds?: number;
  retryMessage?: string;
}

export function parse429Error(
  resText: string,
  headers?: Record<string, string> | Headers
): Parsed429Info {
  let retryDelaySeconds: number | undefined;
  let isDaily = false;
  let retryMessage = '';

  try {
    const json = JSON.parse(resText);
    const err = json?.error || json;
    const msg = String(err?.message || '');

    const details: any[] = Array.isArray(err?.details) ? err.details : [];
    for (const d of details) {
      if (d?.retryDelay && typeof d.retryDelay === 'string') {
        const match = d.retryDelay.match(/^(\d+(?:\.\d+)?)s?$/);
        if (match) {
          retryDelaySeconds = Math.round(parseFloat(match[1]));
        }
      }
      if (
        d?.violations &&
        Array.isArray(d.violations) &&
        d.violations.some((v: any) =>
          String(v?.description || '').toLowerCase().includes('per day') ||
          String(v?.quotaId || '').toLowerCase().includes('perday')
        )
      ) {
        isDaily = true;
      }
    }

    if (
      msg.toLowerCase().includes('per day limit') ||
      msg.toLowerCase().includes('requests per day') ||
      msg.toLowerCase().includes('daily quota')
    ) {
      isDaily = true;
    }

    if (retryDelaySeconds === undefined) {
      const retryInMatch = msg.match(/retry (?:in|after) (?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/i);
      if (retryInMatch) {
        const hours = parseInt(retryInMatch[1] || '0', 10);
        const mins = parseInt(retryInMatch[2] || '0', 10);
        const secs = parseFloat(retryInMatch[3] || '0');
        const total = hours * 3600 + mins * 60 + secs;
        if (total > 0) {
          retryDelaySeconds = Math.round(total);
        }
      }
    }
  } catch {}

  if (retryDelaySeconds === undefined && headers) {
    let headerVal = '';
    if (typeof (headers as any)?.get === 'function') {
      headerVal = (headers as Headers).get('retry-after') || '';
    } else if (typeof headers === 'object') {
      headerVal = (headers as Record<string, string>)['retry-after'] || '';
    }
    if (headerVal && /^\d+$/.test(headerVal.trim())) {
      retryDelaySeconds = parseInt(headerVal.trim(), 10);
    }
  }

  if (typeof retryDelaySeconds === 'number' && retryDelaySeconds >= 90) {
    isDaily = true;
  }

  if (typeof retryDelaySeconds === 'number') {
    if (retryDelaySeconds >= 3600) {
      const h = Math.floor(retryDelaySeconds / 3600);
      const m = Math.floor((retryDelaySeconds % 3600) / 60);
      retryMessage = `${h}h ${m}m`;
    } else if (retryDelaySeconds >= 60) {
      const m = Math.floor(retryDelaySeconds / 60);
      const s = retryDelaySeconds % 60;
      retryMessage = `${m}m ${s}s`;
    } else {
      retryMessage = `${retryDelaySeconds}s`;
    }
  }

  return {
    isQuota: true,
    isDaily,
    retryDelaySeconds,
    retryMessage,
  };
}

/**
 * Probes a candidate model with a 1-token request (8s timeout).
 */
export async function probeModel(
  modelName: string,
  apiKey?: string
): Promise<{ ok: boolean; status: number; elapsedMs: number; errorMsg?: string; quotaInfo?: Parsed429Info }> {
  const key = apiKey || getKey();
  if (!key) {
    return { ok: false, status: 0, elapsedMs: 0, errorMsg: 'No API key set' };
  }

  await ensureCallGap();
  const cleanName = modelName.replace(/^models\//, '');
  recordGeminiRequest(cleanName);

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
    recordCallEndTime();
    const elapsedMs = Date.now() - startTime;
    const resText = await res.text();

    if (res.ok) {
      return { ok: true, status: res.status, elapsedMs };
    }

    let errorMsg = res.statusText;
    let quotaInfo: Parsed429Info | undefined;
    try {
      const errJson = JSON.parse(resText);
      errorMsg = errJson?.error?.message || errorMsg;
    } catch {}

    if (res.status === 429) {
      quotaInfo = parse429Error(resText, res.headers);
    }

    return { ok: false, status: res.status, elapsedMs, errorMsg, quotaInfo };
  } catch (err: any) {
    clearTimeout(timeoutId);
    recordCallEndTime();
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

export interface ModelProbeResult {
  model: string;
  status: number;
  elapsedMs: number;
  errorMsg?: string;
  quotaInfo?: Parsed429Info;
}

export interface ModelSelectionResult {
  chosenModel: string;
  isLite: boolean;
  probeTable: ModelProbeResult[];
  statusMessage: string;
}

export function logProbeTable(
  probeTable: ModelProbeResult[],
  chosen: string,
  isLite: boolean,
  statusMsg: string
): void {
  console.log('\n--- Gemini Model Probe Table ---');
  console.log('Model'.padEnd(25) + ' | ' + 'Status'.padEnd(7) + ' | ' + 'Latency'.padEnd(9) + ' | Result');
  console.log('-'.repeat(68));
  for (const p of probeTable) {
    const res = p.status === 200 ? 'OK' : (p.errorMsg || 'Failed').slice(0, 28);
    console.log(`${p.model.padEnd(25)} | ${String(p.status).padEnd(7)} | ${(p.elapsedMs + 'ms').padEnd(9)} | ${res}`);
  }
  console.log('-'.repeat(68));
  console.log(`Chosen model: ${chosen}${isLite ? ' (lite fallback)' : ''}`);
  console.log(`Status line:  ${statusMsg}`);
  console.log('--------------------------------\n');
}

/**
 * Selects the main model:
 * 1. Checks cached working model first. If cached, reuses it without probing 4 models.
 * 2. Probes only when there is no cached working model, or when forced (forceRefresh/excludeModel).
 * 3. Never silently falls to flash-lite unless allowLiteFallback is explicitly enabled.
 */
export async function selectMainModel(
  apiKey?: string,
  preferredModel?: string,
  forceRefresh: boolean = false,
  excludeModel?: string,
  allowLiteFallback: boolean = false
): Promise<ModelSelectionResult> {
  const key = apiKey || getKey();

  // 1. Re-use cached working model if present and not force-refreshing
  if (!forceRefresh && !excludeModel) {
    const cached = getWorkingModel();
    if (cached?.model) {
      const cleanCached = cached.model.replace(/^models\//, '');
      const isLite = cleanCached.endsWith('-lite');
      if (!isLite || allowLiteFallback) {
        return {
          chosenModel: cleanCached,
          isLite,
          probeTable: [],
          statusMessage: `Using cached model: ${cleanCached}`,
        };
      }
    }
  }

  let allCandidates = await listModels(key, forceRefresh);
  if (excludeModel) {
    allCandidates = allCandidates.filter((m) => m !== excludeModel);
  }

  const mainModels = allCandidates.filter((m) => !m.endsWith('-lite'));
  const liteModels = allCandidates.filter((m) => m.endsWith('-lite'));

  const probeTable: ModelProbeResult[] = [];
  const probeOrder: string[] = [];

  const userSaved = (preferredModel || getSelectedModel() || '').replace(/^models\//, '');
  if (userSaved && userSaved !== excludeModel && mainModels.includes(userSaved)) {
    probeOrder.push(userSaved);
  }
  for (const m of mainModels) {
    if (!probeOrder.includes(m)) probeOrder.push(m);
  }

  // 2a. Probe main (non-lite) models first
  for (const model of probeOrder) {
    const probe = await probeModel(model, key);
    probeTable.push({
      model,
      status: probe.status,
      elapsedMs: probe.elapsedMs,
      errorMsg: probe.errorMsg,
      quotaInfo: probe.quotaInfo,
    });
    if (probe.ok) {
      setSelectedModel(model);
      setWorkingModel(model);
      const msg = `Using main model: ${model} (${probe.elapsedMs}ms)`;
      logProbeTable(probeTable, model, false, msg);
      return {
        chosenModel: model,
        isLite: false,
        probeTable,
        statusMessage: msg,
      };
    }
  }

  // 2b. Probe lite models if all non-lite failed and allowLiteFallback is active
  const failedNonLiteSummary = probeTable.map((p) => `${p.model}: ${p.status}`).join(', ');
  for (const model of liteModels) {
    const probe = await probeModel(model, key);
    probeTable.push({
      model,
      status: probe.status,
      elapsedMs: probe.elapsedMs,
      errorMsg: probe.errorMsg,
      quotaInfo: probe.quotaInfo,
    });
    if (probe.ok) {
      setSelectedModel(model);
      setWorkingModel(model);
      const msg = `Every non-lite model failed [${failedNonLiteSummary}]. Falling back to lite: ${model} (${probe.elapsedMs}ms)`;
      logProbeTable(probeTable, model, true, msg);
      return {
        chosenModel: model,
        isLite: true,
        probeTable,
        statusMessage: msg,
      };
    }
  }

  // 2c. Fallback if all candidates fail
  const fallback = allCandidates[0] || (excludeModel === FALLBACK_MODELS[0] ? FALLBACK_MODELS[1] : FALLBACK_MODELS[0]);
  const msg = `All candidate models failed [${failedNonLiteSummary}]. Defaulting to ${fallback}.`;
  logProbeTable(probeTable, fallback, false, msg);
  return {
    chosenModel: fallback,
    isLite: false,
    probeTable,
    statusMessage: msg,
  };
}

/**
 * Pick the model:
 * Probes candidates in order prioritizing main models, saves working model.
 */
export async function pickModel(
  apiKey?: string,
  forceRefresh: boolean = false,
  excludeModel?: string
): Promise<{ picked: string; fallbackList: string[]; probeTable?: ModelProbeResult[] }> {
  const result = await selectMainModel(apiKey, undefined, forceRefresh, excludeModel);
  let candidates = await listModels(apiKey, false);
  if (excludeModel) {
    candidates = candidates.filter((c) => c !== excludeModel);
  }
  return {
    picked: result.chosenModel,
    fallbackList: candidates,
    probeTable: result.probeTable,
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

export interface GenerateResult {
  ok: boolean;
  text?: string;
  modelUsed?: string;
  status?: number;
  message?: string;
  quotaInfo?: Parsed429Info;
}

export interface GenerateOptions {
  apiKey?: string;
  preferredModel?: string;
  signal?: AbortSignal;
  responseMimeType?: string;
  responseSchema?: any;
  temperature?: number;
  onRateLimitCountdown?: (secondsRemaining: number) => void;
}

/**
 * Executes generateContent using plain REST fetch:
 * - Dynamically determines model; re-picks and retries if 404/410/403.
 * - Handles 429 separately: auto-retries transient (<90s) limits with countdown, stops on daily quotas.
 * - Enforces minimum 2-second gap between consecutive calls.
 * - Tracks requests per minute & day in global request counter.
 * - Keeps thinkingConfig { thinkingBudget: 0 } but retries once without it on HTTP 400.
 * - Timeout 40s.
 */
export async function generate(
  prompt: string,
  options?: GenerateOptions
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
  ): Promise<{
    ok: boolean;
    status: number;
    text?: string;
    errorMsg?: string;
    isTimeout?: boolean;
    quotaInfo?: Parsed429Info;
  }> => {
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

    await ensureCallGap();
    recordGeminiRequest(modelName);

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
        temperature: typeof options?.temperature === 'number' ? options.temperature : 0.1,
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
      let res = await fetch(url, {
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
      recordCallEndTime();

      let elapsedMs = Date.now() - startTime;
      let resText = await res.text();
      let first300 = resText.slice(0, 300);

      // Handle 429: Rate limit / Quota
      if (res.status === 429) {
        const quota = parse429Error(resText, res.headers);
        console.warn(
          `[Gemini REST] 429 on model=${modelName}: isDaily=${quota.isDaily}, delay=${quota.retryDelaySeconds}s`
        );

        // If per-minute transient limit (<90s), wait and auto-retry once
        if (!quota.isDaily && quota.retryDelaySeconds && quota.retryDelaySeconds < 90) {
          console.log(`[Gemini REST] Transient 429 limit. Retrying in ${quota.retryDelaySeconds}s...`);
          let secsLeft = quota.retryDelaySeconds;
          while (secsLeft > 0) {
            if (options?.onRateLimitCountdown) {
              options.onRateLimitCountdown(secsLeft);
            }
            await new Promise((r) => setTimeout(r, 1000));
            secsLeft--;
          }
          if (options?.onRateLimitCountdown) {
            options.onRateLimitCountdown(0);
          }

          // Retry once
          await ensureCallGap();
          recordGeminiRequest(modelName);
          const retryRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: bodyString,
            signal: controller.signal,
          });
          recordCallEndTime();
          if (retryRes.ok) {
            const retryText = await retryRes.text();
            try {
              const retryJson = JSON.parse(retryText);
              const t = retryJson?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (typeof t === 'string') {
                return { ok: true, status: 200, text: t };
              }
            } catch {}
          }
        }

        // Daily quota or retry still failed
        return {
          ok: false,
          status: 429,
          quotaInfo: quota,
          errorMsg: `Daily quota reached for ${modelName}. Resets later.`,
        };
      }

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
      recordCallEndTime();
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
  ): Promise<{
    ok: boolean;
    status: number;
    text?: string;
    errorMsg?: string;
    isTimeout?: boolean;
    quotaInfo?: Parsed429Info;
  }> => {
    triedModels.push(modelName);
    let attempt = await executeOnce(modelName, true);
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

  // Handle 429: Do not mark model as broken, do not clear working model. Return daily quota status directly.
  if (result.status === 429) {
    return {
      ok: false,
      status: 429,
      quotaInfo: result.quotaInfo,
      message: result.errorMsg || `Daily quota reached for ${currentModel}. Resets later.`,
      modelUsed: currentModel,
    };
  }

  // If 404, 410, 503, or 403: model or key is invalid/missing, clear cache and re-pick
  let attempts = 0;
  while ((result.status === 404 || result.status === 410 || result.status === 503 || result.status === 403) && attempts < 3) {
    attempts++;
    console.warn(`[Gemini REST] model ${currentModel} returned ${result.status}, re-picking dynamically (attempt ${attempts})...`);
    clearWorkingModel();
    clearCachedModels();
    clearSelectedModel();

    try {
      const pickedInfo = await pickModel(key, true, currentModel);
      const nextModel = pickedInfo.picked;
      if (nextModel && !triedModels.includes(nextModel)) {
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
      } else {
        break;
      }
    } catch (rePickErr) {
      console.error('[Gemini REST] re-picking model failed:', rePickErr);
      break;
    }
  }

  return {
    ok: false,
    status: result.status,
    message: formatGeminiError(result.status, result.errorMsg || '', triedModels),
    modelUsed: currentModel,
    quotaInfo: result.quotaInfo,
  };
}
