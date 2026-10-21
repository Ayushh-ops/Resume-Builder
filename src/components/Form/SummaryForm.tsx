import React, { useState } from 'react';
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

  const words = summary?.trim().split(/\s+/).filter(Boolean).length || 0;

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

      {aiSuggestions && !isGenerating && (
        <div className="p-3 bg-brand-50 border border-brand-500/20 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-brand-700 dark:text-brand-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-brand-600" />
              AI Suggested Summary ({tone}):
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={applyAiSuggestion}
                className="btn-primary py-1 px-2.5 text-xs"
              >
                <Check className="w-3 h-3" />
                Apply
              </button>
              <button
                onClick={() => setAiSuggestions(null)}
                className="px-2 py-1 text-xs text-ink/50 hover:text-ink"
              >
                Dismiss
              </button>
            </div>
          </div>
          <p className="text-xs text-ink leading-relaxed italic bg-card p-2.5 rounded-lg border border-line">
            "{aiSuggestions}"
          </p>
        </div>
      )}

      <div className="relative">
        <textarea
          value={summary || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="Dynamic professional with 5+ years of experience in..."
          className="input leading-relaxed"
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
