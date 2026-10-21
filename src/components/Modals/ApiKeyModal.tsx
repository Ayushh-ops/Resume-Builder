import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Check, X, Sparkles } from 'lucide-react';
import {
  getStoredApiKey,
  setStoredApiKey,
  getStoredModel,
  setStoredModel,
} from '../../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setKey] = useState(getStoredApiKey());
  const [model, setModel] = useState(getStoredModel());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredApiKey(apiKey.trim());
    setStoredModel(model);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setKey('');
    setStoredApiKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand-50 rounded-lg text-brand-600">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Google Gemini AI Settings</h3>
              <p className="text-[11px] text-ink/40">Powered by the Official @google/genai SDK</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[85vh]">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Your API key is saved locally in your browser's <code className="bg-slate-100 px-1 rounded">localStorage</code> and never sent to any external server.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select AI Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended: Ultra-fast & smart)</option>
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Cost-effective & light)</option>
            </select>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1 text-[11px] text-indigo-900">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Smart Hybrid Mode Active:</span>
            </div>
            <p className="text-indigo-800 leading-relaxed">
              If an API key is not provided, ResumeCraft will automatically use intelligent local heuristics (STAR method transformation, metric calculators, and curated trend recommendations) so all features work 100% of the time!
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
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
        <div className="bg-white border-t border-black/[0.06] px-4 py-3 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
