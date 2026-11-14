import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  Square,
  Key,
  Wrench,
  AlertTriangle,
  ImagePlus,
  X,
  History,
  Check,
  FileCode2,
  Terminal,
  Loader2,
  CheckCircle2,
  Database,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { FREE_PROVIDERS } from '../providers/models';
import { ChatMessage } from '../providers/client';
import { ProjectDatabaseConfig } from './DatabaseModal';

export interface ProjectSnapshot {
  id: string;
  version: number;
  label: string;
  timestamp: string;
  files: Record<string, string>;
}

interface ParsedTaskItem {
  type: 'file' | 'diff' | 'shell';
  label: string;
  completed: boolean;
}

interface SuggestionCardItem {
  title: string;
  description: string;
  fullPrompt: string;
}

interface ParsedAssistantDisplay {
  tasks: ParsedTaskItem[];
  summaryLines: string[];
  suggestions: SuggestionCardItem[];
}

function parseAssistantDisplay(rawText: string, isStreaming: boolean): ParsedAssistantDisplay {
  const tasks: ParsedTaskItem[] = [];

  // 1. Extract completed <studioAction ...>...</studioAction> blocks
  const closedRegex = /<studioAction\s+([^>]+)>([\s\S]*?)<\/studioAction>/g;
  let match: RegExpExecArray | null;
  while ((match = closedRegex.exec(rawText)) !== null) {
    const attrs = match[1];
    const body = match[2].trim();
    const typeMatch = attrs.match(/type=["']([^"']+)["']/);
    const pathMatch = attrs.match(/filePath=["']([^"']+)["']/);
    const actionType = (typeMatch?.[1] || 'file') as 'file' | 'diff' | 'shell';
    const filePath = pathMatch?.[1] || '';

    if (actionType === 'shell') {
      tasks.push({ type: 'shell', label: `Ran: ${body}`, completed: true });
    } else if (actionType === 'diff') {
      tasks.push({ type: 'diff', label: `Updated ${filePath || 'file'}`, completed: true });
    } else {
      tasks.push({ type: 'file', label: `Built ${filePath || 'file'}`, completed: true });
    }
  }

  let remainder = rawText.replace(/<studioAction\s+[^>]+>[\s\S]*?<\/studioAction>/g, '');

  // 2. Check for an active (unclosed) <studioAction ...> block
  const openTagMatch = remainder.match(/<studioAction\s+([^>]*)>([\s\S]*)$/);
  if (openTagMatch) {
    const attrs = openTagMatch[1];
    const partialBody = openTagMatch[2].trim();
    const typeMatch = attrs.match(/type=["']([^"']+)["']/);
    const pathMatch = attrs.match(/filePath=["']([^"']+)["']/);
    const actionType = (typeMatch?.[1] || 'file') as 'file' | 'diff' | 'shell';
    const filePath = pathMatch?.[1] || '';

    if (actionType === 'shell') {
      tasks.push({
        type: 'shell',
        label: partialBody ? `Running: ${partialBody}` : 'Preparing command...',
        completed: !isStreaming,
      });
    } else if (actionType === 'diff') {
      tasks.push({
        type: 'diff',
        label: `Editing ${filePath || 'code'}...`,
        completed: !isStreaming,
      });
    } else {
      tasks.push({
        type: 'file',
        label: `Building ${filePath || 'app code'}...`,
        completed: !isStreaming,
      });
    }

    remainder = remainder.slice(0, openTagMatch.index);
  }

  remainder = remainder.replace(/<studioAction[^>]*$/g, '').trim();

  // 3. Split clean summary lines vs clickable "Suggested Next Tweaks"
  const lines = remainder.split('\n');
  const summaryLines: string[] = [];
  const suggestions: SuggestionCardItem[] = [];
  let inSuggestionsSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (!inSuggestionsSection && summaryLines.length > 0) {
        summaryLines.push('');
      }
      continue;
    }

    if (/^(?:#{1,3}\s*|\*\*)?suggested\s+next\s+tweaks/i.test(line)) {
      inSuggestionsSection = true;
      continue;
    }

    if (inSuggestionsSection && /^[-*•\d.]+\s+/.test(line)) {
      const cleaned = line.replace(/^[-*•\d.]+\s+/, '').trim();
      const boldSplit = cleaned.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
      if (boldSplit) {
        const title = boldSplit[1].replace(/:$/, '').trim();
        const description = boldSplit[2].trim();
        suggestions.push({
          title,
          description,
          fullPrompt: description ? `${title}: ${description}` : title,
        });
      } else {
        const colonIdx = cleaned.indexOf(':');
        if (colonIdx > 0 && colonIdx < 50) {
          const title = cleaned.slice(0, colonIdx).replace(/\*\*/g, '').trim();
          const description = cleaned.slice(colonIdx + 1).replace(/\*\*/g, '').trim();
          suggestions.push({
            title,
            description,
            fullPrompt: `${title}: ${description}`,
          });
        } else {
          const cleanText = cleaned.replace(/\*\*/g, '');
          suggestions.push({
            title: cleanText,
            description: '',
            fullPrompt: cleanText,
          });
        }
      }
    } else {
      summaryLines.push(line);
    }
  }

  return { tasks, summaryLines, suggestions };
}

