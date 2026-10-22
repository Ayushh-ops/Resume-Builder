import React, { useState, useEffect, useMemo } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import {
  hasMetric,
  startsWeak,
  wordCount,
  buildSuggestedShape,
} from '../lib/guidance';

export interface BulletCheckProps {
  onCheckWholeResume: () => void;
  onStartFromScratch: () => void;
}

export const BulletCheck: React.FC<BulletCheckProps> = ({
  onCheckWholeResume,
  onStartFromScratch,
}) => {
  const [text, setText] = useState(
    'Responsible for working on the website and helping the team.'
  );
  const [debouncedText, setDebouncedText] = useState(text);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedText(text);
    }, 150);
    return () => clearTimeout(handler);
  }, [text]);

  const trimmed = debouncedText.trim();
  const hasContent = trimmed.length > 0;

  const checks = useMemo(() => {
    if (!hasContent) return [];

    const verbPassed = !startsWeak(trimmed);
    const metricPassed = hasMetric(trimmed);
    const count = wordCount(trimmed);
    const lengthPassed = count >= 8 && count <= 28;

    return [
      {
        id: 'verb',
        label: 'Starts with a strong action verb',
        passed: verbPassed,
      },
      {
        id: 'metric',
        label: 'Contains a number, % or $ (metric)',
        passed: metricPassed,
      },
      {
        id: 'length',
        label: 'Length 8-28 words',
        passed: lengthPassed,
      },
    ];
  }, [trimmed, hasContent]);

  const suggestedShape = useMemo(() => {
    if (!hasContent) return '';
    return buildSuggestedShape(trimmed);
  }, [trimmed, hasContent]);

  return (
    <div className="border border-line bg-card p-5 max-w-md w-full rounded-[6px] shadow-sm select-none">
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-ink">
          Try it: check a bullet point
        </h2>
        <p className="text-[11px] text-ink/50 mt-0.5">
          Edit the text or paste your own.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste a resume bullet point..."
        className="w-full min-h-[96px] p-2.5 text-xs text-ink bg-canvas/50 border border-line rounded-[6px] focus:outline-none focus:border-ink/40 resize-none font-sans leading-relaxed"
        rows={3}
      />

      {hasContent && (
        <div className="mt-3.5 space-y-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className="flex items-start gap-2 text-xs text-ink/80"
              data-status={check.passed ? 'pass' : 'fail'}
            >
              {check.passed ? (
                <Check
                  className="w-3.5 h-3.5 text-ink/70 shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
              ) : (
                <AlertCircle
                  className="w-3.5 h-3.5 text-ink/40 shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
              )}
              <span className={check.passed ? 'text-ink/80' : 'text-ink/60'}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasContent && suggestedShape && (
        <div className="mt-3 pt-3 border-t border-line">
          <span className="text-[11px] text-ink/50 block mb-1 font-medium">
            Suggested shape
          </span>
          <p className="text-xs text-ink/80 leading-relaxed break-words">
            {suggestedShape}
          </p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onCheckWholeResume}
          className="btn-primary h-8 px-3 text-xs font-medium cursor-pointer"
        >
          Check my whole resume
        </button>
        <button
          type="button"
          onClick={onStartFromScratch}
          className="text-xs text-ink/60 hover:text-ink hover:underline cursor-pointer"
        >
          or start from scratch
        </button>
      </div>
    </div>
  );
};
