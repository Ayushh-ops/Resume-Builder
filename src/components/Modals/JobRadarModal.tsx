import React, { useMemo } from 'react';
import { Radar, ExternalLink } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { ResumeData } from '../../types/resume';

interface JobRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
}

export const JobRadarModal: React.FC<JobRadarModalProps> = ({ isOpen, onClose, resumeData }) => {
  if (!isOpen) return null;

  const userTitle = resumeData.personalInfo.jobTitle?.trim() || '';
  const userLocation = resumeData.personalInfo.location?.trim() || 'Remote';
  const skills = resumeData.skills.flatMap((s) => s.skills);

  const suggestedTitles = useMemo(() => {
    if (!userTitle) return [];
    const titles = new Set<string>();
    titles.add(userTitle);
    const lower = userTitle.toLowerCase();
    const allSkillsLower = skills.map((s) => s.toLowerCase());

    if (lower.includes('engineer') || lower.includes('developer')) {
      if (!lower.includes('senior') && !lower.includes('lead')) {
        titles.add(`Senior ${userTitle}`);
      }
    }
    if (allSkillsLower.some((s) => s.includes('react') || s.includes('vue') || s.includes('frontend'))) {
      titles.add('Frontend Engineer');
      titles.add('Full-Stack Engineer');
    }
    if (allSkillsLower.some((s) => s.includes('node') || s.includes('python') || s.includes('backend') || s.includes('go'))) {
      titles.add('Backend Engineer');
    }
    if (allSkillsLower.some((s) => s.includes('ai') || s.includes('ml') || s.includes('pytorch') || s.includes('llm'))) {
      titles.add('AI Engineer');
      titles.add('Machine Learning Engineer');
    }
    if (allSkillsLower.some((s) => s.includes('cloud') || s.includes('aws') || s.includes('docker') || s.includes('devops'))) {
      titles.add('DevOps Engineer');
    }
    return Array.from(titles).slice(0, 6);
  }, [userTitle, skills]);

  const searchLinks = userTitle
    ? [
        {
          name: 'LinkedIn (Past 24h)',
          url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(userTitle)}&location=${encodeURIComponent(userLocation)}&f_TPR=r86400&sortBy=DD`,
          query: `"${userTitle}" in ${userLocation} · Posted within 24h`,
        },
        {
          name: 'Indeed',
          url: `https://www.indeed.com/jobs?q=${encodeURIComponent(userTitle)}&l=${encodeURIComponent(userLocation)}&sort=date`,
          query: `"${userTitle}" in ${userLocation} · Sorted by date`,
        },
        {
          name: 'Google Jobs',
          url: `https://www.google.com/search?ibp=htl;jobs&q=${encodeURIComponent(userTitle)}+jobs+in+${encodeURIComponent(userLocation)}`,
          query: `"${userTitle}" in ${userLocation} · Aggregated listings`,
        },
        {
          name: 'Wellfound',
          url: `https://wellfound.com/jobs?role=${encodeURIComponent(userTitle)}&remote=true`,
          query: `"${userTitle}" · Startups and tech roles`,
        },
      ]
    : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Job search feeds"
      subtitle={userTitle ? `Query: ${userTitle} · ${userLocation}` : 'Live job search feeds'}
      icon={<Radar className="w-4 h-4 text-ink/70" strokeWidth={1.5} />}
      maxWidth="max-w-2xl"
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
        {!userTitle ? (
          <div className="p-4 bg-muted border border-line rounded-[6px] text-xs text-ink/60">
            Add a target job title to get suggestions
          </div>
        ) : (
          <>
            {/* Search Portals List */}
            <div className="space-y-3">
              <h3 className="text-[12.5px] font-medium text-ink/60">
                Search links
              </h3>
              <div className="space-y-2">
                {searchLinks.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-card hover:bg-muted border border-line rounded-[6px] transition flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <span className="text-xs font-semibold text-ink group-hover:text-brand-600 transition">
                        {item.name}
                      </span>
                      <p className="text-[11px] text-ink/60 mt-0.5">
                        {item.query}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-ink/40 group-hover:text-brand-600 transition shrink-0" strokeWidth={1.5} />
                  </a>
                ))}
              </div>
            </div>

            {/* Suggested Titles */}
            <div className="space-y-3 pt-2 border-t border-line">
              <h3 className="text-[12.5px] font-medium text-ink/60">
                Suggested titles
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestedTitles.map((title, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs text-ink/80 bg-card border border-line rounded-[6px]"
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
