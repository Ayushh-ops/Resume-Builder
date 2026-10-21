import React, { useMemo, useState } from 'react';
import type { ResumeData } from '../../types/resume';
import { Sparkles, CheckCircle2, ChevronDown } from 'lucide-react';

interface CompletenessBarProps {
  data: ResumeData;
}

export const CompletenessBar: React.FC<CompletenessBarProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { percentage, nextHint } = useMemo(() => {
    let score = 0;
    let hint = '';

    const { personalInfo, summary, experience, education, skills } = data;

    // Personal info items (8% each = 32%)
    if (personalInfo.fullName?.trim()) score += 8;
    else if (!hint) hint = 'Add full name';

    if (personalInfo.jobTitle?.trim()) score += 8;
    else if (!hint) hint = 'Add target title';

    if (personalInfo.email?.trim()) score += 8;
    else if (!hint) hint = 'Add email address';

    if (personalInfo.phone?.trim()) score += 8;
    else if (!hint) hint = 'Add phone number';

    // Summary (18%)
    if (summary?.trim() && summary.trim().length >= 20) score += 18;
    else if (!hint) hint = 'Draft summary';

    // Experience (20%)
    const hasExp = experience.some((e) => e.company?.trim() && e.position?.trim());
    if (hasExp) score += 20;
    else if (!hint) hint = 'Add 1 role';

    // Education (15%)
    const hasEdu = education.some((e) => e.institution?.trim() || e.degree?.trim());
    if (hasEdu) score += 15;
    else if (!hint) hint = 'Add education';

    // Skills (15%)
    const validSkillCats = skills.filter((c) => c.skills && c.skills.length > 0).length;
    if (validSkillCats >= 3) {
      score += 15;
    } else {
      score += Math.round((validSkillCats / 3) * 15);
      if (!hint) hint = `Add ${3 - validSkillCats} skill categories`;
    }

    if (!hint) hint = 'Fully optimized!';

    return { percentage: Math.min(100, score), nextHint: hint };
  }, [data]);

  return (
    <div className="card p-2 bg-card border border-line shadow-soft transition-all">
      <div className="flex items-center justify-between gap-2.5 text-xs">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-1.5 shrink-0 font-medium text-ink hover:text-brand-600 transition"
          title="Toggle completeness details"
        >
          {percentage === 100 ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          )}
          <span className="font-bold tabular-nums text-[11px] text-brand-600 font-sans">
            {percentage}%
          </span>
          <ChevronDown
            className={`w-3 h-3 text-ink/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <span className="text-[11px] text-ink/60 truncate max-w-[190px] text-right font-sans" title={percentage === 100 ? '100% complete' : nextHint}>
          {percentage === 100 ? (
            <span className="font-medium text-ink/60">100% complete</span>
          ) : (
            <>
              <span className="font-medium text-ink/70">Next:</span> {nextHint}
            </>
          )}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-line grid grid-cols-2 gap-1.5 text-[10px] text-ink/60 animate-in fade-in">
          <div className="flex items-center gap-1">
            <span className={data.personalInfo.fullName ? 'text-emerald-500 font-bold' : 'text-ink/30'}>•</span>
            <span>Contact Information</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={data.summary ? 'text-emerald-500 font-bold' : 'text-ink/30'}>•</span>
            <span>Executive Summary</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={data.experience.length > 0 ? 'text-emerald-500 font-bold' : 'text-ink/30'}>•</span>
            <span>Work Experience</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={data.skills.length >= 3 ? 'text-emerald-500 font-bold' : 'text-ink/30'}>•</span>
            <span>Skills Density</span>
          </div>
        </div>
      )}
    </div>
  );
};
