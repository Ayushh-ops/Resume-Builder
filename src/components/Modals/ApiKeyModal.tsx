import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Check, X, Sparkles, Moon, Sun, Palette } from 'lucide-react';
import {
  getStoredApiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
} from '../../services/geminiService';
import {
  getInitialThemeMode,
  getInitialThemeAccent,
  applyAppTheme,
  type ThemeMode,
  type ThemeAccent,
} from '../../services/themeService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange?: (mode: ThemeMode, accent: ThemeAccent) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onThemeChange }) => {
  const [apiKey, setKey] = useState(getStoredApiKey());
  const [model, setModel] = useState(getStoredModel());
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode());
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>(getInitialThemeAccent());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setThemeMode(getInitialThemeMode());
      setThemeAccent(getInitialThemeAccent());
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyAppTheme(mode, themeAccent);
    onThemeChange?.(mode, themeAccent);
  };

  const handleAccentChange = (accent: ThemeAccent) => {
    setThemeAccent(accent);
    applyAppTheme(themeMode, accent);
    onThemeChange?.(themeMode, accent);
  };

  const handleSave = () => {
    setStoredApiKey(apiKey.trim());
    setStoredModel(model);
    applyAppTheme(themeMode, themeAccent);
    onThemeChange?.(themeMode, themeAccent);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setKey('');
    setStoredApiKey('');
  };

  const accents: { id: ThemeAccent; label: string; color: string }[] = [
    { id: 'indigo', label: 'Indigo', color: '#4a49d8' },
    { id: 'emerald', label: 'Emerald', color: '#059669' },
    { id: 'rose', label: 'Rose', color: '#e11d48' },
    { id: 'slate', label: 'Slate', color: '#475569' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-card text-ink w-full max-w-md rounded-2xl shadow-paper border border-border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-card border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand-50 rounded-lg text-brand-600">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">App & AI Settings</h3>
              <p className="text-[11px] text-ink/40">Theme appearance and Gemini model configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[85vh]">
          {/* Theme Mode & Accent */}
          <div className="p-3 bg-canvas/60 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-brand-600" />
                <span>Appearance</span>
              </span>
              <div className="inline-flex rounded-lg bg-black/[0.04] dark:bg-white/[0.06] p-0.5 border border-border">
                <button
                  type="button"
                  onClick={() => handleModeChange('light')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                    themeMode === 'light' ? 'bg-card text-brand-600 shadow-soft' : 'text-ink/50 hover:text-ink'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('dark')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                    themeMode === 'dark' ? 'bg-card text-brand-600 shadow-soft' : 'text-ink/50 hover:text-ink'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-bold text-ink/40 mb-1.5">Accent Color</span>
              <div className="grid grid-cols-4 gap-2">
                {accents.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleAccentChange(acc.id)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-[11px] font-medium transition ${
                      themeAccent === acc.id
                        ? 'border-brand-500 bg-brand-50 text-brand-600 font-bold ring-2 ring-brand-500/20'
                        : 'border-border bg-card text-ink/70 hover:text-ink'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                    <span>{acc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink/70 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-canvas/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono text-xs text-ink"
            />
            <p className="text-[11px] text-ink/50 mt-1">
              Your API key is saved locally in your browser's <code className="bg-canvas px-1 rounded">localStorage</code> and never sent to any external server.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-ink/70 mb-1">
              Select AI Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-canvas/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 text-xs text-ink"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended: Ultra-fast & smart)</option>
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Cost-effective & light)</option>
            </select>
          </div>

          <div className="p-3 bg-brand-50/70 border border-brand-500/20 rounded-xl space-y-1 text-[11px] text-brand-700">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Smart Hybrid Mode Active:</span>
            </div>
            <p className="leading-relaxed">
              If an API key is not provided, ResumeCraft will automatically use intelligent local heuristics (STAR method transformation, metric calculators, and curated trend recommendations) so all features work 100% of the time!
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
            >
              <span>Get a free Gemini API key</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-rose-600 hover:underline"
              >
                Clear Key
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-card border-t border-border px-4 py-3 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
