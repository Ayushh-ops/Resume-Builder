import React, { useEffect } from 'react';
import {
  Radar,
  ExternalLink,
  Clock,
  Sparkles,
  Zap,
  Building,
  MapPin,
  DollarSign,
  X,
  Briefcase,
  Search,
  Rocket,
} from 'lucide-react';
import { LinkedinIcon } from '../common/Icons';
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
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const earlyLinks = generateEarlyJobSearchLinks(resumeData);
  const targetedJobs = generateTargetedJobListings(resumeData);

  const getPlatformIcon = (iconName: string) => {
    switch (iconName) {
      case 'Linkedin':
        return <LinkedinIcon className="w-4 h-4 text-blue-600" />;
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case 'Rocket':
        return <Rocket className="w-4 h-4 text-rose-500" />;
      default:
        return <Search className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Early Job Radar & Applicant Advantage</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Past 24h Feed
                </span>
              </div>
              <p className="text-xs text-ink/50">
                Targeting: <span className="font-semibold text-ink">{resumeData.personalInfo.jobTitle || 'Software Engineer'}</span> • {resumeData.personalInfo.location || 'Remote'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[85vh] space-y-6">
          {/* Why Early Applicants Win Banner */}
          <div className="p-3.5 bg-purple-50/80 border border-purple-200/80 rounded-xl flex items-start gap-3 text-xs text-purple-900">
            <Zap className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">The 24-Hour Recruiter Window</p>
              <p className="text-purple-800 text-[11px] mt-0.5 leading-relaxed">
                Candidates applying within the first <strong>24 hours</strong> of a job posting have a <strong>4.2x higher interview rate</strong> compared to applicants arriving after 48 hours. These direct links are pre-configured with 24-hour timestamp filters.
              </p>
            </div>
          </div>

          {/* Quick-Launch 24-Hour Search Portals */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Launch Live Earliest-Postings Queries</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {earlyLinks.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all group block shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(item.iconName)}
                      <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                        {item.platform}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal mb-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:underline">
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Recommended Fresh Roles for Your Resume Profile</span>
              </h3>
              <span className="text-[11px] text-slate-500">Based on your skill & title overlap</span>
            </div>

            <div className="space-y-3">
              {targetedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{job.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {job.matchScore}% Match
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building className="w-3 h-3 text-slate-400" />
                          {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
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
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shrink-0 shadow-sm"
                    >
                      <span>Find on {job.platform}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {job.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-slate-400 font-medium">{job.postedTiming}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-black/[0.06] px-4 py-3 flex justify-between items-center text-xs text-ink/50 shrink-0">
          <span>Tips: Apply directly on the company career portal when found for 2x faster review.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-ink/70 hover:bg-black/5 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
