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
        <p className="text-xs text-ink/60">Add credentials, cloud badges, and professional licenses.</p>
        <button
          onClick={handleAdd}
          className="btn-outline text-brand-600"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Certification</span>
        </button>
      </div>

      {certifications.map((item, index) => (
        <div key={item.id || index} className="p-3.5 bg-card border border-line rounded-xl space-y-3 relative group">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-xs font-bold text-ink">
              {item.name || 'Untitled Certification'}
            </span>
            <button
              onClick={() => handleRemove(index)}
              className="text-ink/40 hover:text-rose-600 transition-colors p-1"
              title="Delete Certification"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Certification Name *</label>
              <div className="relative">
                <Award className="w-3.5 h-3.5 text-ink/40 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder="e.g. AWS Certified Solutions Architect"
                  className="input pl-8"
                />
              </div>
            </div>

            <div>
              <label className="label">Issuing Authority *</label>
              <input
                type="text"
                value={item.issuer}
                onChange={(e) => handleUpdate(index, 'issuer', e.target.value)}
                placeholder="e.g. Google Cloud, Amazon Web Services, Coursera"
                className="input"
              />
            </div>

            <div>
              <label className="label">Issue Date</label>
              <input
                type="text"
                value={item.date}
                onChange={(e) => handleUpdate(index, 'date', e.target.value)}
                placeholder="e.g. Nov 2024"
                className="input"
              />
            </div>

            <div>
              <label className="label">Credential ID / Verification URL</label>
              <input
                type="text"
                value={item.credentialId || ''}
                onChange={(e) => handleUpdate(index, 'credentialId', e.target.value)}
                placeholder="e.g. GCP-ML-849201"
                className="input"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
