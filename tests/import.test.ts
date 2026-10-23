import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractLinesFromPdf } from '../src/lib/import/extract';
import { fallbackRegexParser } from '../src/services/resumeParser';
import { calculateConfidenceAndCounts } from '../src/lib/import/confidence';
import { DATE_RANGE_REGEX } from '../src/lib/import/parse';

describe('Resume Importer Rebuild Tests', () => {
  const pdfPath = path.resolve(process.cwd(), 'resume.pdf');
  const rawLinesPath = path.resolve(process.cwd(), 'debug/raw-lines.txt');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const rawLinesContent = fs.readFileSync(rawLinesPath, 'utf-8');
  const rawLines = rawLinesContent.split('\n');

  // Derive experience and education count dynamically from debug/raw-lines.txt
  // 1. Experience lines are between [p1 y=569.9] PROFESSIONAL EXPERIENCE and [p1 y=458.5] PROJECTS
  let expStart = false;
  let expDateCount = 0;
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
      expDateCount++;
    }
  }

  // 2. Education lines: between EDUCATION and TECHNICAL SKILLS
  let eduStart = false;
  let eduLineCount = 0;
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
      eduLineCount++;
    }
  }

  console.log(`[Derived Metrics from raw-lines.txt] Experience date ranges: ${expDateCount}, Education degrees: ${eduLineCount}`);

  it('raw extraction preserves critical tokens intact', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const fullText = lines.map((l) => l.text).join('\n');

    expect(fullText).toContain('real time');
    expect(fullText).toContain('consumption');
    expect(fullText).toContain('running');
    expect(fullText).toContain('Remote');
    expect(fullText).toContain('(IBM');
  });

  it('no parsed field ends mid-word (every parsed word exists in raw-lines.txt)', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const parsed = fallbackRegexParser(lines.map((l) => l.text).join('\n'), 'resume.pdf', lines);

    // Build dictionary of words in raw-lines.txt
    const rawWords = new Set(
      rawLinesContent
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

    // Collect all words from parsed string values
    const checkWordsInField = (val: any, key?: string) => {
      if (key === 'id' || key === 'link' || key === 'githubLink' || key === 'website') return;
      if (typeof val === 'string') {
        const words = val.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !/^\d+$/.test(w));
        for (const w of words) {
          // URLs or custom IDs can be skipped
          if (w.includes('http') || w.includes('exp-') || w.includes('edu-') || w.includes('skill-') || w.includes('proj-')) continue;
          expect(rawWords.has(w), `Word "${w}" should exist in raw-lines.txt`).toBe(true);
        }
      } else if (Array.isArray(val)) {
        val.forEach((item) => checkWordsInField(item, key));
      } else if (val && typeof val === 'object') {
        for (const [k, v] of Object.entries(val)) {
          checkWordsInField(v, k);
        }
      }
    };

    checkWordsInField(parsed);
  });

  it('name is Sachin Verma with no Abes/Data/Analyst/Intern', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const parsed = fallbackRegexParser(lines.map((l) => l.text).join('\n'), 'resume.pdf', lines);

    expect(parsed.personalInfo?.fullName).toBe('Sachin Verma');
    expect(parsed.personalInfo?.fullName).not.toMatch(/abes|data|analyst|intern/i);
  });

  it('location is Varanasi, Uttar Pradesh', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const parsed = fallbackRegexParser(lines.map((l) => l.text).join('\n'), 'resume.pdf', lines);

    expect(parsed.personalInfo?.location).toBe('Varanasi, Uttar Pradesh');
  });

  it('experience count matches derived date ranges and has valid metadata', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const parsed = fallbackRegexParser(lines.map((l) => l.text).join('\n'), 'resume.pdf', lines);

    const exp = parsed.experience || [];
    console.log(`[Experience Test] Parsed count: ${exp.length}, Derived count: ${expDateCount}`);
    expect(exp.length).toBe(expDateCount);

    for (const item of exp) {
      expect(item.position).toBeTruthy();
      expect(item.company).toBeTruthy();
      expect(item.startDate).toBeTruthy();
      expect(item.endDate).toBeTruthy();
      expect(item.position).not.toContain('Remote');
    }
  });

  it('education count matches derived degrees and equals UI count', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const parsed = fallbackRegexParser(lines.map((l) => l.text).join('\n'), 'resume.pdf', lines);

    const edu = parsed.education || [];
    console.log(`[Education Test] Parsed count: ${edu.length}, Derived count: ${eduLineCount}`);
    expect(edu.length).toBe(eduLineCount);
    expect(edu.length).toBeGreaterThan(0);

    const { counts } = calculateConfidenceAndCounts(parsed);
    expect(counts.education).toBe(edu.length);
  });

  it('skills has no item over 4 words and no Label prefixes', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const parsed = fallbackRegexParser(lines.map((l) => l.text).join('\n'), 'resume.pdf', lines);

    const skillCategories = parsed.skills || [];
    expect(skillCategories.length).toBeGreaterThan(0);

    for (const cat of skillCategories) {
      expect(cat.name).not.toMatch(/^label:/i);
      for (const skill of cat.skills) {
        expect(skill.split(/\s+/).length).toBeLessThanOrEqual(4);
        expect(skill).not.toMatch(/^languages:|^frontend:|^backend:|^data analytics:|^developer tools:/i);
      }
    }
  });

  it('confidence is 0 only when count is 0', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const parsed = fallbackRegexParser(lines.map((l) => l.text).join('\n'), 'resume.pdf', lines);
    const { confidence, counts } = calculateConfidenceAndCounts(parsed);

    for (const sec of ['personalInfo', 'summary', 'experience', 'education', 'skills', 'projects']) {
      const count = counts[sec] ?? 0;
      const conf = confidence[sec] ?? 0;
      if (count === 0) {
        expect(conf).toBe(0);
      } else {
        expect(conf).toBeGreaterThan(0);
      }
    }
  });
});
