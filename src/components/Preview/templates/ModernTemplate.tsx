import React from 'react';
import type { ResumeData, ResumeTheme } from '../../../types/resume';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { LinkedinIcon, GithubIcon } from '../../common/Icons';

interface TemplateProps {
  data: ResumeData;
  theme: ResumeTheme;
}

export const ModernTemplate: React.FC<TemplateProps> = ({ data, theme }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications, customSections } = data;
  const primaryColor = theme.primaryColor || '#4f46e5';

  const defaultOrder = ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'customSections'];
  const sectionOrder = data.sectionOrder && data.sectionOrder.length > 0 ? data.sectionOrder : defaultOrder;
  const titles = data.sectionTitles || {};

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        if (!summary) return null;
        return (
          <section key="summary" className="mb-4 avoid-break">
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200"
              style={{ color: primaryColor }}
            >
              {titles['summary'] || 'Professional Summary'}
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">{summary}</p>
          </section>
        );

      case 'experience':
        if (!experience || experience.length === 0) return null;
        return (
          <section key="experience" className="mb-4">
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-slate-200"
              style={{ color: primaryColor }}
            >
              {titles['experience'] || 'Work Experience'}
            </h2>
            <div className="space-y-3">
              {experience.map((exp, idx) => (
                <div key={exp.id || idx} className="avoid-break">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-900">{exp.company}</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] text-slate-600 mb-1">
                    <span className="font-semibold text-slate-700">{exp.position}</span>
                    {exp.location && <span>{exp.location}</span>}
                  </div>
                  <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-slate-700 leading-relaxed">
                    {exp.highlights.filter(Boolean).map((bullet, bIdx) => (
                      <li key={bIdx} className="pl-0.5">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );

      case 'projects':
        if (!projects || projects.length === 0) return null;
        return (
          <section key="projects" className="mb-4">
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-slate-200"
              style={{ color: primaryColor }}
            >
              {titles['projects'] || 'Technical Projects'}
            </h2>
            <div className="space-y-2.5">
              {projects.map((proj, idx) => (
                <div key={proj.id || idx} className="avoid-break">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 whitespace-nowrap">{proj.name}</span>
                    {proj.link && (
                      <a
                        href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-500 hover:text-indigo-600 underline font-normal whitespace-nowrap"
                      >
                        {proj.linkLabel || proj.link}
                      </a>
                    )}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {proj.technologies.join(' • ')}
                    </div>
                  )}
                  {proj.description && (
                    <p className="text-xs text-slate-600 mt-0.5">{proj.description}</p>
                  )}
                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-xs text-slate-700">
                      {proj.highlights.filter(Boolean).map((h, hIdx) => (
                        <li key={hIdx}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'skills':
        if (!skills || skills.length === 0) return null;
        return (
          <section key="skills" className="mb-4 avoid-break">
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200"
              style={{ color: primaryColor }}
            >
              {titles['skills'] || 'Skills & Competencies'}
            </h2>
            <div className="space-y-1 text-xs">
              {skills.map((cat, idx) => (
                <div key={cat.id || idx} className="flex leading-tight">
                  <span className="font-bold text-slate-800 w-44 shrink-0 text-[11px]">{cat.name}:</span>
                  <span className="text-slate-700 text-[11px]">{cat.skills.join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        return (
          <section key="education" className="mb-4 avoid-break">
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-slate-200"
              style={{ color: primaryColor }}
            >
              {titles['education'] || 'Education'}
            </h2>
            <div className="space-y-2">
              {education.map((edu, idx) => (
                <div key={edu.id || idx}>
                  <div className="flex items-baseline justify-between text-xs font-bold text-slate-900">
                    <span>{edu.institution}</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {edu.startDate && edu.endDate ? `${edu.startDate} – ${edu.endDate}` : edu.endDate || edu.startDate}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs text-slate-700">
                    <span>
                      {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                    </span>
                    {edu.grade && <span className="text-[11px] text-slate-600 font-medium">{edu.grade}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'certifications':
        if (!certifications || certifications.length === 0) return null;
        return (
          <section key="certifications" className="mb-4 avoid-break">
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200"
              style={{ color: primaryColor }}
            >
              {titles['certifications'] || 'Certifications & Licenses'}
            </h2>
            <div className="space-y-1 text-xs text-slate-700">
              {certifications.map((cert, idx) => (
                <div key={cert.id || idx} className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-800">
                    <span className="font-semibold">{cert.name}</span>
                    {cert.issuer && <span className="text-slate-600"> — {cert.issuer}</span>}
                  </span>
                  {cert.date && (
                    <span className="text-[11px] text-slate-500 font-normal shrink-0 ml-2">
                      {cert.date}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'achievements': {
        const ach = customSections?.find((s) => s.id === 'custom-achievements' || s.title?.toLowerCase().includes('achievement'));
        if (!ach) return null;
        return (
          <section key="achievements" className="mb-4 avoid-break">
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200"
              style={{ color: primaryColor }}
            >
              {titles['achievements'] || ach.title}
            </h2>
            <div className="space-y-2">
              {ach.items.map((item, idx) => (
                <div key={item.id || idx}>
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="list-disc list-outside ml-4 space-y-0.5 text-xs text-slate-700 leading-relaxed">
                      {item.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="pl-0.5">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      }

      case 'extracurricular': {
        const extra = customSections?.find((s) => s.id === 'custom-extracurricular' || s.title?.toLowerCase().includes('extracurricular') || s.title?.toLowerCase().includes('activity'));
        if (!extra) return null;
        return (
          <section key="extracurricular" className="mb-4 avoid-break">
            <h2
              className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200"
              style={{ color: primaryColor }}
            >
              {titles['extracurricular'] || extra.title}
            </h2>
            <div className="space-y-2">
              {extra.items.map((item, idx) => (
                <div key={item.id || idx}>
                  <div className="flex justify-between items-baseline text-xs font-semibold text-slate-800">
                    <span>{item.title}</span>
                    {item.subtitle && <span className="text-[11px] font-normal text-slate-600">{item.subtitle}</span>}
                  </div>
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="list-disc list-outside ml-4 space-y-0.5 text-xs text-slate-700 leading-relaxed mt-0.5">
                      {item.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="pl-0.5">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      }

      case 'customSections': {
        const handledInOrder = (id: string, title?: string) => {
          if (sectionOrder.includes('achievements') && (id === 'custom-achievements' || title?.toLowerCase().includes('achievement'))) return true;
          if (sectionOrder.includes('extracurricular') && (id === 'custom-extracurricular' || title?.toLowerCase().includes('extracurricular') || title?.toLowerCase().includes('activity'))) return true;
          return false;
        };
        const remaining = customSections?.filter((s) => !handledInOrder(s.id, s.title));
        if (!remaining || remaining.length === 0) return null;
        return (
          <React.Fragment key="customSections">
            {remaining.map((sec, sIdx) => (
              <section key={sec.id || sIdx} className="mb-4 avoid-break">
                <h2
                  className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-slate-200"
                  style={{ color: primaryColor }}
                >
                  {sec.title}
                </h2>
                <div className="space-y-2">
                  {sec.items.map((item, iIdx) => (
                    <div key={item.id || iIdx}>
                      {(item.title || item.subtitle || item.date) && (
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {item.title}
                            {item.subtitle ? ` – ${item.subtitle}` : ''}
                          </span>
                          {item.date && <span className="text-[11px] font-normal text-slate-500">{item.date}</span>}
                        </div>
                      )}
                      {item.description && (
                        <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{item.description}</p>
                      )}
                      {item.bullets && item.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-xs text-slate-700">
                          {item.bullets.filter(Boolean).map((b, bIdx) => (
                            <li key={bIdx}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </React.Fragment>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      className="resume-sheet text-slate-800 bg-white"
      style={{
        fontFamily: theme.fontFamily === 'serif' ? 'Merriweather, Georgia, serif' : theme.fontFamily === 'mono' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <header className="border-b-2 pb-4 mb-4" style={{ borderColor: primaryColor }}>
        <h1 className={`text-2xl font-extrabold tracking-tight uppercase ${personalInfo.fullName ? 'text-slate-900' : 'text-slate-400'}`}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className="text-sm font-semibold tracking-wide mt-0.5" style={{ color: personalInfo.jobTitle ? primaryColor : '#94a3b8' }}>
          {personalInfo.jobTitle || 'Target Job Title'}
        </p>

        {/* Contact Links Bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11px] text-slate-600">
          {personalInfo.email && (
            <a href={`mailto:${personalInfo.email}`} className="flex items-center gap-1 hover:text-indigo-600">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{personalInfo.email}</span>
            </a>
          )}
          {personalInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{personalInfo.phone}</span>
            </span>
          )}
          {personalInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{personalInfo.location}</span>
            </span>
          )}
          {personalInfo.website && (
            <a href={personalInfo.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>{personalInfo.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {personalInfo.linkedin && (
            <a href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
              <LinkedinIcon className="w-3 h-3 text-slate-400" />
              <span>{personalInfo.linkedin}</span>
            </a>
          )}
          {personalInfo.github && (
            <a href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
              <GithubIcon className="w-3 h-3 text-slate-400" />
              <span>{personalInfo.github}</span>
            </a>
          )}
        </div>
      </header>

      {/* Dynamic Sections in order */}
      {sectionOrder.map((key) => renderSection(key))}
    </div>
  );
};
