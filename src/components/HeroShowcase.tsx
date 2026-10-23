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

  // Ring calculations for SVG circle (r = 16, C = 2 * PI * 16 ≈ 100.53)
  const radius = 16;
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
      {/* Fixed 520x420 composition box with 24px padding and overflow-visible so nothing clips */}
      <div className="relative w-[520px] h-[420px] p-6 box-border overflow-visible flex items-center justify-center select-none">
        <style>{`
          @keyframes heroFloat1 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          @keyframes heroFloat2 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(5px); }
          }
          @keyframes heroFloat3 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          @keyframes heroFloat4 {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(4px); }
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

        {/* Center: A4 Resume Page (shifted slightly right so score card sits top-left completely outside paper text area) */}
        <div
          className="relative z-10 w-[265px] h-[370px] bg-white text-slate-800 rounded-sm border border-slate-200 shadow-xl p-4 transition-transform duration-300 ml-12"
          style={{
            transform: 'rotate(-2deg)',
            boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.12), 0 10px 15px -8px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Header Block: "Your Name" and header never covered */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-900 tracking-tight">Your Name</h4>
              <p className="text-[10px] text-slate-400 font-medium">Job Title</p>
              {/* Contact row */}
              <div className="flex items-center gap-1.5 mt-1 text-[8px] text-slate-400 font-mono">
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
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Experience</span>
              <span className="text-[8px] text-slate-400 font-mono">2024 – Present</span>
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
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Education</span>
              <span className="text-[8px] text-slate-400 font-mono">2020 – 2024</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-slate-300 rounded w-[60%]" />
              <div className="h-1.5 bg-slate-200 rounded w-[75%]" />
              <div className="h-1.5 bg-slate-100 rounded w-[50%]" />
            </div>
          </div>
        </div>

        {/* Floating Card 1: Top-Left outside paper text area (Resume Score + Progress Ring) */}
        <div
          className="absolute top-4 left-4 z-20 bg-card/95 backdrop-blur-md border border-line shadow-xl rounded-[12px] p-2.5 flex items-center gap-2.5 transition-transform duration-200 hover:-translate-y-1 cursor-default"
          style={animationStyle('heroFloat1', '6s', '0s')}
        >
          <div className="relative w-9 h-9 flex items-center justify-center">
            <svg className="w-9 h-9 transform -rotate-90">
              <circle
                cx="18"
                cy="18"
                r={radius}
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                className="text-muted"
              />
              <circle
                cx="18"
                cy="18"
                r={radius}
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-brand-600 dark:text-brand-400 transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-ink tabular-nums">{score}</span>
          </div>
          <div className="pr-1">
            <span className="text-[10px] font-medium text-ink/50 uppercase tracking-wider block">Resume score</span>
            <span className="text-xs font-bold text-ink">Strong</span>
          </div>
        </div>

        {/* Floating Card 2: Right (ATS friendly badge) */}
        <div
          className="absolute top-10 right-3 z-20 bg-card/95 backdrop-blur-md border border-line shadow-xl rounded-[12px] px-3 py-2 flex items-center gap-2 transition-transform duration-200 hover:-translate-y-1 cursor-default"
          style={animationStyle('heroFloat2', '5.5s', '1.2s')}
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Check className="w-3 h-3" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block leading-tight">ATS friendly</span>
            <span className="text-[9px] text-ink/50 block">Passes screening</span>
          </div>
        </div>

        {/* Floating Card 3: Lower-Right (Skills Card) */}
        <div
          className="absolute bottom-10 right-3 z-20 bg-card/95 backdrop-blur-md border border-line shadow-xl rounded-[12px] p-2.5 transition-transform duration-200 hover:-translate-y-1 cursor-default w-40"
          style={animationStyle('heroFloat3', '6.5s', '2.4s')}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/70">Skills</span>
            <span className="text-[9px] text-brand-600 font-semibold cursor-pointer flex items-center gap-0.5">
              <Plus className="w-2.5 h-2.5" /> Add skill
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-ink/80 border border-line">
              Communication
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-ink/80 border border-line">
              Problem solving
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-ink/80 border border-line">
              Teamwork
            </span>
          </div>
        </div>

        {/* Floating Card 4: Bottom-Left (Input bar "Ask for a suggestion...") */}
        <div
          className="absolute bottom-4 left-4 z-20 bg-card/95 backdrop-blur-md border border-line shadow-xl rounded-[12px] px-3 py-2 flex items-center gap-2 transition-transform duration-200 hover:-translate-y-1 cursor-default min-w-[180px]"
          style={animationStyle('heroFloat4', '5.8s', '3.6s')}
        >
          <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin shrink-0" strokeWidth={2} />
          <span className="text-xs text-ink/60 truncate">Ask for a suggestion...</span>
        </div>
      </div>

      {/* Tiny Muted "Illustration" Label in normal flow below the entire composition */}
      <span className="text-[10px] text-ink/30 font-mono tracking-widest mt-2 select-none uppercase">
        Illustration
      </span>
    </div>
  );
};
