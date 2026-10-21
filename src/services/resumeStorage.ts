import type { ResumeData } from '../types/resume';

export interface ResumeIndexEntry {
  id: string;
  name: string;
  title: string;
  updatedAt: string; // ISO 8601 string
  score?: number;
}

export const blankResumeData: ResumeData = {
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

export const isResumeCompletelyEmpty = (data: ResumeData | null | undefined): boolean => {
  if (!data) return true;
  const hasName = Boolean(data.personalInfo?.fullName?.trim());
  const hasTitle = Boolean(data.personalInfo?.jobTitle?.trim());
  const hasExp = Boolean(data.experience && data.experience.length > 0);
  return !hasName && !hasTitle && !hasExp;
};

/**
 * Initializes the resume storage, cleans empty entries, and migrates legacy "resume-data" key if present and non-empty.
 */
export const initResumeStorage = (): ResumeIndexEntry[] => {
  try {
    // 1. Migrate legacy resume-data ONLY if it contains actual content
    const legacy = localStorage.getItem('resume-data');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (parsed && !isResumeCompletelyEmpty(parsed)) {
          const id = 'res_' + Date.now();
          const name = parsed.personalInfo?.fullName?.trim() || 'Untitled resume';
          const title = parsed.personalInfo?.jobTitle?.trim() || '';
          const updatedAt = new Date().toISOString();
          const index = getResumeIndex();
          if (!index.some((i) => i.id === id)) {
            index.unshift({ id, name, title, updatedAt });
            localStorage.setItem('rc-index', JSON.stringify(index));
            localStorage.setItem(`rc-resume:${id}`, JSON.stringify(parsed));
            localStorage.setItem('rc-active', id);
          }
        }
      } catch (err) {
        console.warn('Could not parse legacy resume-data during migration', err);
      } finally {
        localStorage.removeItem('resume-data');
      }
    }

    // 2. On load, delete any entry that is completely empty (no name, no title, no experience)
    const rawIndex = getResumeIndex();
    const cleanIndex: ResumeIndexEntry[] = [];
    let modified = false;

    for (const entry of rawIndex) {
      const data = getResume(entry.id);
      if (isResumeCompletelyEmpty(data)) {
        localStorage.removeItem(`rc-resume:${entry.id}`);
        modified = true;
        if (getActiveResumeId() === entry.id) {
          localStorage.removeItem('rc-active');
        }
      } else {
        cleanIndex.push(entry);
      }
    }

    if (modified) {
      localStorage.setItem('rc-index', JSON.stringify(cleanIndex));
    }
    return cleanIndex;
  } catch (err) {
    console.error('initResumeStorage failed', err);
    return getResumeIndex();
  }
};

export const getResumeIndex = (): ResumeIndexEntry[] => {
  try {
    const raw = localStorage.getItem('rc-index');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse rc-index', err);
  }
  return [];
};

export const getResume = (id: string): ResumeData | null => {
  try {
    const raw = localStorage.getItem(`rc-resume:${id}`);
    if (raw) {
      return JSON.parse(raw) as ResumeData;
    }
  } catch (err) {
    console.warn(`Failed to read rc-resume:${id}`, err);
  }
  return null;
};

export const saveResume = (
  id: string,
  data: ResumeData,
  customName?: string,
  score?: number
): void => {
  try {
    localStorage.setItem(`rc-resume:${id}`, JSON.stringify(data));
    const index = getResumeIndex();
    const entryIdx = index.findIndex((item) => item.id === id);
    const resolvedName =
      customName ||
      data.personalInfo.fullName?.trim() ||
      (entryIdx >= 0 ? index[entryIdx].name : 'Untitled resume');
    const resolvedTitle =
      data.personalInfo.jobTitle?.trim() ||
      (entryIdx >= 0 ? index[entryIdx].title : '');
    const updatedAt = new Date().toISOString();

    const updatedEntry: ResumeIndexEntry = {
      id,
      name: resolvedName,
      title: resolvedTitle,
      updatedAt,
      score: score !== undefined ? score : entryIdx >= 0 ? index[entryIdx].score : undefined,
    };

    if (entryIdx >= 0) {
      index[entryIdx] = updatedEntry;
    } else {
      index.unshift(updatedEntry);
    }
    localStorage.setItem('rc-index', JSON.stringify(index));
  } catch (err) {
    console.error(`Failed to save resume ${id}`, err);
  }
};

export const createResume = (
  initialData?: Partial<ResumeData>,
  name?: string
): string => {
  const id = 'res_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const fullData: ResumeData = {
    ...blankResumeData,
    ...initialData,
    personalInfo: {
      ...blankResumeData.personalInfo,
      ...(initialData?.personalInfo || {}),
    },
    experience: initialData?.experience || [],
    education: initialData?.education || [],
    projects: initialData?.projects || [],
    skills: initialData?.skills || [],
    certifications: initialData?.certifications || [],
    customSections: initialData?.customSections || [],
  };

  const resolvedName =
    name?.trim() ||
    fullData.personalInfo.fullName?.trim() ||
    'Untitled resume';

  saveResume(id, fullData, resolvedName);
  setActiveResumeId(id);
  return id;
};

export const duplicateResume = (id: string): string | null => {
  const source = getResume(id);
  if (!source) return null;
  const index = getResumeIndex();
  const existing = index.find((i) => i.id === id);
  const baseName = existing?.name || source.personalInfo.fullName || 'Resume';
  const newId = createResume(source, `${baseName} (Copy)`);
  return newId;
};

export const renameResume = (id: string, newName: string): void => {
  const trimmed = newName.trim() || 'Untitled resume';
  const index = getResumeIndex();
  const item = index.find((i) => i.id === id);
  if (item) {
    item.name = trimmed;
    item.updatedAt = new Date().toISOString();
    localStorage.setItem('rc-index', JSON.stringify(index));
  }
  const data = getResume(id);
  if (data) {
    if (!data.personalInfo.fullName || data.personalInfo.fullName === item?.name) {
      data.personalInfo.fullName = trimmed;
      localStorage.setItem(`rc-resume:${id}`, JSON.stringify(data));
    }
  }
};

export const deleteResume = (id: string): void => {
  try {
    localStorage.removeItem(`rc-resume:${id}`);
    const index = getResumeIndex().filter((i) => i.id !== id);
    localStorage.setItem('rc-index', JSON.stringify(index));
    const active = getActiveResumeId();
    if (active === id) {
      if (index.length > 0) {
        setActiveResumeId(index[0].id);
      } else {
        localStorage.removeItem('rc-active');
      }
    }
  } catch (err) {
    console.error('Failed to delete resume', err);
  }
};

export const getActiveResumeId = (): string | null => {
  return localStorage.getItem('rc-active');
};

export const setActiveResumeId = (id: string): void => {
  localStorage.setItem('rc-active', id);
};
