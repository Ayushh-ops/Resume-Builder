import * as fs from 'fs';
import * as path from 'path';
import { extractLinesFromPdf } from '../src/lib/import/extract';
import { fallbackRegexParser } from '../src/services/resumeParser';
import { reviewResumeWithAI } from '../src/services/aiReview';

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

  console.log('1. Loading and parsing ./resume.pdf...');
  const pdfBuffer = fs.readFileSync(path.resolve(process.cwd(), 'resume.pdf'));
  const lines = await extractLinesFromPdf(pdfBuffer);
  const rawText = lines.map((l) => l.text).join('\n');
  const parsedData = fallbackRegexParser(rawText, 'resume.pdf', lines);

  console.log(`Parsed name: ${parsedData.personalInfo?.fullName}`);
  console.log(`Parsed experience roles: ${parsedData.experience?.length}`);
  console.log(`Parsed skills categories: ${parsedData.skills?.length}`);

  console.log('\n2. Calling reviewResumeWithAI on ./resume.pdf data...');
  const t0 = Date.now();
  const result = await reviewResumeWithAI(parsedData as any);
  const elapsed = Date.now() - t0;

  console.log('\n--- AI Resume Review Results ---');
  console.log(`Elapsed time: ${elapsed}ms`);
  console.log(`Accepted suggestions count: ${result.accepted.length}`);
  console.log(`Rejected suggestions count: ${result.rejected.length}`);

  if (result.rejected.length > 0) {
    console.log('\nRejected reasons:');
    result.rejected.forEach((r, i) => {
      console.log(`  [${i + 1}] Reason: ${r.reason}`);
    });
  }

  if (result.accepted.length > 0) {
    console.log('\nFirst Accepted Suggestion:');
    console.log(JSON.stringify(result.accepted[0], null, 2));
  }
  console.log('--------------------------------');
}

main().catch((err) => {
  console.error('AI review execution error:', err);
  process.exit(1);
});
