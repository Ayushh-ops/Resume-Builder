import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCode,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import type { ResumeData } from '../../types/resume';
import {
  parseAndStructureResume,
  calculateConfidence,
  type ParsedResumeResult,
} from '../../services/resumeParser';

export interface ChecklistItem {
  label: string;
  hint: string;
  section: string;
  fieldId?: string;
  suggestion?: string;
  suggestedValue?: string;
}

export const getChecklistItems = (data: Partial<ResumeData>): ChecklistItem[] => {
  const items: ChecklistItem[] = [];
  if (!data.personalInfo?.fullName?.trim()) {
    items.push({
      label: 'Name missing',
      hint: 'Candidate name was not detected in the file',
      section: 'personal',
      fieldId: 'personalInfo.fullName',
    });
  } else if ((data.personalInfo as any)?.nameSource === 'from file name') {
    items.push({
      label: 'Confirm name from file name',
      hint: 'Name was derived from file name, please verify',
      section: 'personal',
      fieldId: 'personalInfo.fullName',
    });
  }
  if (!data.personalInfo?.jobTitle?.trim()) {
    const suggestedTitle = data.experience?.[0]?.position?.trim() || undefined;

    items.push({
      label: 'Target title not in your file (optional)',
      hint: 'Add one for job matching, or use the suggestion below.',
      section: 'personal',
      fieldId: 'personalInfo.jobTitle',
      suggestion: suggestedTitle ? `Use: ${suggestedTitle}` : undefined,
      suggestedValue: suggestedTitle,
    });
  }
  if (!data.personalInfo?.email?.trim()) {
    items.push({
      label: 'Email address missing',
      hint: 'ATS parsers require at least one valid contact email',
      section: 'personal',
      fieldId: 'personalInfo.email',
    });
  }
  if (!data.summary?.trim()) {
    items.push({
      label: 'Empty summary',
      hint: 'A 2-4 sentence executive overview improves profile visibility',
      section: 'summary',
      fieldId: 'summary',
    });
  }
  if (!data.experience || data.experience.length === 0) {
    items.push({
      label: 'No experience entries',
      hint: 'Add your work history and achievements',
      section: 'experience',
      fieldId: 'experience',
    });
  } else {
    const missingTitleOrCompany = data.experience.some((e) => !e.position?.trim() || !e.company?.trim());
    if (missingTitleOrCompany) {
      items.push({
        label: 'Missing title or company in experience',
        hint: 'One or more roles are missing a job title or company',
        section: 'experience',
        fieldId: 'experience',
      });
    }
    const missingDates = data.experience.some((e) => !e.startDate && !e.endDate);
    if (missingDates) {
      items.push({
        label: 'No dates in experience',
        hint: 'One or more roles are missing start or end dates',
        section: 'experience',
        fieldId: 'experience',
      });
    }
  }
  if (!data.projects || data.projects.length === 0) {
    items.push({
      label: '0 projects detected',
      hint: 'Add technical projects to showcase hands-on work',
      section: 'projects',
      fieldId: 'projects',
    });
  }
  if (
    !data.skills ||
    data.skills.length === 0 ||
    data.skills.every((s) => !s.skills || s.skills.length === 0)
  ) {
    items.push({
      label: 'No skills found',
      hint: 'List your core technical and professional skills',
      section: 'skills',
      fieldId: 'skills',
    });
  }
  return items;
};

