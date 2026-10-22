import React from 'react';
import type { ResumeData, ResumeTheme } from '../../../types/resume';
import { Mail, Phone, MapPin, Globe, ExternalLink } from 'lucide-react';
import { LinkedinIcon, GithubIcon } from '../../common/Icons';

interface TemplateProps {
  data: ResumeData;
  theme: ResumeTheme;
}

export const ModernTemplate: React.FC<TemplateProps> = ({ data, theme }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications } = data;
  const primaryColor = theme.primaryColor || '#4f46e5';

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
              <span>{personalInfo.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'in/')}</span>
            </a>
          )}
          {personalInfo.github && (
            <a href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
              <GithubIcon className="w-3 h-3 text-slate-400" />
              <span>{personalInfo.github.replace(/^https?:\/\/(www\.)?github\.com\//, 'github/')}</span>
            </a>
          )}
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <section className="mb-4 avoid-break">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200"
            style={{ color: primaryColor }}
          >
            Professional Summary
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* Work Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-4">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-slate-200"
            style={{ color: primaryColor }}
          >
            Work Experience
          </h2>
          <div className="space-y-3">
            {experience.map((exp, idx) => (
              <div key={exp.id || idx} className="avoid-break">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-900">{exp.position}</span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-slate-600 mb-1">
                  <span className="font-semibold text-slate-700">{exp.company}</span>
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
      )}

      {/* Technical Projects */}
      {projects && projects.length > 0 && (
        <section className="mb-4">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-slate-200"
            style={{ color: primaryColor }}
          >
            Technical Projects
          </h2>
          <div className="space-y-2.5">
            {projects.map((proj, idx) => (
              <div key={proj.id || idx} className="avoid-break">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{proj.name}</span>
                    {proj.link && (
                      <a href={proj.link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {proj.technologies.join(' • ')}
                    </span>
                  )}
                </div>
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
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section className="mb-4 avoid-break">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200"
            style={{ color: primaryColor }}
          >
            Skills & Competencies
          </h2>
          <div className="space-y-1 text-xs">
            {skills.map((cat, idx) => (
              <div key={cat.id || idx} className="flex leading-tight">
                <span className="font-bold text-slate-800 w-36 shrink-0 text-[11px]">{cat.name}:</span>
                <span className="text-slate-700 text-[11px]">{cat.skills.join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="mb-4 avoid-break">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-2 pb-0.5 border-b border-slate-200"
            style={{ color: primaryColor }}
          >
            Education
          </h2>
          <div className="space-y-2">
            {education.map((edu, idx) => (
              <div key={edu.id || idx}>
                <div className="flex items-baseline justify-between text-xs font-bold text-slate-900">
                  <span>{edu.institution}</span>
                  <span className="text-[11px] font-normal text-slate-500">{edu.endDate}</span>
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
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <section className="avoid-break">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-1.5 pb-0.5 border-b border-slate-200"
            style={{ color: primaryColor }}
          >
            Certifications & Licenses
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
            {certifications.map((cert, idx) => (
              <div key={cert.id || idx} className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-800">{cert.name}</span>
                <span className="text-slate-400">–</span>
                <span className="text-slate-600 text-[11px]">{cert.issuer}</span>
                {cert.date && <span className="text-slate-400 text-[11px]">({cert.date})</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
