import React, { useState, useMemo, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  Sparkles,
  Eye,
  Edit3,
  Upload,
} from 'lucide-react';
import type { ResumeData, ResumeTheme, TemplateType } from './types/resume';
import { sampleProfiles } from './data/sampleData';
import { calculateLiveATSScore } from './services/atsScorer';
import { Header } from './components/Header';
import { FormSection } from './components/Form/FormSection';
import { PersonalInfoForm } from './components/Form/PersonalInfoForm';
import { SummaryForm } from './components/Form/SummaryForm';
import { ExperienceForm } from './components/Form/ExperienceForm';
import { EducationForm } from './components/Form/EducationForm';
import { SkillsForm } from './components/Form/SkillsForm';
import { ProjectsForm } from './components/Form/ProjectsForm';
import { CertificationsForm } from './components/Form/CertificationsForm';
import { SectionNav } from './components/Form/SectionNav';
import { CompletenessBar } from './components/Form/CompletenessBar';
import { ResumePreview } from './components/Preview/ResumePreview';
import { JobRadarModal } from './components/Modals/JobRadarModal';
import { TrendAdvisorModal } from './components/Modals/TrendAdvisorModal';
import { JobMatcherModal } from './components/Modals/JobMatcherModal';
import { ApiKeyModal } from './components/Modals/ApiKeyModal';
import { ResumeUploadModal } from './components/Modals/ResumeUploadModal';
import { CommandPalette } from './components/CommandPalette';
import { useToast } from './components/common/Toast';
import { printResume, exportResumeToPdf } from './utils/pdfExport';
import type { TailoredChanges } from './services/geminiService';

const blankResumeData: ResumeData = {
  personalInfo: {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
  },
  summary: '',
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  customSections: [],
};

