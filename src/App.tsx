import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Code, Code2, Download, Eye, FileCode, Layers, MessageSquare, Play, RefreshCw, Save, Sliders, Terminal } from 'lucide-react';
import { ChatPane, DatabaseRequestSpec, ProjectSnapshot } from './components/ChatPane';
import { TerminalPane } from './components/TerminalPane';
import { ApiKeyModal } from './components/ApiKeyModal';
import { StarterGalleryModal } from './components/StarterGalleryModal';
import { ExportCodeModal } from './components/ExportCodeModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { StudioStartScreen } from './components/StudioStartScreen';
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
  startProjectServer,
  stopProjectServer,
  writeFile,
} from './engine/webcontainer';
import type { ProjectFileContent } from './engine/webcontainer';
import { executeStudioActions, parseStudioActions } from './engine/parser';
import { downloadProjectAsZip } from './engine/export';
import { STARTER_GALLERY, STARTER_TEMPLATE, StarterAppTemplate } from './prompts/templates';
import { buildSystemPrompt, ConnectedDatabaseInfo } from './prompts/system';
import { importPublicGithubRepository } from './engine/github';
import {
  deleteStoredProject,
  getActiveProjectId,
  listStoredProjects,
  saveStoredProject,
  setActiveProjectId,
  StoredProject,
} from './engine/projectStore';

const RUN_SETTINGS_STORAGE_KEY = 'open_ai_studio_run_settings';
const MODEL_SELECTION_STORAGE_KEY = 'open_ai_studio_model_selection';

type MobileWorkspaceView = 'build' | 'preview' | 'code' | 'terminal' | 'settings';

const MOBILE_NAV_ITEMS = [
  { id: 'build', label: 'Build', icon: MessageSquare },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Sliders },
] as const;

function loadStoredModelSelection(): { providerId: string; modelId: string } {
  try {
    const stored = JSON.parse(localStorage.getItem(MODEL_SELECTION_STORAGE_KEY) || '{}');
    const provider = FREE_PROVIDERS.find((item) => item.id === stored.providerId);
    if (provider) {
      const model = provider.models.find((item) => item.id === stored.modelId) || provider.models[0];
      return { providerId: provider.id, modelId: model.id };
    }
  } catch {
    // Use the no-key cloud provider for first-time sessions.
  }
  const provider = FREE_PROVIDERS[0];
  return { providerId: provider.id, modelId: provider.models[0].id };
}

function isEditableProjectFile(content: ProjectFileContent | undefined): boolean {
  if (typeof content === 'string') return true;
  if (!content) return false;
  try {
    return !new TextDecoder('utf-8', { fatal: true }).decode(content).includes('\0');
  } catch {
    return false;
  }
}

function chooseEditorFile(project: Pick<StoredProject, 'selectedFile' | 'files'>, paths: string[]): string {
  if (paths.includes(project.selectedFile) && isEditableProjectFile(project.files[project.selectedFile])) {
    return project.selectedFile;
  }
  if (paths.includes('src/App.tsx') && isEditableProjectFile(project.files['src/App.tsx'])) return 'src/App.tsx';
  return paths.find((path) => isEditableProjectFile(project.files[path])) || '';
}

function loadStoredRunSettings(): RunSettings {
  try {
    const raw = localStorage.getItem(RUN_SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_RUN_SETTINGS, ...JSON.parse(raw) } : DEFAULT_RUN_SETTINGS;
  } catch {
    return DEFAULT_RUN_SETTINGS;
  }
}

