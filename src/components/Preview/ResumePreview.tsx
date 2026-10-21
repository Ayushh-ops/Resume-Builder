import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Palette, Layout, Type } from 'lucide-react';
import type { ResumeData, ResumeTheme, TemplateType } from '../../types/resume';
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
}

const COLOR_PRESETS = [
  { name: 'Indigo',      value: '#4a49d8' },
  { name: 'Royal Blue',  value: '#0284c7' },
  { name: 'Emerald',     value: '#059669' },
  { name: 'Charcoal',    value: '#16161d' },
  { name: 'Crimson',     value: '#b91c1c' },
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

  return (
    <div className="flex flex-col h-full canvas-dots">
      {/* Floating Toolbar */}
      <div className="no-print sticky top-0 z-20 mx-4 mt-4 mb-0">
        <div className="card shadow-soft px-3 py-2 flex flex-wrap items-center justify-between gap-3">

          {/* Template switcher */}
          <div className="flex items-center gap-2">
            <Layout className="w-3.5 h-3.5 text-ink/30 shrink-0" strokeWidth={1.75} />
            <div className="inline-flex rounded-lg bg-black/[0.04] p-0.5 gap-0.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => onChangeTemplate(t.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                    activeTemplate === t.id
                      ? 'bg-white text-brand-600 ring-2 ring-brand-500/20 shadow-sm'
                      : 'text-ink/50 hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color + Font + Zoom */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-ink/30" strokeWidth={1.75} />
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.value}
                  onClick={() => onChangeTheme({ ...theme, primaryColor: c.value })}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    theme.primaryColor === c.value
                      ? 'scale-125 ring-2 ring-offset-1 ring-brand-500 border-white'
                      : 'border-white/50 opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <Type className="w-3 h-3 text-ink/30" strokeWidth={1.75} />
              <select
                value={theme.fontFamily}
                onChange={e => onChangeTheme({ ...theme, fontFamily: e.target.value as any })}
                className="text-[11px] bg-transparent border border-black/10 rounded-md px-1.5 py-1 text-ink/70 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              >
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
            </div>

            <div className="flex items-center gap-0.5 border-l border-black/[0.06] pl-3 text-ink/40">
              <button onClick={handleZoomOut} className="p-1 hover:text-ink rounded transition active:scale-95" title="Zoom out">
                <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <span className="text-[11px] font-mono w-8 text-center text-ink/60">{zoom}%</span>
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
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
        <div
          id="resume-pdf-sheet"
          className="print-resume-sheet bg-white shadow-paper transition-transform origin-top duration-150 rounded-sm"
          style={{
            width: '794px',
            minHeight: '1123px',
            padding: '14mm 16mm',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {renderTemplate()}
        </div>
      </div>
    </div>
  );
};
