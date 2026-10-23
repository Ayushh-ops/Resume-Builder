import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.slice(-2);
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast viewport: bottom-center stack with gap, max 2, z above content */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none px-4 max-w-sm w-full">
        {toasts.map((toast) => {
          const Icon =
            toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'error'
              ? AlertCircle
              : Info;

          const iconColor =
            toast.type === 'success'
              ? 'text-emerald-600'
              : toast.type === 'error'
              ? 'text-rose-600'
              : 'text-brand-600';

          return (
            <div
              key={toast.id}
              className="pointer-events-auto w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[6px] shadow-menu bg-card text-ink border border-line text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 transition-all shrink-0"
            >
              <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} strokeWidth={1.5} />
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-0.5 hover:bg-muted text-ink/40 hover:text-ink rounded transition-colors -mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
