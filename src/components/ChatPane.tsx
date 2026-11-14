import React, { useState } from 'react';
import { Send, Square, Key, Wrench, AlertTriangle } from 'lucide-react';
import { FREE_PROVIDERS } from '../providers/models';
import { ChatMessage } from '../providers/client';

interface ChatPaneProps {
  providerId: string;
  setProviderId: (id: string) => void;
  modelId: string;
  setModelId: (id: string) => void;
  customModelId: string;
  setCustomModelId: (id: string) => void;
  messages: ChatMessage[];
  isGenerating: boolean;
  lastError: string | null;
  onSendMessage: (prompt: string) => void;
  onStopGeneration: () => void;
  onOpenKeys: () => void;
}

export function ChatPane({
  providerId,
  setProviderId,
  modelId,
  setModelId,
  customModelId,
  setCustomModelId,
  messages,
  isGenerating,
  lastError,
  onSendMessage,
  onStopGeneration,
  onOpenKeys,
}: ChatPaneProps) {
  const [input, setInput] = useState('');
  const currentProvider = FREE_PROVIDERS.find((p) => p.id === providerId) || FREE_PROVIDERS[0];

  const handleProviderChange = (newId: string) => {
    setProviderId(newId);
    const nextProvider = FREE_PROVIDERS.find((p) => p.id === newId);
    if (nextProvider && nextProvider.models.length > 0) {
      setModelId(nextProvider.models[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="w-96 border-r border-zinc-800 flex flex-col bg-zinc-900/50 h-full">
      {/* Header & Model Controls */}
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-zinc-100">Open AI Studio</span>
          <button
            onClick={onOpenKeys}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
          >
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            API Keys
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={providerId}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
          >
            {FREE_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
          >
            {currentProvider.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          value={customModelId}
          onChange={(e) => setCustomModelId(e.target.value)}
          placeholder="Optional: custom model slug override..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-xs text-zinc-500 space-y-2 p-2">
            <p className="font-medium text-zinc-400">Starter Ideas:</p>
            <button
              onClick={() => setInput('Build a Kanban task manager with drag-free status columns, priority tags, and localStorage persistence.')}
              className="block text-left w-full p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300"
            >
              &ldquo;Build a Kanban task manager with priority tags and localStorage.&rdquo;
            </button>
            <button
              onClick={() => setInput('Create an interactive Markdown previewer and JSON formatter tool with copy buttons.')}
              className="block text-left w-full p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300"
            >
              &ldquo;Create an interactive Markdown previewer and JSON formatter.&rdquo;
            </button>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-indigo-600/20 border border-indigo-500/30 text-zinc-100 ml-4'
                : 'bg-zinc-950 border border-zinc-800 text-zinc-300 mr-2'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {/* Error Self-Healing Banner */}
      {lastError && !isGenerating && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 space-y-2">
          <div className="flex items-start gap-2 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="line-clamp-3">{lastError}</span>
          </div>
          <button
            onClick={() => onSendMessage(`Fix this error in the project:\n${lastError}`)}
            className="w-full py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-medium text-white flex items-center justify-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            Fix Error with AI
          </button>
        </div>
      )}

      {/* Prompt Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800">
        <div className="relative">
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Describe the app or feature to build..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 pr-10 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none"
          />
          {isGenerating ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="absolute bottom-2.5 right-2.5 p-1.5 rounded bg-red-600 hover:bg-red-500 text-white"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              className="absolute bottom-2.5 right-2.5 p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
              title="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}