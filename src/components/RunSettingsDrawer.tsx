import React from 'react';
import { RotateCcw, Sliders, Sparkles, X } from 'lucide-react';

export interface RunSettings {
  customInstructions: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export const DEFAULT_RUN_SETTINGS: RunSettings = {
  customInstructions: '',
  temperature: 0.2,
  maxTokens: 8192,
  topP: 0.95,
};

interface RunSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RunSettings;
  onChange: (updated: RunSettings) => void;
  maxContextWindow: number;
}

const INSTRUCTION_PRESETS = [
  {
    label: 'Strict Diffs',
    text: 'Always prefer minimal <studioAction type="diff"> patches over full file rewrites. Keep components modular and concise.',
  },
  {
    label: 'Modern Dark UI',
    text: 'Design sleek dark-mode interfaces using zinc-950 backgrounds, subtle zinc-800 borders, indigo-500 accents, and clean Lucide icons.',
  },
  {
    label: 'Full-Stack API',
    text: 'Include a real Express.js backend with CORS and in-memory or sql.js persistence, wired to the Vite frontend via proxy.',
  },
];

export const RunSettingsDrawer: React.FC<RunSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  maxContextWindow,
}) => {
  if (!isOpen) return null;

  const tokenCap = Math.min(32768, Math.max(4096, Math.floor(maxContextWindow / 2)));

  const handleReset = () => {
    onChange({ ...DEFAULT_RUN_SETTINGS });
  };

  return (
    <aside className="w-full bg-zinc-900/60 flex flex-col h-full">
      {/* Header */}
      <div className="h-11 border-b border-zinc-800 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Run Settings</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            title="Reset to defaults"
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close Run Settings"
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
        {/* System Instructions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              System Instructions
            </label>
            <span className="text-[10px] text-zinc-500">Appended to builder prompt</span>
          </div>

          <textarea
            value={settings.customInstructions}
            onChange={(e) => onChange({ ...settings, customInstructions: e.target.value })}
            placeholder="e.g., Always use TypeScript strict types, mobile-first Tailwind layouts, and clean error boundaries..."
            rows={5}
            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed"
          />

          {/* Quick Instruction Chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {INSTRUCTION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onChange({
                    ...settings,
                    customInstructions: settings.customInstructions
                      ? `${settings.customInstructions.trim()}\n${preset.text}`
                      : preset.text,
                  })
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 transition-colors"
              >
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-zinc-800" />

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">Temperature</label>
            <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-xs text-indigo-300">
              {settings.temperature.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={settings.temperature}
            onChange={(e) => onChange({ ...settings, temperature: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>0.0 (Deterministic)</span>
            <span>0.2 (Code)</span>
            <span>1.0+ (Creative)</span>
          </div>
        </div>

        {/* Max Output Tokens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">Max Output Tokens</label>
            <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-xs text-indigo-300">
              {settings.maxTokens.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={1024}
            max={tokenCap}
            step={512}
            value={Math.min(settings.maxTokens, tokenCap)}
            onChange={(e) => onChange({ ...settings, maxTokens: parseInt(e.target.value, 10) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>1,024</span>
            <span>Model window: {(maxContextWindow / 1000).toFixed(0)}k</span>
          </div>
        </div>

        {/* Top-P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">Top-P</label>
            <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-xs text-indigo-300">
              {settings.topP.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.topP}
            onChange={(e) => onChange({ ...settings, topP: parseFloat(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>
    </aside>
  );
};