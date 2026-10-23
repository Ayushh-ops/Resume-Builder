import React from 'react';
import type { ResumeData, ResumeTheme } from '../../../types/resume';
import { Mail, Phone, MapPin } from 'lucide-react';
import { LinkedinIcon } from '../../common/Icons';

interface TemplateProps {
  data: ResumeData;
  theme: ResumeTheme;
}

export const CreativeTemplate: React.FC<TemplateProps> = ({ data, theme }) => {
  const { personalInfo, summary, experience, education, projects, skills, certifications, customSections } = data;
  const primary = theme.primaryColor || '#0284c7';
  const titles = data.sectionTitles || {};

  return (
    <div
      className="resume-sheet text-slate-800 bg-white"
      style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}
    >
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl mb-4 -mx-1 -mt-1 shadow-xs">
        <h1 className={`text-2xl font-black tracking-tight ${personalInfo.fullName ? 'text-white' : 'text-slate-400'}`}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <p className={`text-xs font-semibold tracking-wide mt-0.5 ${personalInfo.jobTitle ? 'text-indigo-300' : 'text-slate-400'}`}>
          {personalInfo.jobTitle || 'Target Job Title'}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[11px] text-slate-300">
          {personalInfo.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-indigo-400" />
              {personalInfo.email}
            </span>
          )}
          {personalInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-indigo-400" />
              {personalInfo.phone}
            </span>
          )}
          {personalInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-400" />
              {personalInfo.location}
            </span>
          )}
          {personalInfo.linkedin && (
            <span className="flex items-center gap-1">
              <LinkedinIcon className="w-3 h-3 text-indigo-400" />
              {personalInfo.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'in/')}
            </span>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column (35%): Skills, Education, Certifications */}
        <div className="col-span-4 space-y-4 border-r border-slate-100 pr-3">
          {/* Skills */}
          {skills && skills.length > 0 && (
            <div>
              <h2
                className="text-xs font-black uppercase tracking-wider mb-2"
                style={{ color: primary }}
              >
                {titles['skills'] || 'Skills'}
              </h2>
              <div className="space-y-2.5">
                {skills.map((cat, idx) => (
                  <div key={cat.id || idx}>
                    <p className="text-[11px] font-bold text-slate-800">{cat.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cat.skills.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education && education.length > 0 && (
            <div>
              <h2
                className="text-xs font-black uppercase tracking-wider mb-2"
                style={{ color: primary }}
              >
                {titles['education'] || 'Education'}
              </h2>
              <div className="space-y-2">
                {education.map((edu, idx) => (
                  <div key={edu.id || idx} className="text-xs">
                    <p className="font-bold text-slate-900">{edu.institution}</p>
                    <p className="text-[11px] text-slate-700">{edu.degree} {edu.grade ? `(${edu.grade})` : ''}</p>
                    <p className="text-[10px] text-slate-400">{edu.endDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <div>
              <h2
                className="text-xs font-black uppercase tracking-wider mb-2"
                style={{ color: primary }}
              >
                {titles['certifications'] || 'Certifications'}
              </h2>
              <div className="space-y-1.5 text-xs">
                {certifications.map((c, idx) => (
                  <div key={c.id || idx}>
                    <p className="font-semibold text-slate-800 text-[11px]">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.issuer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (65%): Summary, Experience, Projects */}
        <div className="col-span-8 space-y-4">
          {summary && (
            <div className="avoid-break">
              <h2
                className="text-xs font-black uppercase tracking-wider mb-1"
                style={{ color: primary }}
              >
                {titles['summary'] || 'Profile Summary'}
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {experience && experience.length > 0 && (
            <div>
              <h2
                className="text-xs font-black uppercase tracking-wider mb-2.5"
                style={{ color: primary }}
              >
                {titles['experience'] || 'Experience'}
              </h2>
              <div className="space-y-3">
                {experience.map((exp, idx) => (
                  <div key={exp.id || idx} className="avoid-break">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-slate-900">{exp.company}</span>
                      <span className="text-[10px] text-slate-500">
                        {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline text-[11px] font-semibold text-slate-600 mb-1">
                      <span>{exp.position}</span>
                      {exp.location && <span>{exp.location}</span>}
                    </div>
                    <ul className="list-disc list-outside ml-3.5 space-y-0.5 text-xs text-slate-700 leading-relaxed">
                      {exp.highlights.filter(Boolean).map((h, hIdx) => (
                        <li key={hIdx}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects && projects.length > 0 && (
            <div>
              <h2
                className="text-xs font-black uppercase tracking-wider mb-2"
                style={{ color: primary }}
              >
                {titles['projects'] || 'Key Projects'}
              </h2>
              <div className="space-y-2">
                {projects.map((proj, idx) => (
                  <div key={proj.id || idx} className="avoid-break text-xs">
                    <div className="flex justify-between items-baseline font-bold text-slate-900">
                      <span>{proj.name}</span>
                      {proj.technologies && (
                        <span className="text-[10px] font-normal text-slate-500">
                          {proj.technologies.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                    {proj.description && <p className="text-slate-600 text-[11px] mt-0.5">{proj.description}</p>}
                    {proj.highlights && proj.highlights.length > 0 && (
                      <ul className="list-disc list-outside ml-3.5 mt-0.5 text-slate-700 space-y-0.5 text-[11px]">
                        {proj.highlights.filter(Boolean).map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {customSections && customSections.length > 0 && (
            <div className="space-y-3">
              {customSections.map((sec, sIdx) => (
                <div key={sec.id || sIdx}>
                  <h2
                    className="text-xs font-black uppercase tracking-wider mb-2"
                    style={{ color: primary }}
                  >
                    {sec.title}
                  </h2>
                  <div className="space-y-2">
                    {sec.items.map((item, iIdx) => (
                      <div key={item.id || iIdx} className="avoid-break text-xs">
                        {(item.title || item.subtitle || item.date) && (
                          <div className="flex justify-between items-baseline font-bold text-slate-900">
                            <span>
                              {item.title}
                              {item.subtitle ? ` – ${item.subtitle}` : ''}
                            </span>
                            {item.date && (
                              <span className="text-[10px] font-normal text-slate-500">{item.date}</span>
                            )}
                          </div>
                        )}
                        {item.description && <p className="text-slate-600 text-[11px] mt-0.5">{item.description}</p>}
                        {item.bullets && item.bullets.length > 0 && (
                          <ul className="list-disc list-outside ml-3.5 mt-0.5 text-slate-700 space-y-0.5 text-[11px]">
                            {item.bullets.filter(Boolean).map((b, bIdx) => (
                              <li key={bIdx}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
