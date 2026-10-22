import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
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
        return <span className="text-xs text-ink/50">High priority</span>;
      case 'medium':
        return <span className="text-xs text-ink/50">Recommended</span>;
      default:
        return <span className="text-xs text-ink/50">Polish</span>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Industry trends & recommendations"
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
        <div className="p-4 bg-muted/60 border border-line rounded-lg flex items-start gap-3 text-xs text-ink">
          <Lightbulb className="w-4 h-4 text-ink/70 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="font-semibold text-ink">Current hiring landscape</p>
            <p className="text-[11px] text-ink/70 mt-1 leading-relaxed">
              Recruiters prioritize quantifiable outcomes over passive duties, demonstrated tooling adoption, and crisp 1-page formatting.
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
            className="btn-outline h-7 px-2.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            <span>{isLoading ? 'Analyzing...' : 'Re-run trend audit'}</span>
          </button>
        </div>

        {/* Tips List */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-ink/50 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-ink/40" />
            <p className="text-xs">Analyzing resume against market benchmarks...</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className="p-4 bg-card hover:bg-muted border border-line rounded-lg transition-colors space-y-2"
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
