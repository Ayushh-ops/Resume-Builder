import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import type { ATSCheckResult } from '../types/resume';

interface HeaderProps {
  atsResult: ATSCheckResult;
  onOpenJobMatcher: () => void;
  onOpenJobRadar: () => void;
  onOpenTrendAdvisor: () => void;
  onOpenApiKeyModal: () => void;
  onLoadSample: (key: string) => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  isDownloadingPdf: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  savedAt?: Date | null;
  onOpenUpload?: () => void;
}

const scoreStyle = (score: number) => {
  if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 70) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
};

export const Header: React.FC<HeaderProps> = ({
  atsResult,
  onOpenJobMatcher,
  onOpenJobRadar,
  onOpenTrendAdvisor,
  onOpenApiKeyModal,
  onLoadSample,
  onExportJson,
  onImportJson,
  onPrint,
  onDownloadPdf,
  isDownloadingPdf,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  savedAt = null,
  onOpenUpload,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [atsPopoverOpen, setAtsPopoverOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const atsRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (atsRef.current && !atsRef.current.contains(e.target as Node)) {
        setAtsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatSavedTime = (date: Date | null) => {
    if (!date) return '';
    return 'Saved just now';
  };

  const close = () => setMenuOpen(false);

  return (
    <header className="no-print sticky top-0 z-40 h-14 flex items-center bg-white/70 backdrop-blur-xl border-b border-black/[0.06] px-4 lg:px-6">
      <div className="w-full flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-soft">
            <FileText className="w-4 h-4" strokeWidth={2} />
          </div>
          <span className="font-display font-semibold text-ink text-[17px] tracking-tight leading-none">
            ResumeCraft
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-brand-50 text-brand-600 border border-brand-500/20 uppercase tracking-wider">
            AI
          </span>
          {savedAt && (
            <span className="text-[11px] text-ink/40 ml-1.5 hidden md:inline transition-opacity duration-300">
              {formatSavedTime(savedAt)}
            </span>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 mr-1">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-black/5 disabled:opacity-25 disabled:pointer-events-none transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg text-ink/50 hover:text-ink hover:bg-black/5 disabled:opacity-25 disabled:pointer-events-none transition"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* ATS Score badge with Popover */}
          <div className="relative" ref={atsRef}>
            <button
              type="button"
              onClick={() => setAtsPopoverOpen((v) => !v)}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition hover:shadow-sm ${scoreStyle(atsResult.score)}`}
              title="Toggle ATS breakdown"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              ATS {atsResult.score}/100
            </button>

            {atsPopoverOpen && (
              <div className="absolute top-8 right-0 w-64 card shadow-paper p-3 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06] mb-2">
                  <span className="text-xs font-bold text-ink">Top ATS Fixes</span>
                  <span className="text-[10px] font-mono font-semibold text-brand-600">{atsResult.score}/100</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-ink/70">
                  {atsResult.suggestions && atsResult.suggestions.length > 0 ? (
                    atsResult.suggestions.slice(0, 3).map((sug, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold shrink-0">•</span>
                        <span>{sug}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-ink/40">No immediate fixes needed. Great job!</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAtsPopoverOpen(false);
                    onOpenJobMatcher();
                  }}
                  className="w-full mt-2.5 py-1 text-center text-[10px] font-semibold text-brand-600 hover:bg-brand-50 rounded transition"
                >
                  View Full Analysis →
                </button>
              </div>
            )}
          </div>

          {/* Settings icon */}
          <button
            onClick={onOpenApiKeyModal}
            className="p-2 rounded-lg text-ink/50 hover:text-ink hover:bg-black/5 transition active:scale-95"
            title="Gemini API key settings"
          >
            <Settings className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {/* More dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="btn-ghost hidden sm:inline-flex"
            >
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
              <span>More</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 card shadow-paper py-1.5 z-50">
                {/* Tools */}
                <p className="label px-3 pt-1 pb-1">AI Tools</p>
                <button onClick={() => { onOpenJobRadar(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <Radar className="w-3.5 h-3.5" strokeWidth={1.75} /> Job Radar
                </button>
                <button onClick={() => { onOpenTrendAdvisor(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.75} /> 2026 Upgrade Tips
                </button>
                <button onClick={() => { onOpenJobMatcher(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <Target className="w-3.5 h-3.5" strokeWidth={1.75} /> JD Matcher
                </button>

                <div className="my-1 border-t border-black/[0.06]" />

                {/* Samples */}
                <p className="label px-3 pt-1 pb-1">Sample Profiles</p>
                <button onClick={() => { onLoadSample('aiEngineer'); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <User className="w-3.5 h-3.5" strokeWidth={1.75} /> AI Engineer
                </button>
                <button onClick={() => { onLoadSample('fullStack'); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <Code2 className="w-3.5 h-3.5" strokeWidth={1.75} /> Full-Stack Dev
                </button>
                <button onClick={() => { onLoadSample('fresherStudent'); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <GraduationCap className="w-3.5 h-3.5" strokeWidth={1.75} /> Graduate / Fresher
                </button>

                <div className="my-1 border-t border-black/[0.06]" />

                {/* Data */}
                <p className="label px-3 pt-1 pb-1">Data</p>
                <button onClick={() => { importRef.current?.click(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <Upload className="w-3.5 h-3.5" strokeWidth={1.75} /> Import JSON
                </button>
                <button onClick={() => { onExportJson(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.75} /> Export JSON
                </button>
                <button onClick={() => { onPrint(); close(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink/80 hover:bg-brand-50 hover:text-brand-600 transition">
                  <Printer className="w-3.5 h-3.5" strokeWidth={1.75} /> Print
                </button>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input ref={importRef} type="file" accept=".json" onChange={onImportJson} className="hidden" />

          {/* Upload Button */}
          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="btn-ghost hidden sm:inline-flex"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Upload Resume</span>
            </button>
          )}

          {/* Download PDF — primary CTA */}
          <button
            onClick={onDownloadPdf}
            disabled={isDownloadingPdf}
            className="btn-primary"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2} />
            {isDownloadingPdf ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </header>
  );
};
