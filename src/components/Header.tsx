import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Download,
  Printer,
  Radar,
  TrendingUp,
  Target,
  Settings,
  Upload,
  FolderOpen,
  ChevronDown,
  User,
  Code2,
  GraduationCap,
  MoreHorizontal,
  Undo2,
  Redo2,
  FilePlus2,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { ATSCheckResult, ATSProfile } from '../types/resume';
import { type ThemeId, isDarkTheme } from '../services/themeService';

interface HeaderProps {
  atsResult: ATSCheckResult;
  onOpenJobMatcher: () => void;
  onOpenJobRadar: () => void;
  onOpenTrendAdvisor: () => void;
  onOpenApiKeyModal: () => void;
  onLoadSample: (key: string) => void;
  onExportJson: () => void;
  onImportJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  isDownloadingPdf: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  savedAt?: Date | null;
  onOpenUpload?: () => void;
  onOpenCustomAts?: () => void;
  onOpenHome?: () => void;
  onNewResume?: () => void;
  allProfiles?: ATSProfile[];
  activeProfileId?: string;
  onSelectProfileId?: (id: string) => void;
  currentTheme?: ThemeId;
  onToggleTheme?: () => void;
  isHome?: boolean;
  currentResumeId?: string | null;
  currentResumeName?: string;
  onRenameResume?: (id: string, newName: string) => void;
  resumeList?: Array<{ id: string; name: string; title?: string }>;
  onSelectResume?: (id: string) => void;
}

const getScoreColors = (score: number, isEmpty?: boolean) => {
  if (isEmpty) {
    return {
      badge: 'text-ink/40 bg-muted border-line',
      dot: 'bg-ink/30',
      ping: 'bg-ink/20',
      label: 'ATS --',
    };
  }
  if (score >= 80) {
    return {
      badge: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      ping: 'bg-emerald-400',
      label: `ATS ${score}`,
    };
  }
  if (score >= 60) {
    return {
      badge: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
      dot: 'bg-amber-500',
      ping: 'bg-amber-400',
      label: `ATS ${score}`,
    };
  }
  return {
    badge: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
    dot: 'bg-rose-500',
    ping: 'bg-rose-400',
    label: `ATS ${score}`,
  };
};

