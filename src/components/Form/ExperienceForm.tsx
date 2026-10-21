import React, { useState } from 'react';
import { Plus, Trash2, Sparkles, Building2, MapPin, Check, RefreshCw } from 'lucide-react';
import type { ExperienceItem } from '../../types/resume';
import { enhanceBulletPoint } from '../../services/geminiService';

interface ExperienceFormProps {
  experience: ExperienceItem[];
  onChange: (items: ExperienceItem[]) => void;
}

export const ExperienceForm: React.FC<ExperienceFormProps> = ({ experience, onChange }) => {
  const [activeEnhancing, setActiveEnhancing] = useState<{
    itemIndex: number;
    bulletIndex: number;
  } | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<{
    enhanced: string[];
    explanation: string;
  } | null>(null);

  const handleAddExperience = () => {
    const newItem: ExperienceItem = {
      id: `exp-${Date.now()}`,
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      highlights: [''],
    };
    onChange([newItem, ...experience]);
  };

  const handleRemoveExperience = (index: number) => {
    const updated = experience.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateItem = (index: number, field: keyof ExperienceItem, value: any) => {
    const updated = [...experience];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleAddBullet = (expIndex: number) => {
    const updated = [...experience];
    updated[expIndex].highlights.push('');
    onChange(updated);
  };

  const handleUpdateBullet = (expIndex: number, bulletIndex: number, text: string) => {
    const updated = [...experience];
    updated[expIndex].highlights[bulletIndex] = text;
    onChange(updated);
  };

  const handleRemoveBullet = (expIndex: number, bulletIndex: number) => {
    const updated = [...experience];
    updated[expIndex].highlights = updated[expIndex].highlights.filter((_, i) => i !== bulletIndex);
    onChange(updated);
  };

  const handleEnhanceBullet = async (expIndex: number, bulletIndex: number) => {
    const originalText = experience[expIndex].highlights[bulletIndex];
    if (!originalText || originalText.trim().length < 5) return;

    setActiveEnhancing({ itemIndex: expIndex, bulletIndex });
    setIsEnhancing(true);
    setEnhancedResult(null);

    try {
      const result = await enhanceBulletPoint(originalText, experience[expIndex].position);
      setEnhancedResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyBulletReplacement = (text: string) => {
    if (activeEnhancing) {
      handleUpdateBullet(activeEnhancing.itemIndex, activeEnhancing.bulletIndex, text);
      setActiveEnhancing(null);
      setEnhancedResult(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          List your professional career accomplishments using action verbs and quantified impact.
        </p>
        <button
          onClick={handleAddExperience}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Position</span>
        </button>
      </div>

      {experience.map((item, expIndex) => (
        <div
          key={item.id || expIndex}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 relative group hover:border-slate-300 transition-all"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-800">
              {item.position || 'Untitled Position'} {item.company ? `@ ${item.company}` : ''}
            </span>
            <button
              onClick={() => handleRemoveExperience(expIndex)}
              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
              title="Delete Position"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Company / Organization *</label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={item.company || ''}
                  onChange={(e) => handleUpdateItem(expIndex, 'company', e.target.value)}
                  placeholder="e.g. Google, Stripe, NeuralFlow"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Position / Job Title *</label>
              <input
                type="text"
                value={item.position || ''}
                onChange={(e) => handleUpdateItem(expIndex, 'position', e.target.value)}
                placeholder="e.g. Senior Machine Learning Engineer"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Location</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={item.location || ''}
                  onChange={(e) => handleUpdateItem(expIndex, 'location', e.target.value)}
                  placeholder="e.g. San Francisco, CA / Remote"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="text"
                  value={item.startDate || ''}
                  onChange={(e) => handleUpdateItem(expIndex, 'startDate', e.target.value)}
                  placeholder="e.g. 2022-03 or Mar 2022"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="text"
                  disabled={item.current}
                  value={item.current ? 'Present' : item.endDate || ''}
                  onChange={(e) => handleUpdateItem(expIndex, 'endDate', e.target.value)}
                  placeholder="e.g. Present"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`curr-${item.id}`}
              checked={item.current || false}
              onChange={(e) => handleUpdateItem(expIndex, 'current', e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <label htmlFor={`curr-${item.id}`} className="text-xs text-slate-600 cursor-pointer">
              I currently work here
            </label>
          </div>

          {/* Bullet Points */}
          <div className="space-y-2 pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Key Accomplishments & Bullet Points
              </label>
              <button
                onClick={() => handleAddBullet(expIndex)}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Bullet
              </button>
            </div>

            {item.highlights.map((bullet, bulletIndex) => (
              <div key={bulletIndex} className="space-y-2">
                <div className="flex items-start gap-2 group">
                  <span className="text-slate-400 mt-2 text-xs">•</span>
                  <textarea
                    ref={(el) => { if (el) { el.style.height='auto'; el.style.height=el.scrollHeight+'px'; } }}
                    onInput={(e) => { const t=e.currentTarget; t.style.height='auto'; t.style.height=t.scrollHeight+'px'; }}
                    value={bullet}
                    onChange={(e) => handleUpdateBullet(expIndex, bulletIndex, e.target.value)}
                    rows={2}
                    placeholder="e.g. Spearheaded microservice migration reducing p95 latency by 45%..."
                    className="flex-1 p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-none overflow-hidden"
                  />
                  <div className="flex flex-col gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleEnhanceBullet(expIndex, bulletIndex)}
                      disabled={isEnhancing || !bullet || bullet.trim().length < 5}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-indigo-100 disabled:opacity-30"
                      title="AI Bullet Enhancer (STAR + Metrics)"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveBullet(expIndex, bulletIndex)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Remove Bullet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* AI Suggestions Dropdown / Drawer for this specific bullet */}
                {activeEnhancing?.itemIndex === expIndex &&
                  activeEnhancing?.bulletIndex === bulletIndex &&
                  (isEnhancing ? (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2 text-xs text-indigo-700 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini AI is analyzing metrics and action verbs...</span>
                    </div>
                  ) : enhancedResult ? (
                    <div className="p-3.5 bg-gradient-to-br from-indigo-50/90 to-purple-50/90 border border-indigo-200 rounded-xl space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          AI Enhanced Alternatives:
                        </span>
                        <button
                          onClick={() => {
                            setActiveEnhancing(null);
                            setEnhancedResult(null);
                          }}
                          className="text-slate-400 hover:text-slate-600 text-[11px]"
                        >
                          ✕ Close
                        </button>
                      </div>
                      <p className="text-[11px] text-indigo-700 italic">{enhancedResult.explanation}</p>
                      <div className="space-y-1.5">
                        {enhancedResult.enhanced.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className="p-2 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-lg cursor-pointer transition-all flex items-start justify-between gap-2 group/opt"
                            onClick={() => applyBulletReplacement(opt)}
                          >
                            <span className="text-xs text-slate-700 leading-relaxed">• {opt}</span>
                            <span className="opacity-0 group-hover/opt:opacity-100 flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded transition-opacity shrink-0">
                              <Check className="w-3 h-3" /> Select
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
