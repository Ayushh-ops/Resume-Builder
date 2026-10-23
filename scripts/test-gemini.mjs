import * as fs from 'fs';
import * as path from 'path';

function findApiKey() {
  if (process.env.VITE_GEMINI_API_KEY) {
    return cleanKey(process.env.VITE_GEMINI_API_KEY);
  }

  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim();
          if (k === 'VITE_GEMINI_API_KEY' || k === 'GEMINI_API_KEY') {
            return cleanKey(v);
          }
        }
      }
    }
  }
  return '';
}

function cleanKey(raw) {
  if (!raw) return '';
  let str = raw.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

async function main() {
  const key = findApiKey();
  if (!key) {
    console.error('ERROR: No Gemini API key found in process.env or .env / .env.local');
    process.exit(1);
  }

  const hasWhitespace = /\s/.test(key);
  const first4 = key.slice(0, 4);
  const last4 = key.slice(-4);
  console.log(`Key length: ${key.length}`);
  console.log(`First 4: ${first4}, Last 4: ${last4}`);
  console.log(`Contains whitespace: ${hasWhitespace}`);
  console.log('----------------------------------------------------');

  // 1. List models
  console.log('1. GET /v1beta/models');
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`,
      { signal: AbortSignal.timeout(15000) }
    );
    console.log(`HTTP Status: ${listRes.status}`);
    const listBody = await listRes.text();
    if (!listRes.ok) {
      console.log(`Error body: ${listBody}`);
    } else {
      const parsed = JSON.parse(listBody);
      const contentModels = (parsed.models || [])
        .filter((m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => m.name);
      console.log(`Models supporting generateContent (${contentModels.length}):`);
      console.log(contentModels.join(', '));
    }
  } catch (err) {
    console.error(`Network error listing models:`, err.message);
  }
  console.log('----------------------------------------------------');

  // 2. Test models
  const testModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
  let firstWorkingModel = null;

  for (const model of testModels) {
    console.log(`2. POST /v1beta/models/${model}:generateContent`);
    const t0 = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply with the word ok' }] }],
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      const elapsed = Date.now() - t0;
      console.log(`HTTP Status: ${res.status} (${elapsed}ms)`);
      const bodyText = await res.text();
      if (!res.ok) {
        console.log(`Error body: ${bodyText}`);
      } else {
        if (!firstWorkingModel) firstWorkingModel = model;
        try {
          const parsed = JSON.parse(bodyText);
          const replyText = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? bodyText;
          console.log(`Reply text: ${JSON.stringify(replyText.trim())}`);
        } catch {
          console.log(`Response text: ${bodyText}`);
        }
      }
    } catch (err) {
      const elapsed = Date.now() - t0;
      console.error(`Network error (${elapsed}ms):`, err.message);
    }
    console.log('----------------------------------------------------');
  }

  // 3. Repeat first working model with generationConfig
  if (firstWorkingModel) {
    console.log(`3. Repeat ${firstWorkingModel} with generationConfig:`);
    console.log(`{ responseMimeType: "application/json", temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } }`);
    const t0 = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${firstWorkingModel}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply with the word ok in json: {"reply":"ok"}' }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      const elapsed = Date.now() - t0;
      console.log(`HTTP Status: ${res.status} (${elapsed}ms)`);
      const bodyText = await res.text();
      if (!res.ok) {
        console.log(`Error body: ${bodyText}`);
      } else {
        console.log(`Response body: ${bodyText}`);
      }
    } catch (err) {
      const elapsed = Date.now() - t0;
      console.error(`Network error (${elapsed}ms):`, err.message);
    }
  } else {
    console.log('3. Skipped generationConfig check because no tested model succeeded.');
  }
}

main();
