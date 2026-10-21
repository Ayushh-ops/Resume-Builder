import React from 'react';
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

export const SectionNav: React.FC<SectionNavProps> = ({ onOpenSection, activeSection }) => {
  const handleClick = (id: string) => {
    onOpenSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="sticky top-0 z-20 bg-canvas/90 backdrop-blur-md py-1.5 border-b border-black/[0.04]">
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar px-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              title={item.title}
              className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-soft scale-105'
                  : 'text-ink/50 hover:text-brand-600 hover:bg-brand-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
