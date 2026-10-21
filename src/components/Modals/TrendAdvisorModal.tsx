import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import type { ResumeData, TrendUpgradeTip } from '../../types/resume';
import { getModernUpgradeTips } from '../../services/geminiService';

interface TrendAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
}

export const TrendAdvisorModal: React.FC<TrendAdvisorModalProps> = ({
  isOpen,
  onClose,
  resumeData,
}) => {
  const [tips, setTips] = useState<TrendUpgradeTip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTips();
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const loadTips = async () => {
    setIsLoading(true);
    try {
      const result = await getModernUpgradeTips(resumeData);
      setTips(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            Recommended
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
            Polish
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">2026 Tech Hiring Trend Advisor</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  AI Evaluated
                </span>
              </div>
              <p className="text-xs text-ink/50">
                Actionable recommendations to beat modern ATS systems and stand out to hiring managers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[85vh] space-y-5">
          {/* Quick 2026 Hiring Landscape Overview */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
            <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">What 2026 Recruiters Care About Most:</p>
              <p className="text-emerald-800 text-[11px] mt-1 leading-relaxed">
                Recruiters are filtering for <strong>quantifiable business outcomes</strong> (not passive responsibilities), <strong>demonstrated AI & LLM tooling adoption</strong>, and <strong>crisp 1-page ATS formatting</strong>. Here is your customized upgrade checklist:
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Personalized Recommendations ({tips.length})
            </h3>
            <button
              onClick={loadTips}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isLoading ? 'Analyzing...' : 'Re-Run AI Trend Audit'}</span>
            </button>
          </div>

          {/* Tips List */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs">Analyzing resume against 2026 tech market benchmarks...</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/80 hover:bg-white border border-slate-200 rounded-xl transition-all shadow-2xs hover:shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{tip.title}</span>
                        {getSeverityBadge(tip.severity)}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {tip.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{tip.description}</p>

                  {/* Actionable Step Box */}
                  <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/70 rounded-lg flex items-start gap-2 text-xs text-emerald-900">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Next Action: </span>
                      <span className="text-emerald-800">{tip.actionableStep}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-black/[0.06] px-4 py-3 flex justify-between items-center text-xs text-ink/50 shrink-0">
          <span>Apply these suggestions directly in the Experience & Skills editors.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-ink/70 hover:bg-black/5 rounded-lg transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
