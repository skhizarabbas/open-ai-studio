import React, { useRef, useState } from 'react';
import { Send, Square, Key, Wrench, AlertTriangle, ImagePlus, X } from 'lucide-react';
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
  messages,
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

  const currentProvider = FREE_PROVIDERS.find((p) => p.id === providerId) || FREE_PROVIDERS[0];

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

  const renderMessageContent = (content: ChatMessage['content']) => {
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

  return (
    <div className="w-96 border-r border-zinc-800 flex flex-col bg-zinc-900/50 h-full shrink-0">
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
            <p className="font-medium text-zinc-400">Starter Ideas (or paste a UI screenshot):</p>
            <button
              onClick={() =>
                setInput(
                  'Build a Kanban task manager with drag-free status columns, priority tags, and localStorage persistence.'
                )
              }
              className="block text-left w-full p-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300"
            >
              &ldquo;Build a Kanban task manager with priority tags and localStorage.&rdquo;
            </button>
            <button
              onClick={() =>
                setInput('Create an interactive Markdown previewer and JSON formatter tool with copy buttons.')
              }
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
            {renderMessageContent(msg.content)}
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

      {/* Prompt Input with Image Paste & Drop */}
      <form
        onSubmit={handleSubmit}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-3 border-t border-zinc-800 transition-colors ${
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
            placeholder="Describe an app or paste (Ctrl+V) a UI screenshot..."
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