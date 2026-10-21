import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Wand2,
  Check,
  CheckSquare,
  Square,
  FileText,
  Upload,
  Plus,
  Trash2,
  Copy,
  Download,
  Sliders,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import type { ResumeData, ATSCheckResult, ATSProfile, ATSCriterion } from '../../types/resume';
import {
  analyzeJobMatch,
  tailorResumeToJob,
  parseRubricToATSProfile,
  type TailoredChanges,
} from '../../services/geminiService';
import {
  getAllATSProfiles,
  saveCustomProfile,
  deleteCustomProfile,
  getActiveProfileId,
  setActiveProfileId,
  calculateLiveATSScore,
} from '../../services/atsScorer';
import { parseResumeFile } from '../../services/resumeParser';

interface JobMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
  initialAtsResult: ATSCheckResult;
  initialTab?: 'jd_matcher' | 'ats_profile' | 'create_profile';
  onApplyTailoring?: (changes: TailoredChanges) => void;
  onProfileChanged?: (profileId: string) => void;
}

export const JobMatcherModal: React.FC<JobMatcherModalProps> = ({
  isOpen,
  onClose,
  resumeData,
  initialAtsResult,
  initialTab = 'jd_matcher',
  onApplyTailoring,
  onProfileChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'jd_matcher' | 'ats_profile'>(
    initialTab === 'create_profile' ? 'ats_profile' : (initialTab || 'jd_matcher')
  );
  const [profileSubView, setProfileSubView] = useState<'list' | 'create'>(
    initialTab === 'create_profile' ? 'create' : 'list'
  );

  // JD Matcher states
  const [jobDescription, setJobDescription] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ATSCheckResult>(initialAtsResult);
  const [hasScanned, setHasScanned] = useState(false);

  // Tailoring states
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoredChanges, setTailoredChanges] = useState<TailoredChanges | null>(null);
  const [acceptedSummary, setAcceptedSummary] = useState(true);
  const [acceptedBullets, setAcceptedBullets] = useState<Record<string, boolean>>({});

  // ATS Profile states
  const [allProfiles, setAllProfiles] = useState<ATSProfile[]>([]);
  const [activeProfileId, setActiveId] = useState<string>('default');
  const [profileAtsResult, setProfileAtsResult] = useState<ATSCheckResult>(initialAtsResult);

  // Profile creation states
  const [creationMethod, setCreationMethod] = useState<'paste' | 'upload' | 'manual'>('paste');
  const [rubricText, setRubricText] = useState('');
  const [isParsingRubric, setIsParsingRubric] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ATSProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'create_profile') {
        setActiveTab('ats_profile');
        setProfileSubView('create');
      } else {
        setActiveTab(initialTab || 'jd_matcher');
        setProfileSubView('list');
      }
      setEditingProfile(null);
      const profiles = getAllATSProfiles();
      setAllProfiles(profiles);
      const currentId = getActiveProfileId();
      setActiveId(currentId);
      const res = calculateLiveATSScore(resumeData, currentId);
      setProfileAtsResult(res);
    } else {
      setProfileSubView('list');
      setEditingProfile(null);
    }
  }, [isOpen, initialTab, resumeData]);

  const handleTabChange = (tab: 'jd_matcher' | 'ats_profile') => {
    setActiveTab(tab);
    setProfileSubView('list');
    setEditingProfile(null);
  };

  if (!isOpen) return null;

  const handleSelectProfile = (id: string) => {
    setActiveId(id);
    setActiveProfileId(id);
    const res = calculateLiveATSScore(resumeData, id);
    setProfileAtsResult(res);
    onProfileChanged?.(id);
  };

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

  // Profile parsing & saving
  const handleParseRubric = async (text: string) => {
    if (!text.trim()) return;
    setIsParsingRubric(true);
    try {
      const parsed = await parseRubricToATSProfile(text);
      setEditingProfile(parsed);
      setProfileSubView('create');
    } catch (err) {
      console.error('Failed to parse rubric:', err);
    } finally {
      setIsParsingRubric(false);
    }
  };

  const handleRubricFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingRubric(true);
    try {
      const parsed = await parseResumeFile(file);
      await handleParseRubric(parsed.rawText);
    } catch (err) {
      console.error('Failed to parse rubric file:', err);
    } finally {
      setIsParsingRubric(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = () => {
    if (!editingProfile) return;
    saveCustomProfile(editingProfile);
    const updated = getAllATSProfiles();
    setAllProfiles(updated);
    handleSelectProfile(editingProfile.id);
    setEditingProfile(null);
    setProfileSubView('list');
  };

  const handleDeleteProfile = (id: string) => {
    deleteCustomProfile(id);
    const updated = getAllATSProfiles();
    setAllProfiles(updated);
    if (activeProfileId === id) {
      handleSelectProfile('default');
    }
  };

  const handleDuplicateProfile = (profile: ATSProfile) => {
    const dup: ATSProfile = {
      ...profile,
      id: 'custom_' + Date.now(),
      name: `${profile.name} (Copy)`,
      isCustom: true,
    };
    saveCustomProfile(dup);
    setAllProfiles(getAllATSProfiles());
    handleSelectProfile(dup.id);
  };

  const handleExportProfile = (profile: ATSProfile) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${profile.name.replace(/\s+/g, '_')}_ATS_Profile.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleStartManualProfile = () => {
    setEditingProfile({
      id: 'custom_' + Date.now(),
      name: 'New Custom Rubric',
      description: 'Custom evaluation criteria',
      isCustom: true,
      criteria: [
        {
          id: 'c1',
          label: 'Core Keywords',
          weight: 40,
          type: 'keyword',
          params: { keywords: ['Python', 'Docker'], minCount: 2, fixSuggestion: 'Add core technical keywords' },
        },
        {
          id: 'c2',
          label: 'Quantified Metrics',
          weight: 30,
          type: 'metric',
          params: { metricType: 'numbers', minCount: 3, fixSuggestion: 'Include percentages, scale, and numbers' },
        },
        {
          id: 'c3',
          label: 'Required Contact Fields',
          weight: 30,
          type: 'section',
          params: { sectionName: 'personal', fixSuggestion: 'Provide complete phone, email, and LinkedIn links' },
        },
      ],
    });
    setProfileSubView('create');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-300';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-300';
    return 'text-rose-600 bg-rose-50 border-rose-300';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Job Matcher & ATS Profiles"
      subtitle="Match keywords against a job description or custom rubric"
      icon={null}
      maxWidth="max-w-3xl"
      bodyClassName="p-0 flex flex-col flex-1 overflow-hidden min-h-0"
      footer={
        activeTab === 'ats_profile' && profileSubView === 'create' ? null : (
          tailoredChanges && activeTab === 'jd_matcher' ? (
            <>
              <button
                type="button"
                onClick={() => setTailoredChanges(null)}
                className="px-3.5 py-1.5 font-medium text-xs text-ink/70 hover:bg-muted rounded-[6px] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyTailoring}
                className="btn-primary h-8"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply changes</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="btn-outline h-8 px-3.5"
            >
              Close
            </button>
          )
        )
      }
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-line bg-card px-6 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => handleTabChange('jd_matcher')}
          className={`py-2 px-3 text-xs border-b-2 transition cursor-pointer ${
            activeTab === 'jd_matcher'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-ink/60 hover:text-ink font-normal'
          }`}
        >
          Job Description Matcher
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('ats_profile')}
          className={`py-2 px-3 text-xs border-b-2 transition cursor-pointer ${
            activeTab === 'ats_profile'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent text-ink/60 hover:text-ink font-normal'
          }`}
        >
          ATS Profiles ({allProfiles.length})
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 relative">
        <div className="pointer-events-none sticky top-0 left-0 right-0 h-2 bg-gradient-to-b from-card to-transparent z-10 -mt-6 -mx-6 mb-2" />
          {activeTab === 'jd_matcher' && (
            <>
              {tailoredChanges ? (
                /* Diff-Style Preview View */
                <div className="space-y-5 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
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
                  <div className="card p-4 space-y-3 bg-canvas/60 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">Professional Summary</span>
                      <button
                        type="button"
                        onClick={() => setAcceptedSummary(!acceptedSummary)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand-600"
                      >
                        {acceptedSummary ? (
                          <>
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                            <span>Accepted</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-4 h-4 text-ink/30" />
                            <span className="text-ink/40">Keep Original</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 rounded-lg text-ink/70">
                        <span className="block text-[10px] font-bold uppercase text-rose-500 mb-1">Current</span>
                        <p className="leading-relaxed">{resumeData.summary || '(Empty summary)'}</p>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 rounded-lg text-ink">
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
                        <div key={eb.index} className="card p-4 space-y-3 bg-canvas/60 border border-border">
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
                                  className="p-2.5 bg-card rounded-lg border border-border space-y-2"
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
                                    <div className="text-ink/60 bg-rose-50/40 dark:bg-rose-950/20 p-2 rounded border border-rose-200/40">
                                      <span className="text-[10px] font-semibold text-rose-500 block mb-0.5">Original:</span>
                                      {oldBullet || '(empty)'}
                                    </div>
                                    <div className="text-ink bg-emerald-50/40 dark:bg-emerald-950/20 p-2 rounded border border-emerald-200/40 font-medium">
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
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-ink">
                      Paste Target Job Description (LinkedIn, Indeed, Greenhouse, etc.):
                    </label>
                    <textarea
                      rows={4}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="e.g. Seeking Senior AI Engineer with expertise in PyTorch, Gemini API, RAG architectures, Kubernetes, and high-throughput systems..."
                      className="input font-mono text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleScan}
                        disabled={isScanning || !jobDescription.trim()}
                        className="btn-primary"
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
                  <div className="p-5 bg-muted border border-line rounded-2xl space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                      <div>
                        <span className="text-[11px] font-bold text-ink/40 uppercase tracking-wider">
                          {hasScanned ? 'Job Posting ATS Compatibility' : 'General Resume ATS Health'}
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-3xl font-black text-ink tabular-nums">
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
                        <button
                          type="button"
                          onClick={handleStartTailoring}
                          disabled={isTailoring || !jobDescription.trim()}
                          className="btn-primary"
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

                    {/* Keywords */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Matched Keywords ({analysisResult.matchedKeywords.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.matchedKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md"
                            >
                              ✓ {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          Missing Keywords ({analysisResult.missingKeywords.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisResult.missingKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[11px] font-medium bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-md"
                            >
                              + {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'ats_profile' && (
            <div className="space-y-6 animate-in fade-in">
              {profileSubView === 'list' ? (
                <>
                  {/* Profile Selection & Actions Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-canvas/60 rounded-2xl border border-line">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">Active Profile:</span>
                      <select
                        value={activeProfileId}
                        onChange={(e) => handleSelectProfile(e.target.value)}
                        className="input text-xs font-semibold py-1 px-2.5 max-w-[220px]"
                      >
                        {allProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.isCustom ? '★ Custom' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCreationMethod('paste');
                          setEditingProfile(null);
                          setProfileSubView('create');
                        }}
                        className="btn-primary text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Custom Profile</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Profile Info */}
                  {allProfiles.find((p) => p.id === activeProfileId) && (
                    <div className="card p-4 space-y-4 border border-line">
                      {(() => {
                        const currentProf = allProfiles.find((p) => p.id === activeProfileId)!;
                        return (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-bold text-ink">{currentProf.name}</h3>
                                  {currentProf.isCustom && (
                                    <span className="badge">Custom Rubric</span>
                                  )}
                                </div>
                                <p className="text-xs text-ink/50 mt-0.5">{currentProf.description}</p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateProfile(currentProf)}
                                  className="btn-ghost p-1.5"
                                  title="Duplicate Profile"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportProfile(currentProf)}
                                  className="btn-ghost p-1.5"
                                  title="Export Profile JSON"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                {currentProf.isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProfile(currentProf.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                                    title="Delete Profile"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Live Score against this profile */}
                            <div className="flex items-center justify-between p-3 bg-canvas/60 rounded-xl border border-line">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-ink/40">Deterministic Match Score</span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-black text-ink tabular-nums">
                                    {profileAtsResult.isEmpty ? '--' : `${profileAtsResult.score}/100`}
                                  </span>
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(profileAtsResult.score)}`}>
                                    {profileAtsResult.rating}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs text-ink/50 max-w-xs text-right">
                                {profileAtsResult.isEmpty
                                  ? 'Fill out resume details to trigger live scoring'
                                  : 'Computed instantly in-browser using local deterministic rules.'}
                              </span>
                            </div>

                            {/* Criteria Breakdown */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-ink uppercase tracking-wider text-ink/50">
                                Criteria Breakdown ({currentProf.criteria.length} Rules)
                              </h4>

                              <div className="space-y-2">
                                {profileAtsResult.criterionResults?.map((cr) => (
                                  <div
                                    key={cr.criterion.id}
                                    className="p-3 bg-canvas/40 rounded-xl border border-line flex items-start justify-between gap-3"
                                  >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                      {cr.status === 'pass' ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                      ) : cr.status === 'partial' ? (
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-ink">{cr.criterion.label}</span>
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted border border-line text-ink/60 uppercase font-mono">
                                            {cr.criterion.type}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-ink/60 mt-0.5">{cr.message}</p>
                                        <p className="text-[11px] text-brand-600 font-medium mt-1">
                                          💡 <span className="font-semibold">Fix:</span> {cr.fix}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="text-xs font-bold tabular-nums text-ink">
                                        {cr.scoreEarned} / {cr.maxScore} pts
                                      </span>
                                      <span className="block text-[10px] text-ink/40">
                                        Weight {cr.criterion.weight}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                /* Create/Edit Sub-view inside ATS Profiles Tab */
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        {editingProfile ? 'Edit ATS Profile Criteria' : 'Create Custom ATS Profile'}
                      </h3>
                      <p className="text-xs text-ink/50 mt-0.5">
                        Parse an existing company rubric, upload a rubric document, or build criteria manually.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProfile(null);
                        setProfileSubView('list');
                      }}
                      className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      ← Back to profiles
                    </button>
                  </div>

                  {!editingProfile ? (
                    /* 3 Creation Methods */
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                        <button
                          type="button"
                          onClick={() => setCreationMethod('paste')}
                          className={`p-4 rounded-[6px] border text-left transition cursor-pointer flex flex-col justify-start h-full ${
                            creationMethod === 'paste'
                              ? 'border-brand-600 bg-muted text-ink'
                              : 'border-line bg-card text-ink hover:border-ink/40'
                          }`}
                        >
                          <FileText className="w-4 h-4 mb-2 text-ink/70" strokeWidth={1.5} />
                          <div className="font-semibold text-xs text-ink">Method 1: Paste Text</div>
                          <p className="text-xs text-ink/60 mt-1">
                            Paste hiring guidelines, rubric text, or an ATS summary report.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCreationMethod('upload')}
                          className={`p-4 rounded-[6px] border text-left transition cursor-pointer flex flex-col justify-start h-full ${
                            creationMethod === 'upload'
                              ? 'border-brand-600 bg-muted text-ink'
                              : 'border-line bg-card text-ink hover:border-ink/40'
                          }`}
                        >
                          <Upload className="w-4 h-4 mb-2 text-ink/70" strokeWidth={1.5} />
                          <div className="font-semibold text-xs text-ink">Method 2: Upload File</div>
                          <p className="text-xs text-ink/60 mt-1">
                            Upload TXT, PDF, or DOCX document containing scoring rubrics.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={handleStartManualProfile}
                          className="p-4 rounded-[6px] border border-line bg-card text-ink hover:border-ink/40 text-left transition cursor-pointer flex flex-col justify-start h-full"
                        >
                          <Sliders className="w-4 h-4 mb-2 text-ink/70" strokeWidth={1.5} />
                          <div className="font-semibold text-xs text-ink">Method 3: Manual Form</div>
                          <p className="text-xs text-ink/60 mt-1">
                            Define required keywords, section weights, and page limits by hand.
                          </p>
                        </button>
                      </div>

                      {creationMethod === 'paste' && (
                        <div className="space-y-3 pt-1">
                          <label className="block text-xs font-semibold text-ink">
                            Paste ATS Rubric / Scoring Guidelines:
                          </label>
                          <textarea
                            value={rubricText}
                            onChange={(e) => setRubricText(e.target.value)}
                            placeholder="Paste the grading criteria, job requirements, or screening instructions here..."
                            className="input font-sans text-xs min-h-[200px] resize-y w-full"
                          />
                          {/* Sticky bottom action bar for Paste method */}
                          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3 bg-card border-t border-line flex items-center justify-end gap-2 z-20">
                            <button
                              type="button"
                              onClick={() => setProfileSubView('list')}
                              className="px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-muted rounded-[6px] transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleParseRubric(rubricText)}
                              disabled={isParsingRubric || !rubricText.trim()}
                              className="btn-primary"
                            >
                              {isParsingRubric ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                              <span>{isParsingRubric ? 'Parsing Rubric with Gemini...' : 'Parse Criteria with AI'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {creationMethod === 'upload' && (
                        <div className="space-y-3 pt-1">
                          <div className="p-8 border border-dashed border-line hover:border-ink/40 rounded-[10px] text-center space-y-3 bg-card transition">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".txt,.pdf,.docx"
                              onChange={handleRubricFileUpload}
                              className="hidden"
                            />
                            <div className="w-10 h-10 rounded-[6px] bg-muted text-ink/70 flex items-center justify-center mx-auto">
                              <Upload className="w-5 h-5" strokeWidth={1.5} />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-ink">Upload ATS Rubric File</div>
                              <p className="text-xs text-ink/60 mt-0.5">Supports PDF, DOCX, TXT (Max 5MB)</p>
                            </div>
                          </div>
                          {/* Sticky bottom action bar for Upload method */}
                          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3 bg-card border-t border-line flex items-center justify-end gap-2 z-20">
                            <button
                              type="button"
                              onClick={() => setProfileSubView('list')}
                              className="px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-muted rounded-[6px] transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isParsingRubric}
                              className="btn-primary text-xs"
                            >
                              {isParsingRubric ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              <span>{isParsingRubric ? 'Reading & Parsing File...' : 'Select File'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Editable Preview of Parsed Criteria */
                    <div className="space-y-5 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="label">Profile Name</label>
                          <input
                            type="text"
                            value={editingProfile.name}
                            onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                            className="input text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="label">Description</label>
                          <input
                            type="text"
                            value={editingProfile.description || ''}
                            onChange={(e) => setEditingProfile({ ...editingProfile, description: e.target.value })}
                            className="input text-xs"
                          />
                        </div>
                      </div>

                      {/* Criteria List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-ink">Criteria List ({editingProfile.criteria.length})</h4>
                          <button
                            type="button"
                            onClick={() => {
                              const newCrit: ATSCriterion = {
                                id: 'c_' + Date.now(),
                                label: 'New Criterion',
                                weight: 10,
                                type: 'keyword',
                                params: { keywords: ['Key Skill'], fixSuggestion: 'Add required technology' },
                              };
                              setEditingProfile({
                                ...editingProfile,
                                criteria: [...editingProfile.criteria, newCrit],
                              });
                            }}
                            className="btn-ghost text-[11px] py-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Criterion</span>
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {editingProfile.criteria.map((crit, idx) => (
                            <div key={crit.id} className="p-3 bg-canvas/60 rounded-xl border border-line space-y-2">
                              <div className="grid grid-cols-12 gap-2 items-center">
                                <input
                                  type="text"
                                  value={crit.label}
                                  onChange={(e) => {
                                    const next = [...editingProfile.criteria];
                                    next[idx] = { ...crit, label: e.target.value };
                                    setEditingProfile({ ...editingProfile, criteria: next });
                                  }}
                                  className="input text-xs col-span-5 font-semibold py-1"
                                  placeholder="Criterion Label"
                                />

                                <select
                                  value={crit.type}
                                  onChange={(e) => {
                                    const next = [...editingProfile.criteria];
                                    next[idx] = { ...crit, type: e.target.value as any };
                                    setEditingProfile({ ...editingProfile, criteria: next });
                                  }}
                                  className="input text-xs col-span-3 py-1"
                                >
                                  <option value="keyword">Keyword</option>
                                  <option value="section">Section</option>
                                  <option value="metric">Metric</option>
                                  <option value="length">Length</option>
                                  <option value="regex">Regex / Filter</option>
                                </select>

                                <div className="col-span-3 flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={crit.weight}
                                    onChange={(e) => {
                                      const next = [...editingProfile.criteria];
                                      next[idx] = { ...crit, weight: Number(e.target.value) || 0 };
                                      setEditingProfile({ ...editingProfile, criteria: next });
                                    }}
                                    className="input text-xs text-center py-1 tabular-nums"
                                  />
                                  <span className="text-[11px] text-ink/40 font-bold">%</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = editingProfile.criteria.filter((_, i) => i !== idx);
                                    setEditingProfile({ ...editingProfile, criteria: next });
                                  }}
                                  className="col-span-1 p-1 text-rose-500 hover:bg-rose-50 rounded flex justify-center cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <input
                                type="text"
                                value={crit.params.fixSuggestion || ''}
                                onChange={(e) => {
                                  const next = [...editingProfile.criteria];
                                  next[idx] = {
                                    ...crit,
                                    params: { ...crit.params, fixSuggestion: e.target.value },
                                  };
                                  setEditingProfile({ ...editingProfile, criteria: next });
                                }}
                                placeholder="Actionable Fix Suggestion shown to candidate..."
                                className="input text-[11px] text-ink/70 py-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sticky bottom action bar for criteria form */}
                      <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3 bg-card/95 backdrop-blur-sm border-t border-line flex items-center justify-end gap-2 shadow-soft z-20">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProfile(null);
                            setProfileSubView('list');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-ink/60 hover:text-ink cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          className="btn-primary"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save profile</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
    </Modal>
  );
};
