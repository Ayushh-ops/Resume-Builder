import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export type ToolId = 'ats_profile' | 'matcher' | 'trends' | 'job_radar';

interface ToolHowToContent {
  title: string;
  steps: string[];
  example: string;
}

export const HOW_TO_USE_CONTENT: Record<ToolId, ToolHowToContent> = {
  ats_profile: {
    title: 'Custom ATS format',
    steps: [
      'Select a preset scoring rubric or create a custom one with specific requirements.',
      'Paste job requirements or adjust point weights for skills, metrics, and experience.',
      'Save to view real-time score updates and jump straight to sections that need fixes.',
    ],
    example: 'Rubric requiring "React, AWS & metrics" -> live score breakdown with prioritized fix checklist.',
  },
  matcher: {
    title: 'Match to a job description',
    steps: [
      'Paste the full job posting text into the description field.',
      'Run analysis to uncover keyword alignment, missing skills, and match percentage.',
      'Use bullet suggestions and tailoring shortcuts to incorporate missing qualifications.',
    ],
    example: 'Job posting demanding "Go & Kafka" -> 68% match with concrete bullet templates to add.',
  },
  trends: {
    title: 'Industry trends & audit',
    steps: [
      'Run the audit to evaluate metrics density, action verbs, and skills coverage.',
      'Review flagged issues first, then check passed recruiter benchmarks.',
      'Apply suggested before/after templates to rewrite weak bullet points with numbers.',
    ],
    example: 'Bullet without metrics -> rewritten with X-Y-Z formula and quantified placeholders.',
  },
  job_radar: {
    title: 'Job search feeds',
    steps: [
      'Set your target role title and location in Personal Info.',
      'Review high-demand industry skills to see what is present vs. missing in your draft.',
      'Click live search portal links (LinkedIn, Indeed, Google) for roles posted in the last 24 hours.',
    ],
    example: 'Target "Full-Stack Engineer" -> pre-filtered links across 4 platforms with top skill tags.',
  },
};

interface HowToUseProps {
  toolId: ToolId;
  defaultOpen?: boolean;
}

export const HowToUse: React.FC<HowToUseProps> = ({ toolId, defaultOpen }) => {
  const storageKey = `rc-how-to:${toolId}`;
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return stored === 'true';
    return defaultOpen !== undefined ? defaultOpen : false;
  });

  const content = HOW_TO_USE_CONTENT[toolId];
  if (!content) return null;

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="border border-line bg-card rounded-[6px] transition select-none">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-3 py-1.5 flex items-center justify-between text-left cursor-pointer hover:bg-muted/30 rounded-[6px] transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <HelpCircle className="w-3.5 h-3.5 text-ink/50 shrink-0" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-ink">How to use</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-ink/40 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-ink/40 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-line text-xs space-y-2 text-ink/80 select-text">
          <ol className="space-y-1 list-decimal list-inside text-ink/75 leading-relaxed">
            {content.steps.slice(0, 3).map((st, i) => (
              <li key={i}>{st}</li>
            ))}
          </ol>
          <div className="pt-1.5 border-t border-line text-[11px] text-ink/65">
            <strong className="text-ink font-medium">Example:</strong> {content.example}
          </div>
        </div>
      )}
    </div>
  );
};
