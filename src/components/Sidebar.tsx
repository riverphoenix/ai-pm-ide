import { useState, useEffect } from 'react';
import { Project } from '../lib/types';
import { projectsAPI } from '../lib/ipc';
import { ask } from '@tauri-apps/plugin-dialog';

interface SidebarProps {
  onProjectSelect: (projectId: string) => void;
  onSettingsClick: () => void;
  onHomeClick: () => void;
  currentProjectId: string | null;
  currentView: 'welcome' | 'project' | 'settings';
  width?: number;
}

export default function Sidebar({
  onProjectSelect,
  onSettingsClick,
  onHomeClick,
  currentProjectId,
  currentView,
  width = 208
}: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await projectsAPI.list();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const duplicateName = projects.some(
      p => p.name.toLowerCase() === newProjectName.trim().toLowerCase()
    );

    if (duplicateName) {
      alert(`A project named "${newProjectName.trim()}" already exists. Please choose a different name.`);
      return;
    }

    try {
      const project = await projectsAPI.create(newProjectName.trim());
      setProjects([project, ...projects]);
      setNewProjectName('');
      setIsCreating(false);
      onProjectSelect(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    const confirmed = await ask(
      `Are you sure you want to delete "${projectName}"? This will permanently delete all chats, outputs, and context documents in this project.`,
      {
        title: 'Delete Project',
        kind: 'warning',
      }
    );

    if (!confirmed) return;

    try {
      await projectsAPI.delete(projectId);
      if (currentProjectId === projectId) {
        onHomeClick();
      }
      await loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  return (
    <div
      className="bg-codex-sidebar flex flex-col flex-shrink-0"
      style={{ width: `${width}px` }}
    >
      {/* Nav Items */}
      <div className="p-3 space-y-0.5">
        {/* New Project */}
        {isCreating ? (
          <div className="mb-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewProjectName('');
                }
              }}
              placeholder="Project name..."
              className="w-full px-3 py-1.5 bg-codex-bg border border-codex-border rounded-md text-sm text-codex-text-primary placeholder-codex-text-dimmed focus:outline-none focus:ring-1 focus:ring-codex-accent"
              autoFocus
            />
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-2 py-1.5 bg-codex-accent hover:bg-codex-accent-hover disabled:opacity-40 text-white rounded-md text-xs transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => { setIsCreating(false); setNewProjectName(''); }}
                className="flex-1 px-2 py-1.5 bg-codex-surface hover:bg-codex-surface-hover text-codex-text-secondary rounded-md text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full px-3 py-2 flex items-center gap-2.5 text-codex-text-primary hover:bg-codex-surface/50 rounded-md transition-colors text-sm"
          >
            <svg className="w-4 h-4 text-codex-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New project</span>
          </button>
        )}
      </div>

      {/* Threads Section */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-xs text-codex-text-muted font-medium uppercase tracking-wide">Threads</span>
        </div>

        <div className="space-y-0.5">
          {projects.map((project) => (
            <div key={project.id} className="group/project relative">
              <button
                onClick={() => onProjectSelect(project.id)}
                className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-md transition-colors text-sm ${
                  currentProjectId === project.id
                    ? 'bg-codex-surface text-codex-text-primary'
                    : 'text-codex-text-secondary hover:bg-codex-surface/50 hover:text-codex-text-primary'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{project.name}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id, project.name);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/project:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                title="Delete project"
              >
                <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="px-3 py-2 text-xs text-codex-text-muted">No threads</div>
          )}
        </div>
      </div>

      {/* Bottom - Settings */}
      <div className="border-t border-codex-border p-3">
        <button
          onClick={onSettingsClick}
          className={`w-full px-3 py-2 flex items-center gap-2.5 rounded-md transition-colors text-sm ${
            currentView === 'settings'
              ? 'bg-codex-surface text-codex-text-primary'
              : 'text-codex-text-secondary hover:bg-codex-surface/50 hover:text-codex-text-primary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
