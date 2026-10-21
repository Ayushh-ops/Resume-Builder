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
      className={`card transition-colors ${
        isHidden ? 'opacity-60 bg-muted' : ''
      }`}
    >
      <div className="w-full px-3.5 py-3 flex items-center justify-between bg-card hover:bg-muted/30 transition-colors select-none">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {draggable && (
            <div
              className="cursor-grab active:cursor-grabbing text-ink/30 hover:text-ink/60 transition p-0.5 -ml-1"
              title="Drag to reorder section"
            >
              <GripVertical className="w-4 h-4" strokeWidth={1.5} />
            </div>
          )}

          <div
            onClick={() => !isHidden && setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          >
            <span className={`shrink-0 ${isHidden ? 'text-ink/30' : 'text-ink/60'}`}>
              {icon}
            </span>
            <h3
              className={`text-sm font-semibold tracking-tight truncate ${
                isHidden ? 'line-through text-ink/40' : 'text-ink'
              }`}
            >
              {title}
            </h3>
            {badge && (
              <span className="text-[11px] font-normal text-ink/40 shrink-0">
                ({badge})
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
              className="p-1 rounded text-ink/30 hover:text-ink/70 hover:bg-muted transition"
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
            className="p-1 rounded text-ink/30 hover:text-ink/70 hover:bg-muted transition"
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
        <div className="px-4 pb-4 pt-1 border-t border-line bg-card animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
