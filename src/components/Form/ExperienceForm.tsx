import React, { useState } from 'react';
import { Plus, Trash2, Wand2, Building2, MapPin, Check, RefreshCw } from 'lucide-react';
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
        <p className="text-xs text-ink/60">
          List your professional career accomplishments using action verbs and quantified impact.
        </p>
        <button
          onClick={handleAddExperience}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-50/80 border border-brand-500/30 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Position</span>
        </button>
      </div>

      {experience.map((item, expIndex) => (
        <div
          key={item.id || expIndex}
          className="p-4 bg-card border border-line rounded-xl space-y-3.5 relative group hover:border-brand-500/30 transition-all"
        >
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-xs font-bold text-ink">
              {item.position || 'Untitled Position'} {item.company ? `@ ${item.company}` : ''}
            </span>
            <button
              onClick={() => handleRemoveExperience(expIndex)}
              className="text-ink/40 hover:text-rose-600 transition-colors p-1"
              title="Delete Position"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Company / Organization *</label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-ink/40 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={item.company || ''}
                  onChange={(e) => handleUpdateItem(expIndex, 'company', e.target.value)}
                  placeholder="e.g. Google, Stripe, NeuralFlow"
                  className="input pl-8"
                />
              </div>
            </div>

            <div>
              <label className="label">Position / Job Title *</label>
              <input
                type="text"
                value={item.position || ''}
                onChange={(e) => handleUpdateItem(expIndex, 'position', e.target.value)}
                placeholder="e.g. Senior Machine Learning Engineer"
                className="input"
              />
            </div>

            <div>
              <label className="label">Location</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-ink/40 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={item.location || ''}
                  onChange={(e) => handleUpdateItem(expIndex, 'location', e.target.value)}
                  placeholder="e.g. San Francisco, CA / Remote"
                  className="input pl-8"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="label">Start Date</label>
                <input
                  type="text"
                  value={item.startDate || ''}
                  onChange={(e) => handleUpdateItem(expIndex, 'startDate', e.target.value)}
                  placeholder="e.g. 2022-03 or Mar 2022"
                  className="input"
                />
              </div>
              <div className="flex-1">
                <label className="label">End Date</label>
                <input
                  type="text"
                  disabled={item.current}
                  value={item.current ? 'Present' : item.endDate || ''}
                  onChange={(e) => handleUpdateItem(expIndex, 'endDate', e.target.value)}
                  placeholder="e.g. Present"
                  className="input disabled:opacity-50"
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
              className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
            />
            <label htmlFor={`curr-${item.id}`} className="text-xs text-ink/70 cursor-pointer">
              I currently work here
            </label>
          </div>

          {/* Bullet Points */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Key Accomplishments & Bullet Points
              </label>
              <button
                onClick={() => handleAddBullet(expIndex)}
                className="text-[11px] font-medium text-brand-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Bullet
              </button>
            </div>

            {item.highlights.map((bullet, bulletIndex) => (
              <div key={bulletIndex} className="space-y-2">
                <div className="flex items-start gap-2 group">
                  <span className="text-ink/40 mt-2 text-xs">•</span>
                  <textarea
                    id={`exp-${expIndex}-bullet-${bulletIndex}`}
                    ref={(el) => { if (el) { el.style.height='auto'; el.style.height=el.scrollHeight+'px'; } }}
                    onInput={(e) => { const t=e.currentTarget; t.style.height='auto'; t.style.height=t.scrollHeight+'px'; }}
                    value={bullet}
                    onChange={(e) => handleUpdateBullet(expIndex, bulletIndex, e.target.value)}
                    rows={2}
                    placeholder="e.g. Spearheaded microservice migration reducing p95 latency by 45%..."
                    className="flex-1 input leading-relaxed resize-none overflow-hidden"
                  />
                  <div className="flex flex-col gap-1 mt-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleEnhanceBullet(expIndex, bulletIndex)}
                      disabled={isEnhancing || !bullet || bullet.trim().length < 5}
                      className="p-1 text-ink/60 hover:text-ink hover:bg-muted rounded-[4px] border border-line transition-colors disabled:opacity-30"
                      title="Improve bullet point"
                    >
                      <Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleRemoveBullet(expIndex, bulletIndex)}
                      className="p-1 text-ink/40 hover:text-rose-600 hover:bg-muted rounded-[4px] transition-colors"
                      title="Remove bullet"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* AI Suggestions Dropdown / Drawer for this specific bullet */}
                {activeEnhancing?.itemIndex === expIndex &&
                  activeEnhancing?.bulletIndex === bulletIndex &&
                  (isEnhancing ? (
                    <div className="p-3 bg-brand-50 border border-brand-500/20 rounded-lg flex items-center gap-2 text-xs text-brand-600 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini AI is analyzing metrics and action verbs...</span>
                    </div>
                  ) : enhancedResult ? (
                    <div className="p-3.5 bg-brand-50 border border-brand-500/20 rounded-xl space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-bold text-brand-700 dark:text-brand-300">
                        <span className="flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-brand-600" />
                          AI Enhanced Alternatives:
                        </span>
                        <button
                          onClick={() => {
                            setActiveEnhancing(null);
                            setEnhancedResult(null);
                          }}
                          className="text-ink/40 hover:text-ink text-[11px]"
                        >
                          ✕ Close
                        </button>
                      </div>
                      <p className="text-[11px] text-brand-700 dark:text-brand-300 italic">{enhancedResult.explanation}</p>
                      <div className="space-y-1.5">
                        {enhancedResult.enhanced.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className="p-2 bg-card hover:bg-muted border border-line rounded-lg cursor-pointer transition-all flex items-start justify-between gap-2 group/opt text-ink"
                            onClick={() => applyBulletReplacement(opt)}
                          >
                            <span className="text-xs text-ink leading-relaxed">• {opt}</span>
                            <span className="opacity-0 group-hover/opt:opacity-100 flex items-center gap-1 text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded transition-opacity shrink-0">
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
