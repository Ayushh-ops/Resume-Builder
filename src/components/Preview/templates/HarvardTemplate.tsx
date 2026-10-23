import React from 'react';
import type { ResumeData, ResumeTheme } from '../../../types/resume';

interface TemplateProps {
  data: ResumeData;
  theme: ResumeTheme;
}

export const HarvardTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications, customSections } = data;

  const defaultOrder = ['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'customSections'];
  const sectionOrder = data.sectionOrder && data.sectionOrder.length > 0 ? data.sectionOrder : defaultOrder;
  const titles = data.sectionTitles || {};

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        if (!summary) return null;
        return (
          <section key="summary" className="mb-3.5 avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1 text-black">
              {titles['summary'] || 'Professional Summary'}
            </h2>
            <p className="text-xs text-neutral-900 leading-relaxed text-justify">{summary}</p>
          </section>
        );

      case 'experience':
        if (!experience || experience.length === 0) return null;
        return (
          <section key="experience" className="mb-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-2 text-black">
              {titles['experience'] || 'Work Experience'}
            </h2>
            <div className="space-y-3">
              {experience.map((exp, idx) => (
                <div key={exp.id || idx} className="avoid-break">
                  <div className="flex justify-between items-baseline text-xs font-bold text-black">
                    <span>{exp.company}</span>
                    <span className="text-[11px] font-normal not-italic">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs italic text-neutral-800 mb-1">
                    <span>{exp.position}</span>
                    {exp.location && <span className="text-[11px] font-normal italic">{exp.location}</span>}
                  </div>
                  <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-neutral-900 leading-relaxed">
                    {exp.highlights.filter(Boolean).map((bullet, bIdx) => (
                      <li key={bIdx} className="pl-0.5">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        return (
          <section key="education" className="mb-3.5 avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-2 text-black">
              {titles['education'] || 'Education'}
            </h2>
            <div className="space-y-2">
              {education.map((edu, idx) => (
                <div key={edu.id || idx}>
                  <div className="flex justify-between items-baseline text-xs font-bold text-black">
                    <span>{edu.institution}</span>
                    <span className="text-[11px] font-normal">{edu.endDate}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-neutral-800">
                    <span className="italic">
                      {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                      {edu.grade ? `, ${edu.grade}` : ''}
                    </span>
                    {edu.location && <span className="text-[11px] font-normal italic">{edu.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'projects':
        if (!projects || projects.length === 0) return null;
        return (
          <section key="projects" className="mb-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-2 text-black">
              {titles['projects'] || 'Technical & Open Source Projects'}
            </h2>
            <div className="space-y-2.5">
              {projects.map((proj, idx) => (
                <div key={proj.id || idx} className="avoid-break">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-black">
                      {proj.name}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span className="font-normal italic text-neutral-700 ml-1">
                          | {proj.technologies.join(', ')}
                        </span>
                      )}
                    </span>
                    {proj.link && (
                      <a href={proj.link} target="_blank" rel="noreferrer" className="text-[10px] underline text-neutral-600">
                        Link
                      </a>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-xs text-neutral-800 mt-0.5">{proj.description}</p>
                  )}
                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-xs text-neutral-900">
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
          <section key="skills" className="mb-3.5 avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1.5 text-black">
              {titles['skills'] || 'Skills & Technical Proficiencies'}
            </h2>
            <div className="space-y-1 text-xs">
              {skills.map((cat, idx) => (
                <div key={cat.id || idx} className="leading-tight">
                  <span className="font-bold text-black">{cat.name}: </span>
                  <span className="text-neutral-900">{cat.skills.join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        );

      case 'certifications':
        if (!certifications || certifications.length === 0) return null;
        return (
          <section key="certifications" className="mb-3.5 avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1.5 text-black">
              {titles['certifications'] || 'Certifications'}
            </h2>
            <div className="text-xs text-neutral-900 space-y-0.5">
              {certifications.map((cert, idx) => (
                <div key={cert.id || idx}>
                  <span className="font-bold">{cert.name}</span> – {cert.issuer} {cert.date ? `(${cert.date})` : ''}
                </div>
              ))}
            </div>
          </section>
        );

      case 'achievements': {
        const ach = customSections?.find((s) => s.id === 'custom-achievements' || s.title?.toLowerCase().includes('achievement'));
        if (!ach) return null;
        return (
          <section key="achievements" className="mb-3.5 avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1.5 text-black">
              {titles['achievements'] || ach.title}
            </h2>
            <div className="space-y-2 text-xs text-neutral-900">
              {ach.items.map((item, idx) => (
                <div key={item.id || idx}>
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5">
                      {item.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
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
          <section key="extracurricular" className="mb-3.5 avoid-break">
            <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1.5 text-black">
              {titles['extracurricular'] || extra.title}
            </h2>
            <div className="space-y-2 text-xs text-neutral-900">
              {extra.items.map((item, idx) => (
                <div key={item.id || idx}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-black">{item.title}</span>
                    {item.subtitle && <span className="text-[11px] font-normal text-neutral-600">{item.subtitle}</span>}
                  </div>
                  {item.bullets && item.bullets.length > 0 && (
                    <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5">
                      {item.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
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
              <section key={sec.id || sIdx} className="mb-3.5 avoid-break">
                <h2 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-0.5 mb-1.5 text-black">
                  {sec.title}
                </h2>
                <div className="space-y-2 text-xs text-neutral-900">
                  {sec.items.map((item, iIdx) => (
                    <div key={item.id || iIdx}>
                      {(item.title || item.subtitle || item.date) && (
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-black">
                            {item.title}
                            {item.subtitle ? ` – ${item.subtitle}` : ''}
                          </span>
                          {item.date && <span className="text-[11px] font-normal text-neutral-600">{item.date}</span>}
                        </div>
                      )}
                      {item.description && <p className="text-neutral-800 mt-0.5">{item.description}</p>}
                      {item.bullets && item.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5">
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
      className="resume-sheet text-black bg-white"
      style={{ fontFamily: 'Merriweather, Cambria, Georgia, serif' }}
    >
      {/* Header (Classic Centered) */}
      <header className="text-center pb-3 mb-3 border-b border-black">
        <h1 className={`text-xl font-bold tracking-normal uppercase ${personalInfo.fullName ? 'text-black' : 'text-neutral-400'}`}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className={`text-xs italic mt-0.5 ${personalInfo.jobTitle ? 'text-neutral-800' : 'text-neutral-400'}`}>
          {personalInfo.jobTitle || 'Target Job Title'}
        </p>

        {/* Contact Line */}
        <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-neutral-800">
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.location && personalInfo.phone && <span>•</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.phone && personalInfo.email && <span>•</span>}
          {personalInfo.email && (
            <a href={`mailto:${personalInfo.email}`} className="hover:underline">
              {personalInfo.email}
            </a>
          )}
          {personalInfo.linkedin && (
            <>
              <span>•</span>
              <a
                href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                LinkedIn
              </a>
            </>
          )}
          {personalInfo.github && (
            <>
              <span>•</span>
              <a
                href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                GitHub
              </a>
            </>
          )}
          {personalInfo.website && (
            <>
              <span>•</span>
              <a href={personalInfo.website} target="_blank" rel="noreferrer" className="hover:underline">
                Portfolio
              </a>
            </>
          )}
        </div>
      </header>

      {/* Dynamic Sections in order */}
      {sectionOrder.map((key) => renderSection(key))}
    </div>
  );
};
