import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export type ToolId = 'upload' | 'ats_profile' | 'matcher' | 'trends' | 'job_radar' | 'samples';

interface ToolHowToContent {
  title: string;
  whatItIs: string;
  steps: string[];
  example: {
    input: string;
    output: string;
  };
  readingTheResult: string;
  commonMistakes: string[];
}

export const HOW_TO_USE_CONTENT: Record<ToolId, ToolHowToContent> = {
  upload: {
    title: 'Upload a resume',
    whatItIs: 'Extracts career history from PDF, Word, JSON, or text documents into structured ResumeCraft sections.',
    steps: [
      'Drag and drop your resume file or browse from your device (PDF, DOCX, JSON, or TXT up to 5MB).',
      'Wait a moment for local text decoding and AI-assisted field extraction.',
      'Inspect the review screen: check parser confidence scores and verify the detected candidate profile.',
      'Click "Save as new resume" to create a fresh library entry or "Replace current resume" to update your active draft.',
    ],
    example: {
      input: 'Uploaded "Alex_Resume_2025.pdf" with 3 roles, 1 degree, and 12 skills.',
      output: 'Auto-populated Personal Info, Experience, Education, and Skills forms ready to edit.',
    },
    readingTheResult: 'A confidence score of 80%+ indicates high fidelity. Lower scores flag ambiguous section headings or complex layouts to review.',
    commonMistakes: [
      'Uploading scanned image-only PDFs without selectable text layers.',
      'Multi-column tables that join unrelated job titles with company dates.',
      'Skipping the review step without verifying dates and location fields.',
    ],
  },
  ats_profile: {
    title: 'Custom ATS format',
    whatItIs: 'Scores your resume against specific company scoring rubrics, hiring checklists, or custom criteria weights.',
    steps: [
      'Select a preset profile from the dropdown or click "Create Custom Profile".',
      'Paste your target company\'s rubric description, upload a criteria file, or set weights manually.',
      'Save the profile to immediately compute a live score and criteria breakdown for your resume.',
      'Address any failed or partial criteria using the provided "Go to section" shortcuts.',
    ],
    example: {
      input: 'Rubric requiring "5+ years React, AWS cert, and quantified bullet points".',
      output: 'Live score breakdown out of 100 with actionable next steps for missing requirements.',
    },
    readingTheResult: 'Scores of 80+ indicate strong alignment. Each criterion specifies exact point weights, status, and concrete fixes.',
    commonMistakes: [
      'Setting zero weight on critical technical requirements.',
      'Ignoring negative criteria like missing email or unformatted employment dates.',
    ],
  },
  matcher: {
    title: 'Match to a job description',
    whatItIs: 'Compares your resume against a specific job posting to uncover missing keywords, skills gaps, and tailoring opportunities.',
    steps: [
      'Paste the full target job description into the input area.',
      'Click "Analyze match & keywords" to evaluate keyword overlap and ATS compatibility.',
      'Examine missing keywords with their suggested bullet templates.',
      'Click "Add to skills" or "Go to bullet" to incorporate relevant keywords into your resume.',
    ],
    example: {
      input: 'Job posting demanding "Kubernetes, Go, Kafka, and Microservices".',
      output: '64% compatibility score, 4 missing keywords with concrete bullet templates.',
    },
    readingTheResult: '70%+ indicates strong ATS match and alignment with key requirements. 50–69% suggests adding missing technical skills. Below 50% means key qualifications or keywords are absent.',
    commonMistakes: [
      'Pasting only the job title or a 2-line snippet instead of the full requirements.',
      'Keyword-stuffing skills without reflecting real contributions in your bullet points.',
      'Forgetting to adjust your professional summary to match the job\'s focus.',
    ],
  },
  trends: {
    title: 'Industry trends & audit',
    whatItIs: 'Audits your resume against 2026 hiring standards for quantified metrics, active verbs, and modern tooling coverage.',
    steps: [
      'Open the audit to view automated diagnostic checks computed on your current resume.',
      'Review items requiring attention first, followed by passed standards.',
      'Use the Before/After comparisons to rewrite weak bullets with metric templates.',
      'Click "Go to section" to jump straight into the editor and update the exact bullet.',
    ],
    example: {
      input: 'Resume with only 20% of bullets containing numbers or percentages.',
      output: 'Flagged metric deficiency with concrete X-Y-Z formula templates for 3 bullets.',
    },
    readingTheResult: 'Items marked "fix" highlight specific deficiencies based on your resume data. Items marked "ok" confirm alignment with recruiter benchmarks.',
    commonMistakes: [
      'Listing passive duties ("Responsible for...") rather than ownership-driven achievements.',
      'Omitting numbers, percentages, or dollar scale from project accomplishments.',
      'Leaving out mentions of modern tooling and AI-assisted workflows.',
    ],
  },
  job_radar: {
    title: 'Job search feeds',
    whatItIs: 'Generates pre-filtered live search links on major job boards based on your target role, location, and key skills.',
    steps: [
      'Ensure your resume has a target job title and location in Personal Info.',
      'Check the "Highlight for <title>" list to see which top skills are present or missing in your draft.',
      'Click any portal link (LinkedIn, Indeed, Google Jobs, Wellfound) to view listings posted in the last 24 hours.',
      'Use the suggested titles to discover adjacent roles matching your skillset.',
    ],
    example: {
      input: 'Target Title: "Full-Stack Engineer" in "Austin, TX".',
      output: 'Direct links to fresh postings filtered by date across 4 search platforms.',
    },
    readingTheResult: 'Checked skills confirm your resume is ready for that requirement; missing tags indicate key competencies to highlight before applying.',
    commonMistakes: [
      'Leaving the target job title blank in Personal Info.',
      'Applying without verifying if the job requires skills currently absent from your resume.',
      'Searching without location filters or remote preferences.',
    ],
  },
  samples: {
    title: 'Start from a sample',
    whatItIs: 'Loads complete, professionally structured resume templates crafted for specific engineering and product roles.',
    steps: [
      'Choose a sample matching your background: AI Engineer, Full-Stack Developer, or Graduate Student.',
      'Review the structured experience, education, and bullet phrasing in the editor.',
      'Replace placeholder companies, dates, and metrics with your own career milestones.',
      'Score your tailored draft against target job descriptions.',
    ],
    example: {
      input: 'Selected "AI Engineer" profile.',
      output: 'Loaded resume featuring PyTorch, LLM pipeline experience, and quantified achievements.',
    },
    readingTheResult: 'Samples illustrate optimal bullet density (3-6 per role), strong action verbs, and standard section naming.',
    commonMistakes: [
      'Leaving sample company names, dates, or contact emails unchanged.',
      'Skipping the customization of bullets to reflect your actual personal contributions.',
    ],
  },
};

