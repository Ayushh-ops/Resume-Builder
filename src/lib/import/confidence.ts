import type { ResumeData } from '../../types/resume';

export interface ConfidenceAndCounts {
  confidence: Record<string, number>;
  counts: Record<string, number>;
}

export function calculateConfidenceAndCounts(data: Partial<ResumeData>): ConfidenceAndCounts {
  const confidence: Record<string, number> = {};
  const counts: Record<string, number> = {};

  // 1. Personal Info
  const pi = data.personalInfo || {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
  };
  let piDetectedCount = 0;
  if (pi.fullName?.trim()) piDetectedCount++;
  if (pi.jobTitle?.trim()) piDetectedCount++;
  if (pi.email?.trim()) piDetectedCount++;
  if (pi.phone?.trim()) piDetectedCount++;
  if (pi.location?.trim()) piDetectedCount++;

  counts['personalInfo'] = piDetectedCount;
  if (piDetectedCount === 0) {
    confidence['personalInfo'] = 0;
  } else {
    // 5 fields total; min 20%
    confidence['personalInfo'] = Math.round((piDetectedCount / 5) * 100);
  }

  // 2. Summary
  const hasSummary = Boolean(data.summary?.trim());
  counts['summary'] = hasSummary ? 1 : 0;
  confidence['summary'] = hasSummary ? (data.summary!.trim().length > 50 ? 100 : 70) : 0;

  // 3. Experience
  const exp = data.experience || [];
  counts['experience'] = exp.length;
  if (exp.length === 0) {
    confidence['experience'] = 0;
  } else {
    const valid = exp.filter(
      (e) => Boolean(e.position?.trim()) && Boolean(e.company?.trim())
    ).length;
    confidence['experience'] = Math.max(20, Math.round((valid / exp.length) * 100));
  }

  // 4. Education
  const edu = data.education || [];
  counts['education'] = edu.length;
  if (edu.length === 0) {
    confidence['education'] = 0;
  } else {
    const valid = edu.filter((e) => Boolean(e.degree?.trim()) || Boolean(e.institution?.trim())).length;
    confidence['education'] = Math.max(20, Math.round((valid / edu.length) * 100));
  }

  // 5. Skills
  const totalSkills = data.skills?.reduce((acc, c) => acc + (c.skills?.length || 0), 0) || 0;
  counts['skills'] = totalSkills;
  if (totalSkills === 0) {
    confidence['skills'] = 0;
  } else {
    confidence['skills'] = Math.min(100, Math.max(25, Math.round((totalSkills / 8) * 100)));
  }

  // 6. Projects
  const projs = data.projects || [];
  counts['projects'] = projs.length;
  if (projs.length === 0) {
    confidence['projects'] = 0;
  } else {
    const valid = projs.filter((p) => Boolean(p.name?.trim())).length;
    confidence['projects'] = Math.max(20, Math.round((valid / projs.length) * 100));
  }

  // 7. Certifications
  const certs = data.certifications || [];
  counts['certifications'] = certs.length;
  if (certs.length === 0) {
    confidence['certifications'] = 0;
  } else {
    confidence['certifications'] = 100;
  }

  // Overall confidence
  const presentSections = ['personalInfo', 'summary', 'experience', 'education', 'skills', 'projects']
    .filter((sec) => counts[sec] > 0);

  if (presentSections.length === 0) {
    confidence['overall'] = 0;
  } else {
    const sum = presentSections.reduce((acc, sec) => acc + confidence[sec], 0);
    confidence['overall'] = Math.round(sum / presentSections.length);
  }

  return { confidence, counts };
}
