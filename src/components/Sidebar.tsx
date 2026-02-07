import { useState, useEffect } from 'react';
import { Project } from '../lib/types';
import { projectsAPI } from '../lib/ipc';

interface SidebarProps {
  onProjectSelect: (projectId: string) => void;
  currentProjectId: string | null;
}

export default function Sidebar({ onProjectSelect, currentProjectId }: SidebarProps) {
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

    try {
      const project = await projectsAPI.create(newProjectName);
      setProjects([project, ...projects]);
      setNewProjectName('');
      setIsCreating(false);
      onProjectSelect(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div className="w-52 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
            <span className="text-xs">🚀</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-semibold text-white">AI PM IDE</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Projects</p>
          </div>
        </div>
      </div>

      <div className="p-2">
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
          >
            <span className="text-sm">+</span>
            <span>New Project</span>
          </button>
        ) : (
          <div className="space-y-1.5">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              placeholder="Project name..."
              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded text-[10px] font-medium transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                }}
                className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white rounded text-[10px] font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {projects.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-2xl mb-2">📁</div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              No projects yet.<br/>Create one to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 px-1.5">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onProjectSelect(project.id)}
                className={`group w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  currentProjectId === project.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    currentProjectId === project.id
                      ? 'bg-white'
                      : 'bg-slate-600 group-hover:bg-indigo-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-[11px]">{project.name}</div>
                    {project.description && (
                      <div className={`text-[10px] truncate mt-0.5 ${
                        currentProjectId === project.id
                          ? 'text-indigo-200'
                          : 'text-slate-500 group-hover:text-slate-400'
                      }`}>
                        {project.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-2 py-1.5 border-t border-slate-700 bg-slate-900/30">
        <div className="flex items-center justify-between text-[10px]">
          <div className="text-slate-500">
            <div className="font-medium text-slate-400">AI PM IDE</div>
            <div className="mt-0.5 text-slate-600">v0.1.0-alpha</div>
          </div>
          <div className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[9px] font-medium">
            Sprint 1
          </div>
        </div>
      </div>
    </div>
  );
}
