import type { ResumeData, ATSCheckResult } from '../types/resume';

const STRONG_ACTION_VERBS = [
  'architected', 'spearheaded', 'orchestrated', 'engineered', 'optimized',
  'streamlined', 'developed', 'deployed', 'implemented', 'designed', 'accelerated',
  'automated', 'built', 'reduced', 'increased', 'mentored', 'championed', 'scaled'
];

const FLUFF_WORDS = [
  'hard worker', 'team player', 'synergy', 'go-getter', 'detail-oriented',
  'responsible for', 'helped with', 'worked on', 'assisted in', 'duties included'
];

export function calculateLiveATSScore(resume: ResumeData): ATSCheckResult {
  let score = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  // 1. Contact Info check (Max 20 pts)
  let contactScore = 0;
  const { fullName, email, phone, jobTitle, linkedin, github, location } = resume.personalInfo;
  if (fullName?.trim().length > 2) contactScore += 4;
  if (jobTitle?.trim().length > 2) contactScore += 4;
  if (email?.includes('@')) contactScore += 4;
  if (phone?.trim().length >= 7) contactScore += 3;
  if (location?.trim().length >= 2) contactScore += 2;
  if (linkedin?.trim().length >= 5 || github?.trim().length >= 5) contactScore += 3;

  score += contactScore;
  if (contactScore >= 18) {
    strengths.push('Comprehensive contact & online presence credentials');
  } else {
    weaknesses.push('Incomplete contact details or missing professional links (LinkedIn/GitHub)');
    suggestions.push('Provide a clear target Job Title, LinkedIn profile, and active phone number');
  }

  // 2. Summary check (Max 15 pts)
  const summaryWords = resume.summary?.trim().split(/\s+/).filter(Boolean).length || 0;
  if (summaryWords >= 30 && summaryWords <= 90) {
    score += 15;
    strengths.push(`Well-calibrated professional summary length (${summaryWords} words)`);
  } else if (summaryWords > 90) {
    score += 8;
    weaknesses.push(`Summary is somewhat lengthy (${summaryWords} words). Recruiters favor 40-75 words`);
    suggestions.push('Condense summary to 3-4 impactful sentences highlighting high-level career achievements');
  } else if (summaryWords > 10) {
    score += 7;
    suggestions.push('Expand professional summary to cover your specialty and key value proposition');
  } else {
    suggestions.push('Add an executive summary to give recruiters a rapid snapshot of your expertise');
  }

  // Check for 1st-person pronouns in summary
  if (/\b(i|me|my|we|our)\b/i.test(resume.summary)) {
    score = Math.max(0, score - 5);
    weaknesses.push('Summary uses first-person pronouns ("I", "my", "we"). Modern standard is implied third-person');
    suggestions.push('Remove first-person words ("I managed" -> "Managed", "My team" -> "Led cross-functional team")');
  }

  // 3. Experience & Bullet Point Quality (Max 35 pts)
  const allHighlights = resume.experience.flatMap((e) => e.highlights).filter(Boolean);
  if (resume.experience.length === 0) {
    weaknesses.push('No work experience listed yet');
    suggestions.push('Add past roles, internships, or freelance experience');
  } else {
    score += 10;

    let metricBullets = 0;
    let actionVerbBullets = 0;
    let fluffFound = false;

    allHighlights.forEach((hl) => {
      const lower = hl.toLowerCase().trim();
      // Check for numbers, percentages, or money
      if (/\d+%|\$\d+|\d+\s*(users|clients|teams|tb|gb|ms|k|m)\b|\d+\+/i.test(lower)) {
        metricBullets++;
      }
      // Check for strong verbs at start
      const firstWord = lower.split(/\s+/)[0];
      if (STRONG_ACTION_VERBS.includes(firstWord)) {
        actionVerbBullets++;
      }
      // Check for buzzwords
      if (FLUFF_WORDS.some((fw) => lower.includes(fw))) {
        fluffFound = true;
      }
    });

    if (allHighlights.length >= 3) score += 5;

    // Metrics impact
    if (metricBullets >= 3) {
      score += 12;
      strengths.push(`High quantitative impact: ${metricBullets} bullet points contain hard metrics (%, $, scale)`);
    } else if (metricBullets > 0) {
      score += 7;
      suggestions.push('Quantify more achievements! Recruiters want metrics: reduced latency by X%, increased revenue by $Y');
    } else {
      weaknesses.push('Lack of quantified results (percentages, dollar figures, or scale numbers)');
      suggestions.push('Apply the Google X-Y-Z formula: Accomplished [X], measured by [Y], by doing [Z]');
    }

    // Action verbs
    if (actionVerbBullets >= 3) {
      score += 8;
      strengths.push('Strong action-oriented bullet leads (Architected, Engineered, Spearheaded)');
    } else {
      suggestions.push('Start every bullet point with a dynamic past-tense action verb');
    }

    if (fluffFound) {
      score = Math.max(0, score - 5);
      weaknesses.push('Contains passive phrasing or buzzwords (e.g. "responsible for", "helped with")');
      suggestions.push('Use the AI Bullet Enhancer to replace passive phrases with direct impact statements');
    }
  }

  // 4. Skills Section (Max 15 pts)
  const totalSkills = resume.skills.flatMap((s) => s.skills).filter(Boolean).length;
  if (totalSkills >= 8 && totalSkills <= 35) {
    score += 15;
    strengths.push(`Optimal technical skills density (${totalSkills} relevant skills categorized)`);
  } else if (totalSkills > 35) {
    score += 10;
    weaknesses.push('Too many skills listed. Keyword stuffing can harm ATS ranking and human readability');
    suggestions.push('Prune generic tools to focus on top 12-25 high-priority technologies');
  } else if (totalSkills > 0) {
    score += 8;
    suggestions.push('Add more core tools, frameworks, and programming languages to pass automated ATS filters');
  } else {
    suggestions.push('Add a categorized Skills section (Languages, Frameworks, Cloud)');
  }

  // 5. Education & Projects (Max 15 pts)
  let eduProjScore = 0;
  if (resume.education.length > 0) eduProjScore += 8;
  if (resume.projects.length > 0) eduProjScore += 7;
  score += eduProjScore;

  if (resume.projects.length > 0) {
    strengths.push('Showcases real-world projects with live/GitHub repository links');
  } else {
    suggestions.push('Add 1-2 featured technical projects demonstrating practical implementation of your skills');
  }

  const finalScore = Math.min(100, Math.max(0, score));
  const rating: 'Poor' | 'Average' | 'Good' | 'Excellent' =
    finalScore >= 85 ? 'Excellent' : finalScore >= 70 ? 'Good' : finalScore >= 50 ? 'Average' : 'Poor';

  const allSkillsList = resume.skills.flatMap((s) => s.skills);

  return {
    score: finalScore,
    rating,
    matchedKeywords: allSkillsList.slice(0, 8),
    missingKeywords: ['CI/CD', 'SYSTEM ARCHITECTURE', 'DOCKER'],
    strengths,
    weaknesses,
    suggestions,
  };
}
