import type { ResumeData, ATSCheckResult, ATSProfile, ATSCriterionResult } from '../types/resume';

const STRONG_ACTION_VERBS = [
  'architected', 'spearheaded', 'orchestrated', 'engineered', 'optimized',
  'streamlined', 'developed', 'deployed', 'implemented', 'designed', 'accelerated',
  'automated', 'built', 'reduced', 'increased', 'mentored', 'championed', 'scaled'
];

export const PRESET_ATS_PROFILES: ATSProfile[] = [
  {
    id: 'default',
    name: 'Modern ATS (Balanced)',
    description: 'Industry-standard criteria evaluating keywords, metrics, contact info, and section structure.',
    criteria: [
      {
        id: 'contact_info',
        label: 'Complete Contact & Links',
        weight: 20,
        type: 'section',
        params: {
          sectionName: 'personal',
          fixSuggestion: 'Provide full name, target title, email, phone, location, and LinkedIn/GitHub link',
        },
      },
      {
        id: 'summary_concise',
        label: 'Professional Summary Calibration',
        weight: 15,
        type: 'length',
        params: {
          minLength: 30,
          maxLength: 90,
          fixSuggestion: 'Keep summary between 30 and 90 words with high-level value proposition',
        },
      },
      {
        id: 'no_first_person',
        label: 'No First-Person Pronouns',
        weight: 5,
        type: 'regex',
        params: {
          pattern: '\\b(i|me|my|we|our)\\b',
          flags: 'i',
          fixSuggestion: 'Remove "I", "my", "we" from summary and bullets (use implied third-person)',
        },
      },
      {
        id: 'experience_metrics',
        label: 'Quantified Metrics in Bullets',
        weight: 25,
        type: 'metric',
        params: {
          metricType: 'numbers',
          minCount: 3,
          fixSuggestion: 'Include hard numbers, percentages (%), or dollar amounts in at least 3 bullets',
        },
      },
      {
        id: 'action_verbs',
        label: 'Dynamic Action Verbs',
        weight: 15,
        type: 'metric',
        params: {
          metricType: 'actionVerbs',
          minCount: 3,
          fixSuggestion: 'Start experience bullet points with strong action verbs (Engineered, Architected, Scaled)',
        },
      },
      {
        id: 'skills_density',
        label: 'Technical Skills Categorization',
        weight: 10,
        type: 'section',
        params: {
          sectionName: 'skills',
          minCount: 8,
          fixSuggestion: 'List 8 to 35 core technical skills across categorized groups',
        },
      },
      {
        id: 'education_projects',
        label: 'Education & Technical Projects',
        weight: 10,
        type: 'section',
        params: {
          sectionName: 'education_projects',
          fixSuggestion: 'Include formal education and at least one technical project with repo/demo link',
        },
      },
    ],
  },
  {
    id: 'workday',
    name: 'Workday ATS',
    description: 'Strict parser prioritizing standard headers, clear chronological job titles, and verified credentials.',
    criteria: [
      {
        id: 'workday_contact',
        label: 'Verified Direct Contact Data',
        weight: 25,
        type: 'section',
        params: {
          sectionName: 'personal',
          fixSuggestion: 'Workday requires valid email, phone number, and physical city/state location for geofiltering',
        },
      },
      {
        id: 'workday_exp',
        label: 'Chronological Work Experience',
        weight: 30,
        type: 'section',
        params: {
          sectionName: 'experience',
          minCount: 1,
          fixSuggestion: 'Ensure standard job titles and chronological dates for accurate Workday timeline extraction',
        },
      },
      {
        id: 'workday_education',
        label: 'Degree & Institutional Accreditation',
        weight: 15,
        type: 'section',
        params: {
          sectionName: 'education',
          minCount: 1,
          fixSuggestion: 'List university degree and institution for education parsing filters',
        },
      },
      {
        id: 'workday_skills',
        label: 'Standard Technical Taxonomies',
        weight: 20,
        type: 'section',
        params: {
          sectionName: 'skills',
          minCount: 10,
          fixSuggestion: 'Add recognized standard technical skills matching the target job profile',
        },
      },
      {
        id: 'workday_fluff',
        label: 'Zero Buzzwords / Fluff Free',
        weight: 10,
        type: 'regex',
        params: {
          pattern: '\\b(hard worker|team player|synergy|go-getter|responsible for)\\b',
          flags: 'i',
          fixSuggestion: 'Remove vague fluff phrases like "responsible for" or "team player"',
        },
      },
    ],
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse ATS',
    description: 'Popular with tech scaleups; prioritizes hard metrics, modern tech stack keywords, and github links.',
    criteria: [
      {
        id: 'gh_metrics',
        label: 'Quantified Business & Tech Impact',
        weight: 35,
        type: 'metric',
        params: {
          metricType: 'numbers',
          minCount: 4,
          fixSuggestion: 'Include 4+ bullets with measurable scale, percentages, latency or revenue numbers',
        },
      },
      {
        id: 'gh_tech_skills',
        label: 'Modern Tech Stack Keywords',
        weight: 25,
        type: 'section',
        params: {
          sectionName: 'skills',
          minCount: 12,
          fixSuggestion: 'Include cloud, language, and framework technologies relevant to modern tech stacks',
        },
      },
      {
        id: 'gh_projects',
        label: 'Open Source / Live Projects & GitHub',
        weight: 20,
        type: 'section',
        params: {
          sectionName: 'projects',
          minCount: 1,
          fixSuggestion: 'Greenhouse recruiters look for GitHub/portfolio links proving hands-on competence',
        },
      },
      {
        id: 'gh_summary',
        label: 'Direct Executive Summary',
        weight: 20,
        type: 'length',
        params: {
          minLength: 25,
          maxLength: 80,
          fixSuggestion: 'Keep summary concise (25-80 words) focusing on specialized technical domain',
        },
      },
    ],
  },
  {
    id: 'lever',
    name: 'Lever ATS',
    description: 'Focuses on candidate storytelling, strong action verbs, and clean role progression.',
    criteria: [
      {
        id: 'lever_verbs',
        label: 'Decisive Action Verb Leads',
        weight: 30,
        type: 'metric',
        params: {
          metricType: 'actionVerbs',
          minCount: 4,
          fixSuggestion: 'Start bullets with strong ownership verbs: Spearheaded, Architected, Engineered',
        },
      },
      {
        id: 'lever_experience',
        label: 'Detailed Role Achievements',
        weight: 30,
        type: 'section',
        params: {
          sectionName: 'experience',
          minCount: 1,
          fixSuggestion: 'Provide detailed bullet points showing progression and ownership of deliverables',
        },
      },
      {
        id: 'lever_links',
        label: 'Online Profiles (LinkedIn / Portfolio)',
        weight: 20,
        type: 'section',
        params: {
          sectionName: 'personal',
          fixSuggestion: 'Lever candidate profiles link directly to LinkedIn, GitHub, and personal portfolio sites',
        },
      },
      {
        id: 'lever_skills',
        label: 'Skills Breadth & Categorization',
        weight: 20,
        type: 'section',
        params: {
          sectionName: 'skills',
          minCount: 8,
          fixSuggestion: 'Structure skills into distinct categories (e.g. Languages, Cloud, Frameworks)',
        },
      },
    ],
  },
  {
    id: 'taleo',
    name: 'Oracle Taleo ATS',
    description: 'Enterprise legacy system emphasizing exact keyword frequency, formal education, and zero formatting tricks.',
    criteria: [
      {
        id: 'taleo_keywords',
        label: 'Core Role Keywords Density',
        weight: 35,
        type: 'section',
        params: {
          sectionName: 'skills',
          minCount: 10,
          fixSuggestion: 'Taleo ranks applicants based on exact technical keyword count and repetitions',
        },
      },
      {
        id: 'taleo_contact',
        label: 'Full Postal/Location & Contact',
        weight: 25,
        type: 'section',
        params: {
          sectionName: 'personal',
          fixSuggestion: 'Provide complete city, state, phone, and professional email for Taleo requisition mapping',
        },
      },
      {
        id: 'taleo_education',
        label: 'Formal Degree Verification',
        weight: 20,
        type: 'section',
        params: {
          sectionName: 'education',
          minCount: 1,
          fixSuggestion: 'Enterprise systems screen candidates by degree type (B.Tech, B.S., M.S.) and major',
        },
      },
      {
        id: 'taleo_experience',
        label: 'Standard Chronological Employment',
        weight: 20,
        type: 'section',
        params: {
          sectionName: 'experience',
          minCount: 1,
          fixSuggestion: 'Ensure clear start and end dates for automated tenure calculations',
        },
      },
    ],
  },
];