interface HowToUseProps {
  toolId: ToolId;
  defaultOpen?: boolean;
}

export const HowToUse: React.FC<HowToUseProps> = ({ toolId, defaultOpen }) => {
  const storageKey = `rc-how-to:${toolId}`;
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return stored === 'true';
    return defaultOpen !== undefined ? defaultOpen : true;
  });

  const content = HOW_TO_USE_CONTENT[toolId];
  if (!content) return null;

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="border border-line bg-card rounded-[6px] transition select-none">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-3.5 py-2 flex items-center justify-between text-left cursor-pointer hover:bg-muted/30 rounded-[6px] transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <HelpCircle className="w-3.5 h-3.5 text-ink/50 shrink-0" strokeWidth={1.5} />
          <span className="text-xs font-semibold text-ink">How to use this tool</span>
          <span className="text-[11px] text-ink/50 truncate hidden sm:inline">— {content.whatItIs}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-ink/40 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-ink/40 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-line text-xs space-y-3 text-ink/80 animate-in fade-in duration-100 select-text">
          {/* What it is */}
          <div>
            <span className="font-semibold text-ink block text-[11px] uppercase tracking-wider mb-0.5">
              What it is
            </span>
            <p className="leading-relaxed text-ink/75">{content.whatItIs}</p>
          </div>

          {/* Steps */}
          <div>
            <span className="font-semibold text-ink block text-[11px] uppercase tracking-wider mb-1">
              Steps
            </span>
            <ol className="space-y-1 list-decimal list-inside text-ink/75 leading-relaxed">
              {content.steps.map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
          </div>

          {/* Example */}
          <div className="p-2.5 bg-muted/40 border border-line rounded-[6px] space-y-1 text-[11px]">
            <span className="font-semibold text-ink block text-[10px] uppercase tracking-wider">Example</span>
            <p className="text-ink/60">
              <strong className="text-ink font-medium">Input:</strong> {content.example.input}
            </p>
            <p className="text-ink/80">
              <strong className="text-ink font-medium">Output:</strong> {content.example.output}
            </p>
          </div>

          {/* Reading the result */}
          <div>
            <span className="font-semibold text-ink block text-[11px] uppercase tracking-wider mb-0.5">
              Reading the result
            </span>
            <p className="leading-relaxed text-ink/75">{content.readingTheResult}</p>
          </div>

          {/* Common mistakes */}
          <div>
            <span className="font-semibold text-ink block text-[11px] uppercase tracking-wider mb-1">
              Common mistakes to avoid
            </span>
            <ul className="space-y-0.5 list-disc list-inside text-ink/70 leading-relaxed">
              {content.commonMistakes.map((cm, i) => (
                <li key={i}>{cm}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
