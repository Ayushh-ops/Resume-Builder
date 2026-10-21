import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCode,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import type { ResumeData } from '../../types/resume';
import { parseAndStructureResume, type ParsedResumeResult } from '../../services/resumeParser';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAsNew: (data: Partial<ResumeData>, fileName?: string) => void;
  onReplaceCurrent?: (data: Partial<ResumeData>) => void;
  canReplace?: boolean;
}

type UploadStep = 'upload' | 'parsing' | 'review' | 'error';

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({
  isOpen,
  onClose,
  onSaveAsNew,
  onReplaceCurrent,
  canReplace = false,
}) => {
  const [step, setStep] = useState<UploadStep>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsingStage, setParsingStage] = useState<1 | 2 | 3>(1);
  const [parsedResult, setParsedResult] = useState<ParsedResumeResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setErrorMessage('');
      setFileName('');
      setParsedResult(null);
      setParsingStage(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setFileName(file.name.replace(/\.[^/.]+$/, ''));
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit. Please upload a smaller resume.');
      setStep('error');
      return;
    }

    setStep('parsing');
    setParsingStage(1);

    try {
      // Simulate/trigger staged visual progress while parsing
      const timer1 = setTimeout(() => setParsingStage(2), 600);
      const timer2 = setTimeout(() => setParsingStage(3), 1400);

      const result = await parseAndStructureResume(file);

      clearTimeout(timer1);
      clearTimeout(timer2);
      setParsingStage(3);

      setTimeout(() => {
        setParsedResult(result);
        setStep('review');
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse resume document. Please try again or paste in text.');
      setStep('error');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const getConfidenceStyle = (score: number) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    if (score >= 70) return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload resume"
      subtitle="Import a PDF, Word, JSON or text file"
      icon={<Upload className="w-4 h-4 text-ink/70" strokeWidth={1.5} />}
      maxWidth="max-w-2xl"
      footer={
        step === 'review' && parsedResult ? (
          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 font-medium text-xs text-ink/70 hover:bg-muted rounded-[6px] transition cursor-pointer"
            >
              Cancel
            </button>
            {canReplace && onReplaceCurrent && (
              <button
                type="button"
                onClick={() => {
                  onReplaceCurrent(parsedResult.data);
                  onClose();
                }}
                className="btn-outline h-8 px-3 text-xs font-medium cursor-pointer"
              >
                Replace current resume
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onSaveAsNew(parsedResult.data, fileName);
                onClose();
              }}
              className="btn-primary h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Save as new resume</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="btn-outline h-8 px-3.5"
          >
            Close
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-[10px] p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-brand-600 bg-muted/40'
                  : 'border-line hover:border-ink/40 hover:bg-muted/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.json,.txt"
                onChange={handleInputChange}
                className="hidden"
              />

              <Upload className="w-6 h-6 text-ink/50 mx-auto mb-2" strokeWidth={1.5} />

              <h3 className="text-sm font-semibold text-ink">
                Drop your resume here, or <span className="text-brand-600 underline">browse files</span>
              </h3>
              <p className="text-xs text-ink/40 mt-1">
                Supports PDF, Word (.docx), JSON, or TXT (Max 5MB)
              </p>

              <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-ink/60">
                <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full border border-line">
                  <FileText className="w-3.5 h-3.5 text-rose-500" /> PDF
                </span>
                <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full border border-line">
                  <FileText className="w-3.5 h-3.5 text-blue-500" /> Word DOCX
                </span>
                <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full border border-line">
                  <FileCode className="w-3.5 h-3.5 text-emerald-500" /> JSON / TXT
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PARSING PROGRESS */}
        {step === 'parsing' && (
          <div className="py-8 px-4 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
                <RefreshCw className="w-8 h-8 animate-spin" strokeWidth={1.75} />
              </div>
              <Sparkles className="w-5 h-5 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-ink">Analyzing Your Resume</h3>
              <p className="text-xs text-ink/50">Extracting and structuring your career achievements...</p>
            </div>

            {/* 3 Step Visual Checklist */}
            <div className="w-full max-w-sm space-y-3 bg-muted/60 p-4 rounded-xl border border-line">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={parsingStage >= 1 ? 'text-ink' : 'text-ink/40'}>
                  1. Reading & Decoding File
                </span>
                {parsingStage >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={parsingStage >= 2 ? 'text-ink' : 'text-ink/40'}>
                  2. Extracting Text & Sections
                </span>
                {parsingStage >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : parsingStage === 2 ? (
                  <RefreshCw className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                ) : (
                  <span className="text-[10px] text-ink/30">Pending</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={parsingStage >= 3 ? 'text-ink' : 'text-ink/40'}>
                  3. AI Field Structuring & Polish
                </span>
                {parsingStage >= 3 ? (
                  <RefreshCw className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                ) : (
                  <span className="text-[10px] text-ink/30">Pending</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 'review' && parsedResult && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-200">
              <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Resume Parsed Successfully!</span>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Review the detected fields and extraction confidence before importing into the editor.
                </p>
              </div>
            </div>

            {/* 2-column layout: Left = Detected fields, Right = Confidence tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Detected Content */}
              <div className="card p-4 space-y-3 bg-card border border-line">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Detected Candidate Profile
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-ink/40 block text-[10px] uppercase font-semibold">Name</span>
                    <span className="font-semibold text-ink">
                      {parsedResult.data.personalInfo?.fullName || 'Not detected'}
                    </span>
                  </div>

                  <div>
                    <span className="text-ink/40 block text-[10px] uppercase font-semibold">Target Role</span>
                    <span className="text-ink">
                      {parsedResult.data.personalInfo?.jobTitle || 'Not detected'}
                    </span>
                  </div>

                  <div>
                    <span className="text-ink/40 block text-[10px] uppercase font-semibold">Email & Contact</span>
                    <span className="text-ink">
                      {parsedResult.data.personalInfo?.email || 'Not detected'}{' '}
                      {parsedResult.data.personalInfo?.phone ? `• ${parsedResult.data.personalInfo.phone}` : ''}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-line grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-ink/40 block text-[10px]">Experience</span>
                      <span className="font-semibold text-ink">
                        {parsedResult.data.experience?.length || 0} Roles
                      </span>
                    </div>
                    <div>
                      <span className="text-ink/40 block text-[10px]">Education</span>
                      <span className="font-semibold text-ink">
                        {parsedResult.data.education?.length || 0} Degrees
                      </span>
                    </div>
                    <div>
                      <span className="text-ink/40 block text-[10px]">Skills</span>
                      <span className="font-semibold text-ink">
                        {parsedResult.data.skills?.reduce((a, s) => a + s.skills.length, 0) || 0} Skills
                      </span>
                    </div>
                    <div>
                      <span className="text-ink/40 block text-[10px]">Projects</span>
                      <span className="font-semibold text-ink">
                        {parsedResult.data.projects?.length || 0} Projects
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Confidence Breakdown */}
              <div className="card p-4 space-y-3 bg-card border border-line">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Parser Confidence
                </h4>
                <div className="space-y-2">
                  {Object.entries(parsedResult.confidence).map(([section, score]) => (
                    <div key={section} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-ink/70">{section}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getConfidenceStyle(
                          score
                        )}`}
                      >
                        {score}% confidence
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-ink/40 pt-2 border-t border-line leading-relaxed">
                  You can edit, refine, or reorganize any imported section directly in the editor after confirmation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: ERROR */}
        {step === 'error' && (
          <div className="py-6 px-4 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Unable to Parse Document</h3>
              <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="btn-primary mx-auto"
            >
              Try Another File
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
