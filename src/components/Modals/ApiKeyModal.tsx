import React, { useState } from 'react';
import { Key, ExternalLink, Check, Sparkles, Palette } from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  getStoredApiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
} from '../../services/geminiService';
import {
  THEME_PRESETS,
  applyTheme,
  type ThemeId,
} from '../../services/themeService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  onThemeChange?: (theme: ThemeId) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}) => {
  const [apiKey, setKey] = useState(getStoredApiKey());
  const [model, setModel] = useState(getStoredModel());
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSelectTheme = (themeId: ThemeId) => {
    applyTheme(themeId);
    onThemeChange?.(themeId);
  };

  const handleSave = () => {
    setStoredApiKey(apiKey.trim());
    setStoredModel(model);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="App & AI Settings"
      subtitle="Theme appearance and Gemini model configuration"
      icon={<Key className="w-4 h-4 text-brand-600" />}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-muted rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4 text-xs bg-card">
        {/* Unified Theme Grid — Applies Instantly */}
        <div className="p-3 bg-muted/60 rounded-xl border border-line space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-brand-600" />
              <span>Theme Appearance</span>
            </span>
            <span className="text-[10px] text-ink/50 uppercase font-mono tracking-wider">
              {currentTheme}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {THEME_PRESETS.map((preset) => {
              const isActive = currentTheme === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectTheme(preset.id)}
                  className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    isActive
                      ? 'border-brand-500 ring-2 ring-brand-500 bg-card shadow-soft'
                      : 'border-line bg-card hover:border-brand-500/40 hover:bg-muted'
                  }`}
                >
                  {/* Swatch mini preview */}
                  <div
                    className="w-full h-7 rounded-lg border border-line flex items-center justify-between px-2 overflow-hidden"
                    style={{ backgroundColor: preset.canvas }}
                  >
                    <div
                      className="w-4 h-4 rounded shadow-2xs border border-line"
                      style={{ backgroundColor: preset.card }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: preset.accent }}
                    />
                  </div>
                  <div className="flex items-center justify-between min-w-0">
                    <span className="text-[11px] font-bold text-ink truncate">
                      {preset.name}
                    </span>
                    {isActive && <Check className="w-3 h-3 text-brand-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gemini Model Selector */}
        <div className="space-y-1.5">
          <label className="label">Gemini Model</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: 'gemini-3.8-flash',
                name: 'Gemini 3.8 Flash',
                badge: 'Recommended',
                desc: 'Fastest latency, optimal for real-time bullet improvements',
              },
              {
                id: 'gemini-2.5-pro',
                name: 'Gemini 2.5 Pro',
                badge: 'Deep Reasoning',
                desc: 'Highest reasoning depth for complex JD gap analysis',
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  model === m.id
                    ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500'
                    : 'border-line bg-card hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-ink text-[11px]">{m.name}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-brand-50 text-brand-600 border border-line">
                    {m.badge}
                  </span>
                </div>
                <p className="text-[10px] text-ink/60 leading-tight">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Google Gemini API Key</label>
            <span className="text-[10px] text-ink/50 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Stored locally in browser
            </span>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIzaSy..."
            className="input font-mono text-xs"
          />
        </div>

        {/* Help Link & Clear */}
        <div className="flex items-center justify-between pt-1 border-t border-line">
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
    </Modal>
  );
};
