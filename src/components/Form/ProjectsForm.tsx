import React from 'react';
import { Plus, Trash2, FolderGit2, Globe } from 'lucide-react';
import { GithubIcon } from '../common/Icons';
import type { ProjectItem } from '../../types/resume';

interface ProjectsFormProps {
  projects: ProjectItem[];
  onChange: (projects: ProjectItem[]) => void;
}

export const ProjectsForm: React.FC<ProjectsFormProps> = ({ projects, onChange }) => {
  const handleAdd = () => {
    const newItem: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: '',
      description: '',
      technologies: [],
      link: '',
      githubLink: '',
      highlights: [''],
    };
    onChange([...projects, newItem]);
  };

  const handleRemove = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof ProjectItem, value: any) => {
    const updated = [...projects];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleAddBullet = (projIndex: number) => {
    const updated = [...projects];
    updated[projIndex].highlights.push('');
    onChange(updated);
  };

  const handleUpdateBullet = (projIndex: number, bulletIndex: number, val: string) => {
    const updated = [...projects];
    updated[projIndex].highlights[bulletIndex] = val;
    onChange(updated);
  };

  const handleRemoveBullet = (projIndex: number, bulletIndex: number) => {
    const updated = [...projects];
    updated[projIndex].highlights = updated[projIndex].highlights.filter((_, i) => i !== bulletIndex);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/60">Showcase your notable open-source, client, or personal technical projects.</p>
        <button
          onClick={handleAdd}
          className="btn-outline text-brand-600"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Project</span>
        </button>
      </div>

      {projects.map((proj, index) => (
        <div key={proj.id || index} className="p-3.5 bg-card border border-line rounded-xl space-y-3 relative group">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-xs font-bold text-ink">
              {proj.name || 'Untitled Project'}
            </span>
            <button
              onClick={() => handleRemove(index)}
              className="text-ink/40 hover:text-rose-600 transition-colors p-1"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Project Name *</label>
              <div className="relative">
                <FolderGit2 className="w-3.5 h-3.5 text-ink/40 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={proj.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder="e.g. OmniAgent Studio"
                  className="input pl-8"
                />
              </div>
            </div>

            <div>
              <label className="label">
                Technologies (comma-separated)
              </label>
              <input
                type="text"
                value={proj.technologies?.join(', ') || ''}
                onChange={(e) =>
                  handleUpdate(
                    index,
                    'technologies',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="Python, Gemini API, React, Docker"
                className="input"
              />
            </div>

            <div>
              <label className="label">Live Demo / Product URL</label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 text-ink/40 absolute left-2.5 top-2.5" />
                <input
                  type="url"
                  value={proj.link || ''}
                  onChange={(e) => handleUpdate(index, 'link', e.target.value)}
                  placeholder="https://myproject.demo"
                  className="input pl-8"
                />
              </div>
            </div>

            <div>
              <label className="label">GitHub / Repository URL</label>
              <div className="relative">
                <GithubIcon className="w-3.5 h-3.5 text-ink/40 absolute left-2.5 top-2.5" />
                <input
                  type="url"
                  value={proj.githubLink || ''}
                  onChange={(e) => handleUpdate(index, 'githubLink', e.target.value)}
                  placeholder="https://github.com/user/project"
                  className="input pl-8"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Overview Description</label>
            <input
              type="text"
              value={proj.description}
              onChange={(e) => handleUpdate(index, 'description', e.target.value)}
              placeholder="Autonomous multi-agent system built with Gemini 3.8 and LangGraph..."
              className="input"
            />
          </div>

          {/* Project Highlights / Bullets */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink/70">Impact Highlights:</span>
              <button
                onClick={() => handleAddBullet(index)}
                className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" /> Add Highlight
              </button>
            </div>
            {proj.highlights?.map((bullet, bulletIdx) => (
              <div key={bulletIdx} className="flex items-center gap-2">
                <span className="text-ink/40 text-sm leading-normal select-none">•</span>
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => handleUpdateBullet(index, bulletIdx, e.target.value)}
                  placeholder="e.g. Attracted 2,400+ stars on GitHub and featured in Hacker News..."
                  className="flex-1 input text-sm leading-normal"
                />
                <button
                  onClick={() => handleRemoveBullet(index, bulletIdx)}
                  className="text-ink/40 hover:text-rose-500 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