export const Header: React.FC<HeaderProps> = ({
  atsResult,
  onOpenJobMatcher,
  onOpenJobRadar,
  onOpenTrendAdvisor,
  onOpenApiKeyModal,
  onLoadSample,
  onExportJson,
  onPrint,
  onDownloadPdf,
  isDownloadingPdf,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  savedAt = null,
  onOpenUpload,
  onOpenCustomAts,
  onOpenHome,
  onNewResume,
  allProfiles = [],
  activeProfileId = 'default',
  onSelectProfileId,
  currentTheme = 'light',
  onToggleTheme,
  isHome = false,
  currentResumeId = null,
  currentResumeName = 'Untitled resume',
  onRenameResume,
  resumeList = [],
  onSelectResume,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [samplesExpanded, setSamplesExpanded] = useState(false);
  const [atsPopoverOpen, setAtsPopoverOpen] = useState(false);
  const [resumeMenuOpen, setResumeMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(currentResumeName || '');
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const atsRef = useRef<HTMLDivElement>(null);
  const resumeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNameInput(currentResumeName || '');
  }, [currentResumeName]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
      if (atsRef.current && !atsRef.current.contains(e.target as Node)) {
        setAtsPopoverOpen(false);
      }
      if (
        resumeMenuRef.current &&
        !resumeMenuRef.current.contains(e.target as Node)
      ) {
        setResumeMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setAtsPopoverOpen(false);
        setResumeMenuOpen(false);
        setIsRenaming(false);
      }
    };

    document.addEventListener('mousedown', handler);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleFinishRename = () => {
    setIsRenaming(false);
    if (nameInput.trim() && currentResumeId && onRenameResume) {
      onRenameResume(currentResumeId, nameInput.trim());
    } else {
      setNameInput(currentResumeName || '');
    }
  };

  const handleToggleMenu = () => {
    if (!menuOpen && menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setMenuOpen((v) => !v);
  };

  const formatSavedTime = (date: Date | null) => {
    if (!date) return '';
    return 'Saved just now';
  };

  const close = () => setMenuOpen(false);

  const scoreInfo = getScoreColors(atsResult.score, atsResult.isEmpty);

  return (
    <header className="no-print sticky top-0 z-40 h-14 flex items-center bg-card/85 backdrop-blur-xl border-b border-border border-t-0 px-4 lg:px-6 outline-none transition-colors">
      <div className="w-full flex items-center justify-between gap-4">

        {/* Left: Logo & Resume Selector */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <div
            onClick={onOpenHome}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer group select-none"
            title="All resumes (Home)"
          >
            <div className="h-8 w-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className="font-display font-semibold text-ink text-[17px] tracking-tight leading-none group-hover:text-brand-600 transition-colors">
              ResumeCraft
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-brand-50 text-brand-600 border border-brand-500/20 uppercase tracking-wider">
              AI
            </span>
          </div>

          {/* Current Resume Title & Switcher dropdown (only in Editor mode) */}
          {!isHome && currentResumeId && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-line relative min-w-0" ref={resumeMenuRef}>
              {isRenaming ? (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename();
                    if (e.key === 'Escape') {
                      setNameInput(currentResumeName || '');
                      setIsRenaming(false);
                    }
                  }}
                  autoFocus
                  className="text-xs font-semibold px-2 py-1 rounded bg-card border border-brand-500 text-ink focus:outline-none max-w-[140px] sm:max-w-[200px]"
                />
              ) : (
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    onClick={() => {
                      setNameInput(currentResumeName || '');
                      setIsRenaming(true);
                    }}
                    className="text-xs font-semibold text-ink hover:text-brand-600 cursor-pointer truncate max-w-[110px] sm:max-w-[170px] transition"
                    title="Click to rename"
                  >
                    {currentResumeName || 'Untitled resume'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResumeMenuOpen((v) => !v)}
                    className="p-1 rounded hover:bg-muted text-ink/40 hover:text-ink transition cursor-pointer shrink-0"
                    title="Switch resume"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${resumeMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}

              {/* Resume Switcher Dropdown */}
              {resumeMenuOpen && (
                <div className="absolute top-9 left-2 w-64 card shadow-paper py-1.5 z-50 border border-line bg-card animate-in fade-in zoom-in-95 duration-100 max-h-[60vh] overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink/40 border-b border-line flex items-center justify-between">
                    <span>Your Resumes</span>
                    <button
                      type="button"
                      onClick={() => {
                        setResumeMenuOpen(false);
                        onOpenHome?.();
                      }}
                      className="text-brand-600 hover:underline normal-case font-semibold cursor-pointer"
                    >
                      All resumes →
                    </button>
                  </div>

                  <div className="py-1">
                    {resumeList.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setResumeMenuOpen(false);
                          onSelectResume?.(r.id);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                          r.id === currentResumeId
                            ? 'bg-brand-50 text-brand-600 font-bold'
                            : 'text-ink/80 hover:bg-muted'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="block truncate">{r.name}</span>
                          {r.title && <span className="block text-[10px] text-ink/40 truncate font-normal">{r.title}</span>}
                        </div>
                        {r.id === currentResumeId && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setResumeMenuOpen(false);
                        onNewResume?.();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-brand-600 hover:bg-brand-50 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>+ New resume</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {savedAt && !isHome && (
            <span className="text-[11px] text-ink/40 hidden md:inline transition-opacity duration-300">
              {formatSavedTime(savedAt)}
            </span>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">

          {/* Undo / Redo (hidden on Home) */}
          {!isHome && (
            <div className="flex items-center gap-0.5 mr-1">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-muted disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-muted disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}

          {/* ATS Score badge with Popover (hidden on Home) */}
          {!isHome && (
            <div className="relative" ref={atsRef}>
              <button
                type="button"
                onClick={() => setAtsPopoverOpen((v) => !v)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition hover:shadow-sm cursor-pointer ${scoreInfo.badge}`}
                title="Toggle ATS Profile & Breakdown"
              >
                <span className="relative flex h-2 w-2">
                  {!atsResult.isEmpty && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${scoreInfo.ping} opacity-75`} />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${scoreInfo.dot}`} />
                </span>
                <span className="tabular-nums">{scoreInfo.label}</span>
                {atsResult.profileName && !atsResult.isEmpty && (
                  <span className="text-[10px] font-normal opacity-80 max-w-[80px] truncate hidden md:inline">
                    ({atsResult.profileName.split(' ')[0]})
                  </span>
                )}
              </button>

              {atsPopoverOpen && (
                <div className="absolute top-10 right-0 w-72 card shadow-paper p-3.5 z-50 animate-in fade-in space-y-3 bg-card border border-line">
                  {/* Header with Profile Selector */}
                  <div className="pb-2 border-b border-line space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">ATS Evaluation</span>
                      <span className="text-[11px] font-semibold tabular-nums text-brand-600">
                        {atsResult.isEmpty ? 'Empty' : `${atsResult.score}/100`}
                      </span>
                    </div>

                    {/* Profile selector dropdown */}
                    {allProfiles.length > 0 && onSelectProfileId && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] uppercase font-bold text-ink/40 shrink-0">Profile:</span>
                        <select
                          value={activeProfileId}
                          onChange={(e) => onSelectProfileId(e.target.value)}
                          className="text-[11px] bg-muted border border-line rounded px-1.5 py-0.5 text-ink flex-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {allProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.isCustom ? '(Custom)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Criterion breakdown / Top fixes */}
                  <div className="space-y-2 text-[11px]">
                    {atsResult.isEmpty ? (
                      <p className="text-ink/50 py-1 leading-relaxed">
                        Your resume is currently empty. Add contact information, work experience, or skills to compute live ATS scores.
                      </p>
                    ) : atsResult.criterionResults && atsResult.criterionResults.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Evaluation Breakdown</p>
                        {atsResult.criterionResults.slice(0, 4).map((cr) => (
                          <div key={cr.criterion.id} className="p-1.5 bg-muted/50 rounded-lg border border-line flex items-start gap-1.5">
                            {cr.status === 'pass' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            ) : cr.status === 'partial' ? (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-ink truncate">{cr.criterion.label}</span>
                                <span className="text-[10px] tabular-nums text-ink/50">
                                  {cr.scoreEarned}/{cr.maxScore}
                                </span>
                              </div>
                              <p className="text-[10px] text-ink/60 leading-tight mt-0.5">{cr.fix}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {atsResult.suggestions.slice(0, 3).map((sug, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-ink/70">
                            <span className="text-amber-500 font-bold shrink-0">•</span>
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-line flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAtsPopoverOpen(false);
                        if (onOpenCustomAts) onOpenCustomAts();
                        else onOpenJobMatcher();
                      }}
                      className="w-full py-1 text-center text-[11px] font-bold text-brand-600 hover:bg-brand-50 rounded transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>+ Add custom ATS format</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAtsPopoverOpen(false);
                        onOpenJobMatcher();
                      }}
                      className="w-full py-0.5 text-center text-[10px] text-ink/60 hover:text-ink transition cursor-pointer"
                    >
                      Open Full ATS & Profile Studio →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Light / Dark Mode Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-lg text-ink/50 hover:text-ink hover:bg-muted transition active:scale-95 cursor-pointer"
              title={isDarkTheme(currentTheme) ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkTheme(currentTheme) ? (
                <Sun className="w-4 h-4 text-amber-400" strokeWidth={1.75} />
              ) : (
                <Moon className="w-4 h-4" strokeWidth={1.75} />
              )}
            </button>
          )}

          {/* Settings icon */}
          <button
            onClick={onOpenApiKeyModal}
            className="p-2 rounded-lg text-ink/50 hover:text-ink hover:bg-muted transition active:scale-95 cursor-pointer"
            title="Appearance & Gemini AI settings"
          >
            <Settings className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {/* More dropdown (hidden on Home) */}
          {!isHome && (
            <div className="relative">
              <button
                ref={menuBtnRef}
                onClick={handleToggleMenu}
                aria-expanded={menuOpen}
                className="btn-outline hidden sm:inline-flex cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
                <span>More</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>

              {menuOpen &&
                createPortal(
                  <div
                    ref={menuRef}
                    style={{
                      position: 'fixed',
                      top: menuPos.top,
                      right: menuPos.right,
                    }}
                    className="w-56 card shadow-paper py-1.5 z-40 border border-line bg-card max-h-[70vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                  >
                    {/* Actions */}
                    <button
                      onClick={() => {
                        onNewResume?.();
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>New Resume</span>
                    </button>

                    <div className="my-1 border-t border-line" />

                    {/* Tools */}
                    <p className="label px-3 pt-1 pb-1">AI Tools</p>
                    <button onClick={() => { onOpenJobRadar(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer">
                      <Radar className="w-3.5 h-3.5" strokeWidth={1.75} /> Job Radar
                    </button>
                    <button onClick={() => { onOpenTrendAdvisor(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer">
                      <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.75} /> 2026 Upgrade Tips
                    </button>
                    <button onClick={() => { onOpenJobMatcher(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer">
                      <Target className="w-3.5 h-3.5" strokeWidth={1.75} /> JD & ATS Studio
                    </button>

                    <div className="my-1 border-t border-line" />

                    {/* Submenu / Accordion row: Load sample ▸ */}
                    <button
                      type="button"
                      onClick={() => setSamplesExpanded((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Load sample</span>
                      </span>
                      <span className="text-[10px] text-ink/40 font-mono">
                        {samplesExpanded ? '▾' : '▸'}
                      </span>
                    </button>

                    {samplesExpanded && (
                      <div className="py-1 pl-6 pr-2 space-y-0.5 bg-muted/40 border-y border-line/50">
                        <button
                          onClick={() => {
                            onLoadSample('aiEngineer');
                            close();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-ink/80 hover:text-brand-600 hover:bg-muted rounded transition cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>AI Engineer</span>
                        </button>
                        <button
                          onClick={() => {
                            onLoadSample('fullStack');
                            close();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-ink/80 hover:text-brand-600 hover:bg-muted rounded transition cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Full-Stack Dev</span>
                        </button>
                        <button
                          onClick={() => {
                            onLoadSample('fresherStudent');
                            close();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-ink/80 hover:text-brand-600 hover:bg-muted rounded transition cursor-pointer"
                        >
                          <GraduationCap className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Graduate / Fresher</span>
                        </button>
                      </div>
                    )}

                    <div className="my-1 border-t border-line" />

                    {/* Data */}
                    <p className="label px-3 pt-1 pb-1">Data & Export</p>
                    <button onClick={() => { onExportJson(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer">
                      <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.75} /> Export JSON
                    </button>
                    <button onClick={() => { onPrint(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer">
                      <Printer className="w-3.5 h-3.5" strokeWidth={1.75} /> Print
                    </button>
                  </div>,
                  document.body
                )}
            </div>
          )}

          {/* Upload Button: on screens < 1280px (xl), collapse "Upload Resume" to icon-only with tooltip (hidden on Home) */}
          {!isHome && onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="btn-outline hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
              title="Upload Resume (PDF, DOCX, JSON, TXT)"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden xl:inline">Upload Resume</span>
            </button>
          )}

          {/* Download PDF — primary CTA (hidden on Home) */}
          {!isHome && (
            <button
              onClick={onDownloadPdf}
              disabled={isDownloadingPdf}
              className="btn-primary"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2} />
              {isDownloadingPdf ? 'Generating…' : 'Download PDF'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
