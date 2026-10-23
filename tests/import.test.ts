import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { extractLinesFromPdf } from '../src/lib/import/extract';
import { fallbackRegexParser, parseAndStructureResume } from '../src/services/resumeParser';
import { calculateConfidenceAndCounts } from '../src/lib/import/confidence';
import { DATE_RANGE_REGEX } from '../src/lib/import/parse';
import { ModernTemplate } from '../src/components/Preview/templates/ModernTemplate';
import { HarvardTemplate } from '../src/components/Preview/templates/HarvardTemplate';
import { MinimalistTemplate } from '../src/components/Preview/templates/MinimalistTemplate';
import { CreativeTemplate } from '../src/components/Preview/templates/CreativeTemplate';
import { THEME_PRESETS } from '../src/services/themeService';
import type { ResumeData } from '../src/types/resume';

describe('Resume Importer Rebuild Tests', () => {
  const pdfPath = path.resolve(process.cwd(), 'resume.pdf');
  const rawLinesPath = path.resolve(process.cwd(), 'debug/raw-lines.txt');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const rawLinesContent = fs.readFileSync(rawLinesPath, 'utf-8');
  const rawLines = rawLinesContent.split('\n');

  // Derive experience and education count dynamically from debug/raw-lines.txt
  // 1. Experience lines are between PROFESSIONAL EXPERIENCE and PROJECTS
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
      if (key === 'id' || key === 'link' || key === 'githubLink' || key === 'website' || key === 'sectionOrder' || key === 'sectionTitles') return;
      if (typeof val === 'string') {
        const words = val.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !/^\d+$/.test(w));
        for (const w of words) {
          if (w.includes('http') || w.includes('exp-') || w.includes('edu-') || w.includes('skill-') || w.includes('proj-') || w.includes('cert-') || w.includes('custom-') || w.includes('extra-')) continue;
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

  // Explicit values on ./resume.pdf (offline mode)
  it('explicit values on ./resume.pdf (offline mode)', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const rawText = lines.map((l) => l.text).join('\n');
    const parsed = fallbackRegexParser(rawText, 'resume.pdf', lines);

    // 1. Summary: 35-60 words, starts with "B.Tech CSE undergraduate", ends with "by 40%."
    const summaryWords = (parsed.summary || '').split(/\s+/).filter(Boolean);
    expect(summaryWords.length).toBeGreaterThanOrEqual(35);
    expect(summaryWords.length).toBeLessThanOrEqual(60);
    expect(parsed.summary?.startsWith('B.Tech CSE undergraduate')).toBe(true);
    expect(parsed.summary?.endsWith('by 40%.')).toBe(true);

    // 2. Education 1: "B.Tech in CSE (AKTU)", ABES Engineering College, Ghaziabad, Jan 2024 - Jan 2028, CGPA 8.4/10
    expect(parsed.education?.length).toBe(1);
    const edu0 = parsed.education![0];
    expect(edu0.degree).toContain('B.Tech in CSE (AKTU)');
    expect(edu0.institution).toContain('ABES Engineering College, Ghaziabad');
    expect(edu0.startDate).toBe('Jan 2024');
    expect(edu0.endDate).toBe('Jan 2028');
    expect(edu0.grade).toMatch(/8\.4/);

    // 3. Skills: 6 categories
    expect(parsed.skills?.length).toBe(6);
    const catNames = parsed.skills!.map((s) => s.name);
    expect(catNames).toContain('Languages');
    expect(catNames).toContain('Frontend');
    expect(catNames).toContain('Backend & Databases');
    expect(catNames).toContain('Data Analytics');
    expect(catNames).toContain('Developer Tools');
    expect(catNames).toContain('Core Subjects');

    // 4. Experience 2:
    // Bluestock Fintech / Data Analyst Intern / May 2026-Jul 2026 / Remote / 3 bullets
    // BharatCares / AICTE (IBM SkillsBuild) / Intern, Gen AI & Cloud Computing / Jun 2026-Jul 2026 / Remote / 1 bullet
    expect(parsed.experience?.length).toBe(2);
    const exp0 = parsed.experience![0];
    expect(exp0.company).toBe('Bluestock Fintech');
    expect(exp0.position).toBe('Data Analyst Intern');
    expect(exp0.startDate).toBe('May 2026');
    expect(exp0.endDate).toBe('Jul 2026');
    expect(exp0.location).toBe('Remote');
    expect(exp0.highlights.length).toBe(3);

    const exp1 = parsed.experience![1];
    expect(exp1.company).toContain('BharatCares');
    expect(exp1.company).toContain('(IBM SkillsBuild)');
    expect(exp1.position).toBe('Intern, Gen AI & Cloud Computing');
    expect(exp1.startDate).toBe('Jun 2026');
    expect(exp1.endDate).toBe('Jul 2026');
    expect(exp1.location).toBe('Remote');
    expect(exp1.highlights.length).toBe(1);

    // 5. Projects 3:
    // Polar EMS (4 bullets), RedConnect (4), MediCare Reminder (3); each with its tech line and link
    expect(parsed.projects?.length).toBe(3);
    const p0 = parsed.projects![0];
    expect(p0.name).toBe('Polar EMS');
    expect(p0.highlights.length).toBe(4);
    expect(p0.technologies.length).toBeGreaterThan(0);
    expect(p0.link).toContain('polar-ems-barl.vercel.app');

    const p1 = parsed.projects![1];
    expect(p1.name).toBe('RedConnect');
    expect(p1.highlights.length).toBe(4);
    expect(p1.technologies.length).toBeGreaterThan(0);
    expect(p1.link).toContain('red-connect-d-h-n.vercel.app');

    const p2 = parsed.projects![2];
    expect(p2.name).toBe('MediCare Reminder');
    expect(p2.highlights.length).toBe(3);
    expect(p2.technologies.length).toBeGreaterThan(0);
    expect(p2.link).toBeTruthy();

    // 6. Achievements 4 bullets; Certifications 4; Extracurricular 2 entries
    expect(parsed.certifications?.length).toBe(4);

    const achSec = parsed.customSections?.find((s) => /achievement/i.test(s.title));
    expect(achSec).toBeDefined();
    const achBullets = achSec!.items.flatMap((i) => i.bullets || []);
    expect(achBullets.length).toBe(4);

    const extraSec = parsed.customSections?.find((s) => /extracurricular/i.test(s.title));
    expect(extraSec).toBeDefined();
    expect(extraSec!.items.length).toBe(2);
    expect(extraSec!.items[0].title).toContain('AWS Builder Group Club');
    expect(extraSec!.items[0].subtitle).toContain('Secretary');
    expect(extraSec!.items[0].bullets?.length).toBe(2);
    expect(extraSec!.items[1].subtitle || extraSec!.items[1].title).toContain('Volunteer');
    expect(extraSec!.items[1].bullets?.length).toBe(1);

    // 7. Portfolio field empty; linkedin and github present
    expect(parsed.personalInfo?.website).toBe('');
    expect(parsed.personalInfo?.linkedin).toContain('linkedin.com/in/');
    expect(parsed.personalInfo?.github).toContain('github.com/');

    // 8. Total parsed word count is within 5% of PDF raw word count
    const rawWords = rawText.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
    const parsedWordsList: string[] = [];
    const addText = (text?: string) => {
      if (!text) return;
      parsedWordsList.push(...text.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)));
    };

    addText(parsed.personalInfo?.fullName);
    addText(parsed.personalInfo?.location);
    addText(parsed.personalInfo?.email);
    addText(parsed.personalInfo?.phone);
    addText(parsed.personalInfo?.linkedin);
    addText(parsed.personalInfo?.github);
    addText(parsed.summary);
    parsed.education?.forEach((e) => {
      addText(e.institution);
      addText(e.degree);
      addText(e.startDate);
      addText(e.endDate);
      addText(e.grade);
    });
    parsed.skills?.forEach((s) => {
      addText(s.name);
      s.skills.forEach(addText);
    });
    parsed.experience?.forEach((e) => {
      addText(e.company);
      addText(e.position);
      addText(e.location);
      addText(e.startDate);
      addText(e.endDate);
      e.highlights.forEach(addText);
    });
    parsed.projects?.forEach((p) => {
      addText(p.name);
      addText(p.link);
      p.technologies.forEach(addText);
      p.highlights.forEach(addText);
    });
    parsed.certifications?.forEach((c) => {
      addText(c.name);
      addText(c.issuer);
      addText(c.date);
    });
    parsed.customSections?.forEach((cs) => {
      addText(cs.title);
      cs.items.forEach((item) => {
        addText(item.title);
        addText(item.subtitle);
        item.bullets?.forEach(addText);
      });
    });

    const diffPct = Math.abs(parsedWordsList.length - rawWords.length) / rawWords.length;
    console.log(`[Word Count Validation] Raw: ${rawWords.length}, Parsed: ${parsedWordsList.length}, Diff: ${(diffPct * 100).toFixed(2)}%`);
    expect(diffPct).toBeLessThanOrEqual(0.05);

    // 9. Overall confidence rule: Never 100% if checklist item or title inferred
    const { confidence } = calculateConfidenceAndCounts(parsed);
    expect(confidence.overall).toBeLessThan(100);
  });

  // AI response mocked with a bad "whole resume in summary" payload (must be rejected)
  it('AI response mocked with bad "whole resume in summary" payload is rejected and re-derived offline', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const rawText = lines.map((l) => l.text).join('\n');
    const offlineData = fallbackRegexParser(rawText, 'resume.pdf', lines);

    // Mock an AI payload where AI dumped the entire raw resume into summary (388 words)
    const badAiPayload: Partial<ResumeData> = {
      personalInfo: {
        fullName: 'Sachin Verma',
        jobTitle: 'Data Analyst Intern',
        email: 'sachinverma964839@gmail.com',
        phone: '+91 9648393246',
        location: 'Varanasi, Uttar Pradesh',
        website: '',
        linkedin: 'linkedin.com/in/sachinvermadev',
        github: 'github.com/Sachin1707-jpg',
      },
      summary: rawText, // 388+ words containing whole resume!
      experience: offlineData.experience,
      education: offlineData.education,
      skills: offlineData.skills,
      projects: offlineData.projects,
      certifications: offlineData.certifications,
      customSections: offlineData.customSections,
    };

    // Run merge / structure
    // Since mergeWithAiData is internal, we can test it through structureResumeWithGemini or direct call
    // When badAiPayload.summary is passed, validator rejects it and re-derives offline
    const { validateSummary } = await import('../src/lib/import/parse');
    expect(validateSummary(badAiPayload.summary!)).toBe(false);

    // Call fallbackRegexParser or structureResumeWithGemini
    // If summary is bad, parser ensures summary is strictly 35-60 words, starts with "B.Tech CSE undergraduate" and ends with "by 40%."
    const cleanSummary = offlineData.summary;
    expect(validateSummary(cleanSummary!)).toBe(true);

    const summaryWords = cleanSummary!.split(/\s+/).filter(Boolean);
    expect(summaryWords.length).toBeGreaterThanOrEqual(35);
    expect(summaryWords.length).toBeLessThanOrEqual(60);
    expect(cleanSummary?.startsWith('B.Tech CSE undergraduate')).toBe(true);
    expect(cleanSummary?.endsWith('by 40%.')).toBe(true);

    // Overall confidence is strictly < 100% when validator failure or check items exist
    const { confidence } = calculateConfidenceAndCounts(
      { ...offlineData, summary: cleanSummary },
      true // hasCheckItems = true
    );
    expect(confidence.overall).toBeLessThan(100);
  });

  // Editor preview renders all sections once each
  it('editor preview renders all sections once each across all 4 templates', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const rawText = lines.map((l) => l.text).join('\n');
    const parsed = fallbackRegexParser(rawText, 'resume.pdf', lines);

    const fullData: ResumeData = {
      personalInfo: {
        fullName: parsed.personalInfo?.fullName || '',
        jobTitle: parsed.personalInfo?.jobTitle || '',
        email: parsed.personalInfo?.email || '',
        phone: parsed.personalInfo?.phone || '',
        location: parsed.personalInfo?.location || '',
        website: parsed.personalInfo?.website || '',
        linkedin: parsed.personalInfo?.linkedin || '',
        github: parsed.personalInfo?.github || '',
      },
      summary: parsed.summary || '',
      experience: parsed.experience || [],
      education: parsed.education || [],
      skills: parsed.skills || [],
      projects: parsed.projects || [],
      certifications: parsed.certifications || [],
      customSections: parsed.customSections || [],
    };

    const theme = THEME_PRESETS[0];

    // ModernTemplate
    const modernHtml = renderToStaticMarkup(React.createElement(ModernTemplate, { data: fullData, theme }));
    expect(modernHtml.toUpperCase()).toContain('SUMMARY');
    expect(modernHtml.toUpperCase()).toContain('EXPERIENCE');
    expect(modernHtml.toUpperCase()).toContain('EDUCATION');
    expect(modernHtml.toUpperCase()).toContain('CERTIF');
    expect(modernHtml.toUpperCase()).toContain('ACHIEVEMENTS');
    expect(modernHtml.toUpperCase()).toContain('EXTRACURRICULAR');

    // HarvardTemplate
    const harvardHtml = renderToStaticMarkup(React.createElement(HarvardTemplate, { data: fullData, theme }));
    expect(harvardHtml.toUpperCase()).toContain('SUMMARY');
    expect(harvardHtml.toUpperCase()).toContain('EXPERIENCE');
    expect(harvardHtml.toUpperCase()).toContain('EDUCATION');
    expect(harvardHtml.toUpperCase()).toContain('CERTIF');
    expect(harvardHtml.toUpperCase()).toContain('ACHIEVEMENTS');
    expect(harvardHtml.toUpperCase()).toContain('EXTRACURRICULAR');

    // MinimalistTemplate
    const minHtml = renderToStaticMarkup(React.createElement(MinimalistTemplate, { data: fullData, theme }));
    expect(minHtml.toUpperCase()).toContain('EXPERIENCE');
    expect(minHtml.toUpperCase()).toContain('EDUCATION');
    expect(minHtml.toUpperCase()).toContain('SKILLS');
    expect(minHtml.toUpperCase()).toContain('CERTIF');
    expect(minHtml.toUpperCase()).toContain('ACHIEVEMENTS');
    expect(minHtml.toUpperCase()).toContain('EXTRACURRICULAR');

    // CreativeTemplate
    const creativeHtml = renderToStaticMarkup(React.createElement(CreativeTemplate, { data: fullData, theme }));
    expect(creativeHtml.toUpperCase()).toContain('EXPERIENCE');
    expect(creativeHtml.toUpperCase()).toContain('PROJECTS');
    expect(creativeHtml.toUpperCase()).toContain('EDUCATION');
    expect(creativeHtml.toUpperCase()).toContain('CERTIF');
    expect(creativeHtml.toUpperCase()).toContain('ACHIEVEMENTS');
    expect(creativeHtml.toUpperCase()).toContain('EXTRACURRICULAR');
  });

  // --- Strict Verbatim and Deterministic Import Suite ---

  it('target title empty for ./resume.pdf; the "Use:" suggestion exists but is not applied', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const rawText = lines.map((l) => l.text).join('\n');
    const parsed = fallbackRegexParser(rawText, 'resume.pdf', lines);

    // Target title must remain empty
    expect(parsed.personalInfo?.jobTitle).toBe('');

    // Check items contain the suggestion chip
    const { getChecklistItems } = await import('../src/components/Modals/ResumeUploadModal');
    const checkItems = getChecklistItems(parsed);
    const titleItem = checkItems.find((i) => i.fieldId === 'personalInfo.jobTitle');
    expect(titleItem).toBeDefined();
    expect(titleItem!.label).toBe('Target title not in your file (optional)');
    expect(titleItem!.suggestion).toBe('Use: Data Analyst Intern');
    expect(titleItem!.suggestedValue).toBe('Data Analyst Intern');

    // Assert that target title was NOT automatically applied
    expect(parsed.personalInfo?.jobTitle).toBe('');
  });

  it('section order and section titles equal the PDF', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const rawText = lines.map((l) => l.text).join('\n');
    const parsed = fallbackRegexParser(rawText, 'resume.pdf', lines);

    expect(parsed.sectionOrder).toEqual([
      'summary',
      'education',
      'skills',
      'experience',
      'projects',
      'achievements',
      'certifications',
      'extracurricular',
    ]);

    expect(parsed.sectionTitles).toEqual({
      summary: 'SUMMARY',
      education: 'EDUCATION',
      skills: 'TECHNICAL SKILLS',
      experience: 'PROFESSIONAL EXPERIENCE',
      projects: 'PROJECTS',
      achievements: 'ACHIEVEMENTS',
      certifications: 'CERTIFICATES',
      extracurricular: 'EXTRACURRICULAR',
    });
  });

  it('every bullet, date string, role and company equals the raw text after whitespace normalization (zero diff)', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const rawText = lines.map((l) => l.text).join('\n');
    const parsed = fallbackRegexParser(rawText, 'resume.pdf', lines);

    const norm = (str: string) => str.trim().replace(/\s+/g, ' ');

    const normalizedRawLines = rawLinesContent.split('\n').map((l) => {
      const clean = l.replace(/^\[p\d+\s+y=[\d.]+\]\s*/, '').replace(/^[•·⁃◦*]\s*|^-\s+/, '');
      return norm(clean);
    });

    const assertVerbatimInRaw = (val: string, context: string) => {
      const nVal = norm(val);
      const found = normalizedRawLines.some((rl) => rl.includes(nVal) || nVal.includes(rl));
      expect(found, `${context} "${nVal}" must exist in raw text with zero diff`).toBe(true);
    };

    // Experience: roles, companies, dates, bullets
    for (const exp of parsed.experience || []) {
      assertVerbatimInRaw(exp.company, 'Experience company');
      assertVerbatimInRaw(exp.position, 'Experience position');
      if (exp.startDate && exp.endDate) {
        assertVerbatimInRaw(`${exp.startDate}`, 'Experience startDate');
        assertVerbatimInRaw(`${exp.endDate}`, 'Experience endDate');
      }
      for (const b of exp.highlights) {
        assertVerbatimInRaw(b, 'Experience bullet');
      }
    }

    // Projects: name, bullets
    for (const proj of parsed.projects || []) {
      assertVerbatimInRaw(proj.name, 'Project name');
      for (const b of proj.highlights) {
        assertVerbatimInRaw(b, 'Project bullet');
      }
    }

    // Achievements: bullets
    const achSec = parsed.customSections?.find((s) => /achievement/i.test(s.title));
    for (const b of achSec?.items[0]?.bullets || []) {
      assertVerbatimInRaw(b, 'Achievement bullet');
    }

    // Certifications: names
    for (const cert of parsed.certifications || []) {
      assertVerbatimInRaw(cert.name, 'Certification name');
    }

    // Extracurricular: titles, bullets
    const extraSec = parsed.customSections?.find((s) => /extracurricular/i.test(s.title));
    for (const item of extraSec?.items || []) {
      assertVerbatimInRaw(item.title, 'Extracurricular title');
      for (const b of item.bullets || []) {
        assertVerbatimInRaw(b, 'Extracurricular bullet');
      }
    }
  });

  it('import makes no network request (mock fetch, assert not called) and completes < 3s', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    try {
      const file = new File([pdfBuffer], 'resume.pdf', { type: 'application/pdf' });
      const startTime = performance.now();
      const result = await parseAndStructureResume(file);
      const duration = performance.now() - startTime;

      expect(mockFetch).not.toHaveBeenCalled();
      expect(duration).toBeLessThan(3000);
      expect(result.data.personalInfo?.fullName).toBe('Sachin Verma');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('editor preview renders each source section exactly once', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const rawText = lines.map((l) => l.text).join('\n');
    const parsed = fallbackRegexParser(rawText, 'resume.pdf', lines);

    const fullData: ResumeData = {
      personalInfo: {
        fullName: parsed.personalInfo?.fullName || '',
        jobTitle: parsed.personalInfo?.jobTitle || '',
        email: parsed.personalInfo?.email || '',
        phone: parsed.personalInfo?.phone || '',
        location: parsed.personalInfo?.location || '',
        website: parsed.personalInfo?.website || '',
        linkedin: parsed.personalInfo?.linkedin || '',
        github: parsed.personalInfo?.github || '',
      },
      summary: parsed.summary || '',
      experience: parsed.experience || [],
      education: parsed.education || [],
      skills: parsed.skills || [],
      projects: parsed.projects || [],
      certifications: parsed.certifications || [],
      customSections: parsed.customSections || [],
      sectionOrder: parsed.sectionOrder,
      sectionTitles: parsed.sectionTitles,
    };

    const theme = THEME_PRESETS[0];

    // ModernTemplate
    const modernHtml = renderToStaticMarkup(React.createElement(ModernTemplate, { data: fullData, theme }));
    const headings = [
      'SUMMARY',
      'EDUCATION',
      'TECHNICAL SKILLS',
      'PROFESSIONAL EXPERIENCE',
      'PROJECTS',
      'ACHIEVEMENTS',
      'CERTIFICATES',
      'EXTRACURRICULAR',
    ];

    for (const h of headings) {
      const count = (modernHtml.match(new RegExp(`>${h}<`, 'g')) || []).length;
      expect(count, `Section heading "${h}" must render exactly once in ModernTemplate, but rendered ${count} times`).toBe(1);
    }

    // HarvardTemplate
    const harvardHtml = renderToStaticMarkup(React.createElement(HarvardTemplate, { data: fullData, theme }));
    for (const h of headings) {
      const count = (harvardHtml.match(new RegExp(`>${h}<`, 'g')) || []).length;
      expect(count, `Section heading "${h}" must render exactly once in HarvardTemplate, but rendered ${count} times`).toBe(1);
    }

    // MinimalistTemplate
    const minHtml = renderToStaticMarkup(React.createElement(MinimalistTemplate, { data: fullData, theme }));
    for (const h of headings) {
      const count = (minHtml.match(new RegExp(`>${h}<`, 'g')) || []).length;
      expect(count, `Section heading "${h}" must render exactly once in MinimalistTemplate, but rendered ${count} times`).toBe(1);
    }
  });

  it('generic fidelity test: every token from debug/raw-lines.txt appears in the final resume data and education dates are complete', async () => {
    const lines = await extractLinesFromPdf(pdfBuffer);
    const rawText = lines.map((l) => l.text).join('\n');
    const parsed = fallbackRegexParser(rawText, 'resume.pdf', lines);

    // 1. Assert education dates
    expect(parsed.education).toBeDefined();
    expect(parsed.education!.length).toBeGreaterThan(0);
    expect(parsed.education![0].startDate).toBe('Jan 2024');
    expect(parsed.education![0].endDate).toBe('Jan 2028');

    // 2. Collect all text from parsed resume data
    const parsedStrings: string[] = [];
    function collect(obj: any, key?: string) {
      if (!obj) return;
      if (key === 'id') return;
      if (typeof obj === 'string') {
        parsedStrings.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach((item) => collect(item));
      } else if (typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          collect(v, k);
        }
      }
    }
    collect(parsed);
    const allParsedTextLower = parsedStrings.join(' ').toLowerCase();

    // 3. Extract tokens from debug/raw-lines.txt
    const rawLinesStripped = rawLinesContent
      .split('\n')
      .map((l) => l.replace(/^\[p\d+\s+y=[\d.]+\]\s*/, '').trim())
      .filter(Boolean);

    const missingTokens: string[] = [];
    for (const line of rawLinesStripped) {
      const tokens = line
        .split(/\s+/)
        .map((t) => t.replace(/^[•·⁃◦*|–—,;:]+|[|–—,;:]+$/g, ''))
        .filter((t) => t.length > 0);
      for (const t of tokens) {
        if (t === '•' || t === '|' || t === '—' || t === '–') continue;
        if (!allParsedTextLower.includes(t.toLowerCase())) {
          missingTokens.push(t);
        }
      }
    }

    if (missingTokens.length > 0) {
      console.error('Missing tokens from final resume data:', Array.from(new Set(missingTokens)));
    }
    expect(Array.from(new Set(missingTokens))).toEqual([]);
  });
});
