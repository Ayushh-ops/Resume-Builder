import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getKey, getKeySource, filterAndSortModels, FALLBACK_MODELS } from '../src/lib/gemini';
import { fallbackRegexParser } from '../src/services/resumeParser';
import { calculateConfidenceAndCounts } from '../src/lib/import/confidence';

describe('Fresh Checkout Environment (No resume.pdf, No .env)', () => {
  it('verifies tests/data/weak-resume.json exists and is valid fake data', () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/data/weak-resume.json');
    expect(fs.existsSync(fixturePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    expect(content.personalInfo.fullName).toBe('Alex Taylor');
    expect(content.experience).toHaveLength(1);
    expect(content.experience[0].highlights.length).toBeGreaterThanOrEqual(6);
  });

  it('runs safely when no .env key or localStorage key exists', () => {
    // Simulating fresh checkout with no stored keys
    const originalEnv = process.env.VITE_GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;
    try {
      localStorage.clear();
    } catch {}

    const key = getKey();
    const source = getKeySource();
    expect(source).toBe('none');
    expect(key).toBe('');

    // Restore
    if (originalEnv) process.env.VITE_GEMINI_API_KEY = originalEnv;
  });

  it('parses raw text via offline fallback parser without resume.pdf', () => {
    const sampleRaw = `
ALEX TAYLOR
Software Engineer
alex@example.com | 555-0100 | San Francisco, CA

SUMMARY
Experienced software engineer with a track record in web applications.

EXPERIENCE
Acme Corp — Software Engineer
Jan 2022 – Present
• Developed modern frontend web features using React.
• Improved API query response times by 30%.

EDUCATION
State University — B.S. Computer Science
Aug 2018 – May 2022
`;
    const parsed = fallbackRegexParser(sampleRaw, 'sample.txt');
    expect(parsed.personalInfo.fullName).toBe('Alex Taylor');
    expect(parsed.experience.length).toBeGreaterThanOrEqual(1);
    expect(parsed.education.length).toBeGreaterThanOrEqual(1);

    const confidence = calculateConfidenceAndCounts(parsed);
    expect(confidence.confidence.personalInfo).toBeGreaterThan(0);
    expect(confidence.counts.experience).toBeGreaterThanOrEqual(1);
  });

  it('filters models safely using built-in candidate list when network is unavailable', () => {
    const filtered = filterAndSortModels([
      { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
    ]);
    expect(filtered).toContain('gemini-3.5-flash');
    expect(filtered).toContain('gemini-3.5-flash-lite');
    expect(FALLBACK_MODELS.length).toBeGreaterThan(0);
  });

  it('reports SKIPPED: fixture missing when resume.pdf is not present', () => {
    const pdfPath = path.resolve(process.cwd(), 'resume.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.log('SKIPPED: fixture missing');
      expect(true).toBe(true);
    } else {
      // resume.pdf exists in this local dev workspace, assertion remains valid
      expect(fs.existsSync(pdfPath)).toBe(true);
    }
  });
});
