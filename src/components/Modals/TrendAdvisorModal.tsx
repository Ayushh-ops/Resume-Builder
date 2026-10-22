import React, { useState, useMemo } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { HowToUse } from '../common/HowToUse';
import { GuidanceCard } from '../common/GuidanceCard';
import type { ResumeData } from '../../types/resume';
import { getResumeGuidance, type GuidanceItem } from '../../lib/guidance';
import { isResumeEmptyForAts } from '../../services/atsScorer';
import { enhanceBulletPoint } from '../../services/geminiService';

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

  const isEmpty = isResumeEmptyForAts(resumeData);

  const guidanceItems = useMemo(() => {
    if (isEmpty) return [];
    return getResumeGuidance(resumeData);
  }, [resumeData, isEmpty, recheckCount]);

  if (!isOpen) return null;

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
