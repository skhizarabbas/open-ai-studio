import React, { useEffect, useState } from 'react';
import { Database, X, CheckCircle2, Trash2, ExternalLink } from 'lucide-react';

export interface ProjectDatabaseConfig {
  provider: 'none' | 'supabase' | 'firebase';
  supabaseUrl: string;
  supabaseAnonKey: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseAppId: string;
}

export const DEFAULT_DB_CONFIG: ProjectDatabaseConfig = {
  provider: 'none',
  supabaseUrl: '',
  supabaseAnonKey: '',
  firebaseApiKey: '',
  firebaseAuthDomain: '',
  firebaseProjectId: '',
  firebaseAppId: '',
};

const DB_STORAGE_KEY = 'open_ai_studio_project_db';

export function loadStoredDbConfig(): ProjectDatabaseConfig {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    return raw ? { ...DEFAULT_DB_CONFIG, ...JSON.parse(raw) } : DEFAULT_DB_CONFIG;
  } catch {
    return DEFAULT_DB_CONFIG;
  }
}

export function saveStoredDbConfig(config: ProjectDatabaseConfig): void {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(config));
}

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProjectDatabaseConfig;
  onSaveAndWire: (config: ProjectDatabaseConfig, autoWirePrompt?: string) => Promise<void>;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveAndWire,
}) => {
  const [tab, setTab] = useState<'supabase' | 'firebase'>(
    config.provider === 'firebase' ? 'firebase' : 'supabase'
  );
  const [form, setForm] = useState<ProjectDatabaseConfig>(config);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(config);
    if (config.provider === 'firebase') setTab('firebase');
    if (config.provider === 'supabase') setTab('supabase');
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (wireWithAi: boolean) => {
    setIsSaving(true);
    try {
      const nextConfig: ProjectDatabaseConfig = {
        ...form,
        provider: tab,
      };
      saveStoredDbConfig(nextConfig);

      const prompt = wireWithAi
        ? tab === 'supabase'
          ? 'Connect our existing app UI to Supabase using the configured client in src/lib/supabase.ts. Create clean CRUD functions, loading states, and include the exact SQL table schema in your summary so I can run it in Supabase SQL Editor.'
          : 'Connect our existing app UI to Firebase Firestore & Auth using the configured client in src/lib/firebase.ts with clean real-time CRUD operations and loading states.'
        : undefined;

      await onSaveAndWire(nextConfig, prompt);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    const cleared: ProjectDatabaseConfig = { ...DEFAULT_DB_CONFIG };
    saveStoredDbConfig(cleared);
    setForm(cleared);
    await onSaveAndWire(cleared);
    onClose();
  };

  const isSupabaseValid = form.supabaseUrl.trim().length > 0 && form.supabaseAnonKey.trim().length > 0;
  const isFirebaseValid =
    form.firebaseApiKey.trim().length > 0 && form.firebaseProjectId.trim().length > 0;
  const canSave = tab === 'supabase' ? isSupabaseValid : isFirebaseValid;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Connect Project Database</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Selector Tabs */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => setTab('supabase')}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                tab === 'supabase'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Supabase (PostgreSQL)</span>
              {config.provider === 'supabase' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setTab('firebase')}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                tab === 'firebase'
                  ? 'bg-amber-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Firebase (Firestore)</span>
              {config.provider === 'firebase' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {tab === 'supabase' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Creates `.env` + `src/lib/supabase.ts` &amp; installs `@supabase/supabase-js`</span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                >
                  Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Project URL</label>
                <input
                  type="text"
                  value={form.supabaseUrl}
                  onChange={(e) => setForm({ ...form, supabaseUrl: e.target.value })}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Anon / Public Key</label>
                <input
                  type="password"
                  value={form.supabaseAnonKey}
                  onChange={(e) => setForm({ ...form, supabaseAnonKey: e.target.value })}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Creates `.env` + `src/lib/firebase.ts` &amp; installs `firebase`</span>
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                >
                  Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">API Key</label>
                  <input
                    type="password"
                    value={form.firebaseApiKey}
                    onChange={(e) => setForm({ ...form, firebaseApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Project ID</label>
                  <input
                    type="text"
                    value={form.firebaseProjectId}
                    onChange={(e) => setForm({ ...form, firebaseProjectId: e.target.value })}
                    placeholder="my-app-12345"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Auth Domain</label>
                  <input
                    type="text"
                    value={form.firebaseAuthDomain}
                    onChange={(e) => setForm({ ...form, firebaseAuthDomain: e.target.value })}
                    placeholder="my-app.firebaseapp.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">App ID</label>
                  <input
                    type="text"
                    value={form.firebaseAppId}
                    onChange={(e) => setForm({ ...form, firebaseAppId: e.target.value })}
                    placeholder="1:123456:web:abcdef"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
            {config.provider !== 'none' ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-xs text-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canSave || isSaving}
                onClick={() => handleSave(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium text-zinc-200"
              >
                Save Config Only
              </button>
              <button
                type="button"
                disabled={!canSave || isSaving}
                onClick={() => handleSave(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white"
              >
                {isSaving ? 'Setting up...' : 'Save & Wire App with AI'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};