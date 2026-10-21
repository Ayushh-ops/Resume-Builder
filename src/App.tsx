import React, { useState, useMemo } from 'react';
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
import { ResumePreview } from './components/Preview/ResumePreview';
import { JobRadarModal } from './components/Modals/JobRadarModal';
import { TrendAdvisorModal } from './components/Modals/TrendAdvisorModal';
import { JobMatcherModal } from './components/Modals/JobMatcherModal';
import { ApiKeyModal } from './components/Modals/ApiKeyModal';
import { printResume, exportResumeToPdf } from './utils/pdfExport';

export const App: React.FC = () => {
  // Resume state initialized with a rich Applied AI Engineer profile
  const [resumeData, setResumeData] = useState<ResumeData>(sampleProfiles.aiEngineer);
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('modern');
  const [theme, setTheme] = useState<ResumeTheme>({
    primaryColor: '#4f46e5',
    fontFamily: 'sans',
    spacing: 'normal',
    accentColor: '#818cf8',
  });

  // Mobile active tab ('edit' | 'preview')
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  // Modals state
  const [isJobRadarOpen, setIsJobRadarOpen] = useState(false);
  const [isTrendAdvisorOpen, setIsTrendAdvisorOpen] = useState(false);
  const [isJobMatcherOpen, setIsJobMatcherOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Live ATS Scoring
  const atsResult = useMemo(() => {
    return calculateLiveATSScore(resumeData);
  }, [resumeData]);

  // Load preset sample
  const handleLoadSample = (key: string) => {
    if (sampleProfiles[key]) {
      setResumeData(sampleProfiles[key]);
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
    downloadAnchor.setAttribute('download', `${resumeData.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
          setResumeData(parsed);
          confetti({ particleCount: 60, spread: 70 });
        } else {
          alert('Invalid resume JSON format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Direct PDF Download
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const fileName = `${resumeData.personalInfo.fullName.replace(/\s+/g, '_') || 'My'}_Resume.pdf`;
      await exportResumeToPdf('resume-pdf-sheet', fileName);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error(err);
      alert('Generating direct PDF encountered an issue. Falling back to native browser print...');
      printResume();
    } finally {
      setIsDownloadingPdf(false);
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
      />

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
        {/* Left: Editor */}
        <div
          className={`no-print w-full lg:w-[440px] lg:shrink-0 h-full overflow-y-auto p-4 space-y-3 border-r border-black/[0.06] bg-canvas ${
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

          {/* Section 1: Personal Info */}
          <FormSection
            id="personal"
            title="Personal & Contact Info"
            icon={<User className="w-4 h-4" />}
            badge="Required"
            defaultOpen={true}
          >
            <PersonalInfoForm
              data={resumeData.personalInfo}
              onChange={(personalInfo) => setResumeData({ ...resumeData, personalInfo })}
            />
          </FormSection>

          {/* Section 2: Professional Summary */}
          <FormSection
            id="summary"
            title="Professional Summary"
            icon={<FileText className="w-4 h-4" />}
            badge="AI Assist"
            defaultOpen={true}
          >
            <SummaryForm
              summary={resumeData.summary}
              resumeData={resumeData}
              onChange={(summary) => setResumeData({ ...resumeData, summary })}
            />
          </FormSection>

          {/* Section 3: Work Experience */}
          <FormSection
            id="experience"
            title="Work Experience"
            icon={<Briefcase className="w-4 h-4" />}
            badge={`${resumeData.experience.length} Roles`}
            defaultOpen={true}
          >
            <ExperienceForm
              experience={resumeData.experience}
              onChange={(experience) => setResumeData({ ...resumeData, experience })}
            />
          </FormSection>

          {/* Section 4: Skills */}
          <FormSection
            id="skills"
            title="Skills & Technologies"
            icon={<Wrench className="w-4 h-4" />}
            badge={`${resumeData.skills.reduce((acc, cat) => acc + cat.skills.length, 0)} Skills`}
            defaultOpen={false}
          >
            <SkillsForm
              skills={resumeData.skills}
              onChange={(skills) => setResumeData({ ...resumeData, skills })}
            />
          </FormSection>

          {/* Section 5: Technical Projects */}
          <FormSection
            id="projects"
            title="Projects & Open Source"
            icon={<FolderGit2 className="w-4 h-4" />}
            badge={`${resumeData.projects.length} Projects`}
            defaultOpen={false}
          >
            <ProjectsForm
              projects={resumeData.projects}
              onChange={(projects) => setResumeData({ ...resumeData, projects })}
            />
          </FormSection>

          {/* Section 6: Education */}
          <FormSection
            id="education"
            title="Education & Degrees"
            icon={<GraduationCap className="w-4 h-4" />}
            badge={`${resumeData.education.length} Entries`}
            defaultOpen={false}
          >
            <EducationForm
              education={resumeData.education}
              onChange={(education) => setResumeData({ ...resumeData, education })}
            />
          </FormSection>

          {/* Section 7: Certifications */}
          <FormSection
            id="certifications"
            title="Certifications & Credentials"
            icon={<Award className="w-4 h-4" />}
            badge={`${resumeData.certifications.length} Certs`}
            defaultOpen={false}
          >
            <CertificationsForm
              certifications={resumeData.certifications}
              onChange={(certifications) => setResumeData({ ...resumeData, certifications })}
            />
          </FormSection>
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
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
};

export default App;