export function getStoredCustomProfiles(): ATSProfile[] {
  try {
    const raw = localStorage.getItem('ats-custom-profiles');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read custom ATS profiles', e);
  }
  return [];
}

export function saveCustomProfile(profile: ATSProfile): void {
  try {
    const existing = getStoredCustomProfiles();
    const updated = existing.filter((p) => p.id !== profile.id).concat({ ...profile, isCustom: true });
    localStorage.setItem('ats-custom-profiles', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom ATS profile', e);
  }
}

export function deleteCustomProfile(id: string): void {
  try {
    const existing = getStoredCustomProfiles();
    const filtered = existing.filter((p) => p.id !== id);
    localStorage.setItem('ats-custom-profiles', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete custom ATS profile', e);
  }
}

export function getAllATSProfiles(): ATSProfile[] {
  return [...PRESET_ATS_PROFILES, ...getStoredCustomProfiles()];
}

export function getActiveProfileId(): string {
  return localStorage.getItem('active-ats-profile-id') || 'default';
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem('active-ats-profile-id', id);
}

export function isResumeEmptyForAts(resume: ResumeData | null | undefined): boolean {
  if (!resume) return true;
  const hasName = Boolean(resume.personalInfo?.fullName?.trim());
  const hasSummary = Boolean(resume.summary?.trim());
  const hasExp = Boolean(resume.experience && resume.experience.length > 0);
  return !hasName && !hasSummary && !hasExp;
}

export function isResumeEmpty(resume: ResumeData): boolean {
  const hasName = Boolean(resume.personalInfo?.fullName?.trim());
  const hasTitle = Boolean(resume.personalInfo?.jobTitle?.trim());
  const hasSummary = Boolean(resume.summary?.trim());
  const hasExp = resume.experience?.length > 0;
  const hasEdu = resume.education?.length > 0;
  const hasSkills = resume.skills?.some((s) => s.skills?.length > 0);
  return !hasName && !hasTitle && !hasSummary && !hasExp && !hasEdu && !hasSkills;
}

export function calculateLiveATSScore(
  resume: ResumeData,
  profileIdOrProfile?: string | ATSProfile
): ATSCheckResult {
  // 1. Check for truly empty resume state
  if (isResumeEmptyForAts(resume) || isResumeEmpty(resume)) {
    return {
      score: 0,
      rating: 'Poor',
      matchedKeywords: [],
      missingKeywords: ['ADD CONTACT INFO', 'ADD EXPERIENCE', 'ADD SKILLS'],
      strengths: [],
      weaknesses: ['Resume is currently empty'],
      suggestions: ['Add your personal contact details, work experience, and core skills to generate an ATS score'],
      isEmpty: true,
      profileName: 'Default',
    };
  }

  // 2. Resolve ATS Profile
  let activeProfile: ATSProfile;
  if (typeof profileIdOrProfile === 'object' && profileIdOrProfile !== null) {
    activeProfile = profileIdOrProfile;
  } else {
    const profileId = typeof profileIdOrProfile === 'string' ? profileIdOrProfile : getActiveProfileId();
    const all = getAllATSProfiles();
    activeProfile = all.find((p) => p.id === profileId) || PRESET_ATS_PROFILES[0];
  }

  const allSkillsList = resume.skills.flatMap((s) => s.skills).filter(Boolean);
  const allHighlights = resume.experience.flatMap((e) => e.highlights).filter(Boolean);
  const fullText = [
    resume.personalInfo.fullName,
    resume.personalInfo.jobTitle,
    resume.summary,
    ...allSkillsList,
    ...allHighlights,
    ...resume.education.map((ed) => `${ed.institution} ${ed.degree} ${ed.fieldOfStudy}`),
  ].join(' ').toLowerCase();

  const criterionResults: ATSCriterionResult[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  for (const crit of activeProfile.criteria) {
    const weight = crit.weight || 10;
    totalWeight += weight;
    let earned = 0;
    let status: 'pass' | 'partial' | 'fail' = 'fail';
    let message = '';
    const fix = crit.params?.fixSuggestion || 'Review and optimize this criterion';

    switch (crit.type) {
      case 'section': {
        const sec = crit.params?.sectionName || '';
        if (sec === 'personal') {
          const { fullName, email, phone, jobTitle, location, linkedin, github } = resume.personalInfo;
          let count = 0;
          if (fullName?.trim().length > 2) count++;
          if (jobTitle?.trim().length > 2) count++;
          if (email?.includes('@')) count++;
          if (phone?.trim().length >= 7) count++;
          if (location?.trim().length >= 2) count++;
          if (linkedin?.trim().length >= 5 || github?.trim().length >= 5) count++;

          if (count >= 5) {
            earned = weight;
            status = 'pass';
            message = 'Complete contact info and verified links present';
          } else if (count >= 3) {
            earned = Math.round(weight * 0.6);
            status = 'partial';
            message = 'Partial contact details (missing LinkedIn/GitHub, location, or phone)';
          } else {
            earned = 0;
            status = 'fail';
            message = 'Missing essential contact fields (email, phone, or title)';
          }
        } else if (sec === 'experience') {
          const minC = crit.params?.minCount || 1;
          if (resume.experience.length >= minC) {
            earned = weight;
            status = 'pass';
            message = `${resume.experience.length} work experience entries recorded`;
          } else {
            earned = 0;
            status = 'fail';
            message = 'No work experience listed';
          }
        } else if (sec === 'education') {
          if (resume.education.length > 0) {
            earned = weight;
            status = 'pass';
            message = `${resume.education.length} degree entries listed`;
          } else {
            earned = 0;
            status = 'fail';
            message = 'No formal education added';
          }
        } else if (sec === 'skills') {
          const minC = crit.params?.minCount || 8;
          if (allSkillsList.length >= minC && allSkillsList.length <= 35) {
            earned = weight;
            status = 'pass';
            message = `Optimal technical skills density (${allSkillsList.length} skills)`;
          } else if (allSkillsList.length > 35) {
            earned = Math.round(weight * 0.7);
            status = 'partial';
            message = `Over-stuffing skills (${allSkillsList.length}). Prune to 15-25 top skills`;
          } else if (allSkillsList.length > 0) {
            earned = Math.round(weight * 0.5);
            status = 'partial';
            message = `Few skills listed (${allSkillsList.length}/${minC})`;
          } else {
            earned = 0;
            status = 'fail';
            message = 'No technical skills added';
          }
        } else if (sec === 'projects') {
          if (resume.projects.length > 0) {
            earned = weight;
            status = 'pass';
            message = `${resume.projects.length} technical projects detailed`;
          } else {
            earned = 0;
            status = 'fail';
            message = 'No technical projects listed';
          }
        } else if (sec === 'education_projects') {
          const hasEdu = resume.education.length > 0;
          const hasProj = resume.projects.length > 0;
          if (hasEdu && hasProj) {
            earned = weight;
            status = 'pass';
            message = 'Both education and technical projects present';
          } else if (hasEdu || hasProj) {
            earned = Math.round(weight * 0.6);
            status = 'partial';
            message = hasEdu ? 'Projects section recommended' : 'Education section recommended';
          } else {
            earned = 0;
            status = 'fail';
            message = 'Missing education and projects';
          }
        }
        break;
      }

      case 'metric': {
        const mType = crit.params?.metricType || 'numbers';
        const minC = crit.params?.minCount || 3;
        if (mType === 'numbers') {
          let count = 0;
          allHighlights.forEach((hl) => {
            if (/\d+%|\$\d+|\d+\s*(users|clients|teams|tb|gb|ms|k|m)\b|\d+\+/i.test(hl)) count++;
          });
          if (count >= minC) {
            earned = weight;
            status = 'pass';
            message = `${count} bullets contain hard quantitative metrics`;
          } else if (count > 0) {
            earned = Math.round((count / minC) * weight);
            status = 'partial';
            message = `Only ${count} metrics-backed bullets (target: ${minC})`;
          } else {
            earned = 0;
            status = 'fail';
            message = 'No quantitative metrics (%, $, scale) found in bullets';
          }
        } else if (mType === 'actionVerbs') {
          let count = 0;
          allHighlights.forEach((hl) => {
            const first = hl.trim().split(/\s+/)[0]?.toLowerCase();
            if (STRONG_ACTION_VERBS.includes(first)) count++;
          });
          if (count >= minC) {
            earned = weight;
            status = 'pass';
            message = `${count} bullets start with dynamic action verbs`;
          } else if (count > 0) {
            earned = Math.round((count / minC) * weight);
            status = 'partial';
            message = `Only ${count} action-verb leads (target: ${minC})`;
          } else {
            earned = 0;
            status = 'fail';
            message = 'Bullets lack dynamic action-oriented leads';
          }
        }
        break;
      }

      case 'length': {
        const words = resume.summary?.trim().split(/\s+/).filter(Boolean).length || 0;
        const minL = crit.params?.minLength || 30;
        const maxL = crit.params?.maxLength || 90;
        if (words >= minL && words <= maxL) {
          earned = weight;
          status = 'pass';
          message = `Well-calibrated summary length (${words} words)`;
        } else if (words > maxL) {
          earned = Math.round(weight * 0.6);
          status = 'partial';
          message = `Summary is slightly long (${words} words, max: ${maxL})`;
        } else if (words > 10) {
          earned = Math.round(weight * 0.5);
          status = 'partial';
          message = `Summary is brief (${words} words, min: ${minL})`;
        } else {
          earned = 0;
          status = 'fail';
          message = 'Missing executive summary';
        }
        break;
      }

      case 'regex': {
        const pat = crit.params?.pattern || '';
        const flags = crit.params?.flags || 'i';
        if (pat) {
          try {
            const rx = new RegExp(pat, flags);
            const matches = rx.test(fullText);
            // Default: regex checking for bad pattern (e.g. first-person pronouns, buzzwords)
            if (matches) {
              earned = 0;
              status = 'fail';
              message = `Found disallowed pattern match in resume text`;
            } else {
              earned = weight;
              status = 'pass';
              message = 'No disallowed phrasing or buzzwords detected';
            }
          } catch {
            earned = weight;
            status = 'pass';
          }
        }
        break;
      }

      case 'keyword': {
        const kws = crit.params?.keywords || [];
        if (kws.length > 0) {
          const matched = kws.filter((kw) => fullText.includes(kw.toLowerCase()));
          const ratio = matched.length / kws.length;
          if (ratio >= 0.8) {
            earned = weight;
            status = 'pass';
            message = `Matched ${matched.length}/${kws.length} target keywords`;
          } else if (ratio >= 0.4) {
            earned = Math.round(weight * ratio);
            status = 'partial';
            message = `Matched ${matched.length}/${kws.length} target keywords`;
          } else {
            earned = 0;
            status = 'fail';
            message = `Missing most target keywords (${matched.length}/${kws.length})`;
          }
        } else {
          earned = weight;
          status = 'pass';
        }
        break;
      }
    }

    totalWeightedScore += earned;

    criterionResults.push({
      criterion: crit,
      status,
      scoreEarned: earned,
      maxScore: weight,
      message,
      fix,
    });

    if (status === 'pass') {
      strengths.push(`${crit.label}: ${message}`);
    } else if (status === 'partial') {
      suggestions.push(`${crit.label}: ${fix}`);
    } else {
      weaknesses.push(`${crit.label}: ${message}`);
      suggestions.push(`${crit.label}: ${fix}`);
    }
  }

  const finalScore = Math.min(100, Math.max(0, Math.round((totalWeightedScore / (totalWeight || 100)) * 100)));
  const rating: 'Poor' | 'Average' | 'Good' | 'Excellent' =
    finalScore >= 80 ? 'Excellent' : finalScore >= 65 ? 'Good' : finalScore >= 50 ? 'Average' : 'Poor';

  return {
    score: finalScore,
    rating,
    matchedKeywords: allSkillsList.slice(0, 8),
    missingKeywords: ['CI/CD', 'SYSTEM ARCHITECTURE', 'DOCKER'],
    strengths,
    weaknesses,
    suggestions: suggestions.length > 0 ? suggestions : ['Keep your resume updated with your most recent projects and quantifiable results!'],
    profileId: activeProfile.id,
    profileName: activeProfile.name,
    criterionResults,
    isEmpty: false,
  };
}
