import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CustomSection, CustomSectionItem } from '../../types/resume';

interface CustomSectionsFormProps {
  customSections: CustomSection[];
  onChange: (customSections: CustomSection[]) => void;
}

export const CustomSectionsForm: React.FC<CustomSectionsFormProps> = ({
  customSections,
  onChange,
}) => {
  const handleAddSection = () => {
    const newSection: CustomSection = {
      id: `custom-${Date.now()}`,
      title: 'New Section',
      items: [
        {
          id: `item-${Date.now()}-1`,
          title: '',
          bullets: [''],
        },
      ],
    };
    onChange([...customSections, newSection]);
  };

  const handleDeleteSection = (index: number) => {
    const updated = customSections.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateSectionTitle = (index: number, title: string) => {
    const updated = [...customSections];
    updated[index] = { ...updated[index], title };
    onChange(updated);
  };

  const handleAddItem = (sectionIndex: number) => {
    const updated = [...customSections];
    const section = updated[sectionIndex];
    const newItem: CustomSectionItem = {
      id: `item-${Date.now()}-${section.items.length + 1}`,
      title: '',
      bullets: [''],
    };
    updated[sectionIndex] = {
      ...section,
      items: [...section.items, newItem],
    };
    onChange(updated);
  };

  const handleDeleteItem = (sectionIndex: number, itemIndex: number) => {
    const updated = [...customSections];
    const section = updated[sectionIndex];
    updated[sectionIndex] = {
      ...section,
      items: section.items.filter((_, i) => i !== itemIndex),
    };
    onChange(updated);
  };

  const handleUpdateItem = (
    sectionIndex: number,
    itemIndex: number,
    field: keyof CustomSectionItem,
    value: any
  ) => {
    const updated = [...customSections];
    const section = updated[sectionIndex];
    const item = { ...section.items[itemIndex], [field]: value };
    const items = [...section.items];
    items[itemIndex] = item;
    updated[sectionIndex] = { ...section, items };
    onChange(updated);
  };

  const handleUpdateBullet = (
    sectionIndex: number,
    itemIndex: number,
    bulletIndex: number,
    value: string
  ) => {
    const updated = [...customSections];
    const section = updated[sectionIndex];
    const item = section.items[itemIndex];
    const bullets = [...(item.bullets || [])];
    bullets[bulletIndex] = value;
    const items = [...section.items];
    items[itemIndex] = { ...item, bullets };
    updated[sectionIndex] = { ...section, items };
    onChange(updated);
  };

  const handleAddBullet = (sectionIndex: number, itemIndex: number) => {
    const updated = [...customSections];
    const section = updated[sectionIndex];
    const item = section.items[itemIndex];
    const bullets = [...(item.bullets || []), ''];
    const items = [...section.items];
    items[itemIndex] = { ...item, bullets };
    updated[sectionIndex] = { ...section, items };
    onChange(updated);
  };

  const handleDeleteBullet = (sectionIndex: number, itemIndex: number, bulletIndex: number) => {
    const updated = [...customSections];
    const section = updated[sectionIndex];
    const item = section.items[itemIndex];
    const bullets = (item.bullets || []).filter((_, i) => i !== bulletIndex);
    const items = [...section.items];
    items[itemIndex] = { ...item, bullets };
    updated[sectionIndex] = { ...section, items };
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {customSections.map((sec, secIdx) => (
        <div key={sec.id || secIdx} className="p-4 bg-muted/30 border border-line rounded-[6px] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={sec.title}
              onChange={(e) => handleUpdateSectionTitle(secIdx, e.target.value)}
              placeholder="Section Title (e.g. Achievements, Extracurricular)"
              className="text-xs font-bold text-ink bg-transparent border-b border-line hover:border-ink/50 focus:border-brand-600 focus:outline-hidden px-1 py-0.5"
            />
            <button
              type="button"
              onClick={() => handleDeleteSection(secIdx)}
              className="text-ink/40 hover:text-rose-600 p-1 cursor-pointer transition"
              title="Delete Section"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {sec.items.map((item, itemIdx) => (
              <div key={item.id || itemIdx} className="p-3 bg-card border border-line rounded-[6px] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => handleUpdateItem(secIdx, itemIdx, 'title', e.target.value)}
                      placeholder="Title / Organization (optional)"
                      className="text-xs text-ink bg-muted px-2 py-1 rounded-[4px] border border-line focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={item.subtitle || ''}
                      onChange={(e) => handleUpdateItem(secIdx, itemIdx, 'subtitle', e.target.value)}
                      placeholder="Role / Subtitle (optional)"
                      className="text-xs text-ink bg-muted px-2 py-1 rounded-[4px] border border-line focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={item.date || ''}
                      onChange={(e) => handleUpdateItem(secIdx, itemIdx, 'date', e.target.value)}
                      placeholder="Date / Year (optional)"
                      className="text-xs text-ink bg-muted px-2 py-1 rounded-[4px] border border-line focus:outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(secIdx, itemIdx)}
                    className="text-ink/40 hover:text-rose-600 p-1 cursor-pointer"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Bullets */}
                <div className="space-y-1.5 pl-2 border-l border-line">
                  <div className="text-[11px] font-medium text-ink/60">Bullet points</div>
                  {(item.bullets || []).map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <span className="text-ink/40 text-xs">•</span>
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => handleUpdateBullet(secIdx, itemIdx, bIdx, e.target.value)}
                        placeholder="Bullet accomplishment"
                        className="flex-1 text-xs text-ink bg-muted px-2 py-1 rounded-[4px] border border-line focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBullet(secIdx, itemIdx, bIdx)}
                        className="text-ink/40 hover:text-rose-600 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddBullet(secIdx, itemIdx)}
                    className="text-[11px] text-brand-600 hover:underline inline-flex items-center gap-1 cursor-pointer mt-1 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add bullet</span>
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => handleAddItem(secIdx)}
              className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add entry to {sec.title}</span>
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddSection}
        className="btn-outline w-full h-8 text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add custom section</span>
      </button>
    </div>
  );
};
