import React, { useState } from 'react';
import { AlertTriangle, FolderOpen, Github, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { StoredProject } from '../engine/projectStore';

interface ProjectManagerModalProps {
  isOpen: boolean;
  projects: StoredProject[];
  activeProjectId: string | null;
  isBusy: boolean;
  progress: string;
  error: string | null;
  onClose: () => void;
  onCreateProject: () => void;
  onSwitchProject: (project: StoredProject) => void;
  onDeleteProject: (project: StoredProject) => void;
  onImportGithub: (url: string, runAfterImport: boolean) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  projects,
  activeProjectId,
  isBusy,
  progress,
  error,
  onClose,
  onCreateProject,
  onSwitchProject,
  onDeleteProject,
  onImportGithub,
}) => {
  const [githubUrl, setGithubUrl] = useState('');
  const [runAfterImport, setRunAfterImport] = useState(false);

  if (!isOpen) return null;

  const handleImport = (event: React.FormEvent) => {
    event.preventDefault();
    if (!githubUrl.trim() || isBusy) return;
    onImportGithub(githubUrl, runAfterImport);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-manager-title"
        className="w-full max-w-2xl rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <header className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <h2 id="project-manager-title" className="text-sm font-semibold text-zinc-100">Projects</h2>
            <span className="text-[11px] text-zinc-500">Stored in this browser</span>
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} aria-label="Close project manager" className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Your workspaces</h3>
              <p className="text-[11px] text-zinc-500 mt-1">Files, chats, and snapshots stay on this device.</p>
            </div>
            <button type="button" onClick={onCreateProject} disabled={isBusy} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" /> New project
            </button>
          </div>

          <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 max-h-56 overflow-y-auto">
            {projects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <div key={project.id} className={`flex items-center gap-3 px-3 py-2.5 ${isActive ? 'bg-emerald-950/25' : 'bg-zinc-950/60'}`}>
                  <button type="button" onClick={() => onSwitchProject(project)} disabled={isBusy || isActive} className="flex-1 min-w-0 text-left disabled:cursor-default">
                    <span className="block truncate text-xs font-medium text-zinc-100">{project.name}</span>
                    <span className="block truncate text-[10px] text-zinc-500 mt-0.5">
                      {project.source === 'github' ? project.sourceUrl : 'Starter project'}
                      {' · '}{new Date(project.updatedAt).toLocaleString()}
                    </span>
                  </button>
                  {isActive && <span className="text-[10px] text-emerald-300">Open</span>}
                  {!isActive && projects.length > 1 && (
                    <button type="button" onClick={() => onDeleteProject(project)} disabled={isBusy} aria-label={`Delete ${project.name}`} title="Delete project" className="p-1.5 rounded hover:bg-red-950/50 text-zinc-500 hover:text-red-300 disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {projects.length === 0 && <div className="p-4 text-xs text-zinc-500">No saved projects yet.</div>}
          </div>

          <form onSubmit={handleImport} className="border-t border-zinc-800 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-zinc-300" />
              <h3 className="text-xs font-semibold text-zinc-200">Import public GitHub repository</h3>
            </div>
            <input
              type="url"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              placeholder="https://github.com/owner/repository"
              autoComplete="url"
              disabled={isBusy}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <label className="flex items-start gap-2 text-[11px] text-zinc-400 leading-relaxed">
              <input type="checkbox" checked={runAfterImport} onChange={(event) => setRunAfterImport(event.target.checked)} disabled={isBusy} className="mt-0.5 accent-emerald-500" />
              <span>Install dependencies and run this repository after import. This executes its package scripts in the WebContainer.</span>
            </label>
            <div className="flex items-start gap-2 text-[10px] text-amber-300/90">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Imports are limited to 5,000 files, 20 MB per file, and 100 MB total. Environment files are excluded.</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span role="status" className="min-w-0 truncate text-[11px] text-zinc-400">{progress || error || ''}</span>
              <button type="submit" disabled={isBusy || !githubUrl.trim()} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-xs font-medium text-white disabled:opacity-40">
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                {isBusy ? 'Importing...' : 'Import'}
              </button>
            </div>
            {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
          </form>
        </div>
      </section>
    </div>
  );
};