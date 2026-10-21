import React from 'react';
import type { TemplateType } from '../../types/resume';

interface TemplateThumbnailProps {
  id: TemplateType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
  id,
  label,
  isActive,
  onClick,
}) => {
  const renderLayoutPreview = () => {
    switch (id) {
      case 'modern':
        return (
          <div className="w-full h-full flex flex-col justify-between p-1 bg-white">
            {/* Top header with accent line */}
            <div className="space-y-0.5">
              <div className="h-1.5 w-3/4 bg-brand-600 rounded-[1px]" />
              <div className="h-1 w-1/2 bg-black/30 rounded-[1px]" />
            </div>
            {/* Body with subtle accent bars */}
            <div className="space-y-1">
              <div className="flex items-center gap-0.5">
                <div className="w-0.5 h-2 bg-brand-600 rounded-[0.5px]" />
                <div className="h-1 w-full bg-black/20 rounded-[1px]" />
              </div>
              <div className="h-1 w-5/6 bg-black/15 rounded-[1px]" />
              <div className="h-1 w-2/3 bg-black/15 rounded-[1px]" />
            </div>
            {/* Bottom section */}
            <div className="space-y-0.5">
              <div className="h-1 w-1/2 bg-black/25 rounded-[1px]" />
              <div className="h-1 w-full bg-black/15 rounded-[1px]" />
            </div>
          </div>
        );

      case 'harvard':
        return (
          <div className="w-full h-full flex flex-col justify-between p-1 bg-white">
            {/* Centered header + horizontal rule */}
            <div className="space-y-0.5 flex flex-col items-center">
              <div className="h-1.5 w-2/3 bg-black/70 rounded-[1px]" />
              <div className="h-0.5 w-full bg-black/40 my-0.5" />
            </div>
            {/* Standard serif-like clean sections */}
            <div className="space-y-1">
              <div className="h-1 w-1/2 bg-black/40 rounded-[1px]" />
              <div className="h-0.5 w-full bg-black/15 rounded-[0.5px]" />
              <div className="h-1 w-full bg-black/15 rounded-[1px]" />
              <div className="h-1 w-4/5 bg-black/15 rounded-[1px]" />
            </div>
            <div className="space-y-0.5">
              <div className="h-1 w-1/3 bg-black/40 rounded-[1px]" />
              <div className="h-1 w-full bg-black/15 rounded-[1px]" />
            </div>
          </div>
        );

      case 'minimalist':
        return (
          <div className="w-full h-full flex flex-col justify-between p-1 bg-white">
            {/* Minimal top left header */}
            <div className="space-y-0.5">
              <div className="h-1.5 w-1/2 bg-black/80 rounded-[1px]" />
              <div className="h-0.5 w-1/3 bg-black/20 rounded-[0.5px]" />
            </div>
            {/* Clean spacious lines */}
            <div className="space-y-1">
              <div className="h-0.5 w-full bg-black/10 rounded-[0.5px]" />
              <div className="h-1 w-3/4 bg-black/20 rounded-[1px]" />
              <div className="h-1 w-2/3 bg-black/15 rounded-[1px]" />
              <div className="h-1 w-4/5 bg-black/15 rounded-[1px]" />
            </div>
            <div className="space-y-0.5">
              <div className="h-1 w-3/5 bg-black/15 rounded-[1px]" />
            </div>
          </div>
        );

      case 'creative':
        return (
          <div className="w-full h-full flex bg-white">
            {/* Left sidebar */}
            <div className="w-1/3 h-full bg-brand-50 p-0.5 flex flex-col justify-between border-r border-brand-100">
              <div className="w-3 h-3 rounded-full bg-brand-600/30 mx-auto" />
              <div className="space-y-0.5">
                <div className="h-1 w-full bg-brand-600/40 rounded-[0.5px]" />
                <div className="h-1 w-3/4 bg-brand-600/20 rounded-[0.5px]" />
                <div className="h-1 w-1/2 bg-brand-600/20 rounded-[0.5px]" />
              </div>
            </div>
            {/* Right main column */}
            <div className="w-2/3 h-full p-1 flex flex-col justify-between">
              <div className="space-y-0.5">
                <div className="h-1.5 w-3/4 bg-black/60 rounded-[1px]" />
                <div className="h-1 w-1/2 bg-black/20 rounded-[1px]" />
              </div>
              <div className="space-y-1">
                <div className="h-1 w-full bg-black/20 rounded-[1px]" />
                <div className="h-1 w-5/6 bg-black/15 rounded-[1px]" />
              </div>
              <div className="h-1 w-2/3 bg-black/15 rounded-[1px]" />
            </div>
          </div>
        );
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Template: ${label}`}
      className="group flex flex-col items-center justify-center transition-all focus:outline-none w-[44px] shrink-0 cursor-pointer"
    >
      <div
        className={`w-[40px] h-[52px] min-w-[40px] min-h-[52px] max-w-[40px] max-h-[52px] rounded-sm border overflow-hidden transition-all ${
          isActive
            ? 'ring-2 ring-brand-500 border-brand-500/40 shadow-soft'
            : 'border-line opacity-70 group-hover:opacity-100'
        }`}
      >
        {renderLayoutPreview()}
      </div>
      <span
        className={`text-[10px] font-bold leading-tight mt-0.5 truncate max-w-full text-center ${
          isActive ? 'text-brand-600 opacity-100' : 'opacity-0 select-none pointer-events-none'
        }`}
      >
        {label}
      </span>
    </button>
  );
};
