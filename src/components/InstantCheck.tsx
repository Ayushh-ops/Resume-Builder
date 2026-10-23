import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ResumeData } from '../types/resume';
import { fallbackRegexParser } from '../services/resumeParser';
import { calculateLiveATSScore } from '../services/atsScorer';

export interface InstantCheckProps {
  onCheckMyOwnResume: () => void;
  onOpenInEditor: (data: Partial<ResumeData>, rawText: string) => void;
}

const SAMPLE_WEAK_RESUME = `Alex Taylor
Software Engineer
alex.taylor@email.com | (555) 234-5678 | San Francisco, CA | linkedin.com/in/alextaylor

Professional Summary
Software engineer with experience building web applications. Responsible for writing backend code and fixing bugs across multiple repositories.

Experience
Software Engineer at Acme Corp | 2022 - Present
- Responsible for maintaining the core customer portal and bug fixing
- Helped team members with code reviews and sprint deliverables
- Worked on database performance and documentation

Junior Developer at TechStart | 2020 - 2022
- Assisted in building user interfaces using React and JavaScript
- Participated in weekly standups and wrote unit tests

Education
Bachelor of Science in Computer Science | State University | 2016 - 2020

Skills
JavaScript, React, Node.js, HTML, CSS, Git, SQL
`;

export const InstantCheck: React.FC<InstantCheckProps> = ({
  onCheckMyOwnResume,
  onOpenInEditor,
}) => {
  const [text, setText] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [debouncedText, setDebouncedText] = useState('');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedText(text);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]);

  const handleTrySample = () => {
    setText(SAMPLE_WEAK_RESUME);
    setIsSample(true);
    setDebouncedText(SAMPLE_WEAK_RESUME);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setIsSample(false);
  };

  const { parsedData, atsResult, topFailed } = useMemo(() => {
    const clean = debouncedText.trim();
    if (!clean) {
      return { parsedData: null, atsResult: null, topFailed: [] };
    }

    try {
      const parsed = fallbackRegexParser(clean);
      const ats = calculateLiveATSScore(parsed as ResumeData);

      // Top 3 failed criteria with one-line fixes
      const failed = (ats.criterionResults || [])
        .filter((c) => c.status !== 'pass')
        .slice(0, 3);

      return { parsedData: parsed, atsResult: ats, topFailed: failed };
    } catch (err) {
      console.error('InstantCheck parsing/scoring error:', err);
      return { parsedData: null, atsResult: null, topFailed: [] };
    }
  }, [debouncedText]);

  const hasContent = Boolean(text.trim());

  return (
    <div className="border border-line bg-card p-5 max-w-md w-full rounded-[6px] shadow-sm select-none text-left">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xs font-semibold text-ink">Instant check</h2>
          <p className="text-[11px] text-ink/60 mt-0.5">
            See how a resume scores. Nothing is uploaded.
          </p>
        </div>
        <button
          type="button"
          onClick={handleTrySample}
          className="btn-outline h-7 px-2.5 text-[11px] font-medium cursor-pointer shrink-0"
        >
          Try with a sample resume
        </button>
      </div>

      {/* Textarea for pasting or displaying sample */}
      <div className="mb-3">
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Paste resume text here, or click 'Try with a sample resume' above..."
          className="w-full min-h-[160px] p-2.5 text-xs font-mono text-ink bg-canvas/60 border border-line rounded-[6px] focus:outline-none focus:border-ink/40 resize-y leading-relaxed"
        />
      </div>

      {/* Live Score + Top 3 Fixes (empty textarea shows nothing) */}
      {hasContent && atsResult && (
        <div className="mb-4 pt-3 border-t border-line space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-serif font-semibold text-ink">
                {atsResult.score}
              </span>
              <span className="text-xs text-ink/50">/ 100 ATS score</span>
            </div>
            {isSample && (
              <span className="text-[11px] text-ink/50 border border-line px-1.5 py-0.5 rounded">
                Sample resume
              </span>
            )}
          </div>

          {topFailed.length > 0 ? (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-ink block">Top fixes needed:</span>
              <div className="space-y-1.5">
                {topFailed.map((item, idx) => (
                  <div key={idx} className="p-2 bg-muted/40 border border-line rounded-[4px] text-xs">
                    <div className="font-medium text-ink flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>{item.message || item.criterion.label}</span>
                    </div>
                    <div className="text-[11px] text-ink/70 mt-1 pl-3 leading-relaxed">
                      {item.fix}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-emerald-600 font-medium">
              No critical issues detected!
            </p>
          )}
        </div>
      )}

      {/* Final CTA Row */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-line">
        <button
          type="button"
          onClick={onCheckMyOwnResume}
          className="btn-outline h-8 px-3 text-xs font-medium cursor-pointer"
        >
          Check my own resume
        </button>
        <button
          type="button"
          onClick={() => {
            if (parsedData) {
              onOpenInEditor(parsedData, text);
            }
          }}
          disabled={!hasContent || !parsedData}
          className="btn-primary h-8 px-3 text-xs font-medium cursor-pointer disabled:opacity-50"
        >
          Open in editor
        </button>
      </div>
    </div>
  );
};
