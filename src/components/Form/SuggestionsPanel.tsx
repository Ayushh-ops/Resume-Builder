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
import { getKey, getSelectedModel } from '../../lib/gemini';
import {
  reviewResumeWithAI,
  type AIReviewSuggestion,
  type AIReviewResult,
} from '../../services/aiReview';

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
  const [hasRunAi, setHasRunAi] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [lastReviewResult, setLastReviewResult] = useState<AIReviewResult | null>(null);
  const [aiReviewSuggestions, setAiReviewSuggestions] = useState<AIReviewSuggestion[]>(() => {
    try {
      const saved = sessionStorage.getItem('resumecraft_ai_review_suggestions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  const scrollToChangedField = (section: string, expIdx?: number, bulletIdx?: number) => {
    setTimeout(() => {
      let targetEl: HTMLElement | null = null;
      if (typeof expIdx === 'number' && typeof bulletIdx === 'number') {
        targetEl = document.getElementById(`exp-${expIdx}-bullet-${bulletIdx}`);
      }
      if (!targetEl && (section === 'summary' || section === 'summary-check')) {
        targetEl = document.getElementById('summary-textarea') || document.getElementById('summary');
      }
      if (!targetEl && (section === 'skills' || section === 'skills-coverage')) {
        targetEl = document.getElementById('skills');
      }
      if (!targetEl && section === 'experience') {
        targetEl = document.getElementById('experience');
      }
      if (!targetEl) {
        targetEl = document.getElementById(section);
      }
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if ('focus' in targetEl && typeof (targetEl as any).focus === 'function') {
          (targetEl as any).focus();
        }
      }
    }, 60);
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
    scrollToChangedField(item.section);
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
    scrollToChangedField(suggestion.section, suggestion.expIdx, suggestion.bulletIdx);
  };

  const handleReviewWithAi = async (opts?: { stricter?: boolean }) => {
    setAiError(null);
    setAiStatus(null);

    const apiKey = getKey();
    if (!apiKey) {
      const currentModel = getSelectedModel();
      const err = `[${currentModel}] No API key set. Please set your Gemini API key in Settings.`;
      setAiError(err);
      setAiStatus(err);
      setHasRunAi(true);
      return;
    }

    setAiLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 45000); // 45-second timeout

    try {
      const result = await reviewResumeWithAI(resumeData, {
        signal: controller.signal,
        stricter: opts?.stricter,
      });
      clearTimeout(timeoutId);
      setHasRunAi(true);
      setLastReviewResult(result);

      if (result.accepted.length > 0) {
        setAiReviewSuggestions((prev) => {
          const merged = [...prev, ...result.accepted];
          try {
            sessionStorage.setItem('resumecraft_ai_review_suggestions', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      setAiStatus(result.statusText);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setHasRunAi(true);
      const currentModel = getSelectedModel();
      const msg = err.name === 'AbortError' ? 'AI review timed out after 45 seconds' : (err.message || 'AI review failed');
      const formatted = msg.startsWith('[') ? msg : `[${currentModel}] ${msg}`;
      setAiError(formatted);
      setAiStatus(formatted);
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

          {/* Model Choice, Exact Counts & Expandable Details */}
          {lastReviewResult && (
            <div className="p-2.5 rounded-[8px] bg-muted/20 border border-line space-y-2 text-xs">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold text-ink">
                  Model: <span className="font-mono text-brand-600 dark:text-brand-400">{lastReviewResult.modelUsed}</span>
                  {lastReviewResult.isLiteFallback && (
                    <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                      (lite fallback: all non-lite models failed)
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-ink/80 font-medium">
                  {lastReviewResult.statusText}
                </span>
              </div>

              {lastReviewResult.isLiteFallback && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Notice: Every non-lite model failed probe. Used {lastReviewResult.modelUsed}.
                </p>
              )}

              {/* Expandable Model Probe Table */}
              {lastReviewResult.probeTable && lastReviewResult.probeTable.length > 0 && (
                <details className="text-[11px] text-ink/70">
                  <summary className="cursor-pointer hover:text-ink font-medium">
                    View model probe table ({lastReviewResult.probeTable.length} models probed)
                  </summary>
                  <div className="mt-1.5 overflow-x-auto border border-line rounded-[6px] bg-card p-2">
                    <table className="w-full text-left font-mono text-[10px]">
                      <thead>
                        <tr className="border-b border-line text-ink/50">
                          <th className="pb-1 pr-2">Model</th>
                          <th className="pb-1 pr-2">Status</th>
                          <th className="pb-1 pr-2">Latency</th>
                          <th className="pb-1">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastReviewResult.probeTable.map((p) => (
                          <tr key={p.model} className="border-b border-line/40 last:border-0">
                            <td className="py-0.5 pr-2">{p.model}</td>
                            <td className={`py-0.5 pr-2 font-bold ${p.status === 200 ? 'text-emerald-600' : 'text-red-500'}`}>{p.status}</td>
                            <td className="py-0.5 pr-2">{p.elapsedMs}ms</td>
                            <td className="py-0.5 text-ink/60 truncate max-w-[140px]">
                              {p.status === 200 ? 'OK' : p.errorMsg || 'Failed'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              {/* Expandable Rejected Reasons */}
              {lastReviewResult.rejected.length > 0 && (
                <details className="text-[11px] text-ink/70">
                  <summary className="cursor-pointer hover:text-ink font-medium text-amber-600 dark:text-amber-400">
                    View {lastReviewResult.rejected.length} rejected suggestions & reasons
                  </summary>
                  <ul className="mt-1.5 space-y-1 list-disc list-inside bg-card p-2 rounded-[6px] border border-line text-[10px]">
                    {lastReviewResult.rejected.map((r, i) => (
                      <li key={i} className="text-ink/80">
                        <span className="font-medium text-ink">{r.suggestion?.title || 'Suggestion'}:</span>{' '}
                        <span className="text-red-600 dark:text-red-400">{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Honest Empty State when N=0 */}
          {hasRunAi && (!lastReviewResult || lastReviewResult.rawCount === 0) && activeAiSuggestions.length === 0 && !aiError && !aiLoading && (
            <div className="p-3 rounded-[8px] bg-muted/30 border border-line space-y-2 text-xs">
              <div className="flex items-center gap-2 text-ink font-medium">
                <AlertCircle className="w-4 h-4 text-ink/60 shrink-0" />
                <span>AI returned no suggestions</span>
              </div>
              <p className="text-[11px] text-ink/60">
                The reviewer found no issues meeting quality thresholds on this pass.
              </p>
              <button
                type="button"
                onClick={() => handleReviewWithAi({ stricter: true })}
                disabled={aiLoading}
                className="btn-primary text-xs py-1 px-3 flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask again with a stricter reviewer</span>
              </button>
            </div>
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
            const isTemplateCard = isTemplate(item.after) || (!item.after && !item.missingSkills?.length);

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
                      {item.after && (
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
                      )}
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

          {/* Review resume with AI on-demand button and status line */}
          <div className="pt-2 flex flex-col gap-2 border-t border-line/60">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {aiStatus ? (
                  <p
                    data-testid="ai-review-status"
                    className={`text-[11px] font-medium truncate ${
                      aiStatus === 'AI review ready'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {aiStatus}
                  </p>
                ) : (
                  <p className="text-[11px] text-ink/50 truncate">
                    Run AI review on click (40s timeout)
                  </p>
                )}
              </div>
              <button
                type="button"
                data-testid="btn-review-resume"
                disabled={aiLoading}
                onClick={() => handleReviewWithAi()}
                className="btn-outline h-7 px-2.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-brand-600 animate-spin" />
                    <span>Reviewing (up to 40s)...</span>
                  </>
                ) : hasRunAi ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-brand-600" />
                    <span>Re-run</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-brand-600" />
                    <span>Review my resume</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
