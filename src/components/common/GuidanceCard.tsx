import React, { useState } from 'react';
import { Check, ChevronDown, ChevronRight, ArrowRight, Plus, Sparkles, RefreshCw } from 'lucide-react';
import type { GuidanceItem } from '../../lib/guidance';

interface GuidanceCardProps {
  item: GuidanceItem;
  onGoToSection?: (sectionId: string, bulletRef?: string) => void;
  onAddSkill?: (skill: string) => void;
  onImproveWithAi?: (item: GuidanceItem) => Promise<string | void>;
  isAiImproving?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  personal: 'Personal Info',
  summary: 'Summary',
  experience: 'Experience',
  skills: 'Skills',
  projects: 'Projects',
  education: 'Education',
  certifications: 'Certifications',
};

export const GuidanceCard: React.FC<GuidanceCardProps> = ({
  item,
  onGoToSection,
  onAddSkill,
  onImproveWithAi,
  isAiImproving = false,
}) => {
  const [isOpen, setIsOpen] = useState(item.status === 'fix');
  const [aiEnhancedText, setAiEnhancedText] = useState<string | null>(null);
  const [isCallingAi, setIsCallingAi] = useState(false);

  const sectionLabel = SECTION_LABELS[item.section] || item.section;

  const handleAiClick = async () => {
    if (!onImproveWithAi || isCallingAi) return;
    setIsCallingAi(true);
    try {
      const res = await onImproveWithAi(item);
      if (res && typeof res === 'string') {
        setAiEnhancedText(res);
      }
    } catch {
      // silently keep rule text on error
    } finally {
      setIsCallingAi(false);
    }
  };

  // Status OK: Collapsed by default, muted check, plain neutral styling
  if (item.status === 'ok') {
    return (
      <div className="border border-line bg-card rounded-[6px] transition">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="w-full p-3 flex items-center justify-between text-left cursor-pointer hover:bg-muted/30 rounded-[6px] transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Check className="w-3.5 h-3.5 text-ink/50 shrink-0" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-ink truncate">{item.title}</span>
            <span className="text-[11px] text-ink/50 truncate hidden sm:inline">{item.found}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-ink/40 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-ink/40 shrink-0" />
          )}
        </button>

        {isOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-line text-xs space-y-1.5 text-ink/70">
            <p>
              <span className="font-medium text-ink">In your resume: </span>
              {item.found}
            </p>
            <p>
              <span className="font-medium text-ink">Why it matters: </span>
              {item.why}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Status FIX: Expanded, plain neutral UI, actionable steps
  return (
    <div className="border border-line bg-card p-3.5 rounded-[6px] space-y-2.5 text-xs text-ink transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold text-ink">{item.title}</h4>
        {onGoToSection && (
          <button
            type="button"
            onClick={() => onGoToSection(item.section, item.bulletRef)}
            className="text-[11px] font-medium text-ink/70 hover:text-ink inline-flex items-center gap-1 cursor-pointer shrink-0 transition"
          >
            <span>Go to {sectionLabel}</span>
            <ArrowRight className="w-3 h-3 text-ink/50" />
          </button>
        )}
      </div>

      {/* In your resume line */}
      <p className="text-ink/80 leading-relaxed">
        <span className="font-medium text-ink">In your resume: </span>
        {item.found}
      </p>

      {/* Why it matters line */}
      <p className="text-ink/65 leading-relaxed">
        <span className="font-medium text-ink">Why it matters: </span>
        {item.why}
      </p>

      {/* Do this line */}
      <p className="text-ink/85 leading-relaxed">
        <span className="font-medium text-ink">Do this: </span>
        {item.fix}
      </p>

      {/* Optional Skills Checklist */}
      {item.missingSkills && item.missingSkills.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-medium text-ink/60 block">Missing skills for this role:</span>
          <div className="flex flex-wrap gap-1.5">
            {item.missingSkills.map((sk) => (
              <span
                key={sk}
                className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 bg-muted border border-line rounded-[4px] text-[11px] text-ink"
              >
                <span>{sk}</span>
                {onAddSkill && (
                  <button
                    type="button"
                    onClick={() => onAddSkill(sk)}
                    className="p-0.5 hover:text-brand-600 transition cursor-pointer"
                    title={`Add "${sk}" to your skills`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Optional Before / After box */}
      {(item.before || item.after || aiEnhancedText) && (
        <div className="p-2.5 bg-muted/40 border border-line rounded-[6px] space-y-1.5 text-[11px]">
          {item.before && (
            <div>
              <span className="text-ink/50 font-medium block text-[10px] uppercase tracking-wider">Before</span>
              <p className="text-ink/60 font-mono line-through mt-0.5">{item.before}</p>
            </div>
          )}
          <div>
            <span className="text-ink font-medium block text-[10px] uppercase tracking-wider">
              {aiEnhancedText ? 'AI-improved version' : 'Suggested template'}
            </span>
            <p className="text-ink font-mono mt-0.5">{aiEnhancedText || item.after}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-line">
        {onGoToSection && (
          <button
            type="button"
            onClick={() => onGoToSection(item.section, item.bulletRef)}
            className="btn-outline h-7 px-2.5 text-xs inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Go to {sectionLabel}</span>
            <ArrowRight className="w-3 h-3 text-ink/50" />
          </button>
        )}

        {onImproveWithAi && (
          <button
            type="button"
            onClick={handleAiClick}
            disabled={isCallingAi || isAiImproving}
            className="btn-outline h-7 px-2.5 text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            {isCallingAi || isAiImproving ? (
              <RefreshCw className="w-3 h-3 animate-spin text-ink/50" />
            ) : (
              <Sparkles className="w-3 h-3 text-ink/50" />
            )}
            <span>{isCallingAi || isAiImproving ? 'Improving...' : 'Improve with AI'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
