import React, { useState } from 'react';
import { Settings, ExternalLink, Check, Palette } from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  getGeminiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
  testGeminiKey,
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
  const [apiKey, setKey] = useState(getGeminiKey());
  const [model, setModel] = useState(getStoredModel());
  const [keySaved, setKeySaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSelectTheme = (themeId: ThemeId) => {
    applyTheme(themeId);
    onThemeChange?.(themeId);
  };

  const handleSelectModel = (selectedModel: string) => {
    setModel(selectedModel);
    setStoredModel(selectedModel);
  };

  const handleApiKeyBlur = () => {
    setStoredApiKey(apiKey.trim());
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
    }, 1800);
  };

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiKey(apiKey, model);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Error testing key' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    setKey('');
    setStoredApiKey('');
    setTestResult(null);
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
    }, 1800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      subtitle="Theme appearance and model configuration"
      icon={<Settings className="w-4 h-4 text-ink/70" strokeWidth={1.5} />}
      maxWidth="max-w-md"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="btn-primary h-8 px-4"
        >
          Done
        </button>
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
            <span className="text-xs text-ink/60 font-sans capitalize">
              {THEME_PRESETS.find((p) => p.id === currentTheme)?.name || currentTheme}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
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
                  {/* Swatch mini preview with 1px border so Forest/Dark/Midnight are visible */}
                  <div
                    className="w-full h-6 rounded border border-line flex items-center justify-between px-2 overflow-hidden"
                    style={{ backgroundColor: preset.canvas }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded border border-line"
                      style={{ backgroundColor: preset.card }}
                    />
                    <div
                      className="w-2.5 h-2.5 rounded-full border border-line"
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

        {/* Gemini Model Selector — Applies Instantly */}
        <div className="space-y-1.5">
          <label className="label">Model</label>
          <div className="grid grid-cols-1 gap-2">
            {[
              {
                id: 'gemini-2.5-flash',
                name: 'Gemini 2.5 Flash',
                desc: 'Default fast multimodal model for parsing and content drafting',
              },
              {
                id: 'gemini-2.0-flash',
                name: 'Gemini 2.0 Flash',
                desc: 'Fast fallback model for parsing and drafting',
              },
              {
                id: 'gemini-flash-latest',
                name: 'Gemini Flash Latest',
                desc: 'Always points to the latest Flash version',
              },
              {
                id: 'gemini-1.5-flash',
                name: 'Gemini 1.5 Flash',
                desc: 'Proven stable fallback for high-throughput tasks',
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectModel(m.id)}
                className={`p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer flex items-center justify-between ${
                  model === m.id
                    ? 'border-brand-600 bg-muted/40 font-medium'
                    : 'border-line bg-card hover:border-ink/30'
                }`}
              >
                <div>
                  <div className="font-semibold text-ink text-xs mb-0.5">{m.name}</div>
                  <p className="text-[11px] text-ink/60 leading-tight">{m.desc}</p>
                </div>
                {model === m.id && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Google Gemini API key</label>
            <span className="text-[11px] text-ink/40">Stored locally</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setKey(e.target.value);
                setTestResult(null);
              }}
              onBlur={handleApiKeyBlur}
              placeholder="AIzaSy..."
              className="input font-mono text-xs flex-1"
            />
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !apiKey.trim()}
              className="btn-outline h-9 px-3 text-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? 'Testing...' : 'Test key'}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            {testResult ? (
              <span className={testResult.success ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                {testResult.message}
              </span>
            ) : (
              <span className="text-ink/50">
                {apiKey.trim() ? 'AI is active' : 'AI is off, add a key to enable'}
              </span>
            )}
            {keySaved && <span className="text-emerald-600 font-medium">Saved</span>}
          </div>
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
