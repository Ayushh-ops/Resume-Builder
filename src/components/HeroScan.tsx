import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, FileText, Download } from 'lucide-react';

export const HeroScan: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center w-full select-none"
      style={{ minHeight: '390px', height: '390px' }}
      aria-label="Resume scanning animation preview"
    >
      <style>{`
        @keyframes pdfSlideIn {
          0% { transform: translateY(-30px) scale(0.85); opacity: 0; }
          12% { transform: translateY(0) scale(1); opacity: 1; }
          85% { opacity: 1; }
          95%, 100% { opacity: 0; }
        }

        @keyframes scanBeamSweep {
          0%, 14% { top: 0%; opacity: 0; }
          16% { opacity: 1; }
          55% { top: 88%; opacity: 1; }
          58%, 100% { top: 92%; opacity: 0; }
        }

        @keyframes labelFadeContact {
          0%, 20% { opacity: 0; transform: translateX(6px); }
          25%, 85% { opacity: 1; transform: translateX(0); }
          92%, 100% { opacity: 0; }
        }

        @keyframes labelFadeHeadings {
          0%, 30% { opacity: 0; transform: translateX(6px); }
          35%, 85% { opacity: 1; transform: translateX(0); }
          92%, 100% { opacity: 0; }
        }

        @keyframes alertFadeFix {
          0%, 40% { opacity: 0; transform: translateX(6px); }
          45%, 85% { opacity: 1; transform: translateX(0); }
          92%, 100% { opacity: 0; }
        }

        @keyframes labelFadeSkills {
          0%, 50% { opacity: 0; transform: translateX(6px); }
          55%, 85% { opacity: 1; transform: translateX(0); }
          92%, 100% { opacity: 0; }
        }

        @keyframes labelFadeResults {
          0%, 58% { opacity: 0; transform: translateX(6px); }
          63%, 85% { opacity: 1; transform: translateX(0); }
          92%, 100% { opacity: 0; }
        }

        @keyframes ringFill {
          0%, 58% { stroke-dashoffset: 75; opacity: 0; }
          62% { opacity: 1; }
          75%, 88% { stroke-dashoffset: 0; opacity: 1; }
          94%, 100% { stroke-dashoffset: 0; opacity: 0; }
        }

        @keyframes pageShiftAndPulse {
          0%, 65% { transform: translateY(0); }
          72%, 85% { transform: translateY(-4px); }
          95%, 100% { transform: translateY(0); }
        }

        @keyframes downloadPulse {
          0%, 68% { opacity: 0; transform: scale(0.9); }
          74% { opacity: 1; transform: scale(1.05); }
          80%, 88% { opacity: 1; transform: scale(1); }
          94%, 100% { opacity: 0; }
        }

        .hero-scan-loop {
          animation-duration: 8s;
          animation-iteration-count: infinite;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-scan-loop {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .scan-beam {
            display: none !important;
          }
          .progress-ring-circle {
            stroke-dashoffset: 0 !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      {/* Outer Wrapper with pause-on-hidden */}
      <div
        className="relative flex items-center justify-center w-full max-w-[340px]"
        style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
      >
        {/* A4 Resume Sheet (w=225px, h=318px ~ A4 ratio 1:1.414) */}
        <div
          className="hero-scan-loop relative w-[225px] h-[318px] bg-card border border-line rounded-[6px] shadow-sm p-4 overflow-hidden flex flex-col justify-between"
          style={{
            animationName: 'pdfSlideIn, pageShiftAndPulse',
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {/* Scan Beam */}
          <div
            className="hero-scan-loop scan-beam absolute left-0 right-0 h-[2px] bg-brand-600 shadow-[0_0_8px_rgba(79,70,229,0.7)] pointer-events-none z-10"
            style={{
              animationName: 'scanBeamSweep',
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          />

          {/* Top PDF file watermark indicator in t0 */}
          <div className="flex items-center justify-between pb-2 border-b border-line/60">
            <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-ink/40 uppercase">
              <FileText className="w-3 h-3 text-ink/40" />
              <span>PDF</span>
            </div>
            <div className="h-1.5 w-6 bg-ink/10 rounded-full" />
          </div>

          {/* Skeleton Body Content */}
          <div className="space-y-3 flex-1 pt-2">
            {/* Header: Name Bar & Contact Info Row */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-24 bg-ink/25 rounded-[3px]" />
              <div className="flex gap-1.5">
                <div className="h-1.5 w-10 bg-ink/10 rounded-full" />
                <div className="h-1.5 w-12 bg-ink/10 rounded-full" />
                <div className="h-1.5 w-8 bg-ink/10 rounded-full" />
              </div>
            </div>

            {/* Block 1: Summary / Headings */}
            <div className="space-y-1 pt-1">
              <div className="h-2 w-14 bg-ink/30 rounded-[2px]" />
              <div className="h-1.5 w-full bg-ink/10 rounded-full" />
              <div className="h-1.5 w-4/5 bg-ink/10 rounded-full" />
            </div>

            {/* Block 2: Experience / Bullets */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <div className="h-2 w-20 bg-ink/30 rounded-[2px]" />
                <div className="h-1.5 w-10 bg-ink/10 rounded-full" />
              </div>
              <div className="h-1.5 w-full bg-ink/10 rounded-full" />
              <div className="h-1.5 w-5/6 bg-ink/10 rounded-full" />
            </div>

            {/* Block 3: Skills Keywords */}
            <div className="space-y-1 pt-1">
              <div className="h-2 w-16 bg-ink/30 rounded-[2px]" />
              <div className="flex flex-wrap gap-1">
                <div className="h-1.5 w-8 bg-ink/10 rounded-full" />
                <div className="h-1.5 w-10 bg-ink/10 rounded-full" />
                <div className="h-1.5 w-7 bg-ink/10 rounded-full" />
                <div className="h-1.5 w-11 bg-ink/10 rounded-full" />
              </div>
            </div>
          </div>

          {/* t2: Bottom Progress & Pulse Bar */}
          <div className="pt-2 border-t border-line/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 -rotate-90" viewBox="0 0 28 28">
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-line"
                />
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="75.4"
                  strokeDashoffset="0"
                  className="hero-scan-loop progress-ring-circle text-emerald-600"
                  style={{
                    animationName: 'ringFill',
                    animationPlayState: isPaused ? 'paused' : 'running',
                  }}
                />
              </svg>
              <div className="h-1.5 w-12 bg-ink/10 rounded-full" />
            </div>

            {/* Download PDF button pulse in t2 */}
            <div
              className="hero-scan-loop flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-brand-600 text-white text-[9.5px] font-medium"
              style={{
                animationName: 'downloadPulse',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            >
              <Download className="w-2.5 h-2.5" />
              <span>PDF</span>
            </div>
          </div>
        </div>

        {/* Floating Scan Labels on the Right Edge (plain text, muted, no pills) */}
        <div className="absolute -right-2 top-6 flex flex-col gap-5 pointer-events-none text-[11px] text-ink/75 font-medium">
          {/* Label 1: Contact info */}
          <div
            className="hero-scan-loop flex items-center gap-1.5 bg-card/95 backdrop-blur-xs px-2 py-0.5 rounded border border-line shadow-xs"
            style={{
              animationName: 'labelFadeContact',
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
            <span>Contact info</span>
          </div>

          {/* Label 2: Section headings */}
          <div
            className="hero-scan-loop flex items-center gap-1.5 bg-card/95 backdrop-blur-xs px-2 py-0.5 rounded border border-line shadow-xs mt-3"
            style={{
              animationName: 'labelFadeHeadings',
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
            <span>Section headings</span>
          </div>

          {/* Label 3: Alert Fix (Add a number here) */}
          <div
            className="hero-scan-loop flex items-center gap-1.5 bg-card/95 backdrop-blur-xs px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700/60 shadow-xs mt-3 text-amber-700 dark:text-amber-400"
            style={{
              animationName: 'alertFadeFix',
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={2} />
            <span>Add a number here</span>
          </div>

          {/* Label 4: Skills keywords */}
          <div
            className="hero-scan-loop flex items-center gap-1.5 bg-card/95 backdrop-blur-xs px-2 py-0.5 rounded border border-line shadow-xs mt-3"
            style={{
              animationName: 'labelFadeSkills',
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
            <span>Skills keywords</span>
          </div>

          {/* Label 5: Measurable results */}
          <div
            className="hero-scan-loop flex items-center gap-1.5 bg-card/95 backdrop-blur-xs px-2 py-0.5 rounded border border-line shadow-xs -mt-1"
            style={{
              animationName: 'labelFadeResults',
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
            <span>Measurable results</span>
          </div>
        </div>
      </div>

      {/* Muted caption below animation */}
      <p className="text-[11.5px] text-ink/50 mt-3 text-center">
        Upload yours to see real fixes.
      </p>
    </div>
  );
};