export default function App() {
  const [initialModelSelection] = useState(loadStoredModelSelection);
  const [providerId, setProviderId] = useState(initialModelSelection.providerId);
  const [modelId, setModelId] = useState(initialModelSelection.modelId);
  const [customModelId, setCustomModelId] = useState('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [activeProject, setActiveProject] = useState<StoredProject | null>(null);
  const [projectStoreReady, setProjectStoreReady] = useState(false);
  const [isProjectBusy, setIsProjectBusy] = useState(false);
  const [projectProgress, setProjectProgress] = useState('');
  const [projectError, setProjectError] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState(STARTER_GALLERY[0].id);

  const [connectedDatabases, setConnectedDatabases] = useState<ConnectedDatabaseInfo[]>([]);
  const [submittedDbRequestIds, setSubmittedDbRequestIds] = useState<Record<string, boolean>>({});

  const [runSettings, setRunSettings] = useState<RunSettings>(loadStoredRunSettings);
  const [isRunSettingsOpen, setIsRunSettingsOpen] = useState(false);

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
  const [mobileView, setMobileView] = useState<MobileWorkspaceView>('preview');

  const terminalWriteRef = useRef<((data: string) => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bootedRef = useRef(false);
  const projectRecordRef = useRef<StoredProject | null>(null);
  const projectSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const handleUpdateRunSettings = useCallback((updated: RunSettings) => {
    setRunSettings(updated);
    localStorage.setItem(RUN_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  useEffect(() => {
    localStorage.setItem(MODEL_SELECTION_STORAGE_KEY, JSON.stringify({ providerId, modelId }));
  }, [providerId, modelId]);

  const currentProvider = FREE_PROVIDERS.find((p) => p.id === providerId) || FREE_PROVIDERS[0];
  const currentModel = currentProvider.models.find((m) => m.id === modelId);
  const maxContextWindow = currentModel?.contextWindow ?? 128000;

  const handleTerminalReady = useCallback((writeFn: (data: string) => void) => {
    terminalWriteRef.current = writeFn;
  }, []);

  const handleMobileNavigation = (view: MobileWorkspaceView) => {
    setMobileView(view);
    if (view === 'preview' || view === 'code') setActiveTab(view);
    if (view === 'settings') setIsRunSettingsOpen(true);
  };

  const handleToggleRunSettings = () => {
    if (window.innerWidth < 768) {
      setIsRunSettingsOpen(true);
      setMobileView('settings');
    } else {
      setIsRunSettingsOpen((open) => !open);
    }
  };

  const refreshFiles = useCallback(async () => {
    const fileList = await listProjectFiles();
    setFiles(fileList);
  }, []);

  const openFile = useCallback(async (filePath: string) => {
    const content = await readFile(filePath);
    setSelectedFile(filePath);
    setEditorContent(content);
  }, []);

  const persistCurrentProject = useCallback(async () => {
    if (!projectStoreReady || !projectRecordRef.current) return;
    const save = async () => {
      const current = projectRecordRef.current;
      if (!current) return;
      if (selectedFile) await writeFile(selectedFile, editorContent);
      const updated: StoredProject = {
        ...current,
        updatedAt: Date.now(),
        files: await captureProjectSnapshot(),
        messages,
        snapshotsByMessageIndex,
        activeSnapshotId,
        versionCounter: versionCounterRef.current,
        activeTemplateId,
        selectedFile,
        connectedDatabases,
        submittedDbRequestIds,
      };
      await saveStoredProject(updated);
      if (projectRecordRef.current?.id === updated.id) {
        projectRecordRef.current = updated;
        setActiveProject(updated);
        setProjects((previous) => previous.map((project) => project.id === updated.id ? updated : project));
      }
    };

    const queuedSave = projectSaveQueueRef.current.then(save, save);
    projectSaveQueueRef.current = queuedSave.catch(() => undefined);
    await queuedSave;
  }, [
    projectStoreReady,
    selectedFile,
    editorContent,
    messages,
    snapshotsByMessageIndex,
    activeSnapshotId,
    activeTemplateId,
    connectedDatabases,
    submittedDbRequestIds,
  ]);

  const runProject = useCallback(async (project: StoredProject) => {
    setLastError(null);
    terminalWriteRef.current?.('\r\n$ npm install\r\n');
    const installResult = await runShellCommand('npm install', (data) => terminalWriteRef.current?.(data));
    if (installResult.exitCode !== 0) {
      throw new Error(`Dependency installation failed:\n${installResult.output.slice(-600)}`);
    }
    const currentProject = projectRecordRef.current;
    if (currentProject?.id === project.id) {
      const updatedProject = {
        ...currentProject,
        updatedAt: Date.now(),
        files: await captureProjectSnapshot(),
      };
      await saveStoredProject(updatedProject);
      projectRecordRef.current = updatedProject;
      setActiveProject(updatedProject);
      setProjects((previous) => previous.map((item) => item.id === updatedProject.id ? updatedProject : item));
    }
    terminalWriteRef.current?.(`\r\n$ ${project.startCommand}\r\n`);
    await startProjectServer(project.startCommand, (data) => terminalWriteRef.current?.(data));
    setPreviewUrl((url) => (url ? `${url.split('?')[0]}?t=${Date.now()}` : url));
    setActiveTab('preview');
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      try {
        let storedProjects: StoredProject[] = [];
        let project: StoredProject | undefined;
        let storageAvailable = true;
        try {
          storedProjects = await listStoredProjects();
          const activeId = await getActiveProjectId();
          project = storedProjects.find((item) => item.id === activeId) || storedProjects[0];
        } catch (error) {
          storageAvailable = false;
          setLastError(`Local project storage is unavailable: ${error instanceof Error ? error.message : String(error)}`);
        }

        if (project) {
          await restoreProjectSnapshot(project.files);
        } else {
          await mountFiles(STARTER_TEMPLATE);
          const now = Date.now();
          project = {
            id: `project_${crypto.randomUUID()}`,
            name: 'Blank React + Tailwind',
            createdAt: now,
            updatedAt: now,
            source: 'starter',
            scriptsApproved: true,
            startCommand: 'npm run dev',
            files: await captureProjectSnapshot(),
            messages: [],
            snapshotsByMessageIndex: {},
            activeSnapshotId: null,
            versionCounter: 0,
            activeTemplateId: STARTER_GALLERY[0].id,
            selectedFile: 'src/App.tsx',
            connectedDatabases: [],
            submittedDbRequestIds: {},
          };
          if (storageAvailable) {
            await saveStoredProject(project);
            await setActiveProjectId(project.id);
          }
          storedProjects = [project, ...storedProjects];
        }

        projectRecordRef.current = project;
        setActiveProject(project);
        setProjects(storedProjects);
        setMessages(project.messages);
        setSnapshotsByMessageIndex(project.snapshotsByMessageIndex);
        setActiveSnapshotId(project.activeSnapshotId);
        versionCounterRef.current = project.versionCounter;
        setActiveTemplateId(project.activeTemplateId);
        setConnectedDatabases(project.connectedDatabases);
        setSubmittedDbRequestIds(project.submittedDbRequestIds);
        if (project.source === 'github' && !project.scriptsApproved) setActiveTab('code');
        await refreshFiles();
        const fileList = await listProjectFiles();
        const selected = chooseEditorFile(project, fileList);
        if (selected) await openFile(selected);

        await onServerReady((_port, url) => {
          setPreviewUrl(url);
          setActiveTab('preview');
        });
        setProjectStoreReady(storageAvailable);
        if (project.scriptsApproved) await runProject(project);
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [openFile, refreshFiles, runProject]);

  useEffect(() => {
    if (!projectStoreReady || !activeProject) return;
    const timer = window.setTimeout(() => {
      void persistCurrentProject().catch((error: unknown) => {
        setLastError(`Could not save this project locally: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    projectStoreReady,
    activeProject?.id,
    messages,
    snapshotsByMessageIndex,
    activeSnapshotId,
    selectedFile,
    editorContent,
    activeTemplateId,
    connectedDatabases,
    submittedDbRequestIds,
    persistCurrentProject,
  ]);

  const createProjectFromTemplate = async (template: StarterAppTemplate) => {
    if (isProjectBusy || isGenerating) return;
    setIsProjectBusy(true);
    setProjectError(null);
    try {
      await persistCurrentProject();
      await stopProjectServer();
      setProjectStoreReady(false);
      setPreviewUrl('');
      terminalWriteRef.current?.(`\r\n--- Loading starter: ${template.name} ---\r\n`);
      await resetProjectFiles();
      await mountFiles(template.tree);
      const now = Date.now();
      const project: StoredProject = {
        id: `project_${crypto.randomUUID()}`,
        name: template.name,
        createdAt: now,
        updatedAt: now,
        source: 'starter',
        scriptsApproved: true,
        startCommand: template.startCommand,
        files: await captureProjectSnapshot(),
        messages: [],
        snapshotsByMessageIndex: {},
        activeSnapshotId: null,
        versionCounter: 0,
        activeTemplateId: template.id,
        selectedFile: template.entryFile,
        connectedDatabases: [],
        submittedDbRequestIds: {},
      };
      await saveStoredProject(project);
      await setActiveProjectId(project.id);
      projectRecordRef.current = project;
      setActiveProject(project);
      setProjects((previous) => [project, ...previous]);
      setActiveTemplateId(template.id);
      setMessages([]);
      setSnapshotsByMessageIndex({});
      setActiveSnapshotId(null);
      versionCounterRef.current = 0;
      setConnectedDatabases([]);
      setSubmittedDbRequestIds({});
      await refreshFiles();
      await openFile(template.entryFile);
      setProjectStoreReady(true);
      await runProject(project);
      setIsProjectManagerOpen(false);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProjectBusy(false);
    }
  };

  const handleCreateProject = () => createProjectFromTemplate(STARTER_GALLERY[0]);

  const handleSwitchProject = async (project: StoredProject) => {
    if (isProjectBusy || isGenerating || project.id === activeProject?.id) return;
    setIsProjectBusy(true);
    setProjectError(null);
    try {
      await persistCurrentProject();
      setProjectStoreReady(false);
      await stopProjectServer();
      setPreviewUrl('');
      await restoreProjectSnapshot(project.files);
      await setActiveProjectId(project.id);
      projectRecordRef.current = project;
      setActiveProject(project);
      setMessages(project.messages);
      setSnapshotsByMessageIndex(project.snapshotsByMessageIndex);
      setActiveSnapshotId(project.activeSnapshotId);
      versionCounterRef.current = project.versionCounter;
      setActiveTemplateId(project.activeTemplateId);
      setConnectedDatabases(project.connectedDatabases);
      setSubmittedDbRequestIds(project.submittedDbRequestIds);
      await refreshFiles();
      const fileList = await listProjectFiles();
      const selected = chooseEditorFile(project, fileList);
      if (selected) await openFile(selected);
      setActiveTab(project.scriptsApproved ? 'preview' : 'code');
      setProjectStoreReady(true);
      setIsProjectManagerOpen(false);
      if (project.scriptsApproved) await runProject(project);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProjectBusy(false);
    }
  };

  const handleImportGithub = async (url: string, runAfterImport: boolean) => {
    if (isProjectBusy || isGenerating) return;
    setIsProjectBusy(true);
    setProjectProgress('Starting import...');
    setProjectError(null);
    try {
      const imported = await importPublicGithubRepository(url, { onProgress: setProjectProgress });
      await persistCurrentProject();
      const selected = chooseEditorFile(
        { selectedFile: 'src/App.tsx', files: imported.files },
        Object.keys(imported.files)
      );
      const now = Date.now();
      const project: StoredProject = {
        id: `project_${crypto.randomUUID()}`,
        name: `${imported.owner}/${imported.repo}`,
        createdAt: now,
        updatedAt: now,
        source: 'github',
        sourceUrl: imported.repoUrl,
        scriptsApproved: runAfterImport,
        startCommand: 'npm run dev',
        files: imported.files,
        messages: [],
        snapshotsByMessageIndex: {},
        activeSnapshotId: null,
        versionCounter: 0,
        activeTemplateId: 'github-import',
        selectedFile: selected,
        connectedDatabases: [],
        submittedDbRequestIds: {},
      };
      await saveStoredProject(project);
      setProjectStoreReady(false);
      await stopProjectServer();
      setPreviewUrl('');
      await restoreProjectSnapshot(project.files);
      await setActiveProjectId(project.id);
      projectRecordRef.current = project;
      setActiveProject(project);
      setProjects((previous) => [project, ...previous]);
      setMessages([]);
      setSnapshotsByMessageIndex({});
      setActiveSnapshotId(null);
      versionCounterRef.current = 0;
      setActiveTemplateId(project.activeTemplateId);
      setConnectedDatabases([]);
      setSubmittedDbRequestIds({});
      const fileList = await listProjectFiles();
      setFiles(fileList);
      if (selected) await openFile(selected);
      setActiveTab(runAfterImport ? 'preview' : 'code');
      setProjectStoreReady(true);
      setIsProjectManagerOpen(false);
      if (runAfterImport) await runProject(project);
      setProjectProgress('');
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
      setProjectProgress('');
    } finally {
      setIsProjectBusy(false);
    }
  };

  const handleDeleteProject = async (project: StoredProject) => {
    if (projects.length < 2 || project.id === activeProject?.id || isProjectBusy) return;
    if (!window.confirm(`Delete "${project.name}" and its local chat and snapshots?`)) return;
    try {
      await deleteStoredProject(project.id);
      setProjects((previous) => previous.filter((item) => item.id !== project.id));
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRunProject = async () => {
    if (!activeProject || isProjectBusy || isGenerating) return;
    let project = activeProject;
    if (!project.scriptsApproved) {
      const approved = window.confirm('This project can run repository-provided package scripts in the WebContainer. Continue?');
      if (!approved) return;
      project = { ...project, scriptsApproved: true };
    }
    setIsProjectBusy(true);
    try {
      if (project !== activeProject) {
        projectRecordRef.current = project;
        setActiveProject(project);
        await saveStoredProject(project);
        setProjects((previous) => previous.map((item) => item.id === project.id ? project : item));
      }
      await runProject(project);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProjectBusy(false);
    }
  };

  const handleSelectTemplate = async (template: StarterAppTemplate) => {
    await createProjectFromTemplate(template);
  };

  const handleRestoreSnapshot = async (snapshot: ProjectSnapshot) => {
    try {
      setLastError(null);
      terminalWriteRef.current?.(`\r\n--- Restoring snapshot v${snapshot.version} (${snapshot.timestamp}) ---\r\n`);
      await restoreProjectSnapshot(snapshot.files);
      const updatedFiles = await listProjectFiles();
      setFiles(updatedFiles);
      const selected = chooseEditorFile({ selectedFile, files: snapshot.files }, updatedFiles);
      if (selected) await openFile(selected);
      else {
        setSelectedFile('');
        setEditorContent('');
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
    await persistCurrentProject();
  }, [selectedFile, editorContent, persistCurrentProject]);

  const handleSendMessage = async (
    userPrompt: string,
    images?: string[],
    overrideConnectedDbs?: ConnectedDatabaseInfo[]
  ) => {
    setLastError(null);
    const activeDbs = overrideConnectedDbs ?? connectedDatabases;

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
      const appEntryContent = await readFile('src/App.tsx').catch(() => '');
      const activeContext = selectedFile
        ? { path: selectedFile, content: await readFile(selectedFile).catch(() => '') }
        : undefined;

      const systemMsg: ChatMessage = {
        role: 'system',
        content: buildSystemPrompt(
          currentFiles,
          activeContext,
          runSettings.customInstructions,
          appEntryContent,
          activeDbs
        ),
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
        let lastModifiedFile: string | null = null;
        const logs = await executeStudioActions(
          actions,
          (data) => terminalWriteRef.current?.(data),
          async (changedPath) => {
            lastModifiedFile = changedPath;
            await refreshFiles();
            if (changedPath === selectedFile) {
              await openFile(changedPath);
            }
          },
          (command) => window.confirm(`Allow the assistant to run this command inside the WebContainer?\n\n${command}`)
        );

        const failedLog = logs.find((l) => l.status === 'error');
        if (failedLog) {
          setLastError(failedLog.message);
        } else {
          await refreshFiles();
          if (lastModifiedFile) {
            await openFile(lastModifiedFile);
          }
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

  const handleConnectDatabaseFromChat = async (
    spec: DatabaseRequestSpec,
    values: Record<string, string>
  ) => {
    const provider = spec.provider.toLowerCase();
    const cleanedEntries = Object.entries(values)
      .filter(([, v]) => v.trim().length > 0)
      .map(([k, v]) => [k.trim(), v.trim()] as const);

    const envVars: Record<string, string> = Object.fromEntries(cleanedEntries);

    // Append or write .env in WebContainer
    const existingEnv = await readFile('.env').catch(() => '');
    const newEnvLines = cleanedEntries.map(([k, v]) => `${k}=${v}`).join('\n');
    await writeFile('.env', `${existingEnv.trim()}\n${newEnvLines}\n`.trim() + '\n');

    if (provider.includes('supabase')) {
      terminalWriteRef.current?.('\r\n--- Setting up Supabase client in WebContainer ---\r\n');
      await writeFile(
        'src/lib/supabase.ts',
        `import { createClient } from '@supabase/supabase-js';\n\nconst supabaseUrl = import.meta.env.VITE_SUPABASE_URL;\nconst supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;\n\nexport const supabase = createClient(supabaseUrl, supabaseAnonKey);\n`
      );
      terminalWriteRef.current?.('\r\n$ npm install @supabase/supabase-js\r\n');
      await runShellCommand('npm install @supabase/supabase-js', (d) => terminalWriteRef.current?.(d));
    } else if (provider.includes('firebase')) {
      terminalWriteRef.current?.('\r\n--- Setting up Firebase client in WebContainer ---\r\n');
      await writeFile(
        'src/lib/firebase.ts',
        `import { initializeApp } from 'firebase/app';\nimport { getFirestore } from 'firebase/firestore';\nimport { getAuth } from 'firebase/auth';\n\nconst firebaseConfig = {\n  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,\n  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,\n  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,\n  appId: import.meta.env.VITE_FIREBASE_APP_ID,\n};\n\nexport const app = initializeApp(firebaseConfig);\nexport const db = getFirestore(app);\nexport const auth = getAuth(app);\n`
      );
      terminalWriteRef.current?.('\r\n$ npm install firebase\r\n');
      await runShellCommand('npm install firebase', (d) => terminalWriteRef.current?.(d));
    }

    await refreshFiles();
    const updatedDbs: ConnectedDatabaseInfo[] = [
      ...connectedDatabases.filter((d) => d.provider !== spec.provider),
      { provider: spec.provider, envVars },
    ];
    setConnectedDatabases(updatedDbs);
    setSubmittedDbRequestIds((prev) => ({ ...prev, [spec.id]: true }));

    await handleSendMessage(
      `I have connected ${spec.title}. Wire the app to use ${spec.provider} with the environment keys (${Object.keys(
        envVars
      ).join(', ')}) and include any required table/collection schema in your summary.`,
      undefined,
      updatedDbs
    );
  };

  const handleSkipDatabaseFromChat = (spec: DatabaseRequestSpec) => {
    setSubmittedDbRequestIds((prev) => ({ ...prev, [spec.id]: true }));
    handleSendMessage(
      `Skip ${spec.title} for now and keep full persistence working using browser localStorage.`
    );
  };

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const hasCustomInstructions = runSettings.customInstructions.trim().length > 0;
  const showStudioStart =
    messages.length === 0 &&
    activeProject?.source === 'starter' &&
    activeProject.activeTemplateId === STARTER_GALLERY[0].id;

  return (
    <div className="h-[100dvh] w-screen flex overflow-hidden bg-zinc-950 text-zinc-100 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)} />
      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        projects={projects}
        activeProjectId={activeProject?.id || null}
        isBusy={isProjectBusy || isGenerating}
        progress={projectProgress}
        error={projectError}
        onClose={() => setIsProjectManagerOpen(false)}
        onCreateProject={handleCreateProject}
        onSwitchProject={handleSwitchProject}
        onDeleteProject={handleDeleteProject}
        onImportGithub={handleImportGithub}
      />
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

      <div className={`w-full md:w-72 xl:w-80 2xl:w-96 border-r border-zinc-800 shrink-0 h-full overflow-hidden ${mobileView === 'build' ? 'flex' : 'hidden'} md:flex`}>
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
          submittedDbRequestIds={submittedDbRequestIds}
          onConnectDatabaseFromChat={handleConnectDatabaseFromChat}
          onSkipDatabaseFromChat={handleSkipDatabaseFromChat}
          onRestoreSnapshot={handleRestoreSnapshot}
          isGenerating={isGenerating}
          lastError={lastError}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onOpenKeys={() => setIsKeyModalOpen(true)}
          onOpenProjects={() => {
            setProjectError(null);
            setIsProjectManagerOpen(true);
          }}
        />
      </div>

      {/* Center Workbench */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'build' || mobileView === 'settings' ? 'hidden' : 'flex'} md:flex`}>
        {/* Top Toolbar */}
        <div className="studio-toolbar-scroll h-11 border-b border-zinc-800 px-3 flex items-center justify-between bg-zinc-900/40 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  activeTab === 'code' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code
              </button>
            </div>

            <button
              onClick={() => setIsGalleryOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700/80 text-xs text-zinc-200 whitespace-nowrap"
              title="Open Starter App Gallery & Prompt Presets"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Gallery
            </button>
          </div>

          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={handleRunProject}
              disabled={!activeProject || isProjectBusy || isGenerating}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs text-white whitespace-nowrap disabled:opacity-40"
              title="Install dependencies and run the active project"
            >
              <Play className="w-3.5 h-3.5" />
              Run
            </button>
            {activeTab === 'code' ? (
              <button
                onClick={handleSaveManualEdit}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 whitespace-nowrap"
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 whitespace-nowrap"
              title="Get API Code Snippet or Push Built App to GitHub"
            >
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              Get Code / GitHub
            </button>

            <button
              onClick={() => downloadProjectAsZip()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-medium text-emerald-300 whitespace-nowrap"
              title="Download Built App Source Code (.ZIP)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Download ZIP
            </button>

            <button
              onClick={handleToggleRunSettings}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
                isRunSettingsOpen
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200'
                } whitespace-nowrap`}
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
        <div className={`flex-1 flex min-h-0 ${mobileView === 'terminal' ? 'hidden md:flex' : ''}`}>
          {activeTab === 'code' ? (
            <>
              {/* File Tree */}
              <div className="w-56 border-r border-zinc-800 bg-zinc-950 p-2 flex flex-col justify-between overflow-y-auto shrink-0">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-2 py-1">
                    Built App Files
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

                <button
                  onClick={() => downloadProjectAsZip()}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download App (.ZIP)
                </button>
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
            showStudioStart ? (
              <StudioStartScreen
                projectName={activeProject.name}
                isRuntimeReady={Boolean(previewUrl)}
                isGenerating={isGenerating}
                onSendMessage={(prompt) => {
                  setMobileView('build');
                  handleSendMessage(prompt);
                }}
                onOpenGallery={() => setIsGalleryOpen(true)}
                onOpenProjects={() => {
                  setProjectError(null);
                  setIsProjectManagerOpen(true);
                }}
              />
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
            )
          )}
        </div>

        {/* Integrated xterm.js Terminal */}
        <TerminalPane onTerminalReady={handleTerminalReady} isExpanded={mobileView === 'terminal'} />
      </div>

      {/* Right Run Settings Drawer */}
      {isRunSettingsOpen && (
        <div className={`w-full md:w-80 border-l border-zinc-800 shrink-0 h-full overflow-hidden ${mobileView === 'settings' ? 'flex' : 'hidden'} md:flex`}>
          <RunSettingsDrawer
            isOpen={isRunSettingsOpen}
            onClose={() => {
              setIsRunSettingsOpen(false);
              setMobileView('build');
            }}
            settings={runSettings}
            onChange={handleUpdateRunSettings}
            maxContextWindow={maxContextWindow}
          />
        </div>
      )}

      <nav
        aria-label="Studio navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-zinc-800 bg-zinc-950/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = mobileView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => handleMobileNavigation(item.id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] ${
                isActive ? 'text-lime-300' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
