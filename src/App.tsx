import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Code, Code2, Download, Eye, FileCode, Layers, RefreshCw, Save, Sliders } from 'lucide-react';
import { ChatPane, ProjectSnapshot } from './components/ChatPane';
import { TerminalPane } from './components/TerminalPane';
import { ApiKeyModal } from './components/ApiKeyModal';
import { StarterGalleryModal } from './components/StarterGalleryModal';
import { ExportCodeModal } from './components/ExportCodeModal';
import { CodeEditor } from './components/CodeEditor';
import {
  DEFAULT_RUN_SETTINGS,
  RunSettings,
  RunSettingsDrawer,
} from './components/RunSettingsDrawer';
import { ChatContentPart, ChatMessage, streamChatCompletion } from './providers/client';
import { FREE_PROVIDERS } from './providers/models';
import {
  captureProjectSnapshot,
  listProjectFiles,
  mountFiles,
  onServerReady,
  readFile,
  resetProjectFiles,
  restoreProjectSnapshot,
  runShellCommand,
  writeFile,
} from './engine/webcontainer';
import { executeStudioActions, parseStudioActions } from './engine/parser';
import { downloadProjectAsZip } from './engine/export';
import { STARTER_GALLERY, STARTER_TEMPLATE, StarterAppTemplate } from './prompts/templates';
import { buildSystemPrompt } from './prompts/system';

const RUN_SETTINGS_STORAGE_KEY = 'open_ai_studio_run_settings';

function loadStoredRunSettings(): RunSettings {
  try {
    const raw = localStorage.getItem(RUN_SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_RUN_SETTINGS, ...JSON.parse(raw) } : DEFAULT_RUN_SETTINGS;
  } catch {
    return DEFAULT_RUN_SETTINGS;
  }
}

