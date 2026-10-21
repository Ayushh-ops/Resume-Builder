import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCode,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import type { ResumeData } from '../../types/resume';
import { parseAndStructureResume, type ParsedResumeResult } from '../../services/resumeParser';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Partial<ResumeData>) => void;
}

type UploadStep = 'upload' | 'parsing' | 'review' | 'error';

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [step, setStep] = useState<UploadStep>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [parsingStage, setParsingStage] = useState<1 | 2 | 3>(1);
  const [parsedResult, setParsedResult] = useState<ParsedResumeResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setStep('upload');
      setErrorMessage('');
      setParsedResult(null);
      setParsingStage(1);
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
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
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 70) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Import & Structure Resume</h2>
              <p className="text-xs text-ink/50">
                PDF, DOCX, JSON, or TXT — automatic field extraction and AI formatting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink/40 hover:text-ink p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[85vh] space-y-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-brand-500 bg-brand-50/50 scale-[0.99]'
                    : 'border-black/10 hover:border-brand-500/50 hover:bg-brand-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.json,.txt"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-soft">
                  <Upload className="w-6 h-6" strokeWidth={1.75} />
                </div>

                <h3 className="text-sm font-semibold text-ink">
                  Drag & Drop your resume here, or <span className="text-brand-600 underline">browse</span>
                </h3>
                <p className="text-xs text-ink/40 mt-1">
                  Supports PDF, Word (.docx), JSON, or TXT (Max 5MB)
                </p>

                <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-ink/60">
                  <span className="flex items-center gap-1 bg-black/[0.03] px-2.5 py-1 rounded-full">
                    <FileText className="w-3.5 h-3.5 text-rose-500" /> PDF
                  </span>
                  <span className="flex items-center gap-1 bg-black/[0.03] px-2.5 py-1 rounded-full">
                    <FileText className="w-3.5 h-3.5 text-blue-500" /> Word DOCX
                  </span>
                  <span className="flex items-center gap-1 bg-black/[0.03] px-2.5 py-1 rounded-full">
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
              <div className="w-full max-w-sm space-y-3 bg-canvas/70 p-4 rounded-xl border border-black/[0.05]">
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
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-3 text-xs text-emerald-900">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Resume Parsed Successfully!</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Review the detected fields and extraction confidence before importing into the editor.
                  </p>
                </div>
              </div>

              {/* 2-column layout: Left = Detected fields, Right = Confidence tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Detected Content */}
                <div className="card p-4 space-y-3 bg-white border border-black/[0.06]">
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

                    <div className="pt-2 border-t border-black/[0.05] grid grid-cols-2 gap-2 text-[11px]">
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
                <div className="card p-4 space-y-3 bg-white border border-black/[0.06]">
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

                  <p className="text-[11px] text-ink/40 pt-2 border-t border-black/[0.05] leading-relaxed">
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

        {/* Footer */}
        <div className="bg-white border-t border-black/[0.06] px-4 py-3 flex justify-end gap-2 shrink-0">
          {step === 'review' && parsedResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 font-semibold text-xs text-ink/70 hover:bg-black/5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm(parsedResult.data);
                  onClose();
                }}
                className="btn-primary"
              >
                Confirm & Import
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 font-semibold text-xs text-ink/70 hover:bg-black/5 rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
