import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Palette, Type, Upload, User, Sparkles, Sliders } from 'lucide-react';
import type { ResumeData, ResumeTheme, TemplateType } from '../../types/resume';
import { isResumeEmpty } from '../../services/atsScorer';
import { ModernTemplate } from './templates/ModernTemplate';
import { HarvardTemplate } from './templates/HarvardTemplate';
import { MinimalistTemplate } from './templates/MinimalistTemplate';
import { CreativeTemplate } from './templates/CreativeTemplate';
import { TemplateThumbnail } from './TemplateThumbnail';

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
  { id: 'modern',     label: 'Modern'    },
  { id: 'harvard',    label: 'Harvard'   },
  { id: 'minimalist', label: 'Minimal'   },
  { id: 'creative',   label: 'Dual-Col'  },
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

  const handleZoomIn  = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 60));
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
    <div className="flex flex-col h-full canvas-dots relative">
      {/* Floating Toolbar: Vertically centered in one row, wraps cleanly on narrow screens */}
      <div className="no-print sticky top-0 z-20 mx-4 mt-3 mb-0">
        <div className="card shadow-soft px-3 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-line bg-card">

          {/* Template switcher with 40x52 thumbnails */}
          <div className="flex items-center gap-2 shrink-0">
            {TEMPLATES.map(t => (
              <TemplateThumbnail
                key={t.id}
                id={t.id}
                label={t.label}
                isActive={activeTemplate === t.id}
                onClick={() => onChangeTemplate(t.id)}
              />
            ))}
          </div>

          {/* Theme Presets + Custom Color + Font + Zoom */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0 self-center">
            {/* 1-Click Resume Theme Presets */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-line">
              {RESUME_THEME_PRESETS.map((preset) => {
                const isActive = theme.primaryColor === preset.color && theme.fontFamily === preset.font;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onChangeTheme({
                        ...theme,
                        primaryColor: preset.color,
                        fontFamily: preset.font,
                      })
                    }
                    title={`${preset.name} (${preset.font})`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      isActive
                        ? 'bg-card text-brand-600 shadow-soft ring-1 ring-brand-500/30'
                        : 'text-ink/60 hover:text-ink hover:bg-card/50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                    <span className="hidden sm:inline">{preset.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Picker */}
            <div className="relative flex items-center border border-line bg-card rounded-md" title="Custom color picker">
              <label className="p-1 rounded-md hover:bg-muted cursor-pointer text-ink/50 hover:text-ink transition flex items-center">
                <Palette className="w-3.5 h-3.5" strokeWidth={1.75} />
                <input
                  type="color"
                  value={theme.primaryColor || '#4a49d8'}
                  onChange={(e) => onChangeTheme({ ...theme, primaryColor: e.target.value })}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Font Selector */}
            <div className="flex items-center gap-1">
              <Type className="w-3 h-3 text-ink/40" strokeWidth={1.75} />
              <select
                value={theme.fontFamily}
                onChange={e => onChangeTheme({ ...theme, fontFamily: e.target.value as any })}
                className="text-[11px] bg-card border border-line rounded-md px-2 py-1 text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="sans">Sans (Inter)</option>
                <option value="serif">Serif (Merriweather)</option>
                <option value="mono">Mono (Code)</option>
              </select>
            </div>

            {/* Zoom Controls (Inter with tabular-nums) */}
            <div className="flex items-center gap-0.5 border border-line bg-card rounded-md px-1.5 py-0.5 text-ink/60">
              <button onClick={handleZoomOut} className="p-1 hover:text-ink rounded transition active:scale-95" title="Zoom out">
                <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <span className="text-[11px] font-sans tabular-nums w-8 text-center text-ink/80">{zoom}%</span>
              <button onClick={handleZoomIn} className="p-1 hover:text-ink rounded transition active:scale-95" title="Zoom in">
                <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <button onClick={handleReset} className="p-1 hover:text-ink rounded transition active:scale-95 ml-0.5" title="Reset zoom">
                <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* A4 Sheet Viewport */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start relative">
        <div
          id="resume-pdf-sheet"
          data-theme="light"
          className="print-resume-sheet bg-white shadow-paper transition-transform origin-top duration-150 rounded-sm relative text-[#16161d]"
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
            <div className="no-print absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center p-6 z-10 animate-in fade-in">
              <div className="card shadow-paper p-6 max-w-sm text-center space-y-4 border border-border">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-soft">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink">Your resume is empty</h4>
                  <p className="text-xs text-ink/50 mt-1">
                    Upload an existing document or load a pre-filled sample profile to start optimizing.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {onOpenUpload && (
                      <button
                        type="button"
                        onClick={onOpenUpload}
                        className="btn-primary flex-1 justify-center py-2"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Resume</span>
                      </button>
                    )}
                    {onOpenCustomAts && (
                      <button
                        type="button"
                        onClick={onOpenCustomAts}
                        className="btn-outline flex-1 justify-center py-2 text-brand-600 border-brand-500/30"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Custom ATS</span>
                      </button>
                    )}
                  </div>
                  {onLoadSample && (
                    <button
                      type="button"
                      onClick={() => onLoadSample('aiEngineer')}
                      className="btn-ghost w-full justify-center py-2"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Load Sample Profile</span>
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