export default function App() {
  const [providerId, setProviderId] = useState(FREE_PROVIDERS[0].id);
  const [modelId, setModelId] = useState(FREE_PROVIDERS[0].models[0].id);
  const [customModelId, setCustomModelId] = useState('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(STARTER_GALLERY[0].id);

  const [runSettings, setRunSettings] = useState<RunSettings>(loadStoredRunSettings);
  const [isRunSettingsOpen, setIsRunSettingsOpen] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [snapshotsByMessageIndex, setSnapshotsByMessageIndex] = useState<Record<number, ProjectSnapshot>>({});
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const versionCounterRef = useRef(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('src/App.tsx');
  const [editorContent, setEditorContent] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');

  const terminalWriteRef = useRef<((data: string) => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bootedRef = useRef(false);

  const handleUpdateRunSettings = useCallback((updated: RunSettings) => {
    setRunSettings(updated);
    localStorage.setItem(RUN_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const currentProvider = FREE_PROVIDERS.find((p) => p.id === providerId) || FREE_PROVIDERS[0];
  const currentModel = currentProvider.models.find((m) => m.id === modelId);
  const maxContextWindow = currentModel?.contextWindow ?? 128000;

  const handleTerminalReady = useCallback((writeFn: (data: string) => void) => {
    terminalWriteRef.current = writeFn;
  }, []);

  const refreshFiles = useCallback(async () => {
    const fileList = await listProjectFiles();
    setFiles(fileList);
  }, []);

  const openFile = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    const content = await readFile(filePath);
    setEditorContent(content);
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      try {
        await mountFiles(STARTER_TEMPLATE);
        await refreshFiles();
        await openFile('src/App.tsx');

        await onServerReady((_port, url) => {
          setPreviewUrl(url);
          setActiveTab('preview');
        });

        terminalWriteRef.current?.('\r\n$ npm install\r\n');
        const installRes = await runShellCommand('npm install', (d) => terminalWriteRef.current?.(d));
        if (installRes.exitCode === 0) {
          terminalWriteRef.current?.('\r\n$ npm run dev\r\n');
          runShellCommand('npm run dev', (d) => terminalWriteRef.current?.(d));
        }
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [openFile, refreshFiles]);

  const handleSelectTemplate = async (template: StarterAppTemplate) => {
    try {
      setLastError(null);
      setActiveTemplateId(template.id);
      setMessages([]);
      setSnapshotsByMessageIndex({});
      setActiveSnapshotId(null);
      versionCounterRef.current = 0;

      terminalWriteRef.current?.(`\r\n--- Loading starter: ${template.name} ---\r\n`);
      await resetProjectFiles();
      await mountFiles(template.tree);
      await refreshFiles();
      await openFile(template.entryFile);

      terminalWriteRef.current?.('\r\n$ npm install\r\n');
      const installRes = await runShellCommand('npm install', (d) => terminalWriteRef.current?.(d));
      if (installRes.exitCode === 0) {
        terminalWriteRef.current?.(`\r\n$ ${template.startCommand}\r\n`);
        runShellCommand(template.startCommand, (d) => terminalWriteRef.current?.(d));
        setPreviewUrl((u) => (u ? `${u.split('?')[0]}?t=${Date.now()}` : u));
        setActiveTab('preview');
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRestoreSnapshot = async (snapshot: ProjectSnapshot) => {
    try {
      setLastError(null);
      terminalWriteRef.current?.(`\r\n--- Restoring snapshot v${snapshot.version} (${snapshot.timestamp}) ---\r\n`);
      await restoreProjectSnapshot(snapshot.files);
      const updatedFiles = await listProjectFiles();
      setFiles(updatedFiles);

      if (selectedFile && snapshot.files[selectedFile] !== undefined) {
        setEditorContent(snapshot.files[selectedFile]);
      } else if (updatedFiles.length > 0) {
        await openFile(updatedFiles[0]);
      }

      setActiveSnapshotId(snapshot.id);
      setPreviewUrl((u) => (u ? `${u.split('?')[0]}?t=${Date.now()}` : u));
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveManualEdit = useCallback(async () => {
    if (!selectedFile) return;
    await writeFile(selectedFile, editorContent);
  }, [selectedFile, editorContent]);

  const handleSendMessage = async (userPrompt: string, images?: string[]) => {
    setLastError(null);

    const userContent: string | ChatContentPart[] =
      images && images.length > 0
        ? [
            { type: 'text', text: userPrompt },
            ...images.map((url) => ({
              type: 'image_url' as const,
              image_url: { url },
            })),
          ]
        : userPrompt;

    const userMsg: ChatMessage = { role: 'user', content: userContent };
    const updatedHistory = [...messages, userMsg];
    const assistantMsgIndex = updatedHistory.length;
    setMessages([...updatedHistory, { role: 'assistant', content: '' }]);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const currentFiles = await listProjectFiles();
      const activeContext = selectedFile
        ? { path: selectedFile, content: await readFile(selectedFile).catch(() => '') }
        : undefined;

      const systemMsg: ChatMessage = {
        role: 'system',
        content: buildSystemPrompt(currentFiles, activeContext, runSettings.customInstructions),
      };

      const fullResponse = await streamChatCompletion({
        providerId,
        modelId,
        customModelId,
        messages: [systemMsg, ...updatedHistory],
        temperature: runSettings.temperature,
        maxTokens: runSettings.maxTokens,
        topP: runSettings.topP,
        signal: controller.signal,
        onToken: (_token, fullText) => {
          setMessages([...updatedHistory, { role: 'assistant', content: fullText }]);
        },
      });

      const actions = parseStudioActions(fullResponse);
      if (actions.length > 0) {
        const logs = await executeStudioActions(
          actions,
          (data) => terminalWriteRef.current?.(data),
          async (changedPath) => {
            await refreshFiles();
            if (changedPath === selectedFile) {
              await openFile(changedPath);
            }
          }
        );

        const failedLog = logs.find((l) => l.status === 'error');
        if (failedLog) {
          setLastError(failedLog.message);
        } else {
          await refreshFiles();
          setActiveTab('preview');

          const snapshotFiles = await captureProjectSnapshot();
          versionCounterRef.current += 1;
          const snapId = `snap_${Date.now()}_${versionCounterRef.current}`;
          const newSnapshot: ProjectSnapshot = {
            id: snapId,
            version: versionCounterRef.current,
            label: userPrompt.slice(0, 48),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            files: snapshotFiles,
          };
          setSnapshotsByMessageIndex((prev) => ({
            ...prev,
            [assistantMsgIndex]: newSnapshot,
          }));
          setActiveSnapshotId(snapId);
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setLastError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const hasCustomInstructions = runSettings.customInstructions.trim().length > 0;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-zinc-950 text-zinc-100">
      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <StarterGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        activeTemplateId={activeTemplateId}
        onSelectTemplate={handleSelectTemplate}
        onUsePrompt={(prompt) => handleSendMessage(prompt)}
      />
      <ExportCodeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        providerId={providerId}
        modelId={modelId}
        customModelId={customModelId}
        runSettings={runSettings}
        messages={messages}
      />

      <div className="w-96 border-r border-zinc-800 shrink-0 h-full overflow-hidden">
        <ChatPane
          providerId={providerId}
          setProviderId={setProviderId}
          modelId={modelId}
          setModelId={setModelId}
          customModelId={customModelId}
          setCustomModelId={setCustomModelId}
          messages={messages}
          snapshotsByMessageIndex={snapshotsByMessageIndex}
          activeSnapshotId={activeSnapshotId}
          onRestoreSnapshot={handleRestoreSnapshot}
          isGenerating={isGenerating}
          lastError={lastError}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onOpenKeys={() => setIsKeyModalOpen(true)}
        />
      </div>

      {/* Center Workbench */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar */}
        <div className="h-11 border-b border-zinc-800 px-3 flex items-center justify-between bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
                  activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
                  activeTab === 'code' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code
              </button>
            </div>

            <button
              onClick={() => setIsGalleryOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80 text-xs text-zinc-200"
              title="Open Starter App Gallery & Prompt Presets"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Gallery
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'code' ? (
              <button
                onClick={handleSaveManualEdit}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
                title="Save file (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                Save {selectedFile}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="truncate max-w-[160px]">{previewUrl || 'Starting dev server...'}</span>
                {previewUrl && (
                  <button
                    onClick={() => setPreviewUrl((u) => `${u.split('?')[0]}?t=${Date.now()}`)}
                    className="p-1 hover:text-zinc-100"
                    title="Reload Preview"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
              title="Get API Code Snippet or Push to GitHub"
            >
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              Get Code / GitHub
            </button>

            <button
              onClick={() => downloadProjectAsZip()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
              title="Download Project ZIP"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              ZIP
            </button>

            <button
              onClick={() => setIsRunSettingsOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
                isRunSettingsOpen
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
              }`}
              title="Toggle Run Settings & System Instructions"
            >
              <Sliders className="w-3.5 h-3.5" />
              Run Settings
              {hasCustomInstructions && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Custom instructions active" />
              )}
            </button>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 flex min-h-0">
          {activeTab === 'code' ? (
            <>
              {/* File Tree */}
              <div className="w-56 border-r border-zinc-800 bg-zinc-950 p-2 overflow-y-auto space-y-0.5 shrink-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-2 py-1">
                  Project Files
                </div>
                {files.map((file) => (
                  <button
                    key={file}
                    onClick={() => openFile(file)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-xs truncate ${
                      selectedFile === file
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{file}</span>
                  </button>
                ))}
              </div>

              {/* CodeMirror 6 Syntax-Highlighted Editor */}
              <CodeEditor
                filePath={selectedFile}
                value={editorContent}
                onChange={setEditorContent}
                onSave={handleSaveManualEdit}
              />
            </>
          ) : (
            <div className="flex-1 bg-white">
              {previewUrl ? (
                <iframe src={previewUrl} title="App Preview" className="w-full h-full border-0" />
              ) : (
                <div className="w-full h-full bg-zinc-950 flex items-center justify-center text-xs text-zinc-500">
                  Installing dependencies and booting Vite server inside WebContainer...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Integrated xterm.js Terminal */}
        <TerminalPane onTerminalReady={handleTerminalReady} />
      </div>

      {/* Right Run Settings Drawer */}
      {isRunSettingsOpen && (
        <div className="w-80 border-l border-zinc-800 shrink-0 h-full overflow-hidden">
          <RunSettingsDrawer
            isOpen={isRunSettingsOpen}
            onClose={() => setIsRunSettingsOpen(false)}
            settings={runSettings}
            onChange={handleUpdateRunSettings}
            maxContextWindow={maxContextWindow}
          />
        </div>
      )}
    </div>
  );
}