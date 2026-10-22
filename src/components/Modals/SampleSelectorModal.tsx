import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { HowToUse } from '../common/HowToUse';

interface SampleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (key: string) => void;
}

const SAMPLE_OPTIONS = [
  {
    key: 'aiEngineer',
    title: 'AI / Machine Learning Engineer',
    description: 'Engineered for AI practitioners. Features PyTorch, LLM fine-tuning, RAG pipelines, and quantifiable inference optimizations.',
    highlights: ['Quantified model latency & throughput metrics', 'Modern AI & deep learning stack', 'Standard Harvard-style structure'],
  },
  {
    key: 'fullStack',
    title: 'Full-Stack Software Engineer',
    description: 'Tailored for web & cloud developers. Features React, Node.js, distributed databases, microservices, and CI/CD automation.',
    highlights: ['High-impact full-stack achievements', 'Cloud & containerization competencies', 'Clean action-verb driven bullets'],
  },
  {
    key: 'fresherStudent',
    title: 'Graduate Student / Early Career',
    description: 'Designed for recent graduates and career transitioners. Emphasizes academic projects, open-source work, and foundational computer science skills.',
    highlights: ['Project-centered accomplishment format', 'Education & coursework emphasis', 'Ideal for zero to two years experience'],
  },
];

export const SampleSelectorModal: React.FC<SampleSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start from a sample"
      subtitle="Select a professionally crafted resume to use as your starting baseline"
      icon={null}
      maxWidth="max-w-2xl"
      footer={
        <div className="w-full flex justify-end items-center text-xs">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline h-8 px-3.5"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* HowToUse Panel at top */}
        <HowToUse toolId="samples" />

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-ink">Choose a sample profile:</h3>
          <div className="space-y-3">
            {SAMPLE_OPTIONS.map((sample) => (
              <div
                key={sample.key}
                className="p-4 bg-card border border-line rounded-[6px] space-y-2.5 hover:border-accent transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-ink group-hover:text-brand-600 transition-colors">
                      {sample.title}
                    </h4>
                    <p className="text-xs text-ink/70 mt-1 leading-relaxed">
                      {sample.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectSample(sample.key);
                    }}
                    className="btn-primary h-8 px-3 text-xs shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Use this sample</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-2 border-t border-line flex flex-wrap gap-2 text-[11px] text-ink/60">
                  {sample.highlights.map((h, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <span className="text-ink/40">•</span>
                      <span>{h}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
