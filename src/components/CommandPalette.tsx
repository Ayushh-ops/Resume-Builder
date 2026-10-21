import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Layout,
  User,
  FileText,
  Briefcase,
  Wrench,
  FolderGit2,
  GraduationCap,
  Award,
  Upload,
  Download,
  FolderOpen,
  Code2,
  Palette,
} from 'lucide-react';
import type { TemplateType } from '../types/resume';

interface CommandItem {
  id: string;
  label: string;
  category: 'Templates' | 'Jump to Section' | 'Actions' | 'Samples';
  icon: React.ElementType;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (t: TemplateType) => void;
  onJumpSection: (id: string) => void;
  onOpenUpload: () => void;
  onExportJson: () => void;
  onLoadSample: (key: string) => void;
  onDownloadPdf: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onJumpSection,
  onOpenUpload,
  onExportJson,
  onLoadSample,
  onDownloadPdf,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = useMemo(
    () => [
      // Templates
      {
        id: 'tmpl-modern',
        label: 'Switch to Modern Template',
        category: 'Templates',
        icon: Layout,
        onSelect: () => onSelectTemplate('modern'),
      },
      {
        id: 'tmpl-harvard',
        label: 'Switch to Harvard Classic Template',
        category: 'Templates',
        icon: GraduationCap,
        onSelect: () => onSelectTemplate('harvard'),
      },
      {
        id: 'tmpl-minimalist',
        label: 'Switch to Minimalist Template',
        category: 'Templates',
        icon: FileText,
        onSelect: () => onSelectTemplate('minimalist'),
      },
      {
        id: 'tmpl-creative',
        label: 'Switch to Dual-Column Creative Template',
        category: 'Templates',
        icon: Palette,
        onSelect: () => onSelectTemplate('creative'),
      },

      // Sections
      {
        id: 'sec-personal',
        label: 'Jump to Personal Info',
        category: 'Jump to Section',
        icon: User,
        onSelect: () => onJumpSection('personal'),
      },
      {
        id: 'sec-summary',
        label: 'Jump to Professional Summary',
        category: 'Jump to Section',
        icon: FileText,
        onSelect: () => onJumpSection('summary'),
      },
      {
        id: 'sec-experience',
        label: 'Jump to Work Experience',
        category: 'Jump to Section',
        icon: Briefcase,
        onSelect: () => onJumpSection('experience'),
      },
      {
        id: 'sec-skills',
        label: 'Jump to Skills & Technologies',
        category: 'Jump to Section',
        icon: Wrench,
        onSelect: () => onJumpSection('skills'),
      },
      {
        id: 'sec-projects',
        label: 'Jump to Technical Projects',
        category: 'Jump to Section',
        icon: FolderGit2,
        onSelect: () => onJumpSection('projects'),
      },
      {
        id: 'sec-education',
        label: 'Jump to Education & Degrees',
        category: 'Jump to Section',
        icon: GraduationCap,
        onSelect: () => onJumpSection('education'),
      },
      {
        id: 'sec-certs',
        label: 'Jump to Certifications',
        category: 'Jump to Section',
        icon: Award,
        onSelect: () => onJumpSection('certifications'),
      },

      // Actions
      {
        id: 'act-upload',
        label: 'Upload & Parse Resume (PDF, DOCX, JSON)',
        category: 'Actions',
        icon: Upload,
        onSelect: onOpenUpload,
      },
      {
        id: 'act-download-pdf',
        label: 'Download PDF Resume',
        category: 'Actions',
        icon: Download,
        onSelect: onDownloadPdf,
      },
      {
        id: 'act-export-json',
        label: 'Export Resume JSON Backup',
        category: 'Actions',
        icon: FolderOpen,
        onSelect: onExportJson,
      },

      // Samples
      {
        id: 'sample-ai',
        label: 'Load Sample: AI & Machine Learning Engineer',
        category: 'Samples',
        icon: User,
        onSelect: () => onLoadSample('aiEngineer'),
      },
      {
        id: 'sample-fs',
        label: 'Load Sample: Full-Stack Engineer',
        category: 'Samples',
        icon: Code2,
        onSelect: () => onLoadSample('fullStack'),
      },
      {
        id: 'sample-fresher',
        label: 'Load Sample: Graduate / Fresher',
        category: 'Samples',
        icon: GraduationCap,
        onSelect: () => onLoadSample('fresherStudent'),
      },
    ],
    [
      onSelectTemplate,
      onJumpSection,
      onOpenUpload,
      onDownloadPdf,
      onExportJson,
      onLoadSample,
    ]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].onSelect();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/40 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] card shadow-modal border border-line bg-card flex flex-col max-h-[400px] overflow-hidden rounded-[10px] animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 border-b border-line bg-card">
          <Search className="w-4 h-4 text-ink/40 shrink-0" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to section..."
            className="w-full text-xs text-ink placeholder:text-ink/40 bg-transparent focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-ink/40 bg-muted px-1.5 py-0.5 rounded-[4px] border border-line shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-1.5 space-y-0.5 divide-y divide-transparent">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink/40">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-50 text-brand-600 font-semibold'
                      : 'text-ink/75 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-brand-600' : 'text-ink/40'}`} strokeWidth={1.75} />
                    <span className="truncate">{cmd.label}</span>
                  </div>
                  <span className="text-[10px] text-ink/30 shrink-0 ml-2 uppercase tracking-wider font-medium">
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-3 py-1.5 bg-muted/60 border-t border-line flex items-center justify-between text-[10px] text-ink/40">
          <div className="flex items-center gap-2">
            <span>Use ↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Ctrl + K</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