function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

interface ChatPaneProps {
  providerId: string;
  setProviderId: (id: string) => void;
  modelId: string;
  setModelId: (id: string) => void;
  customModelId: string;
  setCustomModelId: (id: string) => void;
  dbConfig: ProjectDatabaseConfig;
  onOpenDatabase: () => void;
  messages: ChatMessage[];
  snapshotsByMessageIndex: Record<number, ProjectSnapshot>;
  activeSnapshotId: string | null;
  onRestoreSnapshot: (snapshot: ProjectSnapshot) => void;
  isGenerating: boolean;
  lastError: string | null;
  onSendMessage: (prompt: string, images?: string[]) => void;
  onStopGeneration: () => void;
  onOpenKeys: () => void;
}

function compressImageToDataUrl(file: File, maxDimension = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ChatPane({
  providerId,
  setProviderId,
  modelId,
  setModelId,
  customModelId,
  setCustomModelId,
  dbConfig,
  onOpenDatabase,
  messages,
  snapshotsByMessageIndex,
  activeSnapshotId,
  onRestoreSnapshot,
  isGenerating,
  lastError,
  onSendMessage,
  onStopGeneration,
  onOpenKeys,
}: ChatPaneProps) {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  const currentProvider = FREE_PROVIDERS.find((p) => p.id === providerId) || FREE_PROVIDERS[0];

  // Always auto-scroll smoothly whenever messages or streaming state updates
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isGenerating]);

  const handleProviderChange = (newId: string) => {
    setProviderId(newId);
    const nextProvider = FREE_PROVIDERS.find((p) => p.id === newId);
    if (nextProvider && nextProvider.models.length > 0) {
      setModelId(nextProvider.models[0].id);
    }
  };

  const addImageFiles = async (fileList: FileList | File[]) => {
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const encoded = await Promise.all(imageFiles.slice(0, 4).map((f) => compressImageToDataUrl(f)));
    setAttachedImages((prev) => [...prev, ...encoded].slice(0, 4));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      await addImageFiles(pastedFiles);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      await addImageFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedImages.length === 0) || isGenerating) return;

    const promptText =
      input.trim() || 'Build a clean, responsive React + Tailwind app matching the attached UI screenshot.';
    onSendMessage(promptText, attachedImages.length > 0 ? attachedImages : undefined);
    setInput('');
    setAttachedImages([]);
  };

  const renderUserContent = (content: ChatMessage['content']) => {
    if (typeof content === 'string') {
      return <span>{content}</span>;
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {content
            .filter((part): part is { type: 'image_url'; image_url: { url: string } } => part.type === 'image_url')
            .map((part, i) => (
              <img
                key={i}
                src={part.image_url.url}
                alt={`Attached UI reference ${i + 1}`}
                className="max-h-36 rounded border border-zinc-700 object-contain bg-zinc-900"
              />
            ))}
        </div>
        {content
          .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
          .map((part, i) => (
            <div key={i}>{part.text}</div>
          ))}
      </div>
    );
  };

  const renderAssistantContent = (content: ChatMessage['content'], isStreamingMessage: boolean) => {
    const rawText = typeof content === 'string' ? content : '';
    const { tasks, summaryLines, suggestions } = parseAssistantDisplay(rawText, isStreamingMessage);

    if (!rawText && isStreamingMessage) {
      return (
        <span className="inline-flex items-center gap-2 text-indigo-300 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Planning your app...
        </span>
      );
    }

    return (
      <div className="space-y-3">
        {/* Clean Task Progress Pills */}
        {tasks.length > 0 && (
          <div className="space-y-1.5">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-medium ${
                  task.completed
                    ? 'bg-zinc-900/90 border-zinc-800 text-zinc-200'
                    : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                }`}
              >
                {!task.completed ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                ) : task.type === 'shell' ? (
                  <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{task.label}</span>
                {task.type !== 'shell' && task.completed && (
                  <FileCode2 className="w-3 h-3 text-zinc-500 ml-auto shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Organized Summary with Bold Headings & Bullets */}
        {summaryLines.length > 0 && (
          <div className="space-y-1.5 text-zinc-300 leading-relaxed">
            {summaryLines.map((line, idx) => {
              if (!line) return <div key={idx} className="h-1" />;

              // Heading line (e.g., ### What Was Done or **What Was Done**)
              if (/^#{1,3}\s+/.test(line) || /^\*\*[^*]+\*\*:?$/.test(line)) {
                const headingText = line.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').replace(/:$/, '');
                return (
                  <div
                    key={idx}
                    className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 pt-1"
                  >
                    {headingText}
                  </div>
                );
              }

              // Bullet point line
              if (/^[-*•]\s+/.test(line)) {
                const bulletBody = line.replace(/^[-*•]\s+/, '');
                return (
                  <div key={idx} className="flex items-start gap-2 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div className="flex-1">{renderInlineBold(bulletBody)}</div>
                  </div>
                );
              }

              return <div key={idx}>{renderInlineBold(line)}</div>;
            })}

            {isStreamingMessage && (
              <span
                aria-hidden="true"
                className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-indigo-400 animate-pulse"
              />
            )}
          </div>
        )}

        {/* Clickable Next Suggestion Cards */}
        {suggestions.length > 0 && !isStreamingMessage && (
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-3 h-3" />
              <span>Suggested Next Tweaks (Click to Apply)</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onSendMessage(item.fullPrompt)}
                  className="group w-full text-left p-2.5 rounded-lg bg-zinc-900/90 hover:bg-indigo-950/40 border border-zinc-800 hover:border-indigo-500/50 transition-all flex items-start justify-between gap-2 disabled:opacity-50"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </div>
                    {item.description && (
                      <div className="text-[11px] text-zinc-400 leading-snug">
                        {item.description}
                      </div>
                    )}
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {summaryLines.length === 0 && isStreamingMessage && tasks.length > 0 && (
          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <span>Applying changes to workspace...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col bg-zinc-900/50 h-full relative">
      {/* Header & Model Controls */}
      <div className="p-3 border-b border-zinc-800 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-zinc-100 truncate">Open AI Studio</span>
            {isGenerating && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-medium text-indigo-300 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Working
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenDatabase}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                dbConfig.provider !== 'none'
                  ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
              }`}
              title="Connect Supabase or Firebase Database"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {dbConfig.provider === 'supabase'
                  ? 'Supabase'
                  : dbConfig.provider === 'firebase'
                  ? 'Firebase'
                  : 'Database'}
              </span>
            </button>

            <button
              onClick={onOpenKeys}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
              title="Configure AI Provider API Keys"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Keys</span>
            </button>
          </div>
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

      {/* Chat Messages with Automatic Auto-Scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
        {messages.length === 0 && (
          <div className="text-xs text-zinc-500 space-y-2 p-2">
            <p className="font-semibold text-zinc-300">Starter Ideas (Click to Build):</p>
            <button
              onClick={() =>
                onSendMessage(
                  'Build a Kanban task manager with priority tags, search filter, and localStorage persistence.'
                )
              }
              className="group block text-left w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 text-zinc-200 transition-colors"
            >
              <div className="font-semibold text-zinc-100 group-hover:text-indigo-300">
                Kanban Task Manager
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Status columns, priority tags, and localStorage persistence
              </div>
            </button>
            <button
              onClick={() =>
                onSendMessage(
                  'Create an interactive Markdown previewer and JSON formatter tool with copy buttons.'
                )
              }
              className="group block text-left w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 text-zinc-200 transition-colors"
            >
              <div className="font-semibold text-zinc-100 group-hover:text-indigo-300">
                Developer Utility Suite
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Live Markdown previewer and JSON formatter with one-click copy
              </div>
            </button>
          </div>
        )}

        {messages.map((msg, idx) => {
          const snapshot = snapshotsByMessageIndex[idx];
          const isCurrentVersion = snapshot && snapshot.id === activeSnapshotId;
          const isStreamingMessage =
            isGenerating && msg.role === 'assistant' && idx === messages.length - 1;

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg text-xs leading-relaxed break-words ${
                msg.role === 'user'
                  ? 'bg-indigo-600/20 border border-indigo-500/30 text-zinc-100 ml-4 whitespace-pre-wrap'
                  : isStreamingMessage
                  ? 'bg-zinc-950 border border-indigo-500/40 text-zinc-200 mr-1 shadow-sm shadow-indigo-950/30'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-300 mr-1'
              }`}
            >
              {msg.role === 'user'
                ? renderUserContent(msg.content)
                : renderAssistantContent(msg.content, isStreamingMessage)}

              {snapshot && (
                <div className="mt-2.5 pt-2 border-t border-zinc-800/90 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <History className="w-3 h-3 text-indigo-400" />
                    <span>
                      v{snapshot.version} &middot; {snapshot.timestamp}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isGenerating || isCurrentVersion}
                    onClick={() => onRestoreSnapshot(snapshot)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      isCurrentVersion
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                        : 'bg-zinc-800 hover:bg-indigo-600 text-zinc-200 hover:text-white'
                    }`}
                    title="Restore project files to this snapshot"
                  >
                    {isCurrentVersion ? (
                      <>
                        <Check className="w-3 h-3" /> Active
                      </>
                    ) : (
                      <>Restore v{snapshot.version}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div ref={bottomAnchorRef} className="h-px" />
      </div>

      {/* Error Self-Healing Banner */}
      {lastError && !isGenerating && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 space-y-2 shrink-0">
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

      {/* Prompt Input with Image Paste & Drop */}
      <form
        onSubmit={handleSubmit}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-3 border-t border-zinc-800 transition-colors shrink-0 ${
          isDragging ? 'bg-indigo-950/30 border-indigo-500' : ''
        }`}
      >
        {/* Attached Image Thumbnails */}
        {attachedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedImages.map((imgUrl, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={imgUrl}
                  alt={`Preview ${idx + 1}`}
                  className="w-14 h-14 object-cover rounded-md border border-zinc-700 bg-zinc-950"
                />
                <button
                  type="button"
                  onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-200 hover:bg-red-600 flex items-center justify-center"
                  title="Remove image"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Describe an app, click a tweak card, or paste (Ctrl+V) a screenshot..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 pr-20 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                addImageFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title="Attach UI Screenshot or Sketch"
            >
              <ImagePlus className="w-3.5 h-3.5" />
            </button>

            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white"
                title="Stop"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}