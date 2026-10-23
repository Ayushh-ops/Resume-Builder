import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  Eye,
  Edit3,
  Upload,
  AlertTriangle,
  Download,
  Plus,
  MoreVertical,
  Copy,
  Trash2,
  FolderOpen,
  CheckCircle2,
  Target,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import type { ResumeData, ResumeTheme, TemplateType, ATSProfile } from './types/resume';
import { sampleProfiles } from './data/sampleData';
import {
  calculateLiveATSScore,
  isResumeEmptyForAts,
  getAllATSProfiles,
  getActiveProfileId,
  setActiveProfileId,
} from './services/atsScorer';
import { InstantCheck } from './components/InstantCheck';
import { getChecklistItems } from './components/Modals/ResumeUploadModal';
import { ModernTemplate } from './components/Preview/templates/ModernTemplate';
import {
  getInitialTheme,
  applyTheme,
  toggleLightDarkTheme,
  THEME_PRESETS,
  type ThemeId,
} from './services/themeService';
import {
  initResumeStorage,
  getResumeIndex,
  getResume,
  saveResume,
  createResume,
  duplicateResume,
  renameResume,
  deleteResume,
  setActiveResumeId,
  blankResumeData,
  isResumeCompletelyEmpty,
  humanizeFileName,
  type ResumeIndexEntry,
} from './services/resumeStorage';
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
import { SampleSelectorModal } from './components/Modals/SampleSelectorModal';
import { Modal } from './components/common/Modal';
import { CommandPalette } from './components/CommandPalette';
import { useToast } from './components/common/Toast';
import { printResume, exportResumeToPdf } from './utils/pdfExport';
import type { TailoredChanges } from './services/geminiService';

type Route =
  | { type: 'home' }
  | { type: 'editor'; resumeId: string };

const pathToRoute = (pathname: string): Route => {
  const match = pathname.match(/^\/(?:editor|r)\/([^/]+)/);
  if (match) {
    return { type: 'editor', resumeId: match[1] };
  }
  return { type: 'home' };
};

