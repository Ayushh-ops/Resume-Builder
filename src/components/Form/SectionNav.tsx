import React, { useState, useEffect } from 'react';
import {
  User,
  FileText,
  Briefcase,
  Wrench,
  FolderGit2,
  GraduationCap,
  Award,
} from 'lucide-react';

interface SectionNavProps {
  onOpenSection: (id: string) => void;
  activeSection?: string;
}

const NAV_ITEMS = [
  { id: 'personal', title: 'Personal Info', icon: User },
  { id: 'summary', title: 'Summary', icon: FileText },
  { id: 'experience', title: 'Experience', icon: Briefcase },
  { id: 'skills', title: 'Skills', icon: Wrench },
  { id: 'projects', title: 'Projects', icon: FolderGit2 },
  { id: 'education', title: 'Education', icon: GraduationCap },
  { id: 'certifications', title: 'Certifications', icon: Award },
];

export const SectionNav: React.FC<SectionNavProps> = ({ onOpenSection, activeSection: propActive }) => {
  const [activeId, setActiveId] = useState<string>(propActive || 'personal');

  // Track active section with IntersectionObserver
  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.id);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0.1,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleClick = (id: string) => {
    setActiveId(id);
    onOpenSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentActive = propActive || activeId;

  return (
    <div className="sticky top-0 z-20 bg-canvas py-1.5 border-b border-line transition-colors">
      <div className="flex items-center justify-between gap-1 px-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentActive === item.id;
          return (
            <div key={item.id} className="relative group">
              <button
                type="button"
                onClick={() => handleClick(item.id)}
                className={`p-1.5 rounded-[6px] transition-colors flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'text-brand-600 bg-card border border-line'
                    : 'text-ink/60 hover:text-ink hover:bg-muted'
                }`}
                title={item.title}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </button>

              {/* Tooltip on hover */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-[4px] bg-card text-ink border border-line text-[11px] font-medium whitespace-nowrap shadow-menu pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-100 z-30">
                {item.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
