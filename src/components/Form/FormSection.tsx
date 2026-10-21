import React, { useState, useEffect } from 'react';
import { ChevronDown, GripVertical, Eye, EyeOff } from 'lucide-react';

interface FormSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isHidden?: boolean;
  onToggleHidden?: () => void;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  id,
  title,
  icon,
  badge,
  defaultOpen = false,
  forceOpen,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isHidden = false,
  onToggleHidden,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  return (
    <div
      id={id}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`card transition-all ${
        isHidden ? 'opacity-60 bg-slate-50' : 'hover:shadow-paper/50'
      }`}
    >
      <div className="w-full px-3.5 py-3 flex items-center justify-between bg-white hover:bg-black/[0.015] transition-colors select-none">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {draggable && (
            <div
              className="cursor-grab active:cursor-grabbing text-ink/30 hover:text-ink/60 transition p-0.5 -ml-1"
              title="Drag to reorder section"
            >
              <GripVertical className="w-4 h-4" strokeWidth={1.75} />
            </div>
          )}

          <div
            onClick={() => !isHidden && setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          >
            <div className={`p-1.5 rounded-lg ${isHidden ? 'bg-black/5 text-ink/40' : 'bg-brand-50 text-brand-600'}`}>
              {icon}
            </div>
            <h3
              className={`text-sm font-semibold tracking-tight truncate ${
                isHidden ? 'line-through text-ink/40' : 'text-ink'
              }`}
            >
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/[0.04] text-ink/50 shrink-0">
                {badge}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {onToggleHidden && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleHidden();
              }}
              className="p-1 rounded text-ink/30 hover:text-ink/70 hover:bg-black/5 transition"
              title={isHidden ? 'Show section' : 'Hide section from resume'}
            >
              {isHidden ? (
                <EyeOff className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.75} />
              ) : (
                <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => !isHidden && setIsOpen(!isOpen)}
            disabled={isHidden}
            className="p-1 rounded text-ink/30 hover:text-ink/70 hover:bg-black/5 transition"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen && !isHidden ? 'rotate-180' : ''
              }`}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </div>

      {isOpen && !isHidden && (
        <div className="px-4 pb-4 pt-1 border-t border-black/[0.04] animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
