import React, { useState } from 'react';
import {
  Target,
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { ResumeData, ATSCheckResult } from '../../types/resume';
import { analyzeJobMatch } from '../../services/geminiService';

interface JobMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
  initialAtsResult: ATSCheckResult;
}

export const JobMatcherModal: React.FC<JobMatcherModalProps> = ({
  isOpen,
  onClose,
  resumeData,
  initialAtsResult,
}) => {
  const [jobDescription, setJobDescription] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ATSCheckResult>(initialAtsResult);
  const [hasScanned, setHasScanned] = useState(false);

  if (!isOpen) return null;

  const handleScan = async () => {
    if (!jobDescription.trim()) return;
    setIsScanning(true);
    try {
      const result = await analyzeJobMatch(resumeData, jobDescription);
      setAnalysisResult(result);
      setHasScanned(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-300';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-300';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-300';
    return 'text-rose-600 bg-rose-50 border-rose-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30 text-blue-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Target Job Description & ATS Matcher</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30">
                  Precision Scanner
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Paste a job posting to reveal missing keywords, ATS parser score, and tailored alignment tips
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Input Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Paste Target Job Description (from LinkedIn, Indeed, Greenhouse, etc.):
            </label>
            <textarea
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="e.g. We are seeking a Senior AI Engineer with expertise in PyTorch, Gemini API, RAG systems, Kubernetes, and high-scale production systems..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
            />
            <div className="flex justify-end">
              <button
                onClick={handleScan}
                disabled={isScanning || !jobDescription.trim()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-200 disabled:opacity-50"
              >
                {isScanning ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isScanning ? 'Scanning ATS Match...' : 'Analyze Match & Keywords'}</span>
              </button>
            </div>
          </div>

          {/* Results Display */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
            {/* Score header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {hasScanned ? 'Job Posting ATS Compatibility' : 'General Resume ATS Health'}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-slate-900">
                    {analysisResult.score}%
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getScoreColor(
                      analysisResult.score
                    )}`}
                  >
                    {analysisResult.rating} Match
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 max-w-xs leading-relaxed">
                {analysisResult.score >= 80
                  ? 'Strong candidate alignment. Your resume contains the critical keywords to pass automated filters.'
                  : 'Needs tuning. Adding the missing keywords below will dramatically elevate your ATS ranking.'}
              </div>
            </div>

            {/* Keyword Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Matched Keywords */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Matched Keywords ({analysisResult.matchedKeywords.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.matchedKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md"
                    >
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Missing / Recommended Keywords ({analysisResult.missingKeywords.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.missingKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-md"
                    >
                      + {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Strengths & Tailoring Suggestions */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              {analysisResult.strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Key Strengths Identified:</h4>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc list-outside ml-4">
                    {analysisResult.strengths.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.suggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 mb-1">
                    Direct Tailoring Steps:
                  </h4>
                  <ul className="space-y-1 text-xs text-indigo-800 list-disc list-outside ml-4">
                    {analysisResult.suggestions.map((sug, idx) => (
                      <li key={idx}>{sug}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-xs text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
