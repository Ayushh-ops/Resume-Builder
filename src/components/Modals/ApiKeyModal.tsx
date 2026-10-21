import React, { useState } from 'react';
import { Key, ExternalLink, Check, Palette } from 'lucide-react';
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
      title="Settings"
      subtitle="Theme appearance and model configuration"
      icon={<Key className="w-4 h-4 text-ink/70" />}
      headerRight={
        <span className="text-[11px] font-mono text-ink/50 bg-muted px-2 py-0.5 rounded-[4px] border border-line">
          AI: {apiKey ? 'on' : 'off'}
        </span>
      }
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-ink/70 hover:bg-muted rounded-[6px] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary h-8 px-3.5"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Saved' : 'Save settings'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4 text-xs bg-card">
        {/* Unified Theme Grid — Applies Instantly */}
        <div className="p-3 bg-muted/40 rounded-[10px] border border-line space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-ink/60" strokeWidth={1.5} />
              <span>Theme</span>
            </span>
            <span className="text-xs text-ink/50 font-mono">
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
                  className={`p-2 rounded-[6px] border text-left transition-colors flex flex-col gap-1.5 cursor-pointer ${
                    isActive
                      ? 'border-brand-600 bg-card font-medium'
                      : 'border-line bg-card hover:border-ink/30 hover:bg-muted'
                  }`}
                >
                  {/* Swatch mini preview */}
                  <div
                    className="w-full h-6 rounded border border-line flex items-center justify-between px-2 overflow-hidden"
                    style={{ backgroundColor: preset.canvas }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded border border-line"
                      style={{ backgroundColor: preset.card }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: preset.accent }}
                    />
                  </div>
                  <div className="flex items-center justify-between min-w-0">
                    <span className="text-xs text-ink truncate">
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
          <label className="label">Model</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: 'gemini-3.8-flash',
                name: 'Gemini 3.8 Flash',
                desc: 'Fastest responses, suitable for drafting & bullet edits',
              },
              {
                id: 'gemini-2.5-pro',
                name: 'Gemini 2.5 Pro',
                desc: 'Deep analysis, suitable for detailed JD gap review',
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer ${
                  model === m.id
                    ? 'border-brand-600 bg-muted/40 font-medium'
                    : 'border-line bg-card hover:border-ink/30'
                }`}
              >
                <div className="font-semibold text-ink text-xs mb-0.5">{m.name}</div>
                <p className="text-[11px] text-ink/60 leading-tight">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Google Gemini API key</label>
            <span className="text-[11px] text-ink/40">
              Stored locally
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
