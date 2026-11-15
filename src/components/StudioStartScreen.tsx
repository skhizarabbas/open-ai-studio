import React, { useRef, useState } from 'react';
import { ArrowUp, FolderOpen, Layers, Loader2, Sparkles } from 'lucide-react';

interface StudioStartScreenProps {
  projectName: string;
  isRuntimeReady: boolean;
  isGenerating: boolean;
  onSendMessage: (prompt: string) => void;
  onOpenGallery: () => void;
  onOpenProjects: () => void;
}

const QUICK_STARTS = [
  {
    label: 'Product dashboard',
    prompt: 'Build a polished product analytics dashboard with key metrics, a recent activity feed, and date filters.',
    tone: 'bg-lime-300',
  },
  {
    label: 'Personal finance',
    prompt: 'Build a personal finance tracker with monthly spending categories, a budget progress view, and transaction search.',
    tone: 'bg-cyan-300',
  },
  {
    label: 'Creative portfolio',
    prompt: 'Build a distinctive portfolio for an independent creative, with selected work, a short bio, and a contact section.',
    tone: 'bg-orange-300',
  },
];

export const StudioStartScreen: React.FC<StudioStartScreenProps> = ({
  projectName,
  isRuntimeReady,
  isGenerating,
  onSendMessage,
  onOpenGallery,
  onOpenProjects,
}) => {
  const [prompt, setPrompt] = useState('');
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const submitPrompt = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating) return;
    onSendMessage(trimmedPrompt);
    setPrompt('');
  };

  return (
    <div className="relative flex-1 min-w-0 overflow-y-auto bg-[#10120f] text-[#f2f4eb]">
      <div aria-hidden="true" className="studio-start-grid pointer-events-none absolute inset-0" />
      <div className="relative flex min-h-full items-center justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <main className="studio-start-enter w-full max-w-[760px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime-200">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-lime-300/25 bg-lime-300/10">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span>Open AI Studio</span>
              <span className="text-zinc-600">/</span>
              <span className="max-w-[200px] truncate text-zinc-400">{projectName}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400" role="status">
              {isRuntimeReady ? (
                <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
              ) : (
                <Loader2 className="h-3 w-3 animate-spin text-amber-300" />
              )}
              {isRuntimeReady ? 'Runtime ready' : 'Warming runtime'}
            </div>
          </div>

          <h1 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight sm:mt-8 sm:text-4xl">
            What do you want to <span className="text-lime-300">build?</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">A rough idea is enough.</p>

          <form
            onSubmit={submitPrompt}
            className="mt-5 overflow-hidden rounded-lg border border-zinc-700/80 bg-[#171a15] shadow-[0_18px_60px_rgba(0,0,0,0.22)] transition-colors focus-within:border-lime-300/60 sm:mt-6"
          >
            <label htmlFor="studio-start-prompt" className="sr-only">Describe the project to build</label>
            <textarea
              ref={promptRef}
              id="studio-start-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submitPrompt(event);
              }}
              rows={2}
              placeholder="A calm task planner for a small design team..."
              className="block min-h-20 w-full resize-y bg-transparent px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none sm:min-h-24 sm:py-4"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-3 py-2.5">
              <span className="pl-1 text-[10px] text-zinc-500">React · TypeScript · Tailwind</span>
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="inline-flex items-center gap-2 rounded-md bg-lime-300 px-3.5 py-2 text-xs font-semibold text-[#171a12] transition-colors hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Build with AI
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Quick starts
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {QUICK_STARTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onSendMessage(item.prompt)}
                  className="group flex min-h-12 items-center gap-2.5 border-t border-zinc-800 px-1.5 py-2 text-left transition-colors hover:border-zinc-600 disabled:opacity-40"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.tone}`} />
                  <span className="text-xs text-zinc-300 transition-colors group-hover:text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-800/80 pt-4">
            <button
              type="button"
              onClick={onOpenGallery}
              className="inline-flex items-center gap-2 text-xs text-zinc-400 transition-colors hover:text-lime-200"
            >
              <Layers className="h-3.5 w-3.5" />
              Browse starters
            </button>
            <button
              type="button"
              onClick={onOpenProjects}
              className="inline-flex items-center gap-2 text-xs text-zinc-400 transition-colors hover:text-lime-200"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Import a repository
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};