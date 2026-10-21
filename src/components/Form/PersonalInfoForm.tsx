import React from 'react';
import { User, Mail, Phone, MapPin, Globe, Briefcase } from 'lucide-react';
import { LinkedinIcon, GithubIcon } from '../common/Icons';
import type { PersonalInfo } from '../../types/resume';

interface PersonalInfoFormProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ data, onChange }) => {
  const handleChange = (field: keyof PersonalInfo, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5">
        <div>
          <label className="label">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.fullName || ''}
              title={data.fullName || ''}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="input pl-9 truncate"
            />
          </div>
        </div>

        <div>
          <label className="label">
            Target Job Title <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.jobTitle || ''}
              title={data.jobTitle || ''}
              onChange={(e) => handleChange('jobTitle', e.target.value)}
              placeholder="e.g. Senior Machine Learning Engineer"
              className="input pl-9 truncate"
            />
          </div>
        </div>

        <div>
          <label className="label">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              value={data.email || ''}
              title={data.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="e.g. alex.morgan@example.com"
              className="input pl-9 truncate"
            />
          </div>
        </div>

        <div>
          <label className="label">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="tel"
              value={data.phone || ''}
              title={data.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
              className="input pl-9 truncate"
            />
          </div>
        </div>

        <div>
          <label className="label">
            Location (City, State / Remote)
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.location || ''}
              title={data.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g. San Francisco, CA (or Remote)"
              className="input pl-9 truncate"
            />
          </div>
        </div>

        <div>
          <label className="label">
            Portfolio / Personal Website
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="url"
              value={data.website || ''}
              title={data.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="e.g. https://alexmorgan.dev"
              className="input pl-9 truncate"
            />
          </div>
        </div>

        <div>
          <label className="label">
            LinkedIn Profile
          </label>
          <div className="relative">
            <LinkedinIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.linkedin || ''}
              title={data.linkedin || ''}
              onChange={(e) => handleChange('linkedin', e.target.value)}
              placeholder="e.g. linkedin.com/in/alex-morgan"
              className="input pl-9 truncate"
            />
          </div>
        </div>

        <div>
          <label className="label">
            GitHub / Code Repository
          </label>
          <div className="relative">
            <GithubIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={data.github || ''}
              title={data.github || ''}
              onChange={(e) => handleChange('github', e.target.value)}
              placeholder="e.g. github.com/alexmorgan"
              className="input pl-9 truncate"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
