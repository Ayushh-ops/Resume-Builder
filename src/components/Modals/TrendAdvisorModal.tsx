import React, { useState, useMemo } from 'react';
import { TrendingUp, RefreshCw, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { HowToUse } from '../common/HowToUse';
import { GuidanceCard } from '../common/GuidanceCard';
import type { ResumeData } from '../../types/resume';
import { getResumeGuidance, type GuidanceItem } from '../../lib/guidance';
import { isResumeEmptyForAts } from '../../services/atsScorer';
import { enhanceBulletPoint } from '../../services/geminiService';
import { getKey, getSelectedModel } from '../../lib/gemini';
import { reviewResumeWithAI, type AIReviewSuggestion } from '../../services/aiReview';

interface TrendAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
  onGoToSection?: (sectionId: string, bulletRef?: string) => void;
  onAddSkill?: (skill: string) => void;
}

export const TrendAdvisorModal: React.FC<TrendAdvisorModalProps> = ({
  isOpen,
  onClose,
  resumeData,
  onGoToSection,
  onAddSkill,
}) => {
  const [recheckCount, setRecheckCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasRunAi, setHasRunAi] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AIReviewSuggestion[]>([]);

  const isEmpty = isResumeEmptyForAts(resumeData);

  const guidanceItems = useMemo(() => {
    if (isEmpty) return [];
    return getResumeGuidance(resumeData);
  }, [resumeData, isEmpty, recheckCount]);

  if (!isOpen) return null;

  const handleReviewWithAi = async () => {
    setAiStatus(null);
    const apiKey = getKey();
    if (!apiKey) {
      const currentModel = getSelectedModel();
      const err = `[${currentModel}] No API key set. Please set your Gemini API key in Settings.`;
      setAiStatus(err);
      setHasRunAi(true);
      return;
    }

    setAiLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);

    try {
      const result = await reviewResumeWithAI(resumeData, controller.signal);
      clearTimeout(timer);
      setHasRunAi(true);
      if (result.accepted.length > 0) {
        setAiSuggestions(result.accepted);
        setAiStatus(result.statusText);
      } else {
        setAiStatus(result.statusText || 'AI returned no suggestions');
      }
    } catch (err: any) {
      clearTimeout(timer);
      setHasRunAi(true);
      const currentModel = getSelectedModel();
      const msg =
        err.name === 'AbortError'
          ? 'AI review timed out after 40 seconds'
          : (err.message || 'AI review failed');
      const formatted = msg.startsWith('[') ? msg : `[${currentModel}] ${msg}`;
      setAiStatus(formatted);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRecheck = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setRecheckCount((c) => c + 1);
      setIsRefreshing(false);
    }, 200);
  };

  const handleImproveWithAi = async (item: GuidanceItem): Promise<string | void> => {
    const textToImprove = item.before || item.fix;
    if (!textToImprove) return;

    try {
      // 20s timeout controller
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);

      const result = await enhanceBulletPoint(textToImprove, resumeData.personalInfo.jobTitle);
      clearTimeout(timer);

      if (result && result.enhanced && result.enhanced.length > 0) {
        return result.enhanced[0];
      }
    } catch {
      // silently keep rule text if AI is unavailable or timed out
    }
  };

  const fixCount = guidanceItems.filter((g) => g.status === 'fix').length;
  const okCount = guidanceItems.filter((g) => g.status === 'ok').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Industry trends & recommendations"
      subtitle="Evaluated against modern hiring standards, metric density, and tooling requirements"
      icon={<TrendingUp className="w-4 h-4 text-ink/70" strokeWidth={1.5} />}
      maxWidth="max-w-3xl"
      footer={
        <div className="w-full flex justify-end items-center text-xs">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline h-8 px-3.5 cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* HowToUse Panel at top */}
        <HowToUse toolId="trends" />

        {isEmpty ? (
          <div className="p-6 bg-muted border border-line rounded-[6px] text-center space-y-1.5">
            <p className="text-xs font-semibold text-ink">Add content to get personalized checks</p>
            <p className="text-[11px] text-ink/60 max-w-sm mx-auto leading-relaxed">
              Fill in your experience, skills, or professional summary in the editor to run automated hiring trend audits.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* AI Review Banner */}
            <div className="p-3 bg-muted/30 border border-line rounded-[8px] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  Executive AI Review
                </span>
                {aiStatus ? (
                  <p
                    data-testid="trends-ai-review-status"
                    className={`text-[11px] font-medium truncate mt-0.5 ${
                      aiStatus === 'AI review ready'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {aiStatus}
                  </p>
                ) : (
                  <p className="text-[11px] text-ink/50 truncate mt-0.5">
                    Evaluates resume truthfully with strict zero-hallucination checks
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={aiLoading}
                onClick={handleReviewWithAi}
                className="btn-outline h-7 px-2.5 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-brand-600 animate-spin" strokeWidth={1.5} />
                    <span>Reviewing (up to 40s)...</span>
                  </>
                ) : hasRunAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-brand-600" strokeWidth={1.5} />
                    <span>Re-run</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" strokeWidth={1.5} />
                    <span>Review my resume</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Review Suggestions if available */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-2 p-3 bg-muted/20 border border-line rounded-[8px]">
                <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  AI Suggested Improvements ({aiSuggestions.length})
                </h4>
                <div className="space-y-2">
                  {aiSuggestions.map((s) => (
                    <div key={s.id} className="p-2.5 bg-card border border-line rounded-[6px] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{s.title}</span>
                        <span className="text-[10px] text-ink/50 capitalize border border-line px-1 rounded">{s.section}</span>
                      </div>
                      {s.before && (
                        <div className="text-[11px] text-ink/60 bg-muted/30 p-1.5 rounded">
                          <span className="text-[9px] uppercase font-bold text-ink/40 block">Current</span>
                          {s.before}
                        </div>
                      )}
                      <div className="text-[11px] text-ink font-medium bg-muted/20 p-1.5 rounded border-l-2 border-brand-600">
                        <span className="text-[9px] uppercase font-bold text-brand-600 block">Proposed</span>
                        {s.after}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Header / Actions Row */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-ink">
                  Diagnostic checks ({guidanceItems.length})
                </h3>
                <p className="text-[11px] text-ink/50 mt-0.5">
                  {fixCount} recommendation{fixCount === 1 ? '' : 's'} to improve · {okCount} benchmark{okCount === 1 ? '' : 's'} passed
                </p>
              </div>

              <button
                type="button"
                onClick={handleRecheck}
                disabled={isRefreshing}
                className="btn-outline h-7 px-2.5 text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                <span>{isRefreshing ? 'Checking...' : 'Re-check'}</span>
              </button>
            </div>

            {/* If no target title, show one muted line */}
            {!resumeData.personalInfo?.jobTitle?.trim() && (
              <div className="p-3 bg-muted/30 border border-line rounded-[6px] text-xs text-ink/60 italic">
                Add a target title to check skills
              </div>
            )}

            {/* Guidance Cards List */}
            <div className="space-y-2.5">
              {guidanceItems.map((item) => (
                <GuidanceCard
                  key={item.id}
                  item={item}
                  onGoToSection={(section, bulletRef) => {
                    onClose();
                    onGoToSection?.(section, bulletRef);
                  }}
                  onAddSkill={onAddSkill}
                  onImproveWithAi={handleImproveWithAi}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
