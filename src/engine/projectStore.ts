import type { ChatMessage } from '../providers/client';
import type { ConnectedDatabaseInfo } from '../prompts/system';
import type { ProjectSnapshot } from '../components/ChatPane';
import type { ProjectFileContent } from './webcontainer';

export interface StoredProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  source: 'starter' | 'github';
  sourceUrl?: string;
  scriptsApproved: boolean;
  startCommand: string;
  files: Record<string, ProjectFileContent>;
  messages: ChatMessage[];
  snapshotsByMessageIndex: Record<number, ProjectSnapshot>;
  activeSnapshotId: string | null;
  versionCounter: number;
  activeTemplateId: string;
  selectedFile: string;
  connectedDatabases: ConnectedDatabaseInfo[];
  submittedDbRequestIds: Record<string, boolean>;
}

const DATABASE_NAME = 'open-ai-studio-local';
const DATABASE_VERSION = 1;
const PROJECTS_STORE = 'projects';
const META_STORE = 'meta';
const ACTIVE_PROJECT_KEY = 'activeProjectId';

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
        database.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local project storage.'));
    request.onblocked = () => reject(new Error('Project storage upgrade is blocked by another open tab.'));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });

  databasePromise = opening;
  return opening;
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('Project storage transaction was aborted.'));
    transaction.onerror = () => reject(transaction.error || new Error('Project storage transaction failed.'));
  });
}

export async function listStoredProjects(): Promise<StoredProject[]> {
  const database = await openDatabase();
  const transaction = database.transaction(PROJECTS_STORE, 'readonly');
  const request = transaction.objectStore(PROJECTS_STORE).getAll();
  const projects = await new Promise<StoredProject[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredProject[]);
    request.onerror = () => reject(request.error || new Error('Could not list local projects.'));
  });
  await waitForTransaction(transaction);
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getStoredProject(id: string): Promise<StoredProject | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction(PROJECTS_STORE, 'readonly');
  const request = transaction.objectStore(PROJECTS_STORE).get(id);
  const project = await new Promise<StoredProject | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredProject | undefined);
    request.onerror = () => reject(request.error || new Error('Could not load the selected project.'));
  });
  await waitForTransaction(transaction);
  return project;
}

export async function saveStoredProject(project: StoredProject): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(PROJECTS_STORE, 'readwrite');
  transaction.objectStore(PROJECTS_STORE).put({ ...project, updatedAt: Date.now() });
  await waitForTransaction(transaction);
}

export async function deleteStoredProject(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([PROJECTS_STORE, META_STORE], 'readwrite');
  transaction.objectStore(PROJECTS_STORE).delete(id);
  const meta = transaction.objectStore(META_STORE);
  const activeRequest = meta.get(ACTIVE_PROJECT_KEY);
  activeRequest.onsuccess = () => {
    if (activeRequest.result === id) meta.delete(ACTIVE_PROJECT_KEY);
  };
  await waitForTransaction(transaction);
}

export async function getActiveProjectId(): Promise<string | null> {
  const database = await openDatabase();
  const transaction = database.transaction(META_STORE, 'readonly');
  const request = transaction.objectStore(META_STORE).get(ACTIVE_PROJECT_KEY);
  const id = await new Promise<string | null>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as string | undefined) || null);
    request.onerror = () => reject(request.error || new Error('Could not read the active project.'));
  });
  await waitForTransaction(transaction);
  return id;
}

export async function setActiveProjectId(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(META_STORE, 'readwrite');
  transaction.objectStore(META_STORE).put(id, ACTIVE_PROJECT_KEY);
  await waitForTransaction(transaction);
}