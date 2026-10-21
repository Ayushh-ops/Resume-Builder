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
      <div className="p-3 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border border-indigo-100 rounded-xl space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
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
              className="text-[11px] px-2 py-0.5 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 font-medium rounded-md border border-indigo-200 transition-colors shadow-2xs flex items-center gap-1"
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
          <div key={category.id || catIndex} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={category.name}
                onChange={(e) => {
                  const updated = [...skills];
                  updated[catIndex].name = e.target.value;
                  onChange(updated);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-500 pb-0.5"
                placeholder="Category Name (e.g. Languages)"
              />
              <button
                onClick={() => handleRemoveCategory(catIndex)}
                className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
              >
                Delete Group
              </button>
            </div>

            {/* Existing Skills Tags */}
            <div className="flex flex-wrap gap-1.5">
              {category.skills.map((skill, skillIndex) => (
                <span
                  key={skillIndex}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded-lg shadow-2xs group"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(catIndex, skillIndex)}
                    className="text-slate-400 hover:text-rose-500 ml-0.5"
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
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleAddSkill(catIndex, newSkillInput[catIndex])}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
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
          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCategory();
            }
          }}
        />
        <button
          onClick={handleAddCategory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Group</span>
        </button>
      </div>
    </div>
  );
};
