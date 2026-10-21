import React from 'react';
import { Plus, Trash2, GraduationCap, MapPin } from 'lucide-react';
import type { EducationItem } from '../../types/resume';

interface EducationFormProps {
  education: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}

export const EducationForm: React.FC<EducationFormProps> = ({ education, onChange }) => {
  const handleAdd = () => {
    const newItem: EducationItem = {
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      fieldOfStudy: '',
      location: '',
      startDate: '',
      endDate: '',
      grade: '',
      highlights: [],
    };
    onChange([...education, newItem]);
  };

  const handleRemove = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof EducationItem, value: any) => {
    const updated = [...education];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/60">Add your degrees, colleges, coursework, and academic honors.</p>
        <button
          onClick={handleAdd}
          className="btn-outline text-brand-600"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Education</span>
        </button>
      </div>

      {education.map((item, index) => (
        <div key={item.id || index} className="p-3.5 bg-card border border-line rounded-xl space-y-3 relative group">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-xs font-bold text-ink">
              {item.institution || 'University / Institution'}
            </span>
            <button
              onClick={() => handleRemove(index)}
              className="text-ink/40 hover:text-rose-600 transition-colors p-1"
              title="Delete Education"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Institution / University *</label>
              <div className="relative">
                <GraduationCap className="w-3.5 h-3.5 text-ink/40 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={item.institution}
                  onChange={(e) => handleUpdate(index, 'institution', e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="input pl-8"
                />
              </div>
            </div>

            <div>
              <label className="label">Degree & Major *</label>
              <input
                type="text"
                value={item.degree}
                onChange={(e) => handleUpdate(index, 'degree', e.target.value)}
                placeholder="e.g. Bachelor of Science in Computer Science"
                className="input"
              />
            </div>

            <div>
              <label className="label">Location</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-ink/40 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={item.location}
                  onChange={(e) => handleUpdate(index, 'location', e.target.value)}
                  placeholder="e.g. Stanford, CA"
                  className="input pl-8"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="label">Graduation Year / Dates</label>
                <input
                  type="text"
                  value={item.endDate}
                  onChange={(e) => handleUpdate(index, 'endDate', e.target.value)}
                  placeholder="e.g. May 2024"
                  className="input"
                />
              </div>
              <div className="w-24">
                <label className="label">GPA / Honors</label>
                <input
                  type="text"
                  value={item.grade || ''}
                  onChange={(e) => handleUpdate(index, 'grade', e.target.value)}
                  placeholder="3.85 / 4.0"
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
