import React, { useState, useEffect } from 'react';
import {
  Target,
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Wand2,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { ResumeData, ATSCheckResult } from '../../types/resume';
import { analyzeJobMatch, tailorResumeToJob, type TailoredChanges } from '../../services/geminiService';

interface JobMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
  initialAtsResult: ATSCheckResult;
  onApplyTailoring?: (changes: TailoredChanges) => void;
}

export const JobMatcherModal: React.FC<JobMatcherModalProps> = ({
  isOpen,
  onClose,
  resumeData,
  initialAtsResult,
  onApplyTailoring,
}) => {
  const [jobDescription, setJobDescription] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ATSCheckResult>(initialAtsResult);
  const [hasScanned, setHasScanned] = useState(false);

  // Tailoring states
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoredChanges, setTailoredChanges] = useState<TailoredChanges | null>(null);
  const [acceptedSummary, setAcceptedSummary] = useState(true);
  const [acceptedBullets, setAcceptedBullets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScan = async () => {
    if (!jobDescription.trim()) return;
    setIsScanning(true);
    try {
      const result = await analyzeJobMatch(resumeData, jobDescription);
      setAnalysisResult(result);
      setHasScanned(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartTailoring = async () => {
    if (!jobDescription.trim()) return;
    setIsTailoring(true);
    try {
      const result = await tailorResumeToJob(resumeData, jobDescription);
      setTailoredChanges(result);
      setAcceptedSummary(true);
      const initialAccepts: Record<string, boolean> = {};
      result.experienceBullets.forEach((eb) => {
        eb.bullets.forEach((_, bi) => {
          initialAccepts[`${eb.index}-${bi}`] = true;
        });
      });
      setAcceptedBullets(initialAccepts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTailoring(false);
    }
  };

  const handleApplyTailoring = () => {
    if (!tailoredChanges || !onApplyTailoring) return;

    const finalChanges: TailoredChanges = {
      summary: acceptedSummary ? tailoredChanges.summary : resumeData.summary,
      experienceBullets: tailoredChanges.experienceBullets.map((eb) => ({
        index: eb.index,
        bullets: eb.bullets.map((b, bi) => {
          const isAccepted = acceptedBullets[`${eb.index}-${bi}`] ?? true;
          return isAccepted
            ? b
            : resumeData.experience[eb.index]?.highlights[bi] || b;
        }),
      })),
    };

    onApplyTailoring(finalChanges);
    setTailoredChanges(null);
    onClose();
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-300';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-300';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-300';
    return 'text-rose-600 bg-rose-50 border-rose-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Target Job Description & ATS Matcher</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Precision Scanner
                </span>
              </div>
              <p className="text-xs text-ink/50">
                Paste a job posting to reveal missing keywords, ATS parser score, and tailored alignment tips
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

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[85vh] space-y-6">
          {tailoredChanges ? (
            /* Diff-Style Preview View */
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-brand-600" />
                    Review Tailored Changes for Target Job
                  </h3>
                  <p className="text-xs text-ink/50 mt-0.5">
                    Select which suggestions you'd like to apply to your resume.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTailoredChanges(null)}
                  className="text-xs text-ink/60 hover:text-ink underline"
                >
                  ← Back to Analysis
                </button>
              </div>

              {/* Summary Diff */}
              <div className="card p-4 space-y-3 bg-slate-50/70 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Professional Summary</span>
                  <button
                    type="button"
                    onClick={() => setAcceptedSummary(!acceptedSummary)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {acceptedSummary ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <span>Accepted</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4 text-ink/30" />
                        <span className="text-ink/40">Rejected</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-ink/70">
                    <span className="block text-[10px] font-bold uppercase text-rose-500 mb-1">Current</span>
                    <p className="leading-relaxed">{resumeData.summary || '(Empty summary)'}</p>
                  </div>
                  <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg text-ink">
                    <span className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Tailored Suggestion</span>
                    <p className="leading-relaxed font-medium">{tailoredChanges.summary}</p>
                  </div>
                </div>
              </div>

              {/* Bullets Diff */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-ink">Experience Bullet Points</h4>
                {tailoredChanges.experienceBullets.map((eb) => {
                  const role = resumeData.experience[eb.index];
                  if (!role) return null;
                  return (
                    <div key={eb.index} className="card p-4 space-y-3 bg-slate-50/70 border border-slate-200">
                      <div className="font-semibold text-xs text-ink">
                        {role.position} @ {role.company}
                      </div>
                      <div className="space-y-2">
                        {eb.bullets.map((newBullet, bi) => {
                          const oldBullet = role.highlights[bi] || '';
                          const isAccepted = acceptedBullets[`${eb.index}-${bi}`] ?? true;
                          return (
                            <div
                              key={bi}
                              className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-ink/40 uppercase">
                                  Bullet #{bi + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAcceptedBullets((prev) => ({
                                      ...prev,
                                      [`${eb.index}-${bi}`]: !isAccepted,
                                    }))
                                  }
                                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600"
                                >
                                  {isAccepted ? (
                                    <>
                                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                                      <span>Accept</span>
                                    </>
                                  ) : (
                                    <>
                                      <Square className="w-4 h-4 text-ink/30" />
                                      <span className="text-ink/40">Keep Original</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div className="text-ink/60 bg-rose-50/40 p-2 rounded border border-rose-100/50">
                                  <span className="text-[10px] font-semibold text-rose-500 block mb-0.5">Original:</span>
                                  {oldBullet || '(empty)'}
                                </div>
                                <div className="text-ink bg-emerald-50/40 p-2 rounded border border-emerald-100/50 font-medium">
                                  <span className="text-[10px] font-semibold text-emerald-600 block mb-0.5">Tailored:</span>
                                  {newBullet}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Normal Matcher View */
            <>
              {/* Input Area */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Paste Target Job Description (from LinkedIn, Indeed, Greenhouse, etc.):
                </label>
                <textarea
                  rows={4}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="e.g. We are seeking a Senior AI Engineer with expertise in PyTorch, Gemini API, RAG systems, Kubernetes, and high-scale production systems..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleScan}
                    disabled={isScanning || !jobDescription.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-200 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{isScanning ? 'Scanning ATS Match...' : 'Analyze Match & Keywords'}</span>
                  </button>
                </div>
              </div>

              {/* Results Display */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
                {/* Score header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {hasScanned ? 'Job Posting ATS Compatibility' : 'General Resume ATS Health'}
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-black text-slate-900">
                        {analysisResult.score}%
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getScoreColor(
                          analysisResult.score
                        )}`}
                      >
                        {analysisResult.rating} Match
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="text-xs text-slate-500 max-w-xs leading-relaxed">
                      {analysisResult.score >= 80
                        ? 'Strong candidate alignment. Your resume contains the critical keywords to pass automated filters.'
                        : 'Needs tuning. Adding the missing keywords below will dramatically elevate your ATS ranking.'}
                    </div>

                    {/* Tailor Resume Button */}
                    <button
                      type="button"
                      onClick={handleStartTailoring}
                      disabled={isTailoring || !jobDescription.trim()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-soft transition active:scale-95 disabled:opacity-50"
                    >
                      {isTailoring ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isTailoring ? 'AI Tailoring...' : 'Tailor Resume to Job'}</span>
                    </button>
                  </div>
                </div>

                {/* Keyword Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Matched Keywords */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Matched Keywords ({analysisResult.matchedKeywords.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.matchedKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md"
                        >
                          ✓ {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Missing / Recommended Keywords ({analysisResult.missingKeywords.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.missingKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-md"
                        >
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Strengths & Tailoring Suggestions */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  {analysisResult.strengths.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-1">Key Strengths Identified:</h4>
                      <ul className="space-y-1 text-xs text-slate-600 list-disc list-outside ml-4">
                        {analysisResult.strengths.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.suggestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900 mb-1">
                        Direct Tailoring Steps:
                      </h4>
                      <ul className="space-y-1 text-xs text-indigo-800 list-disc list-outside ml-4">
                        {analysisResult.suggestions.map((sug, idx) => (
                          <li key={idx}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-black/[0.06] px-4 py-3 flex justify-end gap-2 shrink-0">
          {tailoredChanges ? (
            <>
              <button
                type="button"
                onClick={() => setTailoredChanges(null)}
                className="px-4 py-1.5 font-semibold text-xs text-ink/70 hover:bg-black/5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyTailoring}
                className="btn-primary"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Changes</span>
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 font-semibold text-xs text-ink/70 hover:bg-black/5 rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
