import React from 'react';
import {
  Radar,
  ExternalLink,
  Clock,
  Sparkles,
  Zap,
  Building,
  MapPin,
  DollarSign,
  Briefcase,
  Search,
  Rocket,
} from 'lucide-react';
import { LinkedinIcon } from '../common/Icons';
import { Modal } from '../common/Modal';
import type { ResumeData } from '../../types/resume';
import {
  generateEarlyJobSearchLinks,
  generateTargetedJobListings,
} from '../../services/jobRadarService';

interface JobRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
}

export const JobRadarModal: React.FC<JobRadarModalProps> = ({ isOpen, onClose, resumeData }) => {
  if (!isOpen) return null;

  const earlyLinks = generateEarlyJobSearchLinks(resumeData);
  const targetedJobs = generateTargetedJobListings(resumeData);

  const getPlatformIcon = (iconName: string) => {
    switch (iconName) {
      case 'Linkedin':
        return <LinkedinIcon className="w-4 h-4 text-blue-600" />;
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-brand-600" />;
      case 'Rocket':
        return <Rocket className="w-4 h-4 text-rose-500" />;
      default:
        return <Search className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Job Search Feeds"
      subtitle={`Targeting: ${resumeData.personalInfo.jobTitle || 'Software Engineer'} • ${resumeData.personalInfo.location || 'Remote'}`}
      icon={<Radar className="w-4 h-4 text-ink/70" strokeWidth={1.5} />}
      maxWidth="max-w-3xl"
      footer={
        <div className="w-full flex justify-end items-center text-xs">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline h-8 px-3.5"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Why Early Applicants Win Banner */}
        <div className="p-3.5 bg-brand-50 border border-brand-500/20 rounded-xl flex items-start gap-3 text-xs text-brand-700 dark:text-brand-300">
          <Zap className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">The 24-Hour Recruiter Window</p>
            <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
              Candidates applying within the first <strong>24 hours</strong> of a job posting have a <strong>4.2x higher interview rate</strong> compared to applicants arriving after 48 hours. These direct links are pre-configured with 24-hour timestamp filters.
            </p>
          </div>
        </div>

        {/* Quick-Launch 24-Hour Search Portals */}
        <div>
          <h3 className="text-[12.5px] font-medium text-ink/60 mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>Launch live earliest-postings queries</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {earlyLinks.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 bg-card hover:bg-muted border border-line rounded-xl transition-all group block shadow-soft"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(item.iconName)}
                    <span className="text-xs font-bold text-ink group-hover:text-brand-600">
                      {item.platform}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-500/20">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-ink/60 leading-normal mb-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-1 text-[11px] font-bold text-brand-600 group-hover:underline">
                  <span>Open Live 24h Filter</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Targeted Opportunities Match Graph */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12.5px] font-medium text-ink/60 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Recommended fresh roles for your resume profile</span>
            </h3>
            <span className="text-[11px] text-ink/50">Based on your skill & title overlap</span>
          </div>

          <div className="space-y-3">
            {targetedJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 bg-card border border-line rounded-xl hover:shadow-paper transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-ink">{job.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                        {job.matchScore}% Match
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-ink/60 mt-1">
                      <span className="flex items-center gap-1 font-medium text-ink">
                        <Building className="w-3 h-3 text-ink/40" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-ink/40" />
                        {job.location}
                      </span>
                      {job.salaryEstimate && (
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <DollarSign className="w-3 h-3" />
                          {job.salaryEstimate}
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={job.directSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shrink-0 shadow-sm"
                  >
                    <span>Find on {job.platform}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line text-[11px]">
                  <div className="flex flex-wrap gap-1">
                    {job.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 bg-muted text-ink/80 rounded-md font-medium text-[10px] border border-line"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-ink/40 font-medium">{job.postedTiming}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
