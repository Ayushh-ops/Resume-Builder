import React, { useMemo } from 'react';
import { Radar, ExternalLink, Check, ArrowRight, Plus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { HowToUse } from '../common/HowToUse';
import { getCoreSkillsForRole } from '../../lib/guidance';
import type { ResumeData } from '../../types/resume';

interface JobRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
  onGoToSection?: (sectionId: string, bulletRef?: string) => void;
  onAddSkill?: (skill: string) => void;
}

export const JobRadarModal: React.FC<JobRadarModalProps> = ({
  isOpen,
  onClose,
  resumeData,
  onGoToSection,
  onAddSkill,
}) => {
  if (!isOpen) return null;

  const userTitle = resumeData.personalInfo.jobTitle?.trim() || '';
  const userLocation = resumeData.personalInfo.location?.trim() || 'Remote';
  const skills = resumeData.skills.flatMap((s) => s.skills);

  const coreSkills = useMemo(() => {
    if (!userTitle) return [];
    return getCoreSkillsForRole(userTitle).slice(0, 5);
  }, [userTitle]);

  const existingSkillsLower = useMemo(() => {
    return new Set(skills.map((s) => s.toLowerCase().trim()));
  }, [skills]);

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
        <HowToUse toolId="job_radar" />

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

            {/* Highlight for <title> */}
            <div className="space-y-3 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <h3 className="text-[12.5px] font-medium text-ink/60">
                  Highlight for {userTitle}
                </h3>
                {onGoToSection && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoToSection('skills');
                    }}
                    className="text-xs text-ink/70 hover:text-ink inline-flex items-center gap-1 cursor-pointer transition font-medium"
                  >
                    <span>Go to Skills</span>
                    <ArrowRight className="w-3 h-3 text-ink/50" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-ink/60">
                Top 5 skills employers expect for this role, compared against your current resume:
              </p>
              <div className="space-y-2">
                {coreSkills.map((skill, idx) => {
                  const isPresent =
                    existingSkillsLower.has(skill.toLowerCase().trim()) ||
                    skills.some((s) => s.toLowerCase().includes(skill.toLowerCase().trim()));
                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-card border border-line rounded-[6px] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isPresent ? (
                          <Check className="w-3.5 h-3.5 text-ink/60 shrink-0" strokeWidth={1.5} />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-ink/30 shrink-0 ml-1 mr-1" />
                        )}
                        <span className="font-semibold text-ink truncate">{skill}</span>
                        <span className="text-[11px] text-ink/50">
                          {isPresent ? '· In resume' : '· Missing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isPresent && onAddSkill && (
                          <button
                            type="button"
                            onClick={() => onAddSkill(skill)}
                            className="btn-outline h-6 px-2 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-ink/50" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
