export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  avatarUrl?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  highlights: string[]; // Bullet points
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  location: string;
  startDate: string;
  endDate: string;
  grade?: string;
  highlights?: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  githubLink?: string;
  highlights: string[];
}

export interface SkillCategory {
  id: string;
  name: string; // e.g. "Languages", "Frameworks & Libraries", "Cloud & DevOps", "Tools & Practices"
  skills: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  url?: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  description?: string;
  bullets?: string[];
}

export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  skills: SkillCategory[];
  certifications: CertificationItem[];
  customSections: CustomSection[];
  sectionOrder?: string[];
  sectionTitles?: Record<string, string>;
}

export type TemplateType = 'modern' | 'harvard' | 'minimalist' | 'creative';

export interface ResumeTheme {
  primaryColor: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  spacing: 'compact' | 'normal' | 'spacious';
  accentColor: string;
}

export type ATSCriterionType = 'keyword' | 'section' | 'regex' | 'length' | 'metric';

export interface ATSCriterion {
  id: string;
  label: string;
  weight: number; // percentage / points contributing to 100
  type: ATSCriterionType;
  params: {
    keywords?: string[];
    minCount?: number;
    sectionName?: string; // 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications'
    pattern?: string;
    flags?: string;
    minLength?: number;
    maxLength?: number;
    metricType?: 'numbers' | 'actionVerbs';
    description?: string;
    fixSuggestion?: string;
  };
}

export interface ATSProfile {
  id: string;
  name: string;
  description?: string;
  isCustom?: boolean;
  minPages?: number;
  maxPages?: number;
  criteria: ATSCriterion[];
}

export interface ATSCriterionResult {
  criterion: ATSCriterion;
  status: 'pass' | 'partial' | 'fail';
  scoreEarned: number;
  maxScore: number;
  message: string;
  fix: string;
}

export interface ATSCheckResult {
  score: number; // 0 - 100
  rating: 'Poor' | 'Average' | 'Good' | 'Excellent';
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  profileId?: string;
  profileName?: string;
  criterionResults?: ATSCriterionResult[];
  isEmpty?: boolean;
}

export interface JobListingRecommendation {
  id: string;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  tags: string[];
  directSearchUrl: string;
  platform: 'LinkedIn' | 'Indeed' | 'Google Jobs' | 'Wellfound' | 'GitHub Jobs';
  postedTiming: string;
  salaryEstimate?: string;
}

export interface TrendUpgradeTip {
  category: 'Impact & Metrics' | 'AI & Modern Tech' | 'ATS Formatting' | 'Skill Relevance' | 'Conciseness';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  actionableStep: string;
}
