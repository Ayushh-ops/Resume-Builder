import * as fs from 'fs';
import * as path from 'path';
import { extractLinesFromPdf } from '../src/lib/import/extract';
import { fallbackRegexParser } from '../src/services/resumeParser';
import { calculateConfidenceAndCounts } from '../src/lib/import/confidence';
import { DATE_RANGE_REGEX } from '../src/lib/import/parse';

async function run() {
  console.log('=== RUNNING IMPORTER VERIFICATION ON ./resume.pdf ===');
  const pdfPath = path.resolve(process.cwd(), 'resume.pdf');
  const rawLinesPath = path.resolve(process.cwd(), 'debug/raw-lines.txt');

  const pdfBuffer = fs.readFileSync(pdfPath);
  const rawLinesContent = fs.readFileSync(rawLinesPath, 'utf-8');
  const rawLines = rawLinesContent.split('\n');

  // Derive counts dynamically
  let expStart = false;
  let derivedExpCount = 0;
  for (const l of rawLines) {
    if (l.includes('PROFESSIONAL EXPERIENCE')) {
      expStart = true;
      continue;
    }
    if (expStart && (l.includes('PROJECTS') || l.includes('EDUCATION'))) {
      expStart = false;
      break;
    }
    if (expStart && DATE_RANGE_REGEX.test(l)) {
      derivedExpCount++;
    }
  }

  let eduStart = false;
  let derivedEduCount = 0;
  for (const l of rawLines) {
    if (l.includes('EDUCATION')) {
      eduStart = true;
      continue;
    }
    if (eduStart && (l.includes('TECHNICAL SKILLS') || l.includes('PROFESSIONAL EXPERIENCE'))) {
      eduStart = false;
      break;
    }
    if (eduStart && /\b(?:b\.?tech|b\.?e\.?|bachelor|master)\b/i.test(l)) {
      derivedEduCount++;
    }
  }

  console.log(`[Derived Metrics from raw-lines.txt] Experience date ranges: ${derivedExpCount}, Education degrees: ${derivedEduCount}`);

  const lines = await extractLinesFromPdf(pdfBuffer);
  const fullText = lines.map((l) => l.text).join('\n');
  const parsed = fallbackRegexParser(fullText, 'resume.pdf', lines);
  const { confidence, counts } = calculateConfidenceAndCounts(parsed);

  const checks: { name: string; pass: boolean; details?: string }[] = [];

  // Check 1: Raw tokens
  const hasTokens =
    fullText.includes('real time') &&
    fullText.includes('consumption') &&
    fullText.includes('running') &&
    fullText.includes('Remote') &&
    fullText.includes('(IBM');
  checks.push({
    name: 'Raw extraction tokens intact (real time, consumption, running, Remote, (IBM))',
    pass: hasTokens,
  });

  // Check 2: Word boundaries
  const rawWords = new Set(
    rawLinesContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  let allWordsFound = true;
  let missingWord = '';
  const scanWords = (val: any, key?: string) => {
    if (key === 'id' || key === 'link' || key === 'githubLink' || key === 'website') return;
    if (typeof val === 'string') {
      const words = val.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !/^\d+$/.test(w));
      for (const w of words) {
        if (w.includes('http') || w.includes('exp-') || w.includes('edu-') || w.includes('skill-') || w.includes('proj-')) continue;
        if (!rawWords.has(w)) {
          allWordsFound = false;
          missingWord = w;
        }
      }
    } else if (Array.isArray(val)) {
      val.forEach((item) => scanWords(item, key));
    } else if (val && typeof val === 'object') {
      for (const [k, v] of Object.entries(val)) {
        scanWords(v, k);
      }
    }
  };
  scanWords(parsed);
  checks.push({
    name: 'No parsed field ends mid-word (all words exist in raw dump)',
    pass: allWordsFound,
    details: allWordsFound ? undefined : `Missing word: "${missingWord}"`,
  });

  // Check 3: Name
  const isNameValid = parsed.personalInfo?.fullName === 'Sachin Verma';
  checks.push({
    name: 'Parsed name is exactly "Sachin Verma"',
    pass: isNameValid,
    details: `Actual: "${parsed.personalInfo?.fullName}"`,
  });

  // Check 4: Location
  const isLocationValid = parsed.personalInfo?.location === 'Varanasi, Uttar Pradesh';
  checks.push({
    name: 'Parsed location is "Varanasi, Uttar Pradesh"',
    pass: isLocationValid,
    details: `Actual: "${parsed.personalInfo?.location}"`,
  });

  // Check 5: Experience
  const expList = parsed.experience || [];
  const expCountPass = expList.length === derivedExpCount;
  const expMetadataPass = expList.every(
    (e) => e.position && e.company && e.startDate && e.endDate && !e.position.includes('Remote')
  );
  checks.push({
    name: `Experience count equals derived date ranges (${expList.length} == ${derivedExpCount}) with valid metadata`,
    pass: expCountPass && expMetadataPass,
    details: `Parsed: ${expList.length}, Derived: ${derivedExpCount}`,
  });

  // Check 6: Education
  const eduList = parsed.education || [];
  const eduPass = eduList.length === derivedEduCount && eduList.length > 0;
  checks.push({
    name: `Education count equals derived degree lines (${eduList.length} == ${derivedEduCount}) and > 0`,
    pass: eduPass,
    details: `Parsed: ${eduList.length}, Derived: ${derivedEduCount}`,
  });

  // Check 7: Skills
  const skills = parsed.skills || [];
  let skillsPass = skills.length > 0;
  for (const cat of skills) {
    if (/^label:/i.test(cat.name)) skillsPass = false;
    for (const sk of cat.skills) {
      if (sk.split(/\s+/).length > 4) skillsPass = false;
      if (/^[a-z\s]+:/i.test(sk)) skillsPass = false;
    }
  }
  checks.push({
    name: 'Skills has no items > 4 words and no Label: prefixes',
    pass: skillsPass,
  });

  // Check 8: Confidence
  let confPass = true;
  for (const sec of ['personalInfo', 'summary', 'experience', 'education', 'skills', 'projects']) {
    const c = counts[sec] ?? 0;
    const p = confidence[sec] ?? 0;
    if (c === 0 && p !== 0) confPass = false;
    if (c > 0 && p === 0) confPass = false;
  }
  checks.push({
    name: 'Confidence % is 0 if and only if count is 0',
    pass: confPass,
  });

  console.log('\n--- TEST RESULTS ---');
  let allPassed = true;
  for (const c of checks) {
    const status = c.pass ? 'PASS' : 'FAIL';
    if (!c.pass) allPassed = false;
    console.log(`[${status}] ${c.name}${c.details ? ` (${c.details})` : ''}`);
  }

  console.log('\n--- DETAILED SUMMARY OF EXTRACTED FIELDS ---');
  console.log('Name:', parsed.personalInfo?.fullName);
  console.log('Title:', parsed.personalInfo?.jobTitle);
  console.log('Location:', parsed.personalInfo?.location);
  console.log('Email:', parsed.personalInfo?.email);
  console.log('Phone:', parsed.personalInfo?.phone);
  console.log('LinkedIn:', parsed.personalInfo?.linkedin);
  console.log('GitHub:', parsed.personalInfo?.github);
  console.log('Experience roles:', expList.map((e) => `${e.position} at ${e.company} [${e.startDate} - ${e.endDate}] (${e.location})`));
  console.log('Education degrees:', eduList.map((ed) => `${ed.degree} from ${ed.institution} (${ed.grade}) [${ed.startDate} - ${ed.endDate}]`));
  console.log('Total skills count:', counts['skills']);
  console.log('Projects count:', (parsed.projects || []).length);
  console.log('Confidence scores:', confidence);

  if (!allPassed) {
    console.error('\nFAILURE: Some tests did not pass!');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All tests passed!');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
