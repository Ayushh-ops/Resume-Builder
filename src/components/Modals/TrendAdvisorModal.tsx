import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { Modal } from '../common/Modal';
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
          <span className="inline-flex items-center gap-1.5 text-xs text-ink/70">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>High priority</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink/70">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Recommended</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink/70">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />
            <span>Polish</span>
          </span>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Industry Trends & Recommendations"
      subtitle="Suggestions to align your resume with current industry expectations"
      icon={<TrendingUp className="w-4 h-4 text-ink/70" strokeWidth={1.5} />}
      maxWidth="max-w-3xl"
      footer={
        <div className="w-full flex justify-end items-center text-xs">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline h-8 px-3.5"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Quick 2026 Hiring Landscape Overview */}
        <div className="p-4 bg-muted/60 border border-line rounded-xl flex items-start gap-3 text-xs text-ink">
          <Lightbulb className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-ink">What 2026 Recruiters Care About Most:</p>
            <p className="text-[11px] text-ink/70 mt-1 leading-relaxed">
              Recruiters are filtering for <strong>quantifiable business outcomes</strong> (not passive responsibilities), <strong>demonstrated AI & LLM tooling adoption</strong>, and <strong>crisp 1-page ATS formatting</strong>. Here is your customized upgrade checklist:
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-[12.5px] font-medium text-ink/60">
            Personalized recommendations ({tips.length})
          </h3>
          <button
            onClick={loadTips}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-50/80 border border-brand-500/20 rounded-lg transition-colors disabled:opacity-50"
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
          <div className="py-12 flex flex-col items-center justify-center text-ink/50 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            <p className="text-xs">Analyzing resume against 2026 tech market benchmarks...</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className="p-4 bg-card hover:bg-muted border border-line rounded-xl transition-all shadow-soft space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink">{tip.title}</span>
                      {getSeverityBadge(tip.severity)}
                    </div>
                    <span className="text-xs text-ink/50">
                      {tip.category}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-ink/70 leading-relaxed">{tip.description}</p>

                {/* Actionable Step Box - plain left border 2px accent, no tinted bg */}
                <div className="py-1 px-3 border-l-2 border-brand-600 text-xs text-ink">
                  <div>
                    <span className="font-semibold text-ink">Next action: </span>
                    <span className="text-ink/80">{tip.actionableStep}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
