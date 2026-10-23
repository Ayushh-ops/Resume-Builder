import type { ResumeData } from '../../types/resume';

export interface Segment {
  text: string;
  x0: number;
  x1: number;
  fontSize: number;
  bold: boolean;
}

export interface Line {
  page: number;
  y: number;
  segments: Segment[];
  text: string;
  maxFont: number;
}

export type CanonicalSectionKey =
  | 'header'
  | 'summary'
  | 'profile'
  | 'objective'
  | 'experience'
  | 'work experience'
  | 'employment'
  | 'education'
  | 'skills'
  | 'technical skills'
  | 'projects'
  | 'certifications'
  | 'achievements'
  | 'awards'
  | 'extracurricular'
  | 'activities';

export interface SectionBlock {
  key: CanonicalSectionKey;
  headingLine?: Line;
  lines: Line[];
}

export interface SectionMap {
  header: Line[];
  summary: Line[];
  experience: Line[];
  education: Line[];
  skills: Line[];
  projects: Line[];
  certifications: Line[];
  achievements: Line[];
  awards: Line[];
  extracurricular: Line[];
  rawText: string;
}

export interface ParsedImportResult {
  data: Partial<ResumeData>;
  confidence: Record<string, number>;
  counts: Record<string, number>;
  rawText: string;
  lines: Line[];
  method: 'pdf' | 'docx' | 'txt' | 'json';
  fallbackNotice?: string;
  isAiFallback?: boolean;
  modelUsed?: string;
}
