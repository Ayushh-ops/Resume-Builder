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
} from 'lucide-react';
import type { ResumeData } from '../../types/resume';
import { getResumeGuidance, type GuidanceItem } from '../../lib/guidance';
import { generate, getKey } from '../../lib/gemini';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    id: string;
    title: string;
    before: string;
    after: string;
    targetType: 'bullet' | 'summary';
    expIdx?: number;
    bulletIdx?: number;
  } | null>(null);

  // Diagnostic guidance items from existing checks
  const guidanceItems = useMemo(() => {
    return getResumeGuidance(resumeData);
  }, [resumeData]);

  // Active suggestions with actionable before/after or skills
  const actionableSuggestions = useMemo(() => {
    return guidanceItems.filter(
      (item) => item.status === 'fix' && !dismissedIds.has(item.id) && (item.before || item.after || item.missingSkills?.length)
    );
  }, [guidanceItems, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleApply = (item: GuidanceItem) => {
    const updated: ResumeData = JSON.parse(JSON.stringify(resumeData));

    if (item.section === 'experience' && item.before && item.after) {
      // Find matching bullet across experience
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
      // Add first missing skill to first category
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

  const handleImproveWithAi = async () => {
    setAiError(null);
    setAiSuggestion(null);

    const apiKey = getKey();
    if (!apiKey) {
      setAiError('No API key set. Please set your Gemini API key in Settings.');
      return;
    }

    // Pick first experience bullet or summary to improve
    let targetText = '';
    let targetType: 'bullet' | 'summary' = 'bullet';
    let expIdx = 0;
    let bulletIdx = 0;

    const firstExp = resumeData.experience?.[0];
    if (firstExp?.highlights?.length) {
      targetText = firstExp.highlights[0];
      targetType = 'bullet';
    } else if (resumeData.summary?.trim()) {
      targetText = resumeData.summary.trim();
      targetType = 'summary';
    } else {
      setAiError('No experience bullet or summary found to improve.');
      return;
    }

    setAiLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 40000); // 40-second timeout

    try {
      const prompt = `Rewrite the following resume ${targetType} to make it more impactful, metric-driven, and active. Return ONLY the rewritten text, nothing else.

Current text:
"${targetText}"`;

      const res = await generate(prompt, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok && res.text?.trim()) {
        const proposed = res.text.replace(/^["']|["']$/g, '').trim();
        setAiSuggestion({
          id: `ai-${Date.now()}`,
          title: `AI Polish: ${targetType === 'bullet' ? 'Experience Bullet' : 'Summary'}`,
          before: targetText,
          after: proposed,
          targetType,
          expIdx,
          bulletIdx,
        });
      } else {
        setAiError(res.message || 'AI suggestion request failed or returned empty.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setAiError('AI request timed out after 40 seconds.');
      } else {
        setAiError(err.message || 'AI request failed.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptAiSuggestion = () => {
    if (!aiSuggestion) return;
    const updated: ResumeData = JSON.parse(JSON.stringify(resumeData));

    if (aiSuggestion.targetType === 'bullet') {
      if (updated.experience?.[aiSuggestion.expIdx || 0]?.highlights) {
        updated.experience[aiSuggestion.expIdx || 0].highlights[aiSuggestion.bulletIdx || 0] = aiSuggestion.after;
      }
    } else {
      updated.summary = aiSuggestion.after;
    }

    onApplyChange(updated);
    setAiSuggestion(null);
  };

  const handleRejectAiSuggestion = () => {
    setAiSuggestion(null);
  };

  const totalCount = actionableSuggestions.length + (aiSuggestion ? 1 : 0);
  if (totalCount === 0 && !aiLoading && !aiError) {
    return null;
  }

  return (
    <div className="card border border-line bg-card shadow-xs rounded-[10px] overflow-hidden mb-3">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between bg-muted/40 hover:bg-muted/60 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600 shrink-0" strokeWidth={1.75} />
          <span className="text-xs font-semibold text-ink">Suggestions</span>
          {totalCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-600 border border-brand-500/20">
              {totalCount}
            </span>
          )}
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
          {/* AI Suggestion Card if available */}
          {aiSuggestion && (
            <div className="p-3 bg-brand-50/40 dark:bg-brand-950/20 rounded-[8px] border border-brand-200 dark:border-brand-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {aiSuggestion.title}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-200">
                  AI Generated
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/50">
                  <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300 block mb-0.5">
                    Current Text
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">{aiSuggestion.before}</p>
                </div>

                <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block mb-0.5">
                    Proposed Text
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">{aiSuggestion.after}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRejectAiSuggestion}
                  className="px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-muted rounded-[6px] transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAiSuggestion}
                  className="btn-primary h-7 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept (Undoable)</span>
                </button>
              </div>
            </div>
          )}

          {/* Actionable Suggestions from Guidance */}
          {actionableSuggestions.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-muted/30 rounded-[8px] border border-line space-y-2 text-xs"
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
                <div className="space-y-1 pt-1">
                  <div className="p-2 rounded bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-800/40 text-[11px]">
                    <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300 block mb-0.5">
                      Current Text
                    </span>
                    <p className="text-slate-800 dark:text-slate-200">{item.before}</p>
                  </div>
                  <div className="p-2 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/40 text-[11px]">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block mb-0.5">
                      Proposed Text
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{item.after}</p>
                  </div>
                </div>
              )}

              {/* Skills addition case */}
              {item.missingSkills && item.missingSkills.length > 0 && !item.before && (
                <div className="p-2 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/40 text-[11px]">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block mb-0.5">
                    Proposed Addition
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">
                    Add skill: {item.missingSkills[0]}
                  </p>
                </div>
              )}

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
            </div>
          ))}

          {/* AI Error if any */}
          {aiError && (
            <div className="p-2.5 rounded-[8px] bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
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
                className="text-amber-600 hover:text-amber-800 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Improve with AI on-demand button */}
          <div className="pt-1 flex items-center justify-between border-t border-line/60">
            <span className="text-[11px] text-ink/50">Run AI analysis on click (40s timeout)</span>
            <button
              type="button"
              disabled={aiLoading}
              onClick={handleImproveWithAi}
              className="btn-outline h-7 px-2.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 text-brand-600 animate-spin" />
                  <span>Improving (up to 40s)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Improve with AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
