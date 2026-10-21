import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  X,
  ArrowRight,
  AlertTriangle,
  Download,
  Sliders,
  Target,
} from 'lucide-react';
import type { ResumeData, ResumeTheme, TemplateType, ATSProfile } from './types/resume';
import { sampleProfiles } from './data/sampleData';
import {
  calculateLiveATSScore,
  isResumeEmpty,
  getAllATSProfiles,
  getActiveProfileId,
  setActiveProfileId,
} from './services/atsScorer';
import {
  getInitialTheme,
  applyTheme,
  toggleLightDarkTheme,
  type ThemeId,
} from './services/themeService';
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
import { Modal } from './components/common/Modal';
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

  // Single Unified App Theme State
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(getInitialTheme);

  const handleToggleTheme = () => {
    setCurrentTheme((prev) => toggleLightDarkTheme(prev));
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
  };

  // Job Matcher Initial Tab State (for Custom ATS shortcuts)
  const [jobMatcherInitialTab, setJobMatcherInitialTab] = useState<'jd_matcher' | 'ats_profile' | 'create_profile'>('jd_matcher');

  const handleOpenCustomAts = () => {
    setJobMatcherInitialTab('create_profile');
    openModal(setIsJobMatcherOpen);
  };

  // ATS Profiles state
  const [activeProfileId, setActiveProfileIdState] = useState<string>(() => getActiveProfileId());
  const [allProfiles, setAllProfiles] = useState<ATSProfile[]>(() => getAllATSProfiles());

  const handleSelectProfileId = (id: string) => {
    setActiveProfileIdState(id);
    setActiveProfileId(id);
  };

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

  // Confirmation state before overwriting resume
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    type: 'sample' | 'blank';
    key?: string;
  } | null>(null);

  // Track open layers with a ref so popstate event listener always reads current state
  const openLayersRef = useRef({
    pendingOverwrite: false,
    isUploadModalOpen: false,
    isJobMatcherOpen: false,
    isJobRadarOpen: false,
    isTrendAdvisorOpen: false,
    isApiKeyModalOpen: false,
    isCommandPaletteOpen: false,
    showOnboarding: false,
    hasResumeData: false,
  });

  useEffect(() => {
    openLayersRef.current = {
      pendingOverwrite: !!pendingOverwrite,
      isUploadModalOpen,
      isJobMatcherOpen,
      isJobRadarOpen,
      isTrendAdvisorOpen,
      isApiKeyModalOpen,
      isCommandPaletteOpen,
      showOnboarding,
      hasResumeData: !isResumeEmpty(resumeData),
    };
  }, [
    pendingOverwrite,
    isUploadModalOpen,
    isJobMatcherOpen,
    isJobRadarOpen,
    isTrendAdvisorOpen,
    isApiKeyModalOpen,
    isCommandPaletteOpen,
    showOnboarding,
    resumeData,
  ]);

  // History API helper to close the topmost open layer
  const closeTopmostDirectly = useCallback(() => {
    const cur = openLayersRef.current;
    if (cur.pendingOverwrite) setPendingOverwrite(null);
    else if (cur.isUploadModalOpen) setIsUploadModalOpen(false);
    else if (cur.isJobMatcherOpen) setIsJobMatcherOpen(false);
    else if (cur.isJobRadarOpen) setIsJobRadarOpen(false);
    else if (cur.isTrendAdvisorOpen) setIsTrendAdvisorOpen(false);
    else if (cur.isApiKeyModalOpen) setIsApiKeyModalOpen(false);
    else if (cur.isCommandPaletteOpen) setIsCommandPaletteOpen(false);
    else if (cur.showOnboarding && cur.hasResumeData) setShowOnboarding(false);
  }, []);

  const closeLayer = useCallback(() => {
    if (window.history.state?.layer === 'modal' || window.history.state?.layer === 'home') {
      window.history.back();
    } else {
      closeTopmostDirectly();
    }
  }, [closeTopmostDirectly]);

  // Open layer helpers that push history state
  const openModal = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    window.history.pushState({ layer: 'modal' }, '');
    setter(true);
  }, []);

  const openHome = useCallback(() => {
    window.history.pushState({ layer: 'home' }, '');
    setShowOnboarding(true);
  }, []);

  // History API: push base state on first load, handle browser Back button via popstate
  useEffect(() => {
    if (!window.history.state || window.history.state.layer !== 'base') {
      window.history.replaceState({ layer: 'base' }, '');
    }
    if (showOnboarding) {
      window.history.pushState({ layer: 'home' }, '');
    }

    const handlePopState = () => {
      const cur = openLayersRef.current;

      // 1. Close any open modal first
      if (cur.pendingOverwrite) {
        setPendingOverwrite(null);
        return;
      }
      if (cur.isUploadModalOpen) {
        setIsUploadModalOpen(false);
        return;
      }
      if (cur.isJobMatcherOpen) {
        setIsJobMatcherOpen(false);
        return;
      }
      if (cur.isJobRadarOpen) {
        setIsJobRadarOpen(false);
        return;
      }
      if (cur.isTrendAdvisorOpen) {
        setIsTrendAdvisorOpen(false);
        return;
      }
      if (cur.isApiKeyModalOpen) {
        setIsApiKeyModalOpen(false);
        return;
      }
      if (cur.isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
        return;
      }

      // 2. If no modal, close Home (if open and user already has data)
      if (cur.showOnboarding && cur.hasResumeData) {
        setShowOnboarding(false);
        return;
      }

      // 3. Never exit the app — re-push base state so user stays in app
      window.history.pushState({ layer: 'base' }, '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Command Palette Ctrl+K Listener
  useEffect(() => {
    const handleCommandPaletteKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => {
          if (!prev) {
            window.history.pushState({ layer: 'modal' }, '');
            return true;
          } else {
            closeLayer();
            return false;
          }
        });
      }
    };
    window.addEventListener('keydown', handleCommandPaletteKey);
    return () => window.removeEventListener('keydown', handleCommandPaletteKey);
  }, [closeLayer]);

  // Live ATS Scoring with activeProfileId
  const atsResult = useMemo(() => {
    return calculateLiveATSScore(resumeData, activeProfileId);
  }, [resumeData, activeProfileId]);

  // Esc key closes Home layer if user already has data and no modal is open
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const cur = openLayersRef.current;
        // Modals manage their own Escape key via Modal component
        if (
          cur.pendingOverwrite ||
          cur.isUploadModalOpen ||
          cur.isJobMatcherOpen ||
          cur.isJobRadarOpen ||
          cur.isTrendAdvisorOpen ||
          cur.isApiKeyModalOpen ||
          cur.isCommandPaletteOpen
        ) {
          return;
        }
        if (cur.showOnboarding && cur.hasResumeData) {
          closeLayer();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeLayer]);

  // Execute confirmed overwrite
  const handleExecuteOverwrite = (saveFirst = false) => {
    if (saveFirst) {
      handleExportJson();
    }
    if (!pendingOverwrite) return;

    if (pendingOverwrite.type === 'blank') {
      pushHistory(blankResumeData);
      setShowOnboarding(false);
      localStorage.setItem('resume-data', JSON.stringify(blankResumeData));
      showToast('Started with a blank resume', 'info');
    } else if (pendingOverwrite.type === 'sample' && pendingOverwrite.key) {
      const sample = sampleProfiles[pendingOverwrite.key];
      if (sample) {
        pushHistory(sample);
        setShowOnboarding(false);
        localStorage.setItem('resume-data', JSON.stringify(sample));
        showToast(`Loaded sample: ${pendingOverwrite.key}`, 'success');
        confetti({ particleCount: 50, spread: 60 });
      }
    }
    setPendingOverwrite(null);
    window.history.replaceState({ layer: 'base' }, '');
  };

  // Safe handler for clicking sample
  const handleRequestSample = (key: string) => {
    if (!isResumeEmpty(resumeData)) {
      window.history.pushState({ layer: 'modal' }, '');
      setPendingOverwrite({ type: 'sample', key });
    } else {
      handleLoadSample(key);
      setShowOnboarding(false);
      localStorage.setItem('resume-data', JSON.stringify(sampleProfiles[key]));
    }
  };

  // Safe handler for clicking blank
  const handleRequestBlank = () => {
    if (!isResumeEmpty(resumeData)) {
      window.history.pushState({ layer: 'modal' }, '');
      setPendingOverwrite({ type: 'blank' });
    } else {
      pushHistory(blankResumeData);
      setShowOnboarding(false);
      localStorage.setItem('resume-data', JSON.stringify(blankResumeData));
      showToast('Started with a blank resume', 'info');
    }
  };

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
    setIsUploadModalOpen(false);
    localStorage.setItem('resume-data', JSON.stringify(merged));
    window.history.replaceState({ layer: 'base' }, '');
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
    <div className="min-h-screen flex flex-col bg-canvas font-sans">
      {/* Top Navbar */}
      <Header
        atsResult={atsResult}
        onOpenJobMatcher={() => openModal(setIsJobMatcherOpen)}
        onOpenJobRadar={() => openModal(setIsJobRadarOpen)}
        onOpenTrendAdvisor={() => openModal(setIsTrendAdvisorOpen)}
        onOpenApiKeyModal={() => openModal(setIsApiKeyModalOpen)}
        onLoadSample={handleLoadSample}
        onExportJson={handleExportJson}
        onPrint={printResume}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isDownloadingPdf}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        savedAt={savedAt}
        onOpenUpload={() => openModal(setIsUploadModalOpen)}
        onOpenHome={openHome}
        onNewResume={() => {
          if (!isResumeEmpty(resumeData)) {
            window.history.pushState({ layer: 'modal' }, '');
            setPendingOverwrite({ type: 'blank' });
          } else {
            pushHistory(blankResumeData);
            showToast('Started blank resume', 'info');
          }
        }}
        allProfiles={allProfiles}
        activeProfileId={activeProfileId}
        onSelectProfileId={handleSelectProfileId}
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
        onOpenCustomAts={handleOpenCustomAts}
        isHomeOpen={showOnboarding}
      />

      {/* Full-Screen Centered Onboarding / Home Layer (fixed inset-0 top-14) */}
      {showOnboarding && (
        <div className="fixed inset-0 top-14 z-30 bg-canvas canvas-dots overflow-y-auto flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl card shadow-paper p-6 sm:p-8 text-center space-y-6 sm:space-y-7 relative border border-line my-auto">
            {/* Close button if user already has data */}
            {!isResumeEmpty(resumeData) && (
              <button
                type="button"
                onClick={closeLayer}
                className="absolute top-4 right-4 p-2 rounded-xl text-ink/40 hover:text-ink hover:bg-muted transition"
                title="Continue editing (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div>
              <div className="inline-flex p-3 rounded-2xl bg-brand-50 text-brand-600 mb-2 shadow-soft">
                <FileText className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold font-display text-ink tracking-tight">
                ResumeCraft AI Studio
              </h1>
              <p className="text-xs text-ink/60 mt-1 max-w-md mx-auto">
                Build, optimize, and tailor your executive ATS-ready resume with Gemini 3.8 AI
              </p>
            </div>

            {/* Main Options Grid */}
            <div className={`grid grid-cols-1 ${!isResumeEmpty(resumeData) ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-4 text-left`}>
              {/* Card 0: Continue Editing (when resume has content) */}
              {!isResumeEmpty(resumeData) && (
                <div
                  onClick={closeLayer}
                  className="card p-5 border border-brand-500/30 bg-card hover:ring-2 hover:ring-brand-500 hover:shadow-paper/70 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 w-fit mb-3 group-hover:scale-105 transition-transform">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-ink group-hover:text-brand-600 transition-colors">
                      Continue Editing
                    </h3>
                    <p className="text-xs text-ink/60 mt-1 leading-relaxed">
                      Resume editing "{resumeData.personalInfo.fullName || 'Untitled'}" with current live changes.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line text-xs font-bold text-brand-600 flex items-center gap-1">
                    <span>Back to Workspace →</span>
                  </div>
                </div>
              )}

              {/* Card 1: Upload Resume */}
              <div
                onClick={() => openModal(setIsUploadModalOpen)}
                className="card p-5 border border-line bg-card hover:ring-2 hover:ring-brand-500 hover:shadow-paper/70 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-brand-600 transition-colors">
                    Upload Resume
                  </h3>
                  <p className="text-xs text-ink/60 mt-1 leading-relaxed">
                    Import existing PDF, Word, JSON, or TXT file. Gemini extracts and structures your data automatically.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-line text-xs font-bold text-brand-600 flex items-center gap-1">
                  <span>Import Document →</span>
                </div>
              </div>

              {/* Card 2: Start from Sample */}
              <div
                className="card p-5 border border-line bg-card hover:ring-2 hover:ring-brand-500 hover:shadow-paper/70 transition-all flex flex-col justify-between cursor-pointer group"
                onClick={() => handleRequestSample('aiEngineer')}
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-brand-600 transition-colors">
                    Start from Sample
                  </h3>
                  <p className="text-xs text-ink/60 mt-1 leading-relaxed">
                    Pick a production-grade curated sample profile to customize.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-line space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleRequestSample('aiEngineer')}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-ink/70 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                  >
                    • AI Engineer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestSample('fullStack')}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-ink/70 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                  >
                    • Full-Stack Dev
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestSample('fresherStudent')}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-ink/70 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                  >
                    • Graduate / Fresher
                  </button>
                </div>
              </div>

              {/* Card 3: Start Blank */}
              <div
                onClick={handleRequestBlank}
                className="card p-5 border border-line bg-card hover:ring-2 hover:ring-brand-500 hover:shadow-paper/70 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-muted text-ink/70 w-fit mb-3 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink group-hover:text-brand-600 transition-colors">
                    Start Blank
                  </h3>
                  <p className="text-xs text-ink/60 mt-1 leading-relaxed">
                    Build from scratch with a clean slate, filling each section guided by AI suggestions.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-line text-xs font-bold text-ink/60 flex items-center gap-1">
                  <span>Create Clean Slate →</span>
                </div>
              </div>
            </div>

            {/* Slim Banner: Add Custom ATS Profile */}
            <div
              onClick={() => {
                closeLayer();
                handleOpenCustomAts();
              }}
              className="p-3 bg-muted/60 border border-line rounded-xl flex items-center justify-between cursor-pointer hover:border-brand-500 hover:bg-muted transition text-xs group"
            >
              <div className="flex items-center gap-2 text-ink/70 group-hover:text-ink">
                <Target className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Have your own ATS format?</span>
              </div>
              <span className="font-bold text-brand-600 group-hover:underline flex items-center gap-1">
                <span>Add a custom ATS profile</span>
                <span>→</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tab Toggle */}
      <div className="no-print lg:hidden flex border-b border-line bg-card sticky top-14 z-20">
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
          className={`no-print w-full lg:w-[420px] xl:w-[480px] lg:shrink-0 h-full overflow-y-auto p-4 space-y-3 border-r border-line bg-canvas ${
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

          {/* Quick Actions: Upload Resume & Custom ATS format (Always Visible) */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={() => openModal(setIsUploadModalOpen)}
              className="p-2.5 rounded-xl border border-line bg-card hover:border-brand-500 hover:shadow-soft transition text-left flex items-start gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600 shrink-0 group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-ink group-hover:text-brand-600 transition truncate">
                  Upload resume
                </span>
                <span className="block text-[10px] text-ink/50 truncate">
                  PDF/DOCX/JSON/TXT
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenCustomAts}
              className="p-2.5 rounded-xl border border-line bg-card hover:border-brand-500 hover:shadow-soft transition text-left flex items-start gap-2.5 group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600 shrink-0 group-hover:scale-105 transition-transform">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-ink group-hover:text-brand-600 transition truncate">
                  Custom ATS format
                </span>
                <span className="block text-[10px] text-ink/50 truncate">
                  paste or upload rubric
                </span>
              </div>
            </button>
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
            onOpenUpload={() => openModal(setIsUploadModalOpen)}
            onOpenCustomAts={handleOpenCustomAts}
            onLoadSample={handleLoadSample}
          />
        </div>
      </main>

      {/* Overwrite Confirmation Modal */}
      <Modal
        isOpen={!!pendingOverwrite}
        onClose={closeLayer}
        title="Existing Resume Detected"
        icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
        maxWidth="max-w-md"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={closeLayer}
              className="btn-ghost h-9 px-3.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleExecuteOverwrite(false)}
              className="btn-outline h-9 px-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              Overwrite Without Saving
            </button>
            <button
              type="button"
              onClick={() => handleExecuteOverwrite(true)}
              className="btn-primary h-9 px-3.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Backup & Continue</span>
            </button>
          </div>
        }
      >
        <div className="p-5 space-y-3 bg-card">
          <p className="text-xs text-ink/80 leading-relaxed">
            You already have resume content in memory ({resumeData.personalInfo.fullName || 'Active Resume'}). Loading a new profile or starting blank will replace your current workspace.
          </p>
          <p className="text-[11px] text-ink/60">
            Would you like to export your current resume as a JSON backup first?
          </p>
        </div>
      </Modal>

      {/* Feature Modals */}
      <JobRadarModal
        isOpen={isJobRadarOpen}
        onClose={closeLayer}
        resumeData={resumeData}
      />

      <TrendAdvisorModal
        isOpen={isTrendAdvisorOpen}
        onClose={closeLayer}
        resumeData={resumeData}
      />

      <JobMatcherModal
        isOpen={isJobMatcherOpen}
        onClose={closeLayer}
        resumeData={resumeData}
        initialAtsResult={atsResult}
        initialTab={jobMatcherInitialTab}
        onApplyTailoring={handleApplyTailoring}
        onProfileChanged={(id) => {
          setActiveProfileIdState(id);
          setAllProfiles(getAllATSProfiles());
        }}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={closeLayer}
        currentTheme={currentTheme}
        onThemeChange={handleSelectTheme}
      />

      <ResumeUploadModal
        isOpen={isUploadModalOpen}
        onClose={closeLayer}
        onConfirm={handleConfirmUpload}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeLayer}
        onSelectTemplate={setActiveTemplate}
        onJumpSection={(id) => {
          handleOpenSection(id);
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        onOpenUpload={() => openModal(setIsUploadModalOpen)}
        onExportJson={handleExportJson}
        onLoadSample={handleLoadSample}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
};

export default App;
