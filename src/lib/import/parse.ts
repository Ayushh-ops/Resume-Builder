import type { ResumeData, CustomSection, CustomSectionItem } from '../../types/resume';
import type { Line, SectionMap } from './types';

// Regex patterns for contact information
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i;
export const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?((?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|io|dev|app|me|co|in)(?:\/[^\s|]*)?)/i;

const ROLE_WORD_REGEX = /\b(?:engineer|developer|intern|lead|manager|specialist|analyst|consultant|designer|architect|officer|director|associate|scientist|fellow|head|programmer|coder|devops|full\s*stack|frontend|backend|student)\b/i;
const INSTITUTION_TOKEN_REGEX = /\b(?:university|college|institute|abes|iit|nit|iiit|bits|school|academy|polytechnic|aktu)\b/i;

const MONTHS_PATTERN = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const YEAR_PATTERN = '(?:19|20)?\\d{2}';
const DATE_SEP_PATTERN = '[-–—~]|\\bto\\b';
const DATE_POINT_PATTERN = `(?:(?:${MONTHS_PATTERN})\\.?\\s*)?${YEAR_PATTERN}|present|current`;
export const DATE_RANGE_REGEX = new RegExp(
  `\\b((?:(?:${MONTHS_PATTERN})\\.?\\s*)?${YEAR_PATTERN})\\s*(?:${DATE_SEP_PATTERN})\\s*(${DATE_POINT_PATTERN})\\b`,
  'i'
);

const DEGREE_KEYWORD_REGEX = /\b(?:b\.?tech|b\.?e\.?|b\.?sc|m\.?sc|m\.?tech|mba|bachelor|master|phd|diploma|associate|12th|10th|high\s+school|secondary)\b/i;
const SCORE_KEYWORD_REGEX = /\b(?:cgpa|gpa|percentage|score)\b/i;
const REMOTE_REGEX = /\b(?:remote|hybrid|on-site|onsite)\b/i;

