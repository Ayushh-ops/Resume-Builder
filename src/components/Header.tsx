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
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">

          {/* ATS Score badge */}
          <button
            onClick={onOpenJobMatcher}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition hover:shadow-sm ${scoreStyle(atsResult.score)}`}
            title="Open ATS breakdown"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            ATS {atsResult.score}/100
          </button>

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
              onClick={() => setMenuOpen(v => !v)}
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
