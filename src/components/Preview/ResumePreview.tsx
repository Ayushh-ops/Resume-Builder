import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Upload, User, Sliders } from 'lucide-react';
import type { ResumeData, ResumeTheme, TemplateType } from '../../types/resume';
import { isResumeEmpty } from '../../services/atsScorer';
import { ModernTemplate } from './templates/ModernTemplate';
import { HarvardTemplate } from './templates/HarvardTemplate';
import { MinimalistTemplate } from './templates/MinimalistTemplate';
import { CreativeTemplate } from './templates/CreativeTemplate';

interface ResumePreviewProps {
  data: ResumeData;
  activeTemplate: TemplateType;
  onChangeTemplate: (t: TemplateType) => void;
  theme: ResumeTheme;
  onChangeTheme: (theme: ResumeTheme) => void;
  onOpenUpload?: () => void;
  onOpenCustomAts?: () => void;
  onLoadSample?: (key: string) => void;
}

const RESUME_THEME_PRESETS = [
  { id: 'executive', name: 'Executive', color: '#1e3a8a', font: 'serif' as const },
  { id: 'tech',      name: 'Tech',      color: '#4a49d8', font: 'sans' as const },
  { id: 'warm',      name: 'Warm',      color: '#c2410c', font: 'serif' as const },
  { id: 'mono',      name: 'Mono',      color: '#16161d', font: 'mono' as const },
];

const TEMPLATES = [
  { id: 'modern',     label: 'Modern'     },
  { id: 'harvard',    label: 'Harvard'    },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'creative',   label: 'Creative'   },
] as const;

export const ResumePreview: React.FC<ResumePreviewProps> = ({
  data,
  activeTemplate,
  onChangeTemplate,
  theme,
  onChangeTheme,
  onOpenUpload,
  onOpenCustomAts,
  onLoadSample,
}) => {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn  = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 60));
  const handleReset   = () => setZoom(100);

  const renderTemplate = () => {
    switch (activeTemplate) {
      case 'harvard':    return <HarvardTemplate    data={data} theme={theme} />;
      case 'minimalist': return <MinimalistTemplate data={data} theme={theme} />;
      case 'creative':   return <CreativeTemplate   data={data} theme={theme} />;
      default:           return <ModernTemplate     data={data} theme={theme} />;
    }
  };

  const isEmpty = isResumeEmpty(data);

  return (
    <div className="flex flex-col h-full bg-canvas relative">
      {/* Tidy Single Row Toolbar */}
      <div className="no-print border-b border-line bg-card px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        {/* Template Tabs: simple text tabs with active underline */}
        <div className="flex items-center gap-1 -mb-[9px] pb-[7px]">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTemplate(t.id)}
              className={`px-2.5 py-1 text-xs transition cursor-pointer border-b-2 ${
                activeTemplate === t.id
                  ? 'border-brand-600 text-brand-600 font-semibold'
                  : 'border-transparent text-ink/60 hover:text-ink font-normal'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Controls: Preset Select, Color, Font, Zoom */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs">
          {/* Resume Preset as a clean select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-ink/50 font-medium">Preset</span>
            <select
              value={
                RESUME_THEME_PRESETS.find(
                  (p) => p.color === theme.primaryColor && p.font === theme.fontFamily
                )?.id || 'custom'
              }
              onChange={(e) => {
                const selected = RESUME_THEME_PRESETS.find((p) => p.id === e.target.value);
                if (selected) {
                  onChangeTheme({
                    ...theme,
                    primaryColor: selected.color,
                    fontFamily: selected.font,
                  });
                }
              }}
              className="h-7 text-xs bg-card border border-line rounded-[6px] px-2 text-ink focus:outline-none focus:border-brand-600 cursor-pointer"
              title="Resume style preset"
            >
              {RESUME_THEME_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="custom" disabled>Custom</option>
            </select>
          </div>

          {/* Color Picker with "Accent" label and tooltip */}
          <div className="flex items-center gap-1.5" title="Resume accent color">
            <span className="text-[11px] text-ink/50 font-medium">Accent</span>
            <label
              className="relative flex items-center border border-line bg-card rounded-[6px] h-7 px-1.5 cursor-pointer text-ink/60 hover:text-ink"
              title="Pick resume accent color"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                style={{ backgroundColor: theme.primaryColor || '#b4451f' }}
              />
              <input
                type="color"
                value={theme.primaryColor || '#b4451f'}
                onChange={(e) => onChangeTheme({ ...theme, primaryColor: e.target.value })}
                className="sr-only"
              />
            </label>
          </div>

          {/* Font Selector */}
          <select
            value={theme.fontFamily}
            onChange={(e) => onChangeTheme({ ...theme, fontFamily: e.target.value as any })}
            className="h-7 text-xs bg-card border border-line rounded-[6px] px-2 text-ink focus:outline-none focus:border-brand-600 cursor-pointer"
            title="Font family"
          >
            <option value="sans">Sans</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </select>

          <div className="h-4 w-px bg-line mx-0.5" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 border border-line bg-card rounded-[6px] h-7 px-1 text-ink/70">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 hover:text-ink transition cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <span className="text-[11px] tabular-nums w-8 text-center text-ink/80">{zoom}%</span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 hover:text-ink transition cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1 hover:text-ink transition cursor-pointer ml-0.5 text-ink/40"
              title="Reset zoom"
            >
              <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* A4 Sheet Viewport on Flat Canvas */}
      <div className="flex-1 overflow-auto p-6 sm:p-8 flex justify-center items-start relative bg-canvas">
        <div
          id="resume-pdf-sheet"
          data-theme="light"
          className="print-resume-sheet bg-white border border-line shadow-sm relative text-[#16161d] transition-transform origin-top duration-150"
          style={{
            width: '794px',
            minHeight: '1123px',
            padding: '14mm 16mm',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            backgroundColor: '#ffffff',
            color: '#16161d',
          }}
        >
          {renderTemplate()}

          {/* Empty State Overlay */}
          {isEmpty && (
            <div className="no-print absolute inset-0 bg-white/90 flex items-start justify-center pt-20 p-6 z-10 animate-in fade-in">
              <div className="card p-6 max-w-sm text-center space-y-3 border border-line bg-card shadow-modal max-h-full overflow-y-auto">
                <h4 className="text-sm font-semibold text-ink">Your resume is empty</h4>
                <p className="text-xs text-ink/60">
                  Import a document or choose a sample profile to begin.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    {onOpenUpload && (
                      <button
                        type="button"
                        onClick={onOpenUpload}
                        className="btn-primary flex-1 justify-center h-8"
                      >
                        <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Upload resume</span>
                      </button>
                    )}
                    {onOpenCustomAts && (
                      <button
                        type="button"
                        onClick={onOpenCustomAts}
                        className="btn-outline flex-1 justify-center h-8"
                      >
                        <Sliders className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Custom ATS</span>
                      </button>
                    )}
                  </div>
                  {onLoadSample && (
                    <button
                      type="button"
                      onClick={() => onLoadSample('aiEngineer')}
                      className="btn-ghost w-full justify-center h-8"
                    >
                      <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Load sample profile</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
