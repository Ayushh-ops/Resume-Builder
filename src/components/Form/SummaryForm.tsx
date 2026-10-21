import React, { useState } from 'react';
import { Sparkles, Check, RefreshCw } from 'lucide-react';
import type { ResumeData } from '../../types/resume';
import { generateSummary } from '../../services/geminiService';

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
          <span className="text-xs font-semibold text-slate-700">Tone:</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500"
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
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          )}
          <span>{isGenerating ? 'AI Crafting...' : 'AI Generate / Polish'}</span>
        </button>
      </div>

      {aiSuggestions && (
        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-indigo-900 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              AI Suggested Summary ({tone}):
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={applyAiSuggestion}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
              >
                <Check className="w-3 h-3" />
                Apply
              </button>
              <button
                onClick={() => setAiSuggestions(null)}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Dismiss
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-2.5 rounded-lg border border-indigo-100">
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
          className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
        />
        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
          <span>
            {words} words{' '}
            {words >= 40 && words <= 80 ? (
              <span className="text-emerald-600 font-medium">✓ Optimal ATS length</span>
            ) : words > 80 ? (
              <span className="text-amber-600">⚠ Consider trimming to &lt;80 words</span>
            ) : (
              <span className="text-slate-400">(Recommended: 40-80 words)</span>
            )}
          </span>
          <span className="text-slate-400">Avoid 1st person ("I", "my")</span>
        </div>
      </div>
    </div>
  );
};
