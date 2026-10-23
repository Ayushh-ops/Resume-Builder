import * as fs from 'fs';
import * as path from 'path';
import { extractLinesFromPdf } from '../src/lib/import/extract';
import { fallbackRegexParser } from '../src/services/resumeParser';
import { reviewResumeWithAI } from '../src/services/aiReview';

if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

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

  process.env.VITE_GEMINI_API_KEY = key;

  // ==========================================
  // PART 1: TEST WITH KNOWN-WEAK FIXTURE
  // ==========================================
  console.log('====================================================');
  console.log('PART 1: REAL AI REVIEW ON tests/fixtures/weak-resume.json');
  console.log('====================================================');
  const weakFixturePath = path.resolve(process.cwd(), 'tests/fixtures/weak-resume.json');
  const weakData = JSON.parse(fs.readFileSync(weakFixturePath, 'utf8'));

  const tWeak = Date.now();
  const weakResult = await reviewResumeWithAI(weakData, { apiKey: key });
  const msWeak = Date.now() - tWeak;

  console.log(`\nModel Used: ${weakResult.modelUsed} ${weakResult.isLiteFallback ? '(lite fallback)' : '(main)'}`);
  console.log(`Status line: ${weakResult.probeStatusMessage || ''}`);
  console.log(`Status text: ${weakResult.statusText}`);
  console.log(`Latency:     ${msWeak}ms`);
  console.log(`Counts:      Model returned ${weakResult.rawCount}, accepted ${weakResult.accepted.length}, rejected ${weakResult.rejected.length}`);

  if (weakResult.rejected.length > 0) {
    console.log('\nRejected suggestions:');
    weakResult.rejected.forEach((r, i) => {
      console.log(`  [${i + 1}] "${r.suggestion?.title}": ${r.reason}`);
    });
  }

  console.log(`\nAccepted suggestion pairs (Count: ${weakResult.accepted.length}):`);
  weakResult.accepted.forEach((a, i) => {
    console.log(`\n  [${i + 1}] Issue: [${a.issue}] - ${a.title}`);
    console.log(`      Before: "${a.before}"`);
    console.log(`      After:  "${a.after}"`);
    console.log(`      Why:    "${a.explanation}"`);
  });

  if (weakResult.accepted.length < 3) {
    console.error(`\n[FAILURE] Weak fixture required at least 3 accepted suggestions, got ${weakResult.accepted.length}`);
    process.exit(1);
  } else {
    console.log(`\n[SUCCESS] Weak fixture passed requirement: accepted ${weakResult.accepted.length} >= 3`);
  }

  // ==========================================
  // PART 2: REAL AI REVIEW ON ./resume.pdf
  // ==========================================
  console.log('\n====================================================');
  console.log('PART 2: REAL AI REVIEW ON ./resume.pdf DATA');
  console.log('====================================================');

  const pdfBuffer = fs.readFileSync(path.resolve(process.cwd(), 'resume.pdf'));
  const lines = await extractLinesFromPdf(pdfBuffer);
  const rawText = lines.map((l) => l.text).join('\n');
  const resumeData = fallbackRegexParser(rawText, 'resume.pdf', lines);

  const tResume = Date.now();
  const resumeResult = await reviewResumeWithAI(resumeData as any, { apiKey: key });
  const msResume = Date.now() - tResume;

  console.log(`\nModel Used: ${resumeResult.modelUsed} ${resumeResult.isLiteFallback ? '(lite fallback)' : '(main)'}`);
  console.log(`Status line: ${resumeResult.probeStatusMessage || ''}`);
  console.log(`Status text: ${resumeResult.statusText}`);
  console.log(`Latency:     ${msResume}ms`);
  console.log(`Counts:      Model returned ${resumeResult.rawCount}, accepted ${resumeResult.accepted.length}, rejected ${resumeResult.rejected.length}`);

  if (resumeResult.rejected.length > 0) {
    console.log('\nRejected suggestions:');
    resumeResult.rejected.forEach((r, i) => {
      console.log(`  [${i + 1}] "${r.suggestion?.title}": ${r.reason}`);
    });
  }

  if (resumeResult.accepted.length > 0) {
    console.log(`\nAccepted suggestion pairs (Count: ${resumeResult.accepted.length}):`);
    resumeResult.accepted.forEach((a, i) => {
      console.log(`\n  [${i + 1}] Issue: [${a.issue}] - ${a.title}`);
      console.log(`      Before: "${a.before}"`);
      console.log(`      After:  "${a.after}"`);
      console.log(`      Why:    "${a.explanation}"`);
    });
  }

  if (resumeResult.rawCount === 0) {
    console.log('\nModel returned 0 suggestions. Raw model response snippet (first 500 chars):');
    console.log(resumeResult.rawResponseSnippet || '(empty response)');
  }

  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('AI review execution error:', err);
  process.exit(1);
});