type UploadStep = 'upload' | 'parsing' | 'review' | 'error';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAsNew: (data: Partial<ResumeData>, fileName?: string, firstProblemField?: string) => void | Promise<void>;
  onReplaceCurrent?: (data: Partial<ResumeData>) => void;
  canReplace?: boolean;
  initialFile?: File | null;
  onGoToSection?: (sectionId: string, bulletRef?: string) => void;
  onOpenSettings?: () => void;
}

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({
  isOpen,
  onClose,
  onSaveAsNew,
  onReplaceCurrent,
  canReplace = false,
  initialFile = null,
  onGoToSection,
}) => {
  const [step, setStep] = useState<UploadStep>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsingStage, setParsingStage] = useState<1 | 2>(1);
  const [parsedResult, setParsedResult] = useState<ParsedResumeResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (step === 'parsing') {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      if (initialFile) {
        handleFileProcess(initialFile);
      } else {
        setStep('upload');
        setErrorMessage('');
        setFileName('');
        setParsedResult(null);
        setParsingStage(1);
        setCurrentFile(null);
      }
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen, initialFile]);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStep('upload');
    setErrorMessage('');
    setParsingStage(1);
    setParsedResult(null);
  };

  const handleFileProcess = async (file: File) => {
    setCurrentFile(file);
    setFileName(file.name.replace(/\.[^/.]+$/, ''));
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit. Please upload a smaller resume.');
      setStep('error');
      return;
    }

    setStep('parsing');
    setParsingStage(1);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const timer = setTimeout(() => setParsingStage(2), 350);

      const result = await parseAndStructureResume(file, controller.signal);

      clearTimeout(timer);
      setParsingStage(2);

      setTimeout(() => {
        setParsedResult(result);
        setStep('review');
      }, 300);
    } catch (err: any) {
      console.error('File parsing failed:', err);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload resume"
      subtitle={step === 'parsing' ? 'Reading your file locally.' : 'Import a PDF, Word, JSON or text file'}
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
              onClick={async () => {
                const checkItems = getChecklistItems(parsedResult.data);
                const firstField = checkItems[0]?.fieldId || checkItems[0]?.section;
                await onSaveAsNew(parsedResult.data, fileName, firstField);
              }}
              className="btn-primary h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Save as new resume</span>
            </button>
          </div>
        ) : step === 'parsing' ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-ink/50 tabular-nums">
              {elapsedSeconds}s elapsed
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="btn-outline h-8 px-3 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : step === 'error' ? (
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-outline h-8 px-3 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => currentFile && handleFileProcess(currentFile)}
              className="btn-primary h-8 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
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
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
              <RefreshCw className="w-8 h-8 animate-spin" strokeWidth={1.75} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-ink">Analyzing Your Resume</h3>
              <p className="text-xs text-ink/50">Reading your file locally.</p>
            </div>

            {/* 2 Step Visual Checklist */}
            <div className="w-full max-w-sm space-y-3 bg-muted/60 p-4 rounded-xl border border-line">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={parsingStage >= 1 ? 'text-ink' : 'text-ink/40'}>
                  1. Reading file
                </span>
                {parsingStage >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={parsingStage >= 2 ? 'text-ink' : 'text-ink/40'}>
                  2. Extracting sections
                </span>
                {parsingStage >= 2 ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-normal">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                ) : (
                  <span className="text-[10px] text-ink/30">Pending</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 'review' && parsedResult && (() => {
          const checkItems = getChecklistItems(parsedResult.data);
          const hasMissing = checkItems.length > 0;
          const displayConfidence = calculateConfidence(parsedResult.data, hasMissing);

          const handleFixInEditor = async (sec: string, fieldId?: string) => {
            await onSaveAsNew(parsedResult.data, fileName, fieldId || sec);
            if (onGoToSection) {
              onGoToSection(sec, fieldId);
            }
          };

          return (
            <div className="space-y-4">
              {hasMissing ? (
                <div className="p-3 bg-muted border border-line rounded-[6px] flex items-center gap-2.5 text-xs text-ink">
                  <AlertCircle className="w-4 h-4 text-ink/50 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold">Review parsed fields</span>
                    <p className="text-[11px] text-ink/60 mt-0.5">
                      {checkItems.length} {checkItems.length === 1 ? 'section needs' : 'sections need'} attention. Complete them using the checklist below.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted border border-line rounded-[6px] flex items-center gap-2.5 text-xs text-ink">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold">Resume parsed successfully</span>
                    <p className="text-[11px] text-ink/60 mt-0.5">
                      Review detected fields and extraction confidence before importing.
                    </p>
                  </div>
                </div>
              )}

              {/* Check these checklist */}
              {checkItems.length > 0 && (
                <div className="p-3.5 bg-card border border-line rounded-[6px] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">Check these ({checkItems.length})</span>
                    <span className="text-[11px] text-ink/50">Missing or incomplete fields</span>
                  </div>
                  <div className="space-y-1.5">
                    {checkItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2.5 bg-muted/30 rounded-[6px] border border-line text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-ink block">{item.label}</span>
                          <span className="text-[11px] text-ink/60 truncate block mt-0.5">{item.hint}</span>
                          {item.suggestion && item.suggestedValue && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.fieldId === 'personalInfo.jobTitle' && parsedResult) {
                                  const updated = {
                                    ...parsedResult.data,
                                    personalInfo: {
                                      fullName: parsedResult.data.personalInfo?.fullName || '',
                                      email: parsedResult.data.personalInfo?.email || '',
                                      phone: parsedResult.data.personalInfo?.phone || '',
                                      location: parsedResult.data.personalInfo?.location || '',
                                      website: parsedResult.data.personalInfo?.website || '',
                                      linkedin: parsedResult.data.personalInfo?.linkedin || '',
                                      github: parsedResult.data.personalInfo?.github || '',
                                      ...parsedResult.data.personalInfo,
                                      jobTitle: item.suggestedValue || '',
                                    },
                                  };
                                  setParsedResult({ ...parsedResult, data: updated });
                                }
                              }}
                              className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800 transition cursor-pointer"
                            >
                              <span>{item.suggestion}</span>
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFixInEditor(item.section, item.fieldId)}
                          className="btn-outline h-6 px-2 text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>Fix in editor</span>
                          <ArrowRight className="w-3 h-3 text-ink/50" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2-column layout: Left = Detected fields, Right = Confidence tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Detected Content */}
              <div className="card p-4 space-y-3 bg-card border border-line">
                <h4 className="text-[12.5px] font-medium text-ink/60">
                  Detected candidate profile
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-ink/60 block text-[12.5px]">Name</span>
                    <span className="font-semibold text-ink">
                      {parsedResult.data.personalInfo?.fullName || 'Not detected'}
                    </span>
                  </div>

                  <div>
                    <span className="text-ink/60 block text-[12.5px]">Target role</span>
                    <span className="text-ink">
                      {parsedResult.data.personalInfo?.jobTitle || 'Not detected'}
                    </span>
                  </div>

                  <div>
                    <span className="text-ink/60 block text-[12.5px]">Email & contact</span>
                    <span className="text-ink">
                      {parsedResult.data.personalInfo?.email || 'Not detected'}{' '}
                      {parsedResult.data.personalInfo?.phone ? `• ${parsedResult.data.personalInfo.phone}` : ''}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-line grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-ink/60 block text-[12.5px]">Experience</span>
                      <span className="font-semibold text-ink">
                        {parsedResult.data.experience?.length || 0}{' '}
                        {(parsedResult.data.experience?.length || 0) === 1 ? 'role' : 'roles'}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink/60 block text-[12.5px]">Education</span>
                      <span className="font-semibold text-ink">
                        {parsedResult.data.education?.length || 0}{' '}
                        {(parsedResult.data.education?.length || 0) === 1 ? 'degree' : 'degrees'}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink/60 block text-[12.5px]">Skills</span>
                      <span className="font-semibold text-ink">
                        {parsedResult.data.skills?.reduce((a, s) => a + s.skills.length, 0) || 0} skills
                      </span>
                    </div>
                    <div>
                      <span className="text-ink/60 block text-[12.5px]">Projects</span>
                      <span className="font-semibold text-ink">
                        {parsedResult.data.projects?.length || 0}{' '}
                        {(parsedResult.data.projects?.length || 0) === 1 ? 'project' : 'projects'}
                      </span>
                    </div>
                    {(parsedResult.data.customSections?.length || 0) > 0 && (
                      <div>
                        <span className="text-ink/60 block text-[12.5px]">Additional</span>
                        <span className="font-semibold text-ink">
                          {parsedResult.data.customSections!.reduce((acc, s) => acc + (s.items?.length || 0), 0)} items
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Confidence Breakdown */}
              <div className="card p-4 space-y-3 bg-card border border-line">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12.5px] font-medium text-ink/60">
                    Parser confidence
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        (displayConfidence.overall || 0) >= 80 ? 'bg-emerald-500' : (displayConfidence.overall || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                    />
                    <span className="tabular-nums font-bold text-ink">Overall {displayConfidence.overall || 0}%</span>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-line">
                  {Object.entries(displayConfidence)
                    .filter(([section]) => section !== 'overall')
                    .map(([section, score]) => (
                    <div key={section} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-ink/70">{section}</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="tabular-nums font-medium text-ink">{score}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-ink/40 pt-2 border-t border-line leading-relaxed">
                  You can edit, refine, or reorganize any imported section directly in the editor after confirmation.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

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
