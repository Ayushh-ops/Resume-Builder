import React, { useMemo } from 'react';
import type { ResumeData } from '../../types/resume';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface CompletenessBarProps {
  data: ResumeData;
}

export const CompletenessBar: React.FC<CompletenessBarProps> = ({ data }) => {
  const { percentage, nextHint } = useMemo(() => {
    let score = 0;
    let hint = '';

    const { personalInfo, summary, experience, education, skills } = data;

    // Personal info items (8% each = 32%)
    if (personalInfo.fullName?.trim()) score += 8;
    else if (!hint) hint = 'Add your full name';

    if (personalInfo.jobTitle?.trim()) score += 8;
    else if (!hint) hint = 'Add target job title';

    if (personalInfo.email?.trim()) score += 8;
    else if (!hint) hint = 'Add email address';

    if (personalInfo.phone?.trim()) score += 8;
    else if (!hint) hint = 'Add phone number';

    // Summary (18%)
    if (summary?.trim() && summary.trim().length >= 20) score += 18;
    else if (!hint) hint = 'Draft a professional summary';

    // Experience (20%)
    const hasExp = experience.some((e) => e.company?.trim() && e.position?.trim());
    if (hasExp) score += 20;
    else if (!hint) hint = 'Add at least 1 work experience';

    // Education (15%)
    const hasEdu = education.some((e) => e.institution?.trim() || e.degree?.trim());
    if (hasEdu) score += 15;
    else if (!hint) hint = 'Add your education details';

    // Skills (15%)
    const validSkillCats = skills.filter((c) => c.skills && c.skills.length > 0).length;
    if (validSkillCats >= 3) {
      score += 15;
    } else {
      score += Math.round((validSkillCats / 3) * 15);
      if (!hint) hint = `Add ${3 - validSkillCats} more skill categories`;
    }

    if (!hint) hint = 'Resume profile fully optimized!';

    return { percentage: Math.min(100, score), nextHint: hint };
  }, [data]);

  return (
    <div className="card p-3 bg-white/80 border border-black/[0.06] shadow-2xs space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-ink">
          {percentage === 100 ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          )}
          <span>Completeness</span>
        </div>
        <span className="font-bold text-[11px] text-brand-600 font-mono">
          {percentage}% Complete
        </span>
      </div>

      <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="text-[11px] text-ink/50 truncate flex items-center justify-between">
        <span className="truncate">
          <span className="font-medium text-ink/70">Next:</span> {nextHint}
        </span>
      </div>
    </div>
  );
};