const migrateHashToPath = (): string => {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash;
  if (hash) {
    const clean = hash.replace(/^#\/?/, '');
    let newPath = '/';
    if (clean.startsWith('r/')) {
      newPath = `/editor/${clean.slice(2)}`;
    } else if (clean.startsWith('editor/')) {
      newPath = `/editor/${clean.slice(7)}`;
    } else if (clean && clean !== '/') {
      newPath = `/editor/${clean}`;
    }
    window.history.replaceState(null, '', newPath);
    return newPath;
  }
  return window.location.pathname || '/';
};

const formatRelativeTime = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const computeInitialRoute = (index: ResumeIndexEntry[]): Route => {
  const currentPath = migrateHashToPath();
  const route = pathToRoute(currentPath);
  if (route.type === 'editor') {
    const exists = index.some((item) => item.id === route.resumeId);
    if (exists && getResume(route.resumeId)) {
      return route;
    }
  }
  return { type: 'home' };
};

export const App: React.FC = () => {
  const { showToast } = useToast();

  // Storage initialization and initial index
  const [resumeIndex, setResumeIndex] = useState<ResumeIndexEntry[]>(() => initResumeStorage());

  // Routing State
  const [route, setRoute] = useState<Route>(() => computeInitialRoute(resumeIndex));

  const navigate = useCallback((path: string) => {
    if (window.location.pathname === path && !window.location.hash) return;
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // Current Resume Data
  const [resumeData, setResumeData] = useState<ResumeData>(() => {
    const initial = computeInitialRoute(resumeIndex);
    if (initial.type === 'editor') {
      const loaded = getResume(initial.resumeId);
      if (loaded) return loaded;
    }
    return blankResumeData;
  });

  // Undo / Redo History per resume
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

  // ATS Profiles state
  const [activeProfileId, setActiveProfileIdState] = useState<string>(() => getActiveProfileId());
  const [allProfiles, setAllProfiles] = useState<ATSProfile[]>(() => getAllATSProfiles());

  const handleSelectProfileId = (id: string) => {
    setActiveProfileIdState(id);
    setActiveProfileId(id);
  };

  // Live ATS Scoring with activeProfileId
  const atsResult = useMemo(() => {
    return calculateLiveATSScore(resumeData, activeProfileId);
  }, [resumeData, activeProfileId]);

  // Debounced Autosave to localStorage (per resume)
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (route.type !== 'editor' || !route.resumeId) return;

    const timer = setTimeout(() => {
      try {
        saveResume(route.resumeId, resumeData, undefined, atsResult.score);
        setResumeIndex(getResumeIndex());
        setSavedAt(new Date());
      } catch (err) {
        console.error('Failed to autosave resume:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [resumeData, route, atsResult.score]);

  // Track IDs created in this session so we never show "Resume not found"
  const justCreatedIdsRef = useRef<Set<string>>(new Set());

  // Sync routing and resume data loading via History API (popstate)
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = migrateHashToPath();
      const currentRoute = pathToRoute(pathname);

      if (currentRoute.type === 'editor') {
        const id = currentRoute.resumeId;
        const loaded = getResume(id);
        if (loaded) {
          setRoute({ type: 'editor', resumeId: id });
          setResumeData(loaded);
          setHistory([loaded]);
          setHistoryIndex(0);
          setActiveResumeId(id);
          return;
        }
        if (!justCreatedIdsRef.current.has(id)) {
          showToast('Resume not found', 'error');
        }
        window.history.replaceState(null, '', '/');
        setRoute({ type: 'home' });
        return;
      }

      setRoute({ type: 'home' });
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [showToast]);

  // Initial load path synchronization
  useEffect(() => {
    const pathname = migrateHashToPath();
    const currentRoute = pathToRoute(pathname);

    if (currentRoute.type === 'editor') {
      const id = currentRoute.resumeId;
      const loaded = getResume(id);
      if (!loaded) {
        if (!justCreatedIdsRef.current.has(id)) {
          showToast('Resume not found', 'error');
        }
        window.history.replaceState(null, '', '/');
        setRoute({ type: 'home' });
      } else {
        setResumeData(loaded);
        setHistory([loaded]);
        setHistoryIndex(0);
        setActiveResumeId(id);
      }
    } else {
      if (pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
      setRoute({ type: 'home' });
    }
  }, [showToast]);

  // Single Unified App Theme State
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(getInitialTheme);

  const appAccent = useMemo(() => {
    return THEME_PRESETS.find((p) => p.id === currentTheme)?.accent || '#b4451f';
  }, [currentTheme]);

  // Template & Theme
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('modern');
  const [theme, setTheme] = useState<ResumeTheme>(() => ({
    primaryColor: '#b4451f',
    secondaryColor: '#475569',
    fontFamily: 'sans',
    spacing: 'normal',
    accentColor: '#b4451f',
  }));

  const handleToggleTheme = () => {
    setCurrentTheme((prev) => toggleLightDarkTheme(prev));
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
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
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Job Matcher Initial Tab State
  const [jobMatcherInitialTab, setJobMatcherInitialTab] = useState<'jd_matcher' | 'ats_profile' | 'create_profile'>('jd_matcher');

  // Confirmation Modal state for Delete & Replace
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'replace';
    resumeId?: string;
    resumeName?: string;
    dataToReplace?: Partial<ResumeData>;
  } | null>(null);

  // Non-empty resumes for the library
  const displayResumes = useMemo(() => {
    return resumeIndex.filter((entry) => {
      const data = getResume(entry.id);
      return !isResumeCompletelyEmpty(data);
    });
  }, [resumeIndex]);

  // Clean empty resumes from storage when returning to or viewing Home
  useEffect(() => {
    if (route.type === 'home') {
      const cleaned = initResumeStorage();
      setResumeIndex(cleaned);
    }
  }, [route.type]);

  // Home card dropdown menu & inline rename states
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [renamingCardId, setRenamingCardId] = useState<string | null>(null);
  const [cardRenameValue, setCardRenameValue] = useState('');
  const cardMenuRef = useRef<HTMLDivElement>(null);
  const [cardMenuPos, setCardMenuPos] = useState({ top: 0, right: 0 });

  const handleToggleCardMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openCardMenuId === id) {
      setOpenCardMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuHeight = 180;
      const menuWidth = 160;
      const fitsBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
      const idealTop = fitsBelow ? rect.bottom + 4 : rect.top - menuHeight - 4;
      const top = Math.max(8, Math.min(window.innerHeight - menuHeight - 8, idealTop));
      const right = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, window.innerWidth - rect.right));
      setCardMenuPos({ top, right });
      setOpenCardMenuId(id);
    }
  };

  // Drop zone states for Home landing
  const homeFileInputRef = useRef<HTMLInputElement>(null);
  const [homeDragActive, setHomeDragActive] = useState(false);
  const [uploadedFileForModal, setUploadedFileForModal] = useState<File | null>(null);

  const handleHomeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHomeDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFileForModal(e.dataTransfer.files[0]);
      openModal(setIsUploadModalOpen);
    }
  };

  const handleHomeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileForModal(e.target.files[0]);
      openModal(setIsUploadModalOpen);
      e.target.value = '';
    }
  };

  // Tool Launcher: opens most recent resume first (or creates a new blank one) then launches modal
  const openToolWithResume = (openModalFn: () => void) => {
    let targetId = displayResumes[0]?.id;
    if (!targetId || !getResume(targetId)) {
      const newId = createResume(blankResumeData, 'Untitled resume');
      justCreatedIdsRef.current.add(newId);
      setResumeIndex(getResumeIndex());
      targetId = newId;
    }
    navigate(`/editor/${targetId}`);
    setTimeout(() => {
      openModalFn();
    }, 50);
  };

  useEffect(() => {
    if (!openCardMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setOpenCardMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openCardMenuId]);

  // Modal History Stack helper (Modals pushState({modal: true}), Back closes topmost modal)
  const isClosingViaCodeRef = useRef(false);
  const openModalsRef = useRef({
    confirmAction: false,
    isUploadModalOpen: false,
    isSampleModalOpen: false,
    isJobMatcherOpen: false,
    isJobRadarOpen: false,
    isTrendAdvisorOpen: false,
    isApiKeyModalOpen: false,
    isCommandPaletteOpen: false,
  });

  useEffect(() => {
    openModalsRef.current = {
      confirmAction: !!confirmAction,
      isUploadModalOpen,
      isSampleModalOpen,
      isJobMatcherOpen,
      isJobRadarOpen,
      isTrendAdvisorOpen,
      isApiKeyModalOpen,
      isCommandPaletteOpen,
    };
  }, [
    confirmAction,
    isUploadModalOpen,
    isSampleModalOpen,
    isJobMatcherOpen,
    isJobRadarOpen,
    isTrendAdvisorOpen,
    isApiKeyModalOpen,
    isCommandPaletteOpen,
  ]);

  const openModal = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!window.history.state?.modal) {
      window.history.pushState({ modal: true }, '');
    }
    setter(true);
  }, []);

  const closeModal = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(false);
    if (window.history.state?.modal) {
      isClosingViaCodeRef.current = true;
      window.history.back();
    }
  }, []);

  const openConfirmModal = useCallback((action: typeof confirmAction) => {
    if (!window.history.state?.modal) {
      window.history.pushState({ modal: true }, '');
    }
    setConfirmAction(action);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setConfirmAction(null);
    if (window.history.state?.modal) {
      isClosingViaCodeRef.current = true;
      window.history.back();
    }
  }, []);

  // Browser Back popstate listener to close topmost modal first
  useEffect(() => {
    const handlePopState = () => {
      if (isClosingViaCodeRef.current) {
        isClosingViaCodeRef.current = false;
        return;
      }
      const cur = openModalsRef.current;
      if (cur.confirmAction) {
        setConfirmAction(null);
        return;
      }
      if (cur.isUploadModalOpen) {
        setIsUploadModalOpen(false);
        return;
      }
      if (cur.isSampleModalOpen) {
        setIsSampleModalOpen(false);
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
            if (!window.history.state?.modal) {
              window.history.pushState({ modal: true }, '');
            }
            return true;
          } else {
            if (window.history.state?.modal) {
              isClosingViaCodeRef.current = true;
              window.history.back();
            }
            return false;
          }
        });
      }
    };
    window.addEventListener('keydown', handleCommandPaletteKey);
    return () => window.removeEventListener('keydown', handleCommandPaletteKey);
  }, []);

  const handleOpenCustomAts = () => {
    setJobMatcherInitialTab('create_profile');
    openModal(setIsJobMatcherOpen);
  };

  const handleGoToSection = (sectionId: string, bulletRef?: string) => {
    setIsJobMatcherOpen(false);
    setIsTrendAdvisorOpen(false);
    setIsJobRadarOpen(false);
    setIsUploadModalOpen(false);
    setIsSampleModalOpen(false);

    if (route.type !== 'editor') {
      const targetId = resumeIndex[0]?.id;
      if (targetId) {
        navigate(`/editor/${targetId}`);
      } else {
        const newId = createResume(sampleProfiles.aiEngineer, 'AI Engineer Resume');
        justCreatedIdsRef.current.add(newId);
        setResumeIndex(getResumeIndex());
        navigate(`/editor/${newId}`);
      }
    }

    handleOpenSection(sectionId);

    setTimeout(() => {
      if (bulletRef) {
        const bulletEl = document.getElementById(bulletRef);
        if (bulletEl) {
          bulletEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          bulletEl.focus();
          return;
        }
      }
      const secEl = document.getElementById(sectionId);
      if (secEl) {
        secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = secEl.querySelector('input, textarea') as HTMLElement | null;
        if (firstInput) firstInput.focus();
      }
    }, 150);
  };

  const handleAddSkill = (skillName: string) => {
    const clean = skillName.trim();
    if (!clean) return;
    setResumeData((prev) => {
      const existing = prev.skills.some((c) =>
        c.skills.some((s) => s.toLowerCase() === clean.toLowerCase())
      );
      if (existing) {
        showToast(`"${clean}" is already in your skills`, 'info');
        return prev;
      }
      const nextSkills = [...prev.skills];
      if (nextSkills.length === 0) {
        nextSkills.push({
          id: 'skills-' + Date.now(),
          name: 'Technical Skills',
          skills: [clean],
        });
      } else {
        nextSkills[0] = {
          ...nextSkills[0],
          skills: [...nextSkills[0].skills, clean],
        };
      }
      showToast(`Added "${clean}" to skills`, 'success');
      return { ...prev, skills: nextSkills };
    });
  };

  // --- RESUME CRUD & LIBRARY HANDLERS ---

  // 1. Create New Blank Resume
  const handleCreateNew = () => {
    const newId = createResume(blankResumeData, 'Untitled resume');
    justCreatedIdsRef.current.add(newId);
    setResumeIndex(getResumeIndex());
    navigate(`/editor/${newId}`);
    showToast('Created new blank resume', 'info');
  };

  // 2. Start from Sample
  const handleLoadSample = (key: string) => {
    const sample = sampleProfiles[key];
    if (sample) {
      const sampleNames: Record<string, string> = {
        aiEngineer: 'AI Engineer Resume',
        fullStack: 'Full-Stack Developer Resume',
        fresherStudent: 'Graduate Student Resume',
      };
      const name = sampleNames[key] || 'Sample Resume';
      const newId = createResume(sample, name);
      justCreatedIdsRef.current.add(newId);
      setResumeIndex(getResumeIndex());
      navigate(`/editor/${newId}`);
      showToast(`Created resume from sample: ${name}`, 'success');
      confetti({ particleCount: 50, spread: 60 });
    }
  };

  // 3. Upload handlers
  const handleUploadSaveAsNew = (
    importedData: Partial<ResumeData>,
    fileName?: string,
    firstProblemField?: string
  ) => {
    try {
      // Resume title = parsed name, fallback humanized file name (underscores to spaces, drop "resume/cv"), never raw file name
      const resolvedName =
        importedData.personalInfo?.fullName?.trim() ||
        humanizeFileName(fileName) ||
        'Untitled resume';

      const fullData: ResumeData = {
        ...blankResumeData,
        ...importedData,
        personalInfo: {
          ...blankResumeData.personalInfo,
          ...(importedData.personalInfo || {}),
        },
        experience: importedData.experience || [],
        education: importedData.education || [],
        projects: importedData.projects || [],
        skills: importedData.skills || [],
        certifications: importedData.certifications || [],
        customSections: importedData.customSections || [],
      };

      // Compute and store the ATS score on save so Home card never shows "ATS --"
      const score = calculateLiveATSScore(fullData).score;
      const newId = createResume(fullData, resolvedName, score);
      justCreatedIdsRef.current.add(newId);
      setResumeIndex(getResumeIndex());

      closeModal(setIsUploadModalOpen);

      const path = `/editor/${newId}`;
      console.log(path);
      navigate(path);
      showToast('Imported and saved as new resume!', 'success');
      confetti({ particleCount: 70, spread: 80 });

      // Focus problem field if any checklist item exists
      const checkItems = getChecklistItems(importedData);
      if (checkItems.length > 0 || firstProblemField) {
        const targetField = firstProblemField || checkItems[0]?.fieldId || checkItems[0]?.section;
        const targetSection = checkItems[0]?.section || 'personal';
        handleOpenSection(targetSection);
        setTimeout(() => {
          if (targetField) {
            const el = document.getElementById(targetField);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus();
              return;
            }
          }
          const secEl = document.getElementById(targetSection);
          if (secEl) {
            secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    } catch (err) {
      console.error('Failed to save imported resume:', err);
      showToast('Failed to save resume', 'error');
    }
  };

  const handleInstantCheckOpenInEditor = (parsedData: Partial<ResumeData>) => {
    try {
      const resolvedName = parsedData.personalInfo?.fullName?.trim() || 'Sample Resume';
      const fullData: ResumeData = {
        ...blankResumeData,
        ...parsedData,
        personalInfo: {
          ...blankResumeData.personalInfo,
          ...(parsedData.personalInfo || {}),
        },
        experience: parsedData.experience || [],
        education: parsedData.education || [],
        projects: parsedData.projects || [],
        skills: parsedData.skills || [],
        certifications: parsedData.certifications || [],
        customSections: parsedData.customSections || [],
      };
      const score = calculateLiveATSScore(fullData).score;
      const newId = createResume(fullData, resolvedName, score);
      justCreatedIdsRef.current.add(newId);
      setResumeIndex(getResumeIndex());

      const path = `/editor/${newId}`;
      console.log(path);
      navigate(path);
      showToast('Opened in editor!', 'success');
      confetti({ particleCount: 60, spread: 70 });
    } catch (err) {
      console.error('Failed to open instant check in editor:', err);
      showToast('Failed to open resume', 'error');
    }
  };

  const handleUploadReplaceCurrent = (importedData: Partial<ResumeData>) => {
    closeModal(setIsUploadModalOpen);
    openConfirmModal({
      type: 'replace',
      dataToReplace: importedData,
      resumeName: currentResumeName,
    });
  };

  // 4. Duplicate Resume
  const handleDuplicateResume = (id: string) => {
    const newId = duplicateResume(id);
    if (newId) {
      setResumeIndex(getResumeIndex());
      showToast('Resume duplicated', 'success');
    }
  };

  // 5. Rename Resume
  const handleRenameResume = (id: string, newName: string) => {
    renameResume(id, newName);
    setResumeIndex(getResumeIndex());
    if (route.type === 'editor' && route.resumeId === id) {
      setResumeData((prev) => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          fullName: newName.trim() || prev.personalInfo.fullName,
        },
      }));
    }
    showToast('Resume renamed', 'info');
  };

  // 6. Delete Resume
  const handleDeleteResume = (id: string, name: string) => {
    openConfirmModal({
      type: 'delete',
      resumeId: id,
      resumeName: name,
    });
  };

  // 7. Execute Confirm Dialog (Delete or Replace)
  const handleExecuteConfirm = () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'delete' && confirmAction.resumeId) {
      const id = confirmAction.resumeId;
      deleteResume(id);
      const updated = getResumeIndex();
      setResumeIndex(updated);
      closeConfirmModal();
      showToast('Resume deleted', 'info');

      if (route.type === 'editor' && route.resumeId === id) {
        navigate('/');
      }
    } else if (
      confirmAction.type === 'replace' &&
      confirmAction.dataToReplace &&
      route.type === 'editor'
    ) {
      const importedData = confirmAction.dataToReplace;
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
      closeConfirmModal();
      showToast('Resume replaced with imported data', 'success');
      confetti({ particleCount: 70, spread: 80 });
    }
  };

  // Card inline rename finish
  const handleFinishCardRename = (id: string) => {
    if (cardRenameValue.trim()) {
      handleRenameResume(id, cardRenameValue);
    }
    setRenamingCardId(null);
  };

  // Export JSON backup
  const handleExportJson = (targetId?: string) => {
    const idToExport = targetId || (route.type === 'editor' ? route.resumeId : null);
    if (!idToExport) return;
    const data = getResume(idToExport);
    if (!data) return;
    const fileName = `${data.personalInfo.fullName.replace(/\s+/g, '_') || 'My'}_Resume.json`;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Resume JSON backup exported', 'success');
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

  // Current Resume Name computed for Header
  const currentResumeName = useMemo(() => {
    if (route.type !== 'editor') return '';
    const item = resumeIndex.find((i) => i.id === route.resumeId);
    return item?.name || resumeData.personalInfo.fullName || 'Untitled resume';
  }, [route, resumeIndex, resumeData.personalInfo.fullName]);

  const renderSectionItem = (sectionId: string) => {
    const isHidden = hiddenSections.has(sectionId);
    const isForced = forceOpenSection === sectionId;

    switch (sectionId) {
      case 'personal':
        return (
          <FormSection
            key="personal"
            id="personal"
            title="Personal & contact info"
            icon={<User className="w-4 h-4" strokeWidth={1.5} />}
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
            title="Professional summary"
            icon={<FileText className="w-4 h-4" strokeWidth={1.5} />}
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
            title="Work experience"
            icon={<Briefcase className="w-4 h-4" strokeWidth={1.5} />}
            badge={resumeData.experience.length ? `${resumeData.experience.length}` : undefined}
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
            title="Skills & technologies"
            icon={<Wrench className="w-4 h-4" strokeWidth={1.5} />}
            badge={
              resumeData.skills.reduce((acc, cat) => acc + cat.skills.length, 0)
                ? `${resumeData.skills.reduce((acc, cat) => acc + cat.skills.length, 0)}`
                : undefined
            }
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
            title="Projects & open source"
            icon={<FolderGit2 className="w-4 h-4" strokeWidth={1.5} />}
            badge={resumeData.projects.length ? `${resumeData.projects.length}` : undefined}
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
            title="Education"
            icon={<GraduationCap className="w-4 h-4" strokeWidth={1.5} />}
            badge={resumeData.education.length ? `${resumeData.education.length}` : undefined}
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
            title="Certifications"
            icon={<Award className="w-4 h-4" strokeWidth={1.5} />}
            badge={resumeData.certifications.length ? `${resumeData.certifications.length}` : undefined}
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

  const renderToolCards = () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
      {/* Tool 1: Custom ATS */}
      <div
        onClick={() => openToolWithResume(handleOpenCustomAts)}
        className="group card border border-line bg-card hover:border-accent transition p-4 text-left rounded-[6px] cursor-pointer flex flex-col justify-between"
      >
        <div>
          <h3 className="text-sm font-semibold text-ink group-hover:text-brand-600 transition-colors">
            Score against your own rules
          </h3>
          <p className="text-xs text-ink/70 mt-1">
            Paste a rubric, get a fix list
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-line flex items-center justify-between text-xs font-medium text-ink/80 group-hover:text-brand-600 transition-colors">
          <span>Open Custom ATS</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
        </div>
      </div>

      {/* Tool 3: Match to JD */}
      <div
        onClick={() => openToolWithResume(() => openModal(setIsJobMatcherOpen))}
        className="group card border border-line bg-card hover:border-accent transition p-4 text-left rounded-[6px] cursor-pointer flex flex-col justify-between"
      >
        <div>
          <h3 className="text-sm font-semibold text-ink group-hover:text-brand-600 transition-colors">
            Check fit for a job
          </h3>
          <p className="text-xs text-ink/70 mt-1">
            Paste a job post, see missing keywords
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-line flex items-center justify-between text-xs font-medium text-ink/80 group-hover:text-brand-600 transition-colors">
          <span>Open Matcher</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
        </div>
      </div>

      {/* Tool 4: Job Feeds */}
      <div
        onClick={() => openToolWithResume(() => openModal(setIsJobRadarOpen))}
        className="group card border border-line bg-card hover:border-accent transition p-4 text-left rounded-[6px] cursor-pointer flex flex-col justify-between"
      >
        <div>
          <h3 className="text-sm font-semibold text-ink group-hover:text-brand-600 transition-colors">
            Find fresh roles
          </h3>
          <p className="text-xs text-ink/70 mt-1">
            Search links built from your title
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-line flex items-center justify-between text-xs font-medium text-ink/80 group-hover:text-brand-600 transition-colors">
          <span>Open Job feeds</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
        </div>
      </div>

      {/* Tool 5: Industry Trends */}
      <div
        onClick={() => openToolWithResume(() => openModal(setIsTrendAdvisorOpen))}
        className="group card border border-line bg-card hover:border-accent transition p-4 text-left rounded-[6px] cursor-pointer flex flex-col justify-between"
      >
        <div>
          <h3 className="text-sm font-semibold text-ink group-hover:text-brand-600 transition-colors">
            Audit your resume
          </h3>
          <p className="text-xs text-ink/70 mt-1">
            Checks metrics, verbs and skills in your resume
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-line flex items-center justify-between text-xs font-medium text-ink/80 group-hover:text-brand-600 transition-colors">
          <span>Open Trends</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
        </div>
      </div>

      {/* Tool 6: Start from a Sample */}
      <div
        onClick={() => openModal(setIsSampleModalOpen)}
        className="group card border border-line bg-card hover:border-accent transition p-4 text-left rounded-[6px] cursor-pointer flex flex-col justify-between"
      >
        <div>
          <h3 className="text-sm font-semibold text-ink group-hover:text-brand-600 transition-colors">
            Start from an example
          </h3>
          <p className="text-xs text-ink/70 mt-1">
            Edit a finished resume into yours
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-line flex items-center justify-between text-xs font-medium text-ink/80 group-hover:text-brand-600 transition-colors">
          <span>Open Samples</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );

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
        onExportJson={() => handleExportJson()}
        onPrint={printResume}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isDownloadingPdf}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        savedAt={savedAt}
        onOpenUpload={() => openModal(setIsUploadModalOpen)}
        onOpenHome={() => {
          navigate('/');
        }}
        onNewResume={handleCreateNew}
        allProfiles={allProfiles}
        activeProfileId={activeProfileId}
        onSelectProfileId={handleSelectProfileId}
        currentTheme={currentTheme}
        onToggleTheme={handleToggleTheme}
        onOpenCustomAts={handleOpenCustomAts}
        isHome={route.type === 'home'}
        currentResumeId={route.type === 'editor' ? route.resumeId : null}
        currentResumeName={currentResumeName}
        onRenameResume={handleRenameResume}
        resumeList={resumeIndex}
        onSelectResume={(id) => {
          navigate(`/editor/${id}`);
        }}
      />

      {/* VIEW A: HOME SCREEN ("Your resumes") */}
      {route.type === 'home' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setHomeDragActive(true);
          }}
          onDragLeave={() => setHomeDragActive(false)}
          onDrop={handleHomeDrop}
          className={`flex-1 w-full max-w-5xl mx-auto px-6 ${displayResumes.length === 0 ? 'py-12' : 'py-6 sm:py-8'} flex flex-col justify-start min-h-[calc(100vh-3.5rem)] animate-in fade-in duration-150`}
        >
          <input
            type="file"
            ref={homeFileInputRef}
            onChange={handleHomeFileSelect}
            accept=".pdf,.docx,.doc,.json,.txt"
            className="hidden"
          />

          {displayResumes.length === 0 ? (
            /* Two-column hero (max-w-5xl) */
            <div className="w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-6">
                {/* Left Column (span 7) */}
                <div className="lg:col-span-7 flex flex-col">
                  <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-ink tracking-tight mb-2">
                    Build an ATS-ready resume
                  </h1>
                  <p className="text-xs sm:text-sm text-ink/60 mb-5 leading-relaxed max-w-[34rem] text-balance">
                    Upload your current resume or start fresh. Score it, match it to a job, and export a clean PDF.
                  </p>

                  {/* Dropzone (min-h-[180px]) */}
                  <div
                    onClick={() => homeFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHomeDragActive(true);
                    }}
                    onDragLeave={() => setHomeDragActive(false)}
                    onDrop={handleHomeDrop}
                    className={`min-h-[180px] w-full border-2 border-dashed rounded-lg bg-card transition flex flex-col items-center justify-center p-6 text-center cursor-pointer group select-none ${
                      homeDragActive
                        ? 'border-brand-600 bg-muted/30'
                        : 'border-line hover:border-brand-600'
                    }`}
                  >
                    <Upload className="w-7 h-7 text-ink/40 group-hover:text-brand-600 transition mb-2" strokeWidth={1.5} />
                    <p className="text-xs sm:text-sm font-medium text-ink">
                      Drag a PDF, Word, JSON or text file here, or click to browse
                    </p>
                    <p className="text-[11px] text-ink/40 mt-1">
                      Supports PDF, Word, JSON or text files up to 5MB
                    </p>
                  </div>

                  {/* Text links row */}
                  <div className="mt-3.5 text-xs text-ink/60 flex items-center gap-1.5 flex-wrap">
                    <span>or</span>
                    <button
                      type="button"
                      onClick={handleCreateNew}
                      className="text-brand-600 hover:underline cursor-pointer font-medium"
                    >
                      start from scratch
                    </button>
                  </div>
                </div>

                {/* Right Column (span 5): Instant check card */}
                <div className="lg:col-span-5 hidden lg:flex flex-col items-center justify-center">
                  <InstantCheck
                    onCheckMyOwnResume={() => homeFileInputRef.current?.click()}
                    onOpenInEditor={handleInstantCheckOpenInEditor}
                  />
                </div>
              </div>

              {/* 3-step strip: Upload -> See score and fixes -> Download PDF (plain text, numbers, no pills) */}
              <div className="py-3.5 px-4 my-6 border-y border-line text-xs text-ink/70 flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink">1.</span>
                  <span>Upload</span>
                </div>
                <span className="text-ink/30">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink">2.</span>
                  <span>See score and fixes</span>
                </div>
                <span className="text-ink/30">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink">3.</span>
                  <span>Download PDF</span>
                </div>
              </div>

              {/* 3 Plain Feature Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-t border-line">
                <div>
                  <CheckCircle2 className="w-4 h-4 text-ink/40 mb-2" strokeWidth={1.5} />
                  <h3 className="text-xs font-semibold text-ink">Score against ATS rules</h3>
                  <p className="text-[11px] text-ink/60 mt-1 leading-relaxed">
                    Get instant feedback and actionable fixes based on real recruiter parsing rules.
                  </p>
                </div>
                <div>
                  <Target className="w-4 h-4 text-ink/40 mb-2" strokeWidth={1.5} />
                  <h3 className="text-xs font-semibold text-ink">Match to a job description</h3>
                  <p className="text-[11px] text-ink/60 mt-1 leading-relaxed">
                    Compare your resume to any job post to identify missing keywords and skills.
                  </p>
                </div>
                <div>
                  <ShieldCheck className="w-4 h-4 text-ink/40 mb-2" strokeWidth={1.5} />
                  <h3 className="text-xs font-semibold text-ink">Your data stays in the browser</h3>
                  <p className="text-[11px] text-ink/60 mt-1 leading-relaxed">
                    Resumes are stored privately in local storage without accounts or trackers.
                  </p>
                </div>
              </div>

              {/* Tools grid below the hero */}
              <div className="pt-6 border-t border-line text-left">
                <h2 className="text-sm font-semibold text-ink mb-3">Tools</h2>
                {renderToolCards()}
              </div>
            </div>
          ) : (
            /* Resumes exist: Grid of resumes, compact drop zone, then Tools */
            <>
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line">
                <div>
                  <h1 className="text-2xl font-serif font-semibold text-ink tracking-tight">
                    Your resumes
                  </h1>
                  <p className="text-xs text-ink/60 mt-0.5">
                    Manage and edit your saved resumes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openModal(setIsUploadModalOpen)}
                    className="btn-outline h-8 px-3 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Upload resume</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="btn-primary h-8 px-3 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                    <span>New resume</span>
                  </button>
                </div>
              </div>

              {/* Resumes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 items-stretch">
                {displayResumes.map((entry) => {
                  const resumeItemData = getResume(entry.id);
                  const isCardAtsEmpty = isResumeEmptyForAts(resumeItemData);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        navigate(`/editor/${entry.id}`);
                      }}
                      className="card border border-line bg-card hover:border-ink/40 transition flex flex-col justify-between h-[280px] p-3.5 relative group cursor-pointer"
                    >
                      {/* Scaled A4 Real Resume Thumbnail on WHITE paper */}
                      <div className="w-full h-36 bg-muted/30 rounded-[6px] border border-line overflow-hidden relative flex justify-center items-start pt-1.5 select-none pointer-events-none">
                        <div
                          data-theme="light"
                          style={{
                            width: '794px',
                            minHeight: '1123px',
                            transform: 'scale(0.24)',
                            transformOrigin: 'top center',
                            backgroundColor: '#ffffff',
                            color: '#16161d',
                            padding: '12mm 14mm',
                          }}
                          className="shadow-sm border border-black/10 text-left shrink-0 font-sans"
                        >
                          {resumeItemData ? (
                            <ModernTemplate
                              data={resumeItemData}
                              theme={{
                                primaryColor: '#b4451f',
                                fontFamily: 'sans',
                                spacing: 'normal',
                                accentColor: '#b4451f',
                              }}
                            />
                          ) : null}
                        </div>
                      </div>

                      {/* Title & Info (hide subtitle if no title) */}
                      <div className="mt-2.5 min-w-0">
                        {renamingCardId === entry.id ? (
                          <input
                            type="text"
                            value={cardRenameValue}
                            onChange={(e) => setCardRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleFinishCardRename(entry.id);
                              if (e.key === 'Escape') setRenamingCardId(null);
                            }}
                            onBlur={() => handleFinishCardRename(entry.id)}
                            autoFocus
                            className="w-full text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-card border border-brand-600 text-ink focus:outline-none"
                          />
                        ) : (
                          <h3
                            className="text-xs font-semibold text-ink group-hover:text-brand-600 transition-colors truncate"
                            title={entry.name}
                          >
                            {entry.name}
                          </h3>
                        )}
                        {entry.title?.trim() ? (
                          <p className="text-[11px] text-ink/60 truncate mt-0.5">
                            {entry.title}
                          </p>
                        ) : null}
                      </div>

                      {/* Footer info: last edited & score */}
                      <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-[11px] text-ink/40">
                        <span>{formatRelativeTime(entry.updatedAt)}</span>
                        {isCardAtsEmpty || entry.score === undefined ? (
                          <span className="text-ink/40 font-medium">ATS --</span>
                        ) : (
                          <span className="text-ink/70 font-medium flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                entry.score >= 80
                                  ? 'bg-emerald-600'
                                  : entry.score >= 60
                                  ? 'bg-amber-600'
                                  : 'bg-rose-600'
                              }`}
                            />
                            <span>ATS {entry.score}</span>
                          </span>
                        )}
                      </div>

                      {/* Top-Right Menu Trigger */}
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          type="button"
                          onClick={(e) => handleToggleCardMenu(entry.id, e)}
                          className="p-1 rounded-[4px] bg-card/90 border border-line text-ink/50 hover:text-ink hover:bg-muted transition cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Card Dropdown Menu via Portal */}
                        {openCardMenuId === entry.id &&
                          createPortal(
                            <div
                              ref={cardMenuRef}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'fixed',
                                top: cardMenuPos.top,
                                right: cardMenuPos.right,
                              }}
                              className="w-40 card shadow-menu py-1 z-[60] border border-line bg-card rounded-[6px] animate-in fade-in duration-100"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  navigate(`/editor/${entry.id}`);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-ink/80 hover:bg-muted flex items-center gap-2 transition cursor-pointer"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-ink/60" strokeWidth={1.5} />
                                <span>Open</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  setRenamingCardId(entry.id);
                                  setCardRenameValue(entry.name);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-ink/80 hover:bg-muted flex items-center gap-2 transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-ink/60" strokeWidth={1.5} />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleDuplicateResume(entry.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-ink/80 hover:bg-muted flex items-center gap-2 transition cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-ink/60" strokeWidth={1.5} />
                                <span>Duplicate</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleExportJson(entry.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-ink/80 hover:bg-muted flex items-center gap-2 transition cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-ink/60" strokeWidth={1.5} />
                                <span>Export JSON</span>
                              </button>
                              <div className="my-1 border-t border-line" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleDeleteResume(entry.id, entry.name);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                <span>Delete</span>
                              </button>
                            </div>,
                            document.body
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tools Section */}
              <div className="mt-8 pt-6 border-t border-line">
                <h2 className="text-sm font-semibold text-ink mb-3">Tools</h2>
                {renderToolCards()}
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW B: EDITOR WORKSPACE */}
      {route.type === 'editor' && (
        <>
          {/* Mobile Tab Toggle */}
          <div className="no-print lg:hidden flex border-b border-line bg-card sticky top-13 z-20">
            <button
              onClick={() => setMobileTab('edit')}
              className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                mobileTab === 'edit'
                  ? 'border-brand-600 text-brand-600 font-semibold'
                  : 'border-transparent text-ink/60 hover:text-ink'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                mobileTab === 'preview'
                  ? 'border-brand-600 text-brand-600 font-semibold'
                  : 'border-transparent text-ink/60 hover:text-ink'
              }`}
            >
              <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Preview</span>
            </button>
          </div>

          {/* Main Split-Screen Workspace */}
          <main className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-92px)]">
            {/* Left: Editor Panel */}
            <div
              className={`no-print w-full lg:w-[420px] xl:w-[480px] lg:shrink-0 h-full overflow-y-auto p-4 space-y-3 border-r border-line bg-canvas ${
                mobileTab === 'edit' ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between py-0.5">
                <h2 className="text-sm font-semibold text-ink tracking-tight">Resume content</h2>
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
                appAccent={appAccent}
              />
            </div>
          </main>
        </>
      )}

      {/* Confirmation Modal (for Delete or Replace) */}
      <Modal
        isOpen={!!confirmAction}
        onClose={closeConfirmModal}
        title={confirmAction?.type === 'delete' ? 'Delete Resume' : 'Replace Current Resume'}
        icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={closeConfirmModal}
              className="btn-ghost h-9 px-3.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteConfirm}
              className={`h-9 px-4 text-xs font-semibold rounded-xl text-white transition ${
                confirmAction?.type === 'delete'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {confirmAction?.type === 'delete' ? 'Delete Resume' : 'Replace Resume'}
            </button>
          </div>
        }
      >
        <div className="p-5 space-y-2 bg-card">
          {confirmAction?.type === 'delete' ? (
            <p className="text-xs text-ink/80 leading-relaxed">
              Are you sure you want to delete{' '}
              <strong className="text-ink">{confirmAction.resumeName || 'this resume'}</strong>? This action cannot be undone.
            </p>
          ) : (
            <p className="text-xs text-ink/80 leading-relaxed">
              Are you sure you want to replace the contents of{' '}
              <strong className="text-ink">{confirmAction?.resumeName || 'current resume'}</strong>{' '}
              with the uploaded file? You can also save it as a new resume instead.
            </p>
          )}
        </div>
      </Modal>

      {/* Feature Modals */}
      <JobRadarModal
        isOpen={isJobRadarOpen}
        onClose={() => closeModal(setIsJobRadarOpen)}
        resumeData={resumeData}
        onGoToSection={handleGoToSection}
        onAddSkill={handleAddSkill}
      />

      <TrendAdvisorModal
        isOpen={isTrendAdvisorOpen}
        onClose={() => closeModal(setIsTrendAdvisorOpen)}
        resumeData={resumeData}
        onGoToSection={handleGoToSection}
        onAddSkill={handleAddSkill}
      />

      <JobMatcherModal
        isOpen={isJobMatcherOpen}
        onClose={() => closeModal(setIsJobMatcherOpen)}
        resumeData={resumeData}
        initialAtsResult={atsResult}
        initialTab={jobMatcherInitialTab}
        onApplyTailoring={handleApplyTailoring}
        onProfileChanged={(id) => {
          setActiveProfileIdState(id);
          setAllProfiles(getAllATSProfiles());
        }}
        onGoToSection={handleGoToSection}
        onAddSkill={handleAddSkill}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => closeModal(setIsApiKeyModalOpen)}
        currentTheme={currentTheme}
        onThemeChange={handleSelectTheme}
      />

      <ResumeUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          closeModal(setIsUploadModalOpen);
          setUploadedFileForModal(null);
        }}
        onSaveAsNew={handleUploadSaveAsNew}
        onReplaceCurrent={handleUploadReplaceCurrent}
        canReplace={route.type === 'editor'}
        initialFile={uploadedFileForModal}
        onGoToSection={handleGoToSection}
        onOpenSettings={() => openModal(setIsApiKeyModalOpen)}
      />

      <SampleSelectorModal
        isOpen={isSampleModalOpen}
        onClose={() => closeModal(setIsSampleModalOpen)}
        onSelectSample={handleLoadSample}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => closeModal(setIsCommandPaletteOpen)}
        onSelectTemplate={setActiveTemplate}
        onJumpSection={(id) => {
          handleOpenSection(id);
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        onOpenUpload={() => openModal(setIsUploadModalOpen)}
        onExportJson={() => handleExportJson()}
        onLoadSample={handleLoadSample}
        onDownloadPdf={handleDownloadPdf}
      />
    </div>
  );
};

export default App;
