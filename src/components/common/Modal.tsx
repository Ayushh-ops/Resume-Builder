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
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Esc key closes modal, locks body scroll & restores focus
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // Auto-focus first focusable control
    const timer = setTimeout(() => {
      if (panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus?.();
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
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm dark:backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Solid bg-card panel */}
      <div
        ref={panelRef}
        style={{ backgroundColor: 'rgb(var(--card))' }}
        className={`relative w-full ${maxWidth} bg-card text-ink border border-line rounded-[10px] shadow-modal flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 z-50 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Fixed) */}
        {(title || icon) && (
          <div
            style={{ backgroundColor: 'rgb(var(--card))' }}
            className="px-5 py-3.5 bg-card border-b border-line flex items-center justify-between shrink-0 select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {icon && (
                <span className="text-ink/60 shrink-0">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-ink truncate">{title}</h2>
                  {headerRight}
                </div>
                {subtitle && (
                  <p className="text-xs text-ink/60 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[6px] text-ink/40 hover:text-ink hover:bg-muted transition shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 cursor-pointer"
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
