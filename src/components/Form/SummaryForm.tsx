import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Check, RefreshCw } from 'lucide-react';
import type { ResumeData } from '../../types/resume';
import { generateSummary } from '../../services/geminiService';
import { Skeleton } from '../common/Skeleton';

interface SummaryFormProps {
  summary: string;
  resumeData: ResumeData;
  onChange: (summary: string) => void;
}

export const SummaryForm: React.FC<SummaryFormProps> = ({ summary, resumeData, onChange }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState<'impactful' | 'executive' | 'technical' | 'concise'>('impactful');
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const words = summary?.trim().split(/\s+/).filter(Boolean).length || 0;

  // Auto-grow textarea with min-height 140px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(140, textareaRef.current.scrollHeight)}px`;
    }
  }, [summary]);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${Math.max(140, el.scrollHeight)}px`;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateSummary(resumeData, tone);
      setAiSuggestions(generated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyAiSuggestion = () => {
    if (aiSuggestions) {
      onChange(aiSuggestions);
      setAiSuggestions(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink">Tone:</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as any)}
            className="text-xs bg-card border border-line rounded-md px-2 py-1 text-ink focus:ring-1 focus:ring-brand-500"
          >
            <option value="impactful">Impactful (Metrics)</option>
            <option value="technical">Technical Depth</option>
            <option value="executive">Executive / Leadership</option>
            <option value="concise">Concise & Punchy</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-outline h-7 px-2.5 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
          <span>{isGenerating ? 'Generating…' : 'Generate summary'}</span>
        </button>
      </div>

      {isGenerating && (
        <div className="p-3 bg-brand-50/50 border border-brand-500/20 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold mb-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>AI Crafting Professional Summary...</span>
          </div>
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[90%]" />
          <Skeleton className="h-3.5 w-[75%]" />
        </div>
      )}

      {/* Never overwrite directly: show Current and Proposed with Apply and Dismiss */}
      {aiSuggestions && !isGenerating && (
        <div className="p-3 bg-muted/20 border border-line rounded-[8px] space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-ink font-semibold">
            <span className="flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-brand-600" />
              AI Suggested Summary ({tone}):
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAiSuggestions(null)}
                className="px-2.5 py-1 text-xs text-ink/60 hover:bg-muted rounded-[6px] transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={applyAiSuggestion}
                className="btn-primary py-1 px-3 text-xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Apply
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2.5 rounded-[6px] border border-line bg-muted/20 text-xs">
              <span className="text-[10px] font-medium uppercase tracking-wider text-ink/50 block mb-1">
                Current
              </span>
              <p className="text-ink/80 text-xs leading-relaxed">{summary || '(Empty summary)'}</p>
            </div>

            <div className="p-2.5 rounded-[6px] border border-line border-l-2 border-l-brand-600 bg-muted/20 text-xs pl-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400 block mb-1">
                Proposed
              </span>
              <p className="text-ink font-medium text-xs leading-relaxed">{aiSuggestions}</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={summary || ''}
          onChange={(e) => onChange(e.target.value)}
          onInput={handleTextareaInput}
          placeholder="Dynamic professional with 5+ years of experience in..."
          className="input leading-relaxed min-h-[140px] resize-y overflow-hidden text-sm"
        />
        <div className="flex items-center justify-between mt-1 text-[11px] text-ink/50">
          <span>
            {words} words{' '}
            {words >= 40 && words <= 80 ? (
              <span className="text-emerald-600 font-medium">✓ Optimal ATS length</span>
            ) : words > 80 ? (
              <span className="text-amber-600">⚠ Consider trimming to &lt;80 words</span>
            ) : (
              <span className="text-ink/40">(Recommended: 40-80 words)</span>
            )}
          </span>
          <span className="text-ink/40">Avoid 1st person ("I", "my")</span>
        </div>
      </div>
    </div>
  );
};
