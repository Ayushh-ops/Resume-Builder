import React, { useState, useMemo } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { WEAK_OPENERS } from '../lib/guidance';

export interface BulletBuilderProps {
  onStartResumeWithBullet: (bullet: string) => void;
}

const VERB_CHIPS = ['Built', 'Led', 'Automated', 'Reduced', 'Designed', 'Analyzed', 'Improved'] as const;

function autoMapVerb(text: string): string {
  const clean = text.trim();
  if (!clean) return 'Built';

  const firstWord = clean.split(/\s+/)[0]?.toLowerCase();
  for (const v of VERB_CHIPS) {
    if (v.toLowerCase() === firstWord) return v;
  }

  const matched = WEAK_OPENERS.find((wo) => wo.pattern.test(clean));
  if (matched) {
    const v = matched.verb.toLowerCase();
    if (v.includes('architect') || v.includes('engineer') || v.includes('deliver') || v.includes('execute')) return 'Built';
    if (v.includes('spearhead') || v.includes('orchestrat') || v.includes('lead')) return 'Led';
    if (v.includes('accelerat') || v.includes('improv')) return 'Improved';
    return 'Built';
  }

  if (/^(designed|created|modeled|sketched)\b/i.test(clean)) return 'Designed';
  if (/^(analyzed|researched|evaluated|audited|investigated)\b/i.test(clean)) return 'Analyzed';
  if (/^(automated|scripted|streamlined)\b/i.test(clean)) return 'Automated';
  if (/^(reduced|cut|decreased|slashed|saved)\b/i.test(clean)) return 'Reduced';
  if (/^(improved|optimized|boosted|enhanced)\b/i.test(clean)) return 'Improved';
  if (/^(led|managed|directed|mentored|guided)\b/i.test(clean)) return 'Led';
  if (/^(built|developed|implemented|constructed)\b/i.test(clean)) return 'Built';

  return 'Built';
}

export const BulletBuilder: React.FC<BulletBuilderProps> = ({ onStartResumeWithBullet }) => {
  const [what, setWhat] = useState('');
  const [tools, setTools] = useState('');
  const [result, setResult] = useState('');
  const [selectedVerb, setSelectedVerb] = useState<string>('Built');
  const [hasManualVerb, setHasManualVerb] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleWhatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWhat(val);
    if (!hasManualVerb && val.trim()) {
      setSelectedVerb(autoMapVerb(val));
    }
  };

  const handleVerbSelect = (verb: string) => {
    setSelectedVerb(verb);
    setHasManualVerb(true);
  };

  const hasContent = Boolean(what.trim() || tools.trim() || result.trim());
  const hasMetricInResult = /[\d%$]/.test(result);

  const liveOutput = useMemo(() => {
    if (!hasContent) return '';

    let cleanWhat = what.trim();
    const matchedWeak = WEAK_OPENERS.find((wo) => wo.pattern.test(cleanWhat));
    if (matchedWeak) {
      cleanWhat = cleanWhat.replace(matchedWeak.pattern, '').trim();
    } else {
      const reg = new RegExp(`^${selectedVerb}\\s+`, 'i');
      cleanWhat = cleanWhat.replace(reg, '').trim();
    }
    cleanWhat = cleanWhat.replace(/^[,\s-]+|[,\s.-]+$/g, '');

    const cleanTools = tools.trim().replace(/^[,\s-]+|[,\s.-]+$/g, '');
    const cleanResult = result.trim().replace(/^[,\s-]+|[,\s.-]+$/g, '');

    const segments: string[] = [];
    if (cleanWhat) {
      segments.push(`${selectedVerb} ${cleanWhat}`);
    } else {
      segments.push(selectedVerb);
    }
    if (cleanTools) {
      segments.push(`using ${cleanTools}`);
    }
    if (cleanResult) {
      segments.push(cleanResult);
    }

    let out = segments.join(', ') + '.';
    out = out.charAt(0).toUpperCase() + out.slice(1);
    return out;
  }, [what, tools, result, selectedVerb, hasContent]);

  const handleCopy = async () => {
    if (!liveOutput) return;
    try {
      await navigator.clipboard.writeText(liveOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy bullet:', err);
    }
  };

  return (
    <div className="border border-line bg-card p-5 max-w-md w-full rounded-[6px] shadow-sm select-none">
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-ink">
          Bullet builder
        </h2>
        <p className="text-[11px] text-ink/50 mt-0.5">
          Turn what you did into a strong resume bullet.
        </p>
      </div>

      {/* Action Verb Chips */}
      <div className="mb-3 space-y-1">
        <label className="text-[11px] font-medium text-ink/60">Action verb</label>
        <div className="flex flex-wrap gap-1.5">
          {VERB_CHIPS.map((verb) => {
            const isSelected = selectedVerb === verb;
            return (
              <button
                key={verb}
                type="button"
                onClick={() => handleVerbSelect(verb)}
                className={`px-2 py-1 text-[11px] rounded-[4px] border transition cursor-pointer ${
                  isSelected
                    ? 'border-ink bg-muted text-ink font-semibold'
                    : 'border-line bg-card text-ink/70 hover:border-ink/30 hover:text-ink'
                }`}
              >
                {verb}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] font-medium text-ink/70 block mb-1">
            What did you do?
          </label>
          <input
            type="text"
            value={what}
            onChange={handleWhatChange}
            placeholder="built a dashboard for the sales team"
            className="w-full h-8 px-2.5 text-xs text-ink bg-canvas/50 border border-line rounded-[6px] focus:outline-none focus:border-ink/40"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-ink/70 block mb-1">
            Tools used
          </label>
          <input
            type="text"
            value={tools}
            onChange={(e) => setTools(e.target.value)}
            placeholder="Power BI, SQL"
            className="w-full h-8 px-2.5 text-xs text-ink bg-canvas/50 border border-line rounded-[6px] focus:outline-none focus:border-ink/40"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-ink/70 block mb-1">
            Result
          </label>
          <input
            type="text"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="cut reporting time by 40%"
            className="w-full h-8 px-2.5 text-xs text-ink bg-canvas/50 border border-line rounded-[6px] focus:outline-none focus:border-ink/40"
          />
          {result.trim().length > 0 && !hasMetricInResult && (
            <p className="text-[11px] text-ink/50 mt-1">
              Tip: add a metric (e.g. 20%, 3x, 500 users) for 40% more recruiter callbacks
            </p>
          )}
        </div>
      </div>

      {/* Live Output Box (Hidden when all inputs are empty) */}
      {hasContent && liveOutput && (
        <div className="mt-4 pt-3 border-t border-line space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-ink/50">Drafted bullet</span>
          </div>
          <p className="text-xs text-ink/90 bg-canvas/60 p-2.5 rounded-[6px] border border-line/80 leading-relaxed font-sans select-text">
            {liveOutput}
          </p>

          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-outline h-7 px-2.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-ink/50" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onStartResumeWithBullet(liveOutput)}
              className="btn-primary h-7 px-2.5 text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Start a resume with this bullet</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