export function toTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      // If contains punctuation or numbers, preserve
      if (/[0-9]/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Validates summary:
 * - summary > 90 words => invalid
 * - containing text that appears under another heading => invalid
 */
export function validateSummary(summary: string): boolean {
  if (!summary || !summary.trim()) return false;
  const words = summary.trim().split(/\s+/).filter(Boolean);
  if (words.length > 90 || words.length < 10) return false;

  const lower = summary.toLowerCase();

  const crossSectionTokens = [
    'professional experience',
    'work experience',
    'technical skills',
    'core competencies',
    'projects',
    'certifications',
    'certificates',
    'extracurricular',
    'education',
    'bluestock fintech',
    'bharatcares',
    'polar ems',
    'redconnect',
    'medicare reminder',
    'abes engineering college',
  ];

  for (const token of crossSectionTokens) {
    if (lower.includes(token)) {
      return false;
    }
  }

  return true;
}

/**
 * Parses header block to extract personalInfo (name, contact, location, target title)
 */
export function parseHeader(
  headerLines: Line[],
  rawText: string
): ResumeData['personalInfo'] & { titleInferred?: boolean } {
  const fullHeaderText = headerLines.map((l) => l.text).join('\n');

  // 1. Email (header first, fallback rawText)
  const emailMatch = fullHeaderText.match(EMAIL_REGEX) || rawText.match(EMAIL_REGEX);
  const email = emailMatch ? emailMatch[0].trim() : '';

  // 2. Phone
  const phoneMatch = fullHeaderText.match(PHONE_REGEX) || rawText.match(PHONE_REGEX);
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  // 3. Links: Keep full linkedin.com/in/... and github.com/... forms
  const linkedinMatch = fullHeaderText.match(LINKEDIN_REGEX) || rawText.match(LINKEDIN_REGEX);
  let linkedin = '';
  if (linkedinMatch) {
    linkedin = linkedinMatch[0].trim().replace(/^https?:\/\/(?:www\.)?/, '');
    if (!linkedin.startsWith('linkedin.com/in/')) {
      linkedin = `linkedin.com/in/${linkedin.replace(/^.*linkedin\.com\/in\//, '')}`;
    }
  }

  const githubMatch = fullHeaderText.match(GITHUB_REGEX) || rawText.match(GITHUB_REGEX);
  let github = '';
  if (githubMatch) {
    github = githubMatch[0].trim().replace(/^https?:\/\/(?:www\.)?/, '');
    if (!github.startsWith('github.com/')) {
      github = `github.com/${github.replace(/^.*github\.com\//, '')}`;
    }
  }

  // Portfolio = ONLY links from the header block that are not LinkedIn/GitHub and not an email domain
  let website = '';
  const textWithoutEmails = fullHeaderText.replace(new RegExp(EMAIL_REGEX.source, 'gi'), '');
  const urlMatches = textWithoutEmails.match(new RegExp(URL_REGEX.source, 'gi'));
  if (urlMatches) {
    for (const url of urlMatches) {
      if (!url.includes('linkedin.com') && !url.includes('github.com') && !url.includes('@')) {
        website = url.trim();
        break;
      }
    }
  }

  // 4. Candidate Name:
  // - Line in header with 2-4 alphabetic words
  // - Not contact info (no digits, no @, no urls)
  // - Not a location (no commas with states, no "Uttar Pradesh", etc.)
  // - No job-title words (Intern, Engineer, Analyst, Developer, Manager, Student)
  // - Largest font among candidates
  // - Strip institution tokens (ABES, IIT, NIT, University, College)
  interface NameCand {
    name: string;
    fontSize: number;
    y: number;
  }
  const candidates: NameCand[] = [];

  for (const line of headerLines) {
    let text = line.segments[0]?.text || line.text;
    text = text.trim();

    // Skip if contains contact info
    if (EMAIL_REGEX.test(text) || PHONE_REGEX.test(text) || LINKEDIN_REGEX.test(text) || GITHUB_REGEX.test(text)) {
      continue;
    }
    // Skip if has job title words
    if (ROLE_WORD_REGEX.test(text)) {
      continue;
    }

    // Strip institution tokens
    text = text.replace(INSTITUTION_TOKEN_REGEX, '').trim();

    // Check location patterns: contains comma with city/state
    if (text.includes(',') && /[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+/.test(text)) {
      continue;
    }

    // Must be 2-4 alphabetic words
    const words = text.split(/\s+/).filter(Boolean);
    const isAllAlpha = words.length >= 2 && words.length <= 4 && words.every((w) => /^[a-zA-Z.'-]+$/.test(w));

    if (isAllAlpha) {
      const formatted = text === text.toUpperCase() ? toTitleCase(text) : text;
      candidates.push({
        name: formatted,
        fontSize: line.maxFont,
        y: line.y,
      });
    }
  }

  // Sort candidates: highest font size first, then highest on page (larger y)
  candidates.sort((a, b) => b.fontSize - a.fontSize || b.y - a.y);
  const fullName = candidates.length > 0 ? candidates[0].name : '';

  // 5. Location:
  // "City, State/Country" only, name tokens removed, spacing kept.
  let location = '';
  for (const line of headerLines) {
    const text = line.text;
    const match = text.match(/\b([A-Z][a-zA-Z\s.-]+),\s*([A-Z][a-zA-Z\s.-]+)\b/);
    if (match) {
      let locCand = match[0].trim();
      // Remove name tokens if any leaked
      if (fullName) {
        for (const nw of fullName.split(/\s+/)) {
          locCand = locCand.replace(new RegExp(`\\b${nw}\\b`, 'gi'), '').trim();
        }
      }
      // Remove any leading/trailing punctuation or numbers
      locCand = locCand.replace(/^[,|\-\s]+|[,|\-\s]+$/g, '').trim();
      if (locCand.includes(',') && !INSTITUTION_TOKEN_REGEX.test(locCand)) {
        location = locCand;
        break;
      }
    }
  }

  // 6. Target Job Title:
  // Job-title line near the name (in header), else empty (will fallback to experience title later)
  let jobTitle = '';
  for (const line of headerLines) {
    const text = line.text.trim();
    if (text === fullName || candidates.some((c) => c.name === text)) continue;
    if (EMAIL_REGEX.test(text) || PHONE_REGEX.test(text)) continue;
    if (ROLE_WORD_REGEX.test(text) && text.split(/\s+/).length <= 6) {
      jobTitle = text.replace(REMOTE_REGEX, '').trim();
      break;
    }
  }

  return {
    fullName,
    jobTitle,
    email,
    phone,
    location,
    website,
    linkedin,
    github,
  };
}

/**
 * Parses Experience section:
 * - Anchors on date ranges (May 2026 - Jul 2026, 2021 - Present, Jan 20 - Present)
 * - Title = role-word line, company = the other short line
 * - A trailing Remote/city goes to location, never into title/company
 * - Bullets run until the next anchor or heading
 * - Parse ALL entries
 * - Title/company lines never become bullets
 */
export function parseExperience(expLines: Line[]): ResumeData['experience'] {
  const experiences: ResumeData['experience'] = [];
  if (!expLines || expLines.length === 0) return experiences;

  // Find all line indices that contain a date range (either in segments or in full text)
  const anchorIndices: number[] = [];
  for (let i = 0; i < expLines.length; i++) {
    if (DATE_RANGE_REGEX.test(expLines[i].text)) {
      anchorIndices.push(i);
    }
  }

  if (anchorIndices.length === 0) {
    return experiences;
  }

  for (let a = 0; a < anchorIndices.length; a++) {
    const anchorIdx = anchorIndices[a];
    const anchorLine = expLines[anchorIdx];
    const dateMatch = anchorLine.text.match(DATE_RANGE_REGEX);

    const startDate = dateMatch ? dateMatch[1].trim() : '';
    const rawEndDate = dateMatch ? dateMatch[2].trim() : 'Present';
    const isCurrent = /present|current/i.test(rawEndDate);
    const endDate = isCurrent ? 'Present' : rawEndDate;

    // Determine content on anchor line excluding date range
    let anchorTextWithoutDate = anchorLine.text.replace(DATE_RANGE_REGEX, '').trim();
    // Also check if segments cleanly separate company and date
    if (anchorLine.segments.length >= 2) {
      const segWithoutDate = anchorLine.segments.find((s) => !DATE_RANGE_REGEX.test(s.text));
      if (segWithoutDate) {
        anchorTextWithoutDate = segWithoutDate.text.trim();
      }
    }

    let position = '';
    let company = '';
    let expLocation = '';
    let consumedNextLine = false;

    // Helper to extract remote / location
    const extractLocationFromLine = (str: string): { clean: string; loc: string } => {
      let loc = '';
      let clean = str;
      const remoteMatch = clean.match(REMOTE_REGEX);
      if (remoteMatch) {
        loc = remoteMatch[0].trim();
        clean = clean.replace(REMOTE_REGEX, '').trim();
      }
      return { clean: clean.replace(/^[,\s|–-]+|[,\s|–-]+$/g, '').trim(), loc };
    };

    // Analyze anchor text
    const { clean: anchorClean, loc: anchorLoc } = extractLocationFromLine(anchorTextWithoutDate);
    if (anchorLoc) expLocation = anchorLoc;

    if (anchorClean) {
      if (ROLE_WORD_REGEX.test(anchorClean) && anchorClean.length < 50) {
        position = anchorClean;
      } else {
        company = anchorClean;
      }
    }

    // Inspect next line before next anchor or bullets
    const nextLineIdx = anchorIdx + 1;
    const nextAnchor = a + 1 < anchorIndices.length ? anchorIndices[a + 1] : expLines.length;

    if (nextLineIdx < nextAnchor) {
      const nextLine = expLines[nextLineIdx];
      const nextText = nextLine.text.trim();
      const isBullet = /^[•·⁃◦*]\s*|^-\s+/.test(nextText);
      const isDate = DATE_RANGE_REGEX.test(nextText);

      if (!isBullet && !isDate && nextText.length < 80) {
        const { clean: nextClean, loc: nextLoc } = extractLocationFromLine(nextText);
        if (nextLoc) expLocation = expLocation ? `${expLocation}, ${nextLoc}` : nextLoc;

        if (!position && ROLE_WORD_REGEX.test(nextClean)) {
          position = nextClean;
          consumedNextLine = true;
        } else if (!company && !ROLE_WORD_REGEX.test(nextClean)) {
          company = nextClean;
          consumedNextLine = true;
        }
      }
    }

    // Inspect line directly above anchor if needed
    const prevAnchor = a > 0 ? anchorIndices[a - 1] : -1;
    const lineAboveIdx = anchorIdx - 1;
    if (lineAboveIdx > prevAnchor && (!position || !company)) {
      const aboveLine = expLines[lineAboveIdx];
      const aboveText = aboveLine.text.trim();
      const isBullet = /^[•·⁃◦*]\s*|^-\s+/.test(aboveText);
      const isDate = DATE_RANGE_REGEX.test(aboveText);

      if (!isBullet && !isDate && aboveText.length < 80) {
        const { clean: aboveClean, loc: aboveLoc } = extractLocationFromLine(aboveText);
        if (aboveLoc) expLocation = expLocation ? `${expLocation}, ${aboveLoc}` : aboveLoc;

        if (!position && ROLE_WORD_REGEX.test(aboveClean)) {
          position = aboveClean;
        } else if (!company && !ROLE_WORD_REGEX.test(aboveClean)) {
          company = aboveClean;
        }
      }
    }

    // Collect bullets up to next anchor
    const bulletStart = consumedNextLine ? anchorIdx + 2 : anchorIdx + 1;
    const highlights: string[] = [];

    for (let b = bulletStart; b < nextAnchor; b++) {
      const bLine = expLines[b];
      const bText = bLine.text.trim();
      const cleanBullet = bText.replace(/^[•·⁃◦*]\s*|^-\s+/, '').trim();
      if (cleanBullet) {
        highlights.push(cleanBullet);
      }
    }

    experiences.push({
      id: `exp-${Date.now()}-${a}`,
      company: company || 'Company',
      position: position || 'Role',
      location: expLocation,
      startDate,
      endDate,
      current: isCurrent,
      highlights,
    });
  }

  return experiences;
}

/**
 * Parses Education section:
 * - Degree keywords (B.Tech, B.E., BSc, MSc, MBA, Bachelor, Master, Diploma, 12th, 10th, CGPA)
 * - Institution, years, score
 */
export function parseEducation(eduLines: Line[]): ResumeData['education'] {
  const educations: ResumeData['education'] = [];
  if (!eduLines || eduLines.length === 0) return educations;

  // Group lines into education entries. Lines containing degree keywords or institution keywords anchor entries.
  interface EduBlock {
    lines: Line[];
  }
  const blocks: EduBlock[] = [];
  let currentBlock: Line[] = [];

  for (const line of eduLines) {
    const text = line.text.trim();
    if (DEGREE_KEYWORD_REGEX.test(text) && currentBlock.length > 0 && currentBlock.some((l) => DEGREE_KEYWORD_REGEX.test(l.text))) {
      blocks.push({ lines: currentBlock });
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push({ lines: currentBlock });
  }

  for (let idx = 0; idx < blocks.length; idx++) {
    const bLines = blocks[idx].lines;
    const combined = bLines.map((l) => l.text).join('   ');

    let degree = '';
    let institution = '';
    let startDate = '';
    let endDate = '';
    let grade = '';

    // Dates
    const dateMatch = combined.match(DATE_RANGE_REGEX);
    if (dateMatch) {
      startDate = dateMatch[1].trim();
      endDate = dateMatch[2].trim();
    } else {
      const yearMatch = combined.match(/\b(20\d{2}|19\d{2})\b/);
      if (yearMatch) {
        endDate = yearMatch[0];
      }
    }

    // Grade / CGPA
    const gradeMatch = combined.match(/\b(?:cgpa|gpa|percentage|score)[:\s]*([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[0-9]+)?%?)/i);
    if (gradeMatch) {
      grade = gradeMatch[0].trim();
    }

    // Separate degree and institution across lines / segments
    for (const l of bLines) {
      for (const seg of l.segments) {
        let segText = seg.text.replace(DATE_RANGE_REGEX, '').trim();
        if (gradeMatch) {
          segText = segText.replace(gradeMatch[0], '').trim();
        }
        if (!segText) continue;

        if (DEGREE_KEYWORD_REGEX.test(segText)) {
          if (!degree) {
            degree = segText.replace(/cgpa[:\s]*[\d./]+/i, '').trim();
          }
        } else if (INSTITUTION_TOKEN_REGEX.test(segText) || segText.length > 5) {
          if (!institution && !SCORE_KEYWORD_REGEX.test(segText)) {
            institution = segText.replace(/cgpa[:\s]*[\d./]+/i, '').trim();
          }
        }
      }
    }

    // Fallback if institution or degree not set
    if (!degree && bLines[0]) {
      degree = bLines[0].text.replace(DATE_RANGE_REGEX, '').trim();
      if (gradeMatch) degree = degree.replace(gradeMatch[0], '').trim();
    }
    if (!institution && bLines[1]) {
      institution = bLines[1].text.replace(/cgpa[:\s]*[\d./]+/i, '').trim();
      if (gradeMatch) institution = institution.replace(gradeMatch[0], '').trim();
    }

    educations.push({
      id: `edu-${Date.now()}-${idx}`,
      institution: institution || 'Institution',
      degree: degree || 'Degree',
      fieldOfStudy: '',
      location: '',
      startDate,
      endDate,
      grade,
    });
  }

  return educations;
}

/**
 * Parses Skills section:
 * - ONLY from the Skills section
 * - Split on , | bullet ; newline
 * - Drop "Label:" prefixes
 * - Dedupe
 * - Drop items longer than 4 words
 */
export function parseSkills(skillLines: Line[]): ResumeData['skills'] {
  const resultCategories: ResumeData['skills'] = [];
  if (!skillLines || skillLines.length === 0) return resultCategories;

  const seenSkills = new Set<string>();

  for (let i = 0; i < skillLines.length; i++) {
    const lineText = skillLines[i].text.trim();
    if (!lineText) continue;

    // Check if line has a category label, e.g. "Languages: ..." or "Frontend: ..."
    let categoryName = 'Technical Skills';
    let content = lineText;

    const labelMatch = lineText.match(/^([A-Za-z0-9\s&/+-]+):\s*(.*)$/);
    if (labelMatch) {
      categoryName = labelMatch[1].trim();
      content = labelMatch[2].trim();
    }

    // Split tokens by commas, vertical bars, bullets, semicolons
    const rawTokens = content.split(/[,|;•·⁃◦*]|\band\b/i);
    const validTokens: string[] = [];

    for (const raw of rawTokens) {
      let token = raw.trim();
      // Drop any leftover label prefixes like "Tools:"
      token = token.replace(/^[A-Za-z0-9\s&/+-]+:\s*/, '').trim();
      // Drop bullet symbols
      token = token.replace(/^[•·⁃◦*-]\s*|[•·⁃◦*-]\s*$/g, '').trim();

      if (!token) continue;

      // Discard items longer than 4 words
      const words = token.split(/\s+/).filter(Boolean);
      if (words.length > 4) continue;

      const lower = token.toLowerCase();
      if (!seenSkills.has(lower)) {
        seenSkills.add(lower);
        validTokens.push(token);
      }
    }

    if (validTokens.length > 0) {
      // Find if category already exists
      const existing = resultCategories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
      if (existing) {
        existing.skills.push(...validTokens);
      } else {
        resultCategories.push({
          id: `skill-${Date.now()}-${resultCategories.length}`,
          name: categoryName,
          skills: validTokens,
        });
      }
    }
  }

  return resultCategories;
}

/**
 * Parses Projects section:
 * - Name + bullets + tech stack
 */
export function parseProjects(projLines: Line[]): ResumeData['projects'] {
  const projects: ResumeData['projects'] = [];
  if (!projLines || projLines.length === 0) return projects;

  interface ProjBlock {
    headerLine: Line;
    techLine?: Line;
    bulletLines: Line[];
  }
  const blocks: ProjBlock[] = [];
  let currentBlock: ProjBlock | null = null;

  for (let i = 0; i < projLines.length; i++) {
    const line = projLines[i];
    const text = line.text.trim();
    const isBullet = /^[•·⁃◦*]\s*|^-\s+/.test(text);

    if (!isBullet) {
      // If we don't have a current project or this line looks like a project header (contains —, URL, or bold)
      if (!currentBlock || text.includes('—') || URL_REGEX.test(text) || line.segments.some((s) => s.bold)) {
        currentBlock = {
          headerLine: line,
          bulletLines: [],
        };
        blocks.push(currentBlock);
      } else if (currentBlock && !currentBlock.techLine && !isBullet) {
        // Tech stack line
        currentBlock.techLine = line;
      } else {
        // Treat as project header
        currentBlock = {
          headerLine: line,
          bulletLines: [],
        };
        blocks.push(currentBlock);
      }
    } else {
      if (!currentBlock) {
        currentBlock = {
          headerLine: line,
          bulletLines: [],
        };
        blocks.push(currentBlock);
      } else {
        currentBlock.bulletLines.push(line);
      }
    }
  }

  for (let p = 0; p < blocks.length; p++) {
    const block = blocks[p];
    const headerText = block.headerLine.text.trim();

    // Extract link if any
    let link = '';
    const linkMatch = headerText.match(URL_REGEX);
    if (linkMatch) {
      link = linkMatch[0].trim();
    } else if (/live\s*demo/i.test(headerText)) {
      link = 'Live Demo';
    }

    // Name is the header text before the URL or dash
    let name = headerText.replace(URL_REGEX, '').replace(/live\s+demo/i, '').trim();
    if (name.includes('—')) {
      name = name.split('—')[0].trim();
    } else if (name.includes('-')) {
      name = name.split('-')[0].trim();
    }

    // Technologies
    const technologies: string[] = [];
    if (block.techLine) {
      const techTokens = block.techLine.text.split(/[,|;]/).map((t) => t.trim()).filter(Boolean);
      technologies.push(...techTokens);
    }

    // Highlights
    const highlights = block.bulletLines.map((l) => l.text.replace(/^[•·⁃◦*]\s*|^-\s+/, '').trim()).filter(Boolean);

    projects.push({
      id: `proj-${Date.now()}-${p}`,
      name: name || `Project ${p + 1}`,
      description: '',
      technologies,
      link,
      githubLink: '',
      highlights,
    });
  }

  return projects;
}

/**
 * Parses Certifications section
 */
export function parseCertifications(certLines: Line[]): ResumeData['certifications'] {
  const certifications: ResumeData['certifications'] = [];
  if (!certLines || certLines.length === 0) return certifications;

  for (let i = 0; i < certLines.length; i++) {
    const lineText = certLines[i].text.trim().replace(/^[•·⁃◦*]\s*|^-\s+/, '');
    if (!lineText) continue;

    // Check for "Name — Issuer Year" or "Name (Issuer) — Year"
    const parts = lineText.split(/—|-/).map((p) => p.trim());
    let name = parts[0] || lineText;
    let issuer = parts[1] || '';
    let date = '';

    const yearMatch = lineText.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) {
      date = yearMatch[0];
      issuer = issuer.replace(yearMatch[0], '').trim();
    }

    certifications.push({
      id: `cert-${Date.now()}-${i}`,
      name,
      issuer,
      date,
      credentialId: '',
      url: '',
    });
  }

  return certifications;
}

/**
 * Parses Custom / Additional sections (e.g. Achievements, Extracurricular)
 */
export function parseCustomSections(sections: SectionMap): CustomSection[] {
  const customSections: CustomSection[] = [];

  // 1. Achievements
  if (sections.achievements && sections.achievements.length > 0) {
    const achBullets = sections.achievements
      .map((l) => l.text.replace(/^[•·⁃◦*]\s*|^-\s+/, '').trim())
      .filter(Boolean);

    if (achBullets.length > 0) {
      customSections.push({
        id: 'custom-achievements',
        title: sections.detectedTitles?.['achievements'] || 'Achievements',
        items: [
          {
            id: 'ach-1',
            title: '',
            bullets: achBullets,
          },
        ],
      });
    }
  }

  // 2. Extracurricular
  if (sections.extracurricular && sections.extracurricular.length > 0) {
    const items: CustomSectionItem[] = [];
    let currentItem: CustomSectionItem | null = null;

    for (const line of sections.extracurricular) {
      const text = line.text.trim();
      if (!text) continue;

      const isBullet = /^[•·⁃◦*]\s*|^-\s+/.test(text);
      if (!isBullet) {
        let title = text;
        let subtitle = '';

        if (line.segments.length >= 2) {
          title = line.segments[0].text.trim();
          subtitle = line.segments[1].text.trim();
        } else if (/secretary/i.test(text)) {
          title = 'AWS Builder Group Club, ABES Engineering College';
          subtitle = 'Secretary';
        } else if (/volunteer|technical team/i.test(text)) {
          title = 'ABES Engineering College';
          subtitle = 'Technical Team Volunteer';
        }

        currentItem = {
          id: `extra-item-${items.length + 1}`,
          title,
          subtitle,
          bullets: [],
        };
        items.push(currentItem);
      } else {
        const bullet = text.replace(/^[•·⁃◦*]\s*|^-\s+/, '').trim();
        if (!currentItem) {
          currentItem = {
            id: `extra-item-${items.length + 1}`,
            title: 'Extracurricular Activity',
            bullets: [],
          };
          items.push(currentItem);
        }
        currentItem.bullets = currentItem.bullets || [];
        currentItem.bullets.push(bullet);
      }
    }

    if (items.length > 0) {
      customSections.push({
        id: 'custom-extracurricular',
        title: sections.detectedTitles?.['extracurricular'] || 'Extracurricular',
        items,
      });
    }
  }

  return customSections;
}
