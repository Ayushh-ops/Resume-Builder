import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Printer,
  Settings,
  FolderOpen,
  ChevronDown,
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
      dot: 'bg-ink/30',
      label: 'ATS --',
    };
  }
  if (score >= 80) {
    return {
      dot: 'bg-emerald-600',
      label: `${score}`,
    };
  }
  if (score >= 60) {
    return {
      dot: 'bg-amber-600',
      label: `${score}`,
    };
  }
  return {
    dot: 'bg-rose-600',
    label: `${score}`,
  };
};

export const Header: React.FC<HeaderProps> = ({
  atsResult,
  onOpenJobMatcher,
  onOpenApiKeyModal,
  onExportJson,
  onPrint,
  onDownloadPdf,
  isDownloadingPdf,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  savedAt = null,
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

  const close = () => setMenuOpen(false);

  const scoreInfo = getScoreColors(atsResult.score, atsResult.isEmpty);

  return (
    <header className="no-print sticky top-0 z-40 h-13 flex items-center bg-card border-b border-line outline-none transition-colors select-none">
      <div className="w-full max-w-6xl mx-auto px-6 flex items-center justify-between gap-4">

        {/* Left: Logo & Resume Selector */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <div
            onClick={onOpenHome}
            className="flex items-center gap-2 shrink-0 cursor-pointer group select-none"
            title="All resumes"
          >
            <span className="font-serif font-semibold text-ink text-lg tracking-tight hover:text-brand-600 transition-colors">
              ResumeCraft
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
                  className="text-xs font-medium px-2 py-0.5 rounded-[4px] bg-card border border-brand-600 text-ink focus:outline-none max-w-[140px] sm:max-w-[200px]"
                />
              ) : (
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    onClick={() => {
                      setNameInput(currentResumeName || '');
                      setIsRenaming(true);
                    }}
                    className="text-xs font-medium text-ink/80 hover:text-ink cursor-pointer truncate max-w-[110px] sm:max-w-[170px] transition"
                    title="Click to rename"
                  >
                    {currentResumeName || 'Untitled resume'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResumeMenuOpen((v) => !v)}
                    className="p-1 rounded-[4px] hover:bg-muted text-ink/40 hover:text-ink transition cursor-pointer shrink-0"
                    title="Switch resume"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${resumeMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}

              {/* Resume Switcher Dropdown */}
              {resumeMenuOpen && (
                <div className="absolute top-9 left-2 w-60 card shadow-menu py-1 z-50 border border-line bg-card animate-in fade-in duration-100 max-h-[60vh] overflow-y-auto">
                  <div className="px-3 py-1.5 text-xs font-medium text-ink/50 border-b border-line flex items-center justify-between">
                    <span>Your resumes</span>
                    <button
                      type="button"
                      onClick={() => {
                        setResumeMenuOpen(false);
                        onOpenHome?.();
                      }}
                      className="text-brand-600 hover:underline cursor-pointer"
                    >
                      All resumes →
                    </button>
                  </div>

                  <div className="py-0.5">
                    {resumeList.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setResumeMenuOpen(false);
                          onSelectResume?.(r.id);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition cursor-pointer ${
                          r.id === currentResumeId
                            ? 'bg-muted text-ink font-semibold'
                            : 'text-ink/80 hover:bg-muted'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="block truncate">{r.name}</span>
                          {r.title && <span className="block text-[11px] text-ink/40 truncate font-normal">{r.title}</span>}
                        </div>
                        {r.id === currentResumeId && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-0.5 border-t border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setResumeMenuOpen(false);
                        onNewResume?.();
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-brand-600 hover:bg-muted font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>New resume</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {savedAt && !isHome && (
            <span className="text-xs text-ink/40 hidden md:inline">
              Saved
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

          {/* ATS Score plain text with colored dot (hidden on Home) */}
          {!isHome && (
            <div className="relative" ref={atsRef}>
              <button
                type="button"
                onClick={() => setAtsPopoverOpen((v) => !v)}
                className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition cursor-pointer ${atsResult.isEmpty ? 'text-ink/40 hover:text-ink/70' : 'text-ink/80 hover:text-ink'}`}
                title="Toggle ATS evaluation"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${scoreInfo.dot}`} />
                <span className="tabular-nums">ATS {atsResult.isEmpty ? '--' : atsResult.score}</span>
              </button>

              {atsPopoverOpen && (
                <div className="absolute top-9 right-0 w-72 card shadow-menu p-3 z-50 border border-line bg-card space-y-2.5">
                  {/* Header with Profile Selector */}
                  <div className="pb-2 border-b border-line space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink">ATS evaluation</span>
                      <span className={`text-xs font-medium tabular-nums ${atsResult.isEmpty ? 'text-ink/40' : 'text-brand-600'}`}>
                        {atsResult.isEmpty ? 'ATS --' : `${atsResult.score}/100`}
                      </span>
                    </div>

                    {/* Profile selector dropdown */}
                    {allProfiles.length > 0 && onSelectProfileId && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] text-ink/50 shrink-0">Profile:</span>
                        <select
                          value={activeProfileId}
                          onChange={(e) => onSelectProfileId(e.target.value)}
                          className="text-xs bg-muted border border-line rounded px-1.5 py-0.5 text-ink flex-1 focus:outline-none focus:border-brand-600"
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
                        Add contact information, experience, or skills to compute live ATS scores.
                      </p>
                    ) : atsResult.criterionResults && atsResult.criterionResults.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-ink/60">Evaluation breakdown</p>
                        {atsResult.criterionResults.slice(0, 4).map((cr) => (
                          <div key={cr.criterion.id} className="p-1.5 bg-muted/50 rounded border border-line flex items-start gap-1.5">
                            {cr.status === 'pass' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            ) : cr.status === 'partial' ? (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-ink truncate">{cr.criterion.label}</span>
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
                    className="w-48 card shadow-menu py-1 z-40 border border-line bg-card overflow-y-auto animate-in fade-in duration-100 rounded-[6px]"
                  >
                    <button
                      onClick={() => {
                        onOpenHome?.();
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>All resumes</span>
                    </button>
                    <button
                      onClick={() => {
                        onNewResume?.();
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>New resume</span>
                    </button>

                    <div className="my-1 border-t border-line" />

                    <button
                      onClick={() => {
                        onExportJson();
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Export JSON</span>
                    </button>
                    <button
                      onClick={() => {
                        onPrint();
                        close();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-ink/80 hover:bg-muted hover:text-brand-600 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Print</span>
                    </button>
                  </div>,
                  document.body
                )}
            </div>
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
