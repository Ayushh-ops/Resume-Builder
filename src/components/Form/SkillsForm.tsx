import React, { useState } from 'react';
import { Plus, X, Sparkles, Tag } from 'lucide-react';
import type { SkillCategory } from '../../types/resume';

interface SkillsFormProps {
  skills: SkillCategory[];
  onChange: (skills: SkillCategory[]) => void;
}

const TRENDING_AI_TECH = [
  'Gemini 3.8 API',
  'PyTorch',
  'TypeScript',
  'React 19',
  'RAG Architectures',
  'Docker',
  'Kubernetes',
  'PostgreSQL',
  'FastAPI',
  'GraphQL',
  'MLOps',
  'Vector DBs (Qdrant)',
];

export const SkillsForm: React.FC<SkillsFormProps> = ({ skills, onChange }) => {
  const [newSkillInput, setNewSkillInput] = useState<{ [catIndex: number]: string }>({});
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: SkillCategory = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      skills: [],
    };
    onChange([...skills, newCat]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (catIndex: number) => {
    onChange(skills.filter((_, i) => i !== catIndex));
  };

  const handleAddSkill = (catIndex: number, skillName: string) => {
    const clean = skillName.trim();
    if (!clean) return;
    const updated = [...skills];
    if (!updated[catIndex].skills.includes(clean)) {
      updated[catIndex].skills.push(clean);
      onChange(updated);
    }
    setNewSkillInput({ ...newSkillInput, [catIndex]: '' });
  };

  const handleRemoveSkill = (catIndex: number, skillIndex: number) => {
    const updated = [...skills];
    updated[catIndex].skills = updated[catIndex].skills.filter((_, i) => i !== skillIndex);
    onChange(updated);
  };

  return (
    <div className="space-y-5">
      {/* 2026 In-Demand Quick Add Chips */}
      <div className="p-3 bg-brand-50 border border-brand-500/20 rounded-xl space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Top Trending 2026 Tech (Click to Add):</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {TRENDING_AI_TECH.map((tech) => (
            <button
              key={tech}
              onClick={() => {
                if (skills.length > 0) {
                  handleAddSkill(0, tech);
                }
              }}
              className="text-[11px] px-2 py-0.5 bg-card hover:bg-brand-600 hover:text-white text-brand-600 font-medium rounded-md border border-line transition-colors shadow-2xs flex items-center gap-1"
            >
              <Plus className="w-2.5 h-2.5" />
              {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Categories */}
      <div className="space-y-3.5">
        {skills.map((category, catIndex) => (
          <div key={category.id || catIndex} className="p-3.5 bg-card border border-line rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={category.name}
                onChange={(e) => {
                  const updated = [...skills];
                  updated[catIndex].name = e.target.value;
                  onChange(updated);
                }}
                className="text-xs font-bold text-ink bg-transparent border-b border-dashed border-line focus:outline-none focus:border-brand-500 pb-0.5"
                placeholder="Category Name (e.g. Languages)"
              />
              <button
                onClick={() => handleRemoveCategory(catIndex)}
                className="text-[11px] text-ink/40 hover:text-rose-600 transition-colors"
              >
                Delete Group
              </button>
            </div>

            {/* Existing Skills Tags */}
            <div className="flex flex-wrap gap-1.5">
              {category.skills.map((skill, skillIndex) => (
                <span
                  key={skillIndex}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-muted text-ink border border-line rounded-lg shadow-2xs group"
                >
                  <Tag className="w-2.5 h-2.5 text-ink/40" />
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(catIndex, skillIndex)}
                    className="text-ink/40 hover:text-rose-500 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Input to add skill */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newSkillInput[catIndex] || ''}
                onChange={(e) => setNewSkillInput({ ...newSkillInput, [catIndex]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(catIndex, newSkillInput[catIndex]);
                  }
                }}
                placeholder="Type a skill and press Enter (or comma)..."
                className="flex-1 input text-xs py-1.5"
              />
              <button
                onClick={() => handleAddSkill(catIndex, newSkillInput[catIndex])}
                className="btn-primary py-1.5 px-3 text-xs"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Category Input */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New Category (e.g. 'Cloud & DevOps' or 'AI & MLOps')"
          className="flex-1 input text-xs py-1.5"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCategory();
            }
          }}
        />
        <button
          onClick={handleAddCategory}
          className="btn-outline text-brand-600 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Group</span>
        </button>
      </div>
    </div>
  );
};
