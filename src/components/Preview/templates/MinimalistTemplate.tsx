import React from 'react';
import type { ResumeData, ResumeTheme } from '../../../types/resume';

interface TemplateProps {
  data: ResumeData;
  theme: ResumeTheme;
}

export const MinimalistTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications, customSections } = data;

  const defaultOrder = ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'customSections'];
  const sectionOrder = data.sectionOrder && data.sectionOrder.length > 0 ? data.sectionOrder : defaultOrder;
  const titles = data.sectionTitles || {};

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        if (!summary) return null;
        return (
          <section key="summary" className="mb-4 avoid-break">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
              {titles['summary'] || 'Summary'}
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed font-normal border-l-2 pl-3 border-slate-300">
              {summary}
            </p>
          </section>
        );

      case 'experience':
        if (!experience || experience.length === 0) return null;
        return (
          <section key="experience" className="mb-4">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
              {titles['experience'] || 'Experience'}
            </h2>
            <div className="space-y-3">
              {experience.map((exp, idx) => (
                <div key={exp.id || idx} className="avoid-break">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-slate-900">{exp.company}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] text-slate-600 font-medium mb-1">
                    <span>{exp.position}</span>
                    {exp.location && <span>{exp.location}</span>}
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {exp.highlights.filter(Boolean).map((h, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-2">
                        <span className="text-slate-400 select-none text-[10px] mt-0.5">—</span>
                        <span className="leading-relaxed">{h}</span>
                      </li>
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
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
              {titles['projects'] || 'Projects'}
            </h2>
            <div className="space-y-2.5">
              {projects.map((proj, idx) => (
                <div key={proj.id || idx} className="avoid-break">
                  <div className="flex items-baseline gap-2 text-xs flex-wrap">
                    <span className="font-bold text-slate-900 whitespace-nowrap">{proj.name}</span>
                    {proj.link && (
                      <a
                        href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline font-normal whitespace-nowrap"
                      >
                        {proj.linkLabel || proj.link}
                      </a>
                    )}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {proj.technologies.slice(0, 5).join(' / ')}
                    </div>
                  )}
                  {proj.description && <p className="text-xs text-slate-600">{proj.description}</p>}
                  {proj.highlights && (
                    <ul className="space-y-0.5 text-xs text-slate-700 mt-1">
                      {proj.highlights.filter(Boolean).map((h, hIdx) => (
                        <li key={hIdx} className="flex items-start gap-2">
                          <span className="text-slate-400 select-none text-[10px]">—</span>
                          <span>{h}</span>
                        </li>
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
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
              {titles['skills'] || 'Skills'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {skills.map((cat, idx) => (
                <div key={cat.id || idx}>
                  <span className="font-bold text-slate-800 text-[11px]">{cat.name}: </span>
                  <span className="text-slate-600 text-[11px]">{cat.skills.join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        return (
          <section key="education" className="mb-4 avoid-break">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
              {titles['education'] || 'Education'}
            </h2>
            <div className="space-y-1.5">
              {education.map((edu, idx) => (
                <div key={edu.id || idx} className="flex items-baseline justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{edu.institution}</span>
                    <span className="text-slate-600 text-[11px]"> — {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''} {edu.grade ? `(${edu.grade})` : ''}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {edu.startDate && edu.endDate ? `${edu.startDate} – ${edu.endDate}` : edu.endDate || edu.startDate}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'certifications':
        if (!certifications || certifications.length === 0) return null;
        return (
          <section key="certifications" className="mb-4 avoid-break">
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
              {titles['certifications'] || 'Certifications'}
            </h2>
            <div className="space-y-1 text-xs text-slate-700">
              {certifications.map((cert, idx) => (
                <div key={cert.id || idx} className="flex justify-between items-baseline">
                  <span>
                    <span className="font-bold text-slate-800">{cert.name}</span>
                    {cert.issuer && <span> — {cert.issuer}</span>}
                  </span>
                  {cert.date && (
                    <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">
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
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
              {titles['achievements'] || ach.title}
            </h2>
            <div className="space-y-2 text-xs">
              {ach.items.map((item, idx) => (
                <div key={item.id || idx}>
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="space-y-0.5 text-xs text-slate-700">
                      {item.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="text-slate-400 select-none text-[10px]">—</span>
                          <span>{b}</span>
                        </li>
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
            <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
              {titles['extracurricular'] || extra.title}
            </h2>
            <div className="space-y-2 text-xs">
              {extra.items.map((item, idx) => (
                <div key={item.id || idx}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    {item.subtitle && <span className="text-[10px] text-slate-500 font-mono">{item.subtitle}</span>}
                  </div>
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="space-y-0.5 text-xs text-slate-700 mt-1">
                      {item.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="text-slate-400 select-none text-[10px]">—</span>
                          <span>{b}</span>
                        </li>
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
                <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
                  {sec.title}
                </h2>
                <div className="space-y-2 text-xs">
                  {sec.items.map((item, iIdx) => (
                    <div key={item.id || iIdx}>
                      {(item.title || item.subtitle || item.date) && (
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-slate-900">
                            {item.title}
                            {item.subtitle ? ` — ${item.subtitle}` : ''}
                          </span>
                          {item.date && <span className="text-[10px] text-slate-500 font-mono">{item.date}</span>}
                        </div>
                      )}
                      {item.description && <p className="text-slate-600 mt-0.5">{item.description}</p>}
                      {item.bullets && item.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-slate-700">
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
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header */}
      <header className="mb-5">
        <h1 className={`text-3xl font-light tracking-tight ${personalInfo.fullName ? 'text-slate-900' : 'text-slate-400'}`}>
          {personalInfo.fullName ? (
            <>
              <span className="font-bold">{personalInfo.fullName.split(' ')[0]}</span>{' '}
              {personalInfo.fullName.split(' ').slice(1).join(' ')}
            </>
          ) : (
            'Your Name'
          )}
        </h1>
        <p className={`text-xs font-medium tracking-widest uppercase mt-0.5 ${personalInfo.jobTitle ? 'text-slate-500' : 'text-slate-400'}`}>
          {personalInfo.jobTitle || 'Target Job Title'}
        </p>

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500 font-mono">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>/ {personalInfo.phone}</span>}
          {personalInfo.location && <span>/ {personalInfo.location}</span>}
          {personalInfo.linkedin && (
            <a
              href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              / {personalInfo.linkedin}
            </a>
          )}
          {personalInfo.github && (
            <a
              href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              / {personalInfo.github}
            </a>
          )}
        </div>
      </header>

      {/* Dynamic Sections in order */}
      {sectionOrder.map((key) => renderSection(key))}
    </div>
  );
};
