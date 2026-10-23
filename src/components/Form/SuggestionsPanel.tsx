import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  Copy,
} from 'lucide-react';
import type { ResumeData } from '../../types/resume';
import { getResumeGuidance, type GuidanceItem } from '../../lib/guidance';
import { getKey } from '../../lib/gemini';
import { reviewResumeWithAI, type AIReviewSuggestion } from '../../services/aiReview';

interface SuggestionsPanelProps {
  resumeData: ResumeData;
  onApplyChange: (updated: ResumeData) => void;
  onOpenSettings?: () => void;
}

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  resumeData,
  onApplyChange,
  onOpenSettings,
}) => {
  // Collapsed by default
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReviewSuggestions, setAiReviewSuggestions] = useState<AIReviewSuggestion[]>([]);

  const hasTargetTitle = Boolean(resumeData.personalInfo?.jobTitle?.trim());

  // Diagnostic guidance items from existing checks
  const guidanceItems = useMemo(() => {
    return getResumeGuidance(resumeData);
  }, [resumeData]);

  // Active suggestions with actionable before/after or skills
  // Skills-coverage suggestion appears only when a target title exists
  const actionableSuggestions = useMemo(() => {
    return guidanceItems.filter((item) => {
      if (item.status !== 'fix' || dismissedIds.has(item.id)) return false;
      if (item.id === 'skills-coverage' && !hasTargetTitle) return false;
      return Boolean(item.before || item.after || item.missingSkills?.length);
    });
  }, [guidanceItems, dismissedIds, hasTargetTitle]);

  const activeAiSuggestions = useMemo(() => {
    return aiReviewSuggestions.filter((s) => !dismissedIds.has(s.id));
  }, [aiReviewSuggestions, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const isTemplate = (text?: string) => Boolean(text && /\[[a-zA-Z0-9_\s%]+\]/.test(text));

  const handleCopyTemplate = (id: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleApply = (item: GuidanceItem) => {
    const updated: ResumeData = JSON.parse(JSON.stringify(resumeData));

    if (item.section === 'experience' && item.before && item.after) {
      let replaced = false;
      for (const exp of updated.experience || []) {
        if (!exp.highlights) continue;
        for (let b = 0; b < exp.highlights.length; b++) {
          if (exp.highlights[b].trim() === item.before.trim()) {
            exp.highlights[b] = item.after;
            replaced = true;
            break;
          }
        }
        if (replaced) break;
      }
      if (!replaced && updated.experience?.[0]?.highlights?.length) {
        updated.experience[0].highlights[0] = item.after;
      }
    } else if (item.section === 'skills' && item.missingSkills && item.missingSkills.length > 0) {
      const skillToAdd = item.missingSkills[0];
      if (updated.skills && updated.skills.length > 0) {
        if (!updated.skills[0].skills.includes(skillToAdd)) {
          updated.skills[0].skills.push(skillToAdd);
        }
      } else {
        updated.skills = [
          {
            id: 'skill-cat-1',
            name: 'Technical Skills',
            skills: [skillToAdd],
          },
        ];
      }
    } else if (item.section === 'summary' && item.after) {
      updated.summary = item.after;
    }

    onApplyChange(updated);
    handleDismiss(item.id);
  };

  const handleApplyAiSuggestion = (suggestion: AIReviewSuggestion) => {
    const updated: ResumeData = JSON.parse(JSON.stringify(resumeData));

    if (suggestion.targetType === 'summary') {
      updated.summary = suggestion.after;
    } else if (suggestion.targetType === 'skill') {
      const skillName = suggestion.skillName || suggestion.after;
      if (updated.skills && updated.skills.length > 0) {
        if (!updated.skills[0].skills.includes(skillName)) {
          updated.skills[0].skills.push(skillName);
        }
      } else {
        updated.skills = [
          {
            id: 'skill-cat-ai',
            name: 'Technical Skills',
            skills: [skillName],
          },
        ];
      }
    } else {
      // Bullet point
      let replaced = false;
      if (typeof suggestion.expIdx === 'number' && typeof suggestion.bulletIdx === 'number') {
        if (updated.experience?.[suggestion.expIdx]?.highlights?.[suggestion.bulletIdx]) {
          updated.experience[suggestion.expIdx].highlights[suggestion.bulletIdx] = suggestion.after;
          replaced = true;
        }
      }
      if (!replaced && suggestion.before) {
        for (const exp of updated.experience || []) {
          if (!exp.highlights) continue;
          for (let b = 0; b < exp.highlights.length; b++) {
            if (exp.highlights[b].trim() === suggestion.before.trim()) {
              exp.highlights[b] = suggestion.after;
              replaced = true;
              break;
            }
          }
          if (replaced) break;
        }
      }
      if (!replaced && updated.experience?.[0]?.highlights?.length) {
        updated.experience[0].highlights[0] = suggestion.after;
      }
    }

    onApplyChange(updated);
    handleDismiss(suggestion.id);
  };

  const handleReviewWithAi = async () => {
    setAiError(null);

    const apiKey = getKey();
    if (!apiKey) {
      setAiError('No API key set. Please set your Gemini API key in Settings.');
      return;
    }

    setAiLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 40000); // 40-second timeout

    try {
      const result = await reviewResumeWithAI(resumeData, controller.signal);
      clearTimeout(timeoutId);

      if (result.accepted.length > 0) {
        setAiReviewSuggestions((prev) => [...prev, ...result.accepted]);
      } else {
        const firstReason = result.rejected[0]?.reason;
        setAiError(firstReason ? `AI review suggestions rejected by validator: ${firstReason}` : 'No valid improvements generated.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setAiError('AI review timed out after 40 seconds.');
      } else {
        setAiError(err.message || 'AI review failed.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const totalCount = actionableSuggestions.length + activeAiSuggestions.length;

  return (
    <div className="card border border-line bg-card shadow-xs rounded-[10px] overflow-hidden">
      {/* Collapsible Header - single header line with plain text count, no pill badge */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between bg-muted/40 hover:bg-muted/60 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600 shrink-0" strokeWidth={1.75} />
          <span className="text-xs font-semibold text-ink">
            Suggestions ({totalCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink/50">Opt-in</span>
          {isCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-ink/50" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-ink/50" />
          )}
        </div>
      </button>

      {/* Panel Body */}
      {!isCollapsed && (
        <div className="p-3 space-y-3 border-t border-line">
          {/* When no target title exists, show one muted line */}
          {!hasTargetTitle && (
            <p className="text-[11px] text-ink/50 italic py-0.5">
              Add a target title to check skills
            </p>
          )}

          {/* AI Review Suggestions if available (Neutral styling only) */}
          {activeAiSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-3 bg-muted/20 rounded-[8px] border border-line space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  {suggestion.title}
                </span>
                <span className="text-[10px] font-medium text-ink/60 border border-line px-1.5 py-0.5 rounded bg-muted/40 capitalize">
                  {suggestion.section}
                </span>
              </div>

              {suggestion.explanation && (
                <p className="text-[11px] text-ink/70 leading-relaxed">{suggestion.explanation}</p>
              )}

              <div className="space-y-1.5 text-xs">
                {suggestion.before && (
                  <div className="p-2.5 rounded-[6px] border border-line bg-muted/20 text-xs">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-ink/50 block mb-1">
                      Current
                    </span>
                    <p className="text-ink/80 text-xs leading-relaxed">{suggestion.before}</p>
                  </div>
                )}

                <div className="p-2.5 rounded-[6px] border border-line border-l-2 border-l-brand-600 bg-muted/20 text-xs pl-3">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400 block mb-1">
                    Proposed
                  </span>
                  <p className="text-ink font-medium text-xs leading-relaxed">{suggestion.after}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDismiss(suggestion.id)}
                  className="px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-muted rounded-[6px] transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Dismiss</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyAiSuggestion(suggestion)}
                  className="btn-primary h-7 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          ))}

          {/* Actionable Suggestions from Guidance (Neutral styling only) */}
          {actionableSuggestions.map((item) => {
            const isTemplateCard = isTemplate(item.after);

            return (
              <div
                key={item.id}
                className="p-3 bg-muted/20 rounded-[8px] border border-line space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-ink">{item.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismiss(item.id)}
                    className="text-ink/40 hover:text-ink/80 transition cursor-pointer p-0.5"
                    title="Dismiss suggestion"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[11px] text-ink/70 leading-relaxed">{item.found}</p>

                {/* Exact current text vs proposed text */}
                {item.before && item.after && (
                  <div className="space-y-1.5 pt-1">
                    <div className="p-2.5 rounded-[6px] border border-line bg-muted/20 text-xs">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-ink/50 block mb-1">
                        Current
                      </span>
                      <p className="text-ink/80 text-xs leading-relaxed">{item.before}</p>
                    </div>
                    <div className="p-2.5 rounded-[6px] border border-line border-l-2 border-l-brand-600 bg-muted/20 text-xs pl-3">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400 block mb-1">
                        Proposed
                      </span>
                      <p className="text-ink font-medium text-xs leading-relaxed">{item.after}</p>
                    </div>
                  </div>
                )}

                {/* Skills addition case: "You may add if true" */}
                {item.missingSkills && item.missingSkills.length > 0 && !item.before && (
                  <div className="p-2.5 rounded-[6px] border border-line border-l-2 border-l-brand-600 bg-muted/20 text-xs pl-3">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400 block mb-1">
                      Proposed Addition
                    </span>
                    <p className="text-ink text-xs">
                      Add skill: <span className="font-semibold">{item.missingSkills[0]}</span>{' '}
                      <span className="text-ink/60 font-normal">(You may add if true)</span>
                    </p>
                  </div>
                )}

                {/* Action buttons: Template cards only get Copy template + Dismiss; Non-templates get Apply + Dismiss */}
                {isTemplateCard ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-medium text-ink/60 border border-line px-1.5 py-0.5 rounded bg-muted/40">
                      Template
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDismiss(item.id)}
                        className="px-2 py-1 text-[11px] font-medium text-ink/60 hover:bg-muted rounded-[6px] transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyTemplate(item.id, item.after!)}
                        className="btn-outline h-6 px-2.5 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy template</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDismiss(item.id)}
                      className="px-2 py-1 text-[11px] font-medium text-ink/60 hover:bg-muted rounded-[6px] transition cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApply(item)}
                      className="btn-primary h-6 px-2.5 text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Apply</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* AI Error if any */}
          {aiError && (
            <div className="p-2.5 rounded-[8px] bg-muted/40 border border-line flex items-start gap-2 text-xs text-ink/80">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span>{aiError}</span>
                {aiError.includes('Settings') && onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="ml-1 text-brand-600 underline font-medium hover:text-brand-700 cursor-pointer"
                  >
                    Open Settings
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAiError(null)}
                className="text-ink/50 hover:text-ink cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Review resume with AI on-demand button */}
          <div className="pt-1 flex items-center justify-between border-t border-line/60">
            <span className="text-[11px] text-ink/50">Run AI review on click (40s timeout)</span>
            <button
              type="button"
              disabled={aiLoading}
              onClick={handleReviewWithAi}
              className="btn-outline h-7 px-2.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 text-brand-600 animate-spin" />
                  <span>Reviewing (up to 40s)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-brand-600" />
                  <span>Review resume with AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
