import type { Line, SectionMap, CanonicalSectionKey } from './types';

export const CANONICAL_HEADINGS: { key: CanonicalSectionKey; regex: RegExp }[] = [
  { key: 'summary', regex: /^(?:professional\s+)?summary$/i },
  { key: 'profile', regex: /^(?:professional\s+)?profile$/i },
  { key: 'objective', regex: /^(?:career\s+)?objective$/i },
  { key: 'work experience', regex: /^(?:work\s+experience|professional\s+experience|employment\s+history)$/i },
  { key: 'experience', regex: /^(?:experience|employment)$/i },
  { key: 'education', regex: /^(?:education|academics|academic\s+background)$/i },
  { key: 'technical skills', regex: /^(?:technical\s+skills|core\s+competencies)$/i },
  { key: 'skills', regex: /^(?:skills|technologies|areas\s+of\s+expertise)$/i },
  { key: 'projects', regex: /^(?:projects|personal\s+projects|key\s+projects|academic\s+projects)$/i },
  { key: 'certifications', regex: /^(?:certifications?|certificates?|licenses?)$/i },
  { key: 'achievements', regex: /^(?:achievements?|honors?|key\s+achievements?)$/i },
  { key: 'awards', regex: /^(?:awards?|honors\s+&\s+awards?)$/i },
  { key: 'extracurricular', regex: /^(?:extracurricular(?:\s+activities)?|activities|leadership(?:\s+&\s+activities)?|volunteer(?:\s+experience)?)$/i },
];

/**
 * Checks whether a line is a section heading:
 * - <= 4 words
 * - Matches one of the canonical heading patterns
 * - Typically uppercase, larger font, or bolder
 */
export function matchSectionHeading(line: Line): CanonicalSectionKey | null {
  const clean = line.text.trim();
  if (!clean) return null;

  // Headings are short: <= 4 words
  const words = clean.split(/\s+/);
  if (words.length > 4) return null;

  // Must not have punctuation typical of normal sentences/contacts (colons allowed at the end)
  const trimmed = clean.replace(/[:\s]+$/, '');

  for (const { key, regex } of CANONICAL_HEADINGS) {
    if (regex.test(trimmed)) {
      return key;
    }
  }

  return null;
}

export function groupLinesIntoSections(lines: Line[]): SectionMap {
  const detectedOrder: string[] = [];
  const detectedTitles: Record<string, string> = {};

  const map: SectionMap = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    achievements: [],
    awards: [],
    extracurricular: [],
    rawText: lines.map((l) => l.text).join('\n'),
    detectedOrder,
    detectedTitles,
  };

  if (lines.length === 0) return map;

  let currentKey: CanonicalSectionKey | 'header' = 'header';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingKey = matchSectionHeading(line);

    if (headingKey) {
      currentKey = headingKey;
      const rawTitle = line.text.trim().replace(/[:\s]+$/, '');

      // Normalize to standard section keys
      let normKey = headingKey as string;
      if (headingKey === 'work experience' || headingKey === 'employment') normKey = 'experience';
      else if (headingKey === 'profile' || headingKey === 'objective') normKey = 'summary';
      else if (headingKey === 'technical skills') normKey = 'skills';
      else if (headingKey === 'activities') normKey = 'extracurricular';

      if (!detectedOrder.includes(normKey)) {
        detectedOrder.push(normKey);
        detectedTitles[normKey] = rawTitle;
      }
      // We do not add the heading line itself to the section content
      continue;
    }

    if (currentKey === 'header') {
      map.header.push(line);
    } else if (currentKey === 'summary' || currentKey === 'profile' || currentKey === 'objective') {
      map.summary.push(line);
    } else if (currentKey === 'experience' || currentKey === 'work experience' || currentKey === 'employment') {
      map.experience.push(line);
    } else if (currentKey === 'education') {
      map.education.push(line);
    } else if (currentKey === 'skills' || currentKey === 'technical skills') {
      map.skills.push(line);
    } else if (currentKey === 'projects') {
      map.projects.push(line);
    } else if (currentKey === 'certifications') {
      map.certifications.push(line);
    } else if (currentKey === 'achievements') {
      map.achievements.push(line);
    } else if (currentKey === 'awards') {
      map.awards.push(line);
    } else if (currentKey === 'extracurricular' || currentKey === 'activities') {
      map.extracurricular.push(line);
    }
  }

  return map;
}