export const App: React.FC = () => {
  const { showToast } = useToast();

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('resume-data')
  );

  // Resume state initialized with stored data or rich profile
  const [resumeData, setResumeData] = useState<ResumeData>(() => {
    try {
      const saved = localStorage.getItem('resume-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.personalInfo) return parsed;
      }
    } catch (e) {
      console.warn('Could not read cached resume-data', e);
    }
    return sampleProfiles.aiEngineer;
  });

  // Undo / Redo History
  const [history, setHistory] = useState<ResumeData[]>([resumeData]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = useCallback(
    (newData: ResumeData) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const updated = [...sliced, newData];
        if (updated.length > 50) updated.shift();
        return updated;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
      setResumeData(newData);
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      setResumeData(history[targetIndex]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      setResumeData(history[targetIndex]);
    }
  }, [historyIndex, history]);

  // Keyboard shortcut for Undo / Redo
  useEffect(() => {
    const handleUndoRedoKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleUndoRedoKeys);
    return () => window.removeEventListener('keydown', handleUndoRedoKeys);
  }, [undo, redo]);

  // Debounced Autosave to localStorage
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('resume-data', JSON.stringify(resumeData));
        setSavedAt(new Date());
      } catch (err) {
        console.error('Failed to autosave resume:', err);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [resumeData]);

  // Template & Theme
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('modern');
  const [theme, setTheme] = useState<ResumeTheme>({
    primaryColor: '#4f46e5',
    fontFamily: 'sans',
    spacing: 'normal',
    accentColor: '#818cf8',
  });

  // Section Ordering & Visibility
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'personal',
    'summary',
    'experience',
    'skills',
    'projects',
    'education',
    'certifications',
  ]);
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [forceOpenSection, setForceOpenSection] = useState<string | null>(null);

  const handleOpenSection = (id: string) => {
    setForceOpenSection(id);
    setTimeout(() => setForceOpenSection(null), 300);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedSection || draggedSection === targetId) return;
    setSectionOrder((prev) => {
      const next = prev.filter((id) => id !== draggedSection);
      const targetIdx = next.indexOf(targetId);
      next.splice(targetIdx, 0, draggedSection);
      return next;
    });
    setDraggedSection(null);
  };

  const toggleSectionHidden = (id: string) => {
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mobile active tab ('edit' | 'preview')
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  // Modals state
  const [isJobRadarOpen, setIsJobRadarOpen] = useState(false);
  const [isTrendAdvisorOpen, setIsTrendAdvisorOpen] = useState(false);
  const [isJobMatcherOpen, setIsJobMatcherOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Command Palette Ctrl+K Listener
  useEffect(() => {
    const handleCommandPaletteKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleCommandPaletteKey);
    return () => window.removeEventListener('keydown', handleCommandPaletteKey);
  }, []);

  // Live ATS Scoring
  const atsResult = useMemo(() => {
    return calculateLiveATSScore(resumeData);
  }, [resumeData]);

  // Load preset sample
  const handleLoadSample = (key: string) => {
    if (sampleProfiles[key]) {
      pushHistory(sampleProfiles[key]);
      showToast(`Loaded sample profile: ${key}`, 'info');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.1 },
      });
    }
  };

  // Export JSON backup
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(resumeData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${resumeData.personalInfo.fullName.replace(/\s+/g, '_') || 'My'}_Resume.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Resume JSON backup exported', 'success');
  };

  // Import JSON backup
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.personalInfo) {
          pushHistory(parsed);
          showToast('JSON resume imported successfully', 'success');
          confetti({ particleCount: 60, spread: 70 });
        } else {
          showToast('Invalid resume JSON format.', 'error');
        }
      } catch (err) {
        showToast('Could not parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm resume upload from parser
  const handleConfirmUpload = (importedData: Partial<ResumeData>) => {
    const merged: ResumeData = {
      ...resumeData,
      ...importedData,
      personalInfo: {
        ...resumeData.personalInfo,
        ...(importedData.personalInfo || {}),
      },
      experience: importedData.experience || resumeData.experience,
      education: importedData.education || resumeData.education,
      projects: importedData.projects || resumeData.projects,
      skills: importedData.skills || resumeData.skills,
      certifications: importedData.certifications || resumeData.certifications,
    };
    pushHistory(merged);
    setShowOnboarding(false);
    localStorage.setItem('resume-data', JSON.stringify(merged));
    showToast('Resume imported and structured successfully!', 'success');
    confetti({ particleCount: 70, spread: 80 });
  };

  // Apply AI tailoring changes from JobMatcherModal
  const handleApplyTailoring = (changes: TailoredChanges) => {
    const updated: ResumeData = {
      ...resumeData,
      summary: changes.summary,
      experience: resumeData.experience.map((exp, idx) => {
        const match = changes.experienceBullets.find((b) => b.index === idx);
        return match ? { ...exp, highlights: match.bullets } : exp;
      }),
    };
    pushHistory(updated);
    showToast('Resume successfully tailored to job!', 'success');
  };

  // Direct PDF Download
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const fileName = `${resumeData.personalInfo.fullName.replace(/\s+/g, '_') || 'My'}_Resume.pdf`;
      await exportResumeToPdf('resume-pdf-sheet', fileName);
      showToast('PDF downloaded successfully!', 'success');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error(err);
      showToast('Issue generating direct PDF. Falling back to native print...', 'info');
      printResume();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const renderSectionItem = (sectionId: string) => {
    const isHidden = hiddenSections.has(sectionId);
    const isForced = forceOpenSection === sectionId;

    switch (sectionId) {
      case 'personal':
        return (
          <FormSection
            key="personal"
            id="personal"
            title="Personal & Contact Info"
            icon={<User className="w-4 h-4" />}
            badge="Required"
            defaultOpen={true}
            forceOpen={isForced}
            draggable={true}
            onDragStart={() => setDraggedSection('personal')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('personal')}
            isHidden={isHidden}
            onToggleHidden={() => toggleSectionHidden('personal')}
          >
            <PersonalInfoForm
              data={resumeData.personalInfo}
              onChange={(personalInfo) => pushHistory({ ...resumeData, personalInfo })}
            />
          </FormSection>
        );

      case 'summary':
        return (
          <FormSection
            key="summary"
            id="summary"
            title="Professional Summary"
            icon={<FileText className="w-4 h-4" />}
            badge="AI Assist"
            defaultOpen={true}
            forceOpen={isForced}
            draggable={true}
            onDragStart={() => setDraggedSection('summary')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('summary')}
            isHidden={isHidden}
            onToggleHidden={() => toggleSectionHidden('summary')}
          >
            <SummaryForm
              summary={resumeData.summary}
              resumeData={resumeData}
              onChange={(summary) => pushHistory({ ...resumeData, summary })}
            />
          </FormSection>
        );

      case 'experience':
        return (
          <FormSection
            key="experience"
            id="experience"
            title="Work Experience"
            icon={<Briefcase className="w-4 h-4" />}
            badge={`${resumeData.experience.length} Roles`}
            defaultOpen={true}
            forceOpen={isForced}
            draggable={true}
            onDragStart={() => setDraggedSection('experience')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('experience')}
            isHidden={isHidden}
            onToggleHidden={() => toggleSectionHidden('experience')}
          >
            <ExperienceForm
              experience={resumeData.experience}
              onChange={(experience) => pushHistory({ ...resumeData, experience })}
            />
          </FormSection>
        );

      case 'skills':
        return (
          <FormSection
            key="skills"
            id="skills"
            title="Skills & Technologies"
            icon={<Wrench className="w-4 h-4" />}
            badge={`${resumeData.skills.reduce((acc, cat) => acc + cat.skills.length, 0)} Skills`}
            defaultOpen={false}
            forceOpen={isForced}
            draggable={true}
            onDragStart={() => setDraggedSection('skills')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('skills')}
            isHidden={isHidden}
            onToggleHidden={() => toggleSectionHidden('skills')}
          >
            <SkillsForm
              skills={resumeData.skills}
              onChange={(skills) => pushHistory({ ...resumeData, skills })}
            />
          </FormSection>
        );

      case 'projects':
        return (
          <FormSection
            key="projects"
            id="projects"
            title="Projects & Open Source"
            icon={<FolderGit2 className="w-4 h-4" />}
            badge={`${resumeData.projects.length} Projects`}
            defaultOpen={false}
            forceOpen={isForced}
            draggable={true}
            onDragStart={() => setDraggedSection('projects')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('projects')}
            isHidden={isHidden}
            onToggleHidden={() => toggleSectionHidden('projects')}
          >
            <ProjectsForm
              projects={resumeData.projects}
              onChange={(projects) => pushHistory({ ...resumeData, projects })}
            />
          </FormSection>
        );

      case 'education':
        return (
          <FormSection
            key="education"
            id="education"
            title="Education & Degrees"
            icon={<GraduationCap className="w-4 h-4" />}
            badge={`${resumeData.education.length} Entries`}
            defaultOpen={false}
            forceOpen={isForced}
            draggable={true}
            onDragStart={() => setDraggedSection('education')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('education')}
            isHidden={isHidden}
            onToggleHidden={() => toggleSectionHidden('education')}
          >
            <EducationForm
              education={resumeData.education}
              onChange={(education) => pushHistory({ ...resumeData, education })}
            />
          </FormSection>
        );

      case 'certifications':
        return (
          <FormSection
            key="certifications"
            id="certifications"
            title="Certifications & Credentials"
            icon={<Award className="w-4 h-4" />}
            badge={`${resumeData.certifications.length} Certs`}
            defaultOpen={false}
            forceOpen={isForced}
            draggable={true}
            onDragStart={() => setDraggedSection('certifications')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop('certifications')}
            isHidden={isHidden}
            onToggleHidden={() => toggleSectionHidden('certifications')}
          >
            <CertificationsForm
              certifications={resumeData.certifications}
              onChange={(certifications) => pushHistory({ ...resumeData, certifications })}
            />
          </FormSection>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas font-sans selection:bg-brand-600 selection:text-white">
      {/* Top Navbar */}
      <Header
        atsResult={atsResult}
        onOpenJobMatcher={() => setIsJobMatcherOpen(true)}
        onOpenJobRadar={() => setIsJobRadarOpen(true)}
        onOpenTrendAdvisor={() => setIsTrendAdvisorOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onLoadSample={handleLoadSample}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onPrint={printResume}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isDownloadingPdf}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        savedAt={savedAt}
        onOpenUpload={() => setIsUploadModalOpen(true)}
      />

      {showOnboarding ? (
        /* Full-Screen Centered Onboarding Flow */
        <div className="flex-1 flex items-center justify-center p-6 bg-canvas canvas-dots">
          <div className="w-full max-w-3xl card shadow-paper p-8 text-center space-y-8 animate-in zoom-in-95">
            <div>
              <div className="inline-flex p-3 rounded-2xl bg-brand-50 text-brand-600 mb-3 shadow-soft">
                <FileText className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold font-display text-ink tracking-tight">
                Welcome to ResumeCraft AI
              </h1>
              <p className="text-sm text-ink/50 mt-1 max-w-md mx-auto">
                How would you like to build your ATS-optimized executive resume today?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
              {/* Card 1: Upload Resume */}
              <div
                onClick={() => setIsUploadModalOpen(true)}
                className="card p-5 border border-black/[0.08] hover:border-brand-500 hover:shadow-paper/70 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-brand-600 transition-colors">
                    Upload Resume
                  </h3>
                  <p className="text-xs text-ink/50 mt-1.5 leading-relaxed">
                    Import existing PDF, Word, or JSON file. Gemini extracts and structures your data automatically.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/[0.05] text-[11px] font-bold text-brand-600 flex items-center gap-1">
                  <span>Import Document →</span>
                </div>
              </div>

              {/* Card 2: Start from Sample */}
              <div className="card p-5 border border-black/[0.08] hover:border-brand-500 hover:shadow-paper/70 transition-all flex flex-col justify-between">
                <div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 w-fit mb-3">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink">
                    Start from Sample
                  </h3>
                  <p className="text-xs text-ink/50 mt-1.5 leading-relaxed">
                    Pick a production-grade curated sample profile to edit and customize.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/[0.05] space-y-1.5">
                  <button
                    onClick={() => {
                      handleLoadSample('aiEngineer');
                      setShowOnboarding(false);
                      localStorage.setItem('resume-data', JSON.stringify(sampleProfiles.aiEngineer));
                    }}
                    className="w-full text-left px-2 py-1 text-[11px] font-semibold text-ink/70 hover:text-brand-600 hover:bg-brand-50 rounded transition"
                  >
                    • AI Engineer
                  </button>
                  <button
                    onClick={() => {
                      handleLoadSample('fullStack');
                      setShowOnboarding(false);
                      localStorage.setItem('resume-data', JSON.stringify(sampleProfiles.fullStack));
                    }}
                    className="w-full text-left px-2 py-1 text-[11px] font-semibold text-ink/70 hover:text-brand-600 hover:bg-brand-50 rounded transition"
                  >
                    • Full-Stack Dev
                  </button>
                  <button
                    onClick={() => {
                      handleLoadSample('fresherStudent');
                      setShowOnboarding(false);
                      localStorage.setItem('resume-data', JSON.stringify(sampleProfiles.fresherStudent));
                    }}
                    className="w-full text-left px-2 py-1 text-[11px] font-semibold text-ink/70 hover:text-brand-600 hover:bg-brand-50 rounded transition"
                  >
                    • Graduate / Fresher
                  </button>
                </div>
              </div>

              {/* Card 3: Start Blank */}
              <div
                onClick={() => {
                  pushHistory(blankResumeData);
                  setShowOnboarding(false);
                  localStorage.setItem('resume-data', JSON.stringify(blankResumeData));
                  showToast('Started with a blank resume', 'info');
                }}
                className="card p-5 border border-black/[0.08] hover:border-brand-500 hover:shadow-paper/70 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-brand-600 transition-colors">
                    Start Blank
                  </h3>
                  <p className="text-xs text-ink/50 mt-1.5 leading-relaxed">
                    Build from scratch with a completely clean slate, filling each section guided by AI suggestions.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/[0.05] text-[11px] font-bold text-ink/60 flex items-center gap-1">
                  <span>Create Clean Slate →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Tab Toggle */}
          <div className="no-print lg:hidden flex border-b border-black/[0.06] bg-white sticky top-14 z-30">
            <button
              onClick={() => setMobileTab('edit')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                mobileTab === 'edit'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-ink/50 hover:text-ink'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                mobileTab === 'preview'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-ink/50 hover:text-ink'
              }`}
            >
              <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Preview (ATS: {atsResult.score})</span>
            </button>
          </div>

          {/* Main Split-Screen Workspace */}
          <main className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-56px)]">
            {/* Left: Editor Panel */}
            <div
              className={`no-print w-full lg:w-[420px] xl:w-[480px] lg:shrink-0 h-full overflow-y-auto p-4 space-y-3 border-r border-black/[0.06] bg-canvas ${
                mobileTab === 'edit' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between py-1">
                <div>
                  <h2 className="text-sm font-semibold text-ink tracking-tight">Resume Content</h2>
                  <p className="text-[11px] text-ink/40 mt-0.5">Live preview updates in real-time.</p>
                </div>
                <div className="badge">
                  <Sparkles className="w-3 h-3 mr-1" strokeWidth={1.75} />
                  AI Active
                </div>
              </div>

              {/* Completeness Bar */}
              <CompletenessBar data={resumeData} />

              {/* Section Nav */}
              <SectionNav onOpenSection={handleOpenSection} />

              {/* Form Sections (Orderable & Hideable) */}
              <div className="space-y-3">
                {sectionOrder.map((secId) => renderSectionItem(secId))}
              </div>
            </div>

            {/* Right: Live Preview */}
            <div
              className={`w-full lg:flex-1 h-full overflow-hidden ${
                mobileTab === 'preview' ? 'block' : 'hidden lg:block'
              }`}
            >
              <ResumePreview
                data={resumeData}
                activeTemplate={activeTemplate}
                onChangeTemplate={setActiveTemplate}
                theme={theme}
                onChangeTheme={setTheme}
              />
            </div>
          </main>
        </>
      )}

      {/* Feature Modals */}
      <JobRadarModal
        isOpen={isJobRadarOpen}
        onClose={() => setIsJobRadarOpen(false)}
        resumeData={resumeData}
      />

      <TrendAdvisorModal
        isOpen={isTrendAdvisorOpen}
        onClose={() => setIsTrendAdvisorOpen(false)}
        resumeData={resumeData}
      />

      <JobMatcherModal
        isOpen={isJobMatcherOpen}
        onClose={() => setIsJobMatcherOpen(false)}
        resumeData={resumeData}
        initialAtsResult={atsResult}
        onApplyTailoring={handleApplyTailoring}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      <ResumeUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onConfirm={handleConfirmUpload}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTemplate={setActiveTemplate}
        onJumpSection={(id) => {
          handleOpenSection(id);
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onExportJson={handleExportJson}
        onLoadSample={handleLoadSample}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
};

export default App;
