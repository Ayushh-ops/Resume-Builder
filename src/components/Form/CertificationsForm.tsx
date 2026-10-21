import React from 'react';
import { Plus, Trash2, Award } from 'lucide-react';
import type { CertificationItem } from '../../types/resume';

interface CertificationsFormProps {
  certifications: CertificationItem[];
  onChange: (certs: CertificationItem[]) => void;
}

export const CertificationsForm: React.FC<CertificationsFormProps> = ({
  certifications,
  onChange,
}) => {
  const handleAdd = () => {
    const newItem: CertificationItem = {
      id: `cert-${Date.now()}`,
      name: '',
      issuer: '',
      date: '',
      credentialId: '',
    };
    onChange([...certifications, newItem]);
  };

  const handleRemove = (index: number) => {
    onChange(certifications.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof CertificationItem, value: any) => {
    const updated = [...certifications];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Add credentials, cloud badges, and professional licenses.</p>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Certification</span>
        </button>
      </div>

      {certifications.map((item, index) => (
        <div key={item.id || index} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-800">
              {item.name || 'Untitled Certification'}
            </span>
            <button
              onClick={() => handleRemove(index)}
              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
              title="Delete Certification"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Certification Name *</label>
              <div className="relative">
                <Award className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder="e.g. AWS Certified Solutions Architect"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Issuing Authority *</label>
              <input
                type="text"
                value={item.issuer}
                onChange={(e) => handleUpdate(index, 'issuer', e.target.value)}
                placeholder="e.g. Google Cloud, Amazon Web Services, Coursera"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Issue Date</label>
              <input
                type="text"
                value={item.date}
                onChange={(e) => handleUpdate(index, 'date', e.target.value)}
                placeholder="e.g. Nov 2024"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Credential ID / Verification URL</label>
              <input
                type="text"
                value={item.credentialId || ''}
                onChange={(e) => handleUpdate(index, 'credentialId', e.target.value)}
                placeholder="e.g. GCP-ML-849201"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
