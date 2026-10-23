import * as fs from 'fs';
import * as path from 'path';
import { generate, pickModel } from '../src/lib/gemini';

function loadEnvKey(): string {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (k === 'VITE_GEMINI_API_KEY') {
          return v.replace(/^["']|["']$/g, '').trim();
        }
      }
    }
  }
  return '';
}

async function main() {
  const key = loadEnvKey();
  if (!key) {
    console.error('No key found in .env');
    process.exit(1);
  }

  const pickedInfo = await pickModel(key, true);
  const chosenModel = pickedInfo.picked;

  const t0 = Date.now();
  const res = await generate('Reply with the word ok', {
    apiKey: key,
    preferredModel: chosenModel,
  });
  const elapsed = Date.now() - t0;

  console.log('--- Real Gemini Probe Result ---');
  console.log(`Chosen model: ${res.modelUsed || chosenModel}`);
  console.log(`HTTP status: ${res.status}`);
  console.log(`Elapsed ms: ${elapsed}ms`);
  console.log(`Response text: ${JSON.stringify(res.text)}`);
  console.log('--------------------------------');
}

main().catch((err) => {
  console.error('Real probe error:', err);
  process.exit(1);
});
