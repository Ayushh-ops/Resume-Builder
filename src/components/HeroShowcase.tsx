import React, { useState, useEffect } from 'react';
import { Check, Plus, Loader2 } from 'lucide-react';

export const HeroShowcase: React.FC = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Pause animation when tab is hidden
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Score count-up to 86
  useEffect(() => {
    if (reducedMotion) {
      setScore(86);
      return;
    }
    let current = 0;
    const target = 86;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        setScore(target);
        clearInterval(interval);
      } else {
        setScore(current);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const animationStyle = (animationName: string, duration: string, delay: string) => {
    if (reducedMotion) return {};
    return {
      animation: `${animationName} ${duration} ease-in-out infinite`,
      animationDelay: delay,
      animationPlayState: isPaused ? ('paused' as const) : ('running' as const),
    };
  };

  return (
    <div className="flex flex-col items-center">
      {/* Fixed 520x420 composition box with 110px gutters left/right and 300px centered paper */}
      <div
        data-testid="hero-showcase-box"
        className="relative w-[520px] h-[420px] box-border overflow-visible select-none"
      >
        <style>{`
          @keyframes heroFloat1 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          @keyframes heroFloat2 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(4px); }
          }
          @keyframes heroFloat3 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
          @keyframes heroFloat4 {
            0%, 100% { transform: translate(-50%, 0px); }
            50% { transform: translate(-50%, 3px); }
          }
        `}</style>

        {/* Background Soft Organic Blob + Radial Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="absolute w-[360px] h-[360px] rounded-full bg-brand-500/10 dark:bg-brand-500/15 blur-3xl" />
          <svg
            viewBox="0 0 200 200"
            className="w-[400px] h-[400px] text-brand-600/10 dark:text-brand-400/10"
            fill="currentColor"
          >
            <path
              d="M44.5,-62.1C57.4,-54.6,67.8,-42.6,73.4,-28.7C78.9,-14.8,79.6,1.1,75.1,15.5C70.6,29.9,60.9,42.8,48.5,52.2C36.1,61.6,21,67.5,5.1,69.5C-10.8,71.5,-27.5,69.6,-40.8,61.3C-54.1,53,-64,38.3,-69.6,22.2C-75.2,6.1,-76.5,-11.4,-70.7,-25.9C-64.9,-40.4,-52,-51.9,-38.3,-59C-24.6,-66.1,-10.1,-68.8,3.2,-73.2C16.5,-77.6,31.6,-69.6,44.5,-62.1Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        {/* Center: A4 Resume Page (300px wide, centered at left: 110px with 110px gutters left/right, UI font everywhere) */}
        <div
          data-testid="hero-paper"
          className="absolute left-[110px] top-[32px] z-10 w-[300px] h-[340px] bg-white text-slate-800 rounded-sm border border-slate-200 shadow-xl p-4 font-sans transition-transform duration-300"
          style={{
            transform: 'rotate(-2deg)',
            transformOrigin: 'center center',
            boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.12), 0 10px 15px -8px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Header Block: "Your Name" and header never covered */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div>
              <h4
                data-testid="hero-paper-name"
                className="text-xs font-bold text-slate-900 tracking-tight font-sans"
              >
                Your Name
              </h4>
              <p
                data-testid="hero-paper-title"
                className="text-[10px] text-slate-400 font-medium font-sans"
              >
                Job Title
              </p>
              {/* Contact row (UI font everywhere, no monospace) */}
              <div
                data-testid="hero-paper-contact"
                className="flex items-center gap-1 mt-1 text-[8px] text-slate-400 font-sans"
              >
                <span>contact@email.com</span>
                <span>•</span>
                <span>City, ST</span>
                <span>•</span>
                <span>portfolio.dev</span>
              </div>
            </div>
            {/* Flat abstract circle in accent (no face, no image) */}
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 shrink-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-brand-600/40" />
            </div>
          </div>

          {/* Section 1: Experience */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span
                data-testid="hero-paper-heading-exp"
                className="text-[9px] font-bold uppercase tracking-wider text-slate-700 font-sans"
              >
                Experience
              </span>
              <span className="text-[8px] text-slate-400 font-sans">2024 – Present</span>
            </div>
            {/* Realistic grey text lines */}
            <div className="space-y-1.5">
              <div className="h-1.5 bg-slate-300 rounded w-[88%]" />
              <div className="h-1.5 bg-slate-200 rounded w-[72%]" />
              <div className="h-1.5 bg-slate-200 rounded w-[80%]" />
              <div className="h-1.5 bg-slate-100 rounded w-[60%]" />
            </div>

            <div className="mt-2 space-y-1.5">
              <div className="flex justify-between">
                <div className="h-1.5 bg-slate-300 rounded w-[45%]" />
                <div className="h-1.5 bg-slate-200 rounded w-[25%]" />
              </div>
              <div className="h-1.5 bg-slate-200 rounded w-[82%]" />
              <div className="h-1.5 bg-slate-100 rounded w-[68%]" />
            </div>
          </div>

          {/* Section 2: Education */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span
                data-testid="hero-paper-heading-edu"
                className="text-[9px] font-bold uppercase tracking-wider text-slate-700 font-sans"
              >
                Education
              </span>
              <span className="text-[8px] text-slate-400 font-sans">2020 – 2024</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-slate-300 rounded w-[60%]" />
              <div className="h-1.5 bg-slate-200 rounded w-[75%]" />
              <div className="h-1.5 bg-slate-100 rounded w-[50%]" />
            </div>
          </div>
        </div>

        {/* Floating Card 1: Lives in Left Gutter [0, 110px], never over paper text */}
        <div
          data-testid="hero-card-score"
          className="absolute top-6 left-2 z-20 w-[100px] bg-card/95 backdrop-blur-md border border-line shadow-xl rounded-[10px] p-2 flex flex-col items-center text-center transition-transform duration-200 hover:-translate-y-1 cursor-default font-sans"
          style={animationStyle('heroFloat1', '6s', '0s')}
        >
          <div className="relative w-8 h-8 flex items-center justify-center mb-1">
            <svg className="w-8 h-8 transform -rotate-90">
              <circle
                cx="16"
                cy="16"
                r={radius}
                stroke="currentColor"
                strokeWidth="2.5"
                fill="transparent"
                className="text-muted"
              />
              <circle
                cx="16"
                cy="16"
                r={radius}
                stroke="currentColor"
                strokeWidth="2.5"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-brand-600 dark:text-brand-400 transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-ink tabular-nums">{score}</span>
          </div>
          <span className="text-[8px] font-medium text-ink/50 uppercase tracking-wider block">Score</span>
          <span className="text-[10px] font-bold text-ink leading-tight">Strong</span>
        </div>

        {/* Floating Card 2: Lives in Right Gutter [410, 520px], never over paper text */}
        <div
          data-testid="hero-card-ats"
          className="absolute top-8 right-2 z-20 w-[112px] bg-card/95 backdrop-blur-md border border-line shadow-xl rounded-[10px] p-2 flex items-center gap-1.5 transition-transform duration-200 hover:-translate-y-1 cursor-default font-sans"
          style={animationStyle('heroFloat2', '5.5s', '1.2s')}
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Check className="w-3 h-3" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block leading-tight whitespace-nowrap">
              ATS friendly
            </span>
            <span className="text-[8px] text-ink/50 block whitespace-nowrap">Passes filter</span>
          </div>
        </div>

        {/* Floating Card 3: Lives in Right Gutter [410, 520px], never over paper text */}
        <div
          data-testid="hero-card-skills"
          className="absolute top-36 right-2 z-20 w-[105px] bg-card/95 backdrop-blur-md border border-line shadow-xl rounded-[10px] p-2 transition-transform duration-200 hover:-translate-y-1 cursor-default font-sans"
          style={animationStyle('heroFloat3', '6.5s', '2.4s')}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-ink/70">Skills</span>
            <span className="text-[8px] text-brand-600 font-semibold cursor-pointer flex items-center gap-0.5">
              <Plus className="w-2 h-2" /> Add
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="px-1 py-0.5 rounded text-[8px] font-medium bg-muted text-ink/80 border border-line truncate">
              Problem solving
            </span>
            <span className="px-1 py-0.5 rounded text-[8px] font-medium bg-muted text-ink/80 border border-line truncate">
              Teamwork
            </span>
            <span className="px-1 py-0.5 rounded text-[8px] font-medium bg-muted text-ink/80 border border-line truncate">
              Communication
            </span>
          </div>
        </div>

        {/* Floating Card 4: Lives Below Paper [y > 380px], never over paper text */}
        <div
          data-testid="hero-card-prompt"
          className="absolute bottom-2 left-1/2 z-20 bg-card/95 backdrop-blur-md border border-line shadow-xl rounded-[10px] px-3 py-1.5 flex items-center gap-1.5 transition-transform duration-200 hover:-translate-y-1 cursor-default min-w-[190px] font-sans"
          style={animationStyle('heroFloat4', '5.8s', '3.6s')}
        >
          <Loader2 className="w-3 h-3 text-brand-600 animate-spin shrink-0" strokeWidth={2} />
          <span className="text-[11px] text-ink/60 truncate">Ask for a suggestion...</span>
        </div>
      </div>

      {/* Tiny Muted "Illustration" Label in normal flow below the entire composition */}
      <span className="text-[10px] text-ink/30 font-sans tracking-widest mt-2 select-none uppercase">
        Illustration
      </span>
    </div>
  );
};
