import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-md', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl'
  className?: string;
  bodyClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerRight,
  footer,
  children,
  maxWidth = 'max-w-2xl',
  className = '',
  bodyClassName = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc key closes modal & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Solid bg-card panel */}
      <div
        ref={panelRef}
        style={{ backgroundColor: 'rgb(var(--card))' }}
        className={`relative w-full ${maxWidth} bg-card text-ink border border-line rounded-2xl shadow-paper flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 z-50 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Fixed) */}
        {(title || icon) && (
          <div
            style={{ backgroundColor: 'rgb(var(--card))' }}
            className="px-5 py-4 bg-card border-b border-line flex items-center justify-between shrink-0 select-none"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {icon && (
                <div className="p-2 rounded-xl bg-brand-50 text-brand-600 shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-ink truncate">{title}</h2>
                  {headerRight}
                </div>
                {subtitle && (
                  <p className="text-[11px] sm:text-xs text-ink/60 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-muted transition-colors shrink-0"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body (Scrollable) */}
        <div
          style={{ backgroundColor: 'rgb(var(--card))' }}
          className={`overflow-y-auto flex-1 p-5 bg-card ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Footer (Fixed) */}
        {footer && (
          <div
            style={{ backgroundColor: 'rgb(var(--card))' }}
            className="px-5 py-3 border-t border-line bg-card flex items-center justify-end gap-2 shrink-0"
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
