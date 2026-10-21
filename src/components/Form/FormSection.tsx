import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FormSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card transition-shadow hover:shadow-paper/50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-black/[0.015] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-ink tracking-tight">{title}</h3>
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/[0.04] text-ink/50">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-ink/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-black/[0.04] animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
