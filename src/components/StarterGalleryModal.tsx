import React from 'react';
import { Layers, Play, Sparkles, X } from 'lucide-react';
import { STARTER_GALLERY, StarterAppTemplate } from '../prompts/templates';

interface StarterGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTemplateId: string;
  onSelectTemplate: (template: StarterAppTemplate) => void;
  onUsePrompt: (prompt: string) => void;
}

export const StarterGalleryModal: React.FC<StarterGalleryModalProps> = ({
  isOpen,
  onClose,
  activeTemplateId,
  onSelectTemplate,
  onUsePrompt,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Starter App Gallery & Prompt Presets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {STARTER_GALLERY.map((tpl) => {
            const isCurrent = tpl.id === activeTemplateId;
            return (
              <div
                key={tpl.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-colors ${
                  isCurrent
                    ? 'bg-indigo-950/25 border-indigo-500/50'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-zinc-100">{tpl.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-indigo-300 border border-zinc-700">
                      {tpl.badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{tpl.description}</p>

                  {/* Curated Follow-up Prompts */}
                  <div className="pt-2 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                      Prompt Presets
                    </div>
                    {tpl.suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onUsePrompt(prompt);
                          onClose();
                        }}
                        className="w-full text-left p-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-[11px] text-zinc-300 flex items-start gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTemplate(tpl);
                    onClose();
                  }}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isCurrent ? 'Create Another Project' : 'Create Project'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};