import React from 'react';
import type { ResumeData, ResumeTheme } from '../../../types/resume';

interface TemplateProps {
  data: ResumeData;
  theme: ResumeTheme;
}

export const MinimalistTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications, customSections } = data;


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
            <span>/ {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'in/')}</span>
          )}
          {personalInfo.github && (
            <span>/ {personalInfo.github.replace(/^https?:\/\/(www\.)?github\.com\//, 'gh/')}</span>
          )}
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <section className="mb-4 avoid-break">
          <p className="text-xs text-slate-700 leading-relaxed font-normal border-l-2 pl-3 border-slate-300">
            {summary}
          </p>
        </section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
            Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp, idx) => (
              <div key={exp.id || idx} className="avoid-break">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-slate-900">{exp.position}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium mb-1">
                  {exp.company} {exp.location ? `• ${exp.location}` : ''}
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
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
            Projects
          </h2>
          <div className="space-y-2.5">
            {projects.map((proj, idx) => (
              <div key={proj.id || idx} className="avoid-break">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-slate-900">{proj.name}</span>
                  {proj.technologies && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {proj.technologies.slice(0, 5).join(' / ')}
                    </span>
                  )}
                </div>
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
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section className="mb-4 avoid-break">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">
            Skills
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
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="mb-4 avoid-break">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
            Education
          </h2>
          <div className="space-y-1.5">
            {education.map((edu, idx) => (
              <div key={edu.id || idx} className="flex items-baseline justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{edu.institution}</span>
                  <span className="text-slate-600 text-[11px]"> — {edu.degree} in {edu.fieldOfStudy}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{edu.endDate}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <section className="mb-4 avoid-break">
          <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">
            Certifications
          </h2>
          <div className="space-y-1 text-xs text-slate-700">
            {certifications.map((cert, idx) => (
              <div key={cert.id || idx}>
                <span className="font-bold text-slate-800">{cert.name}</span> — {cert.issuer} {cert.date ? `(${cert.date})` : ''}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Additional / Custom Sections */}
      {customSections && customSections.length > 0 && (
        <>
          {customSections.map((sec, sIdx) => (
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
        </>
      )}
    </div>
  );
};
