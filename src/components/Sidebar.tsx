import { useState, useEffect } from 'react';
import { Project } from '../lib/types';
import { projectsAPI } from '../lib/ipc';

interface SidebarProps {
  onProjectSelect: (projectId: string) => void;
  onSettingsClick: () => void;
  currentProjectId: string | null;
  currentView: 'welcome' | 'project' | 'settings';
  width?: number;
}

export default function Sidebar({
  onProjectSelect,
  onSettingsClick,
  currentProjectId,
  currentView,
  width = 208
}: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);

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

  const collapsedWidth = 56;
  const expandedWidth = width;

  return (
    <div
      className="bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0 transition-all duration-300"
      style={{ width: isCollapsed ? `${collapsedWidth}px` : `${expandedWidth}px` }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700">
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center"
            title="Expand sidebar"
          >
            <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center hover:bg-indigo-700 transition-colors">
              <span className="text-xs">🚀</span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-xs">🚀</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-semibold text-white">AI PM IDE</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Projects</p>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Collapse sidebar"
            >
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* New Project Button */}
      <div className="p-2">
        {isCollapsed ? (
          <button
            onClick={() => {
              setIsCollapsed(false);
              setIsCreating(true);
            }}
            className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors flex items-center justify-center"
            title="New Project"
          >
            <span className="text-sm">+</span>
          </button>
        ) : !isCreating ? (
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

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto py-1">
        {projects.length === 0 ? (
          <div className={`${isCollapsed ? 'p-2' : 'p-4'} text-center`}>
            <div className={`${isCollapsed ? 'text-lg' : 'text-2xl'} mb-2`}>📁</div>
            {!isCollapsed && (
              <p className="text-slate-500 text-[11px] leading-relaxed">
                No projects yet.<br/>Create one to get started!
              </p>
            )}
          </div>
        ) : isCollapsed ? (
          <div className="space-y-1 px-1.5">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onProjectSelect(project.id)}
                className={`group w-full p-2 rounded transition-colors flex items-center justify-center ${
                  currentProjectId === project.id
                    ? 'bg-indigo-600'
                    : 'hover:bg-slate-700/70'
                }`}
                title={project.name}
              >
                <div className={`w-2 h-2 rounded-full ${
                  currentProjectId === project.id
                    ? 'bg-white'
                    : 'bg-slate-600 group-hover:bg-indigo-400'
                }`} />
              </button>
            ))}
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

      {/* Settings Button */}
      <div className="border-t border-slate-700">
        <button
          onClick={onSettingsClick}
          className={`w-full py-2 text-xs transition-colors ${
            currentView === 'settings'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:bg-slate-700/70 hover:text-white'
          } ${isCollapsed ? 'flex items-center justify-center' : 'px-3 text-left flex items-center gap-2'}`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <span>⚙️</span>
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </button>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-2 py-1.5 border-t border-slate-700 bg-slate-900/30">
          <div className="flex items-center justify-between text-[10px]">
            <div className="text-slate-500">
              <div className="font-medium text-slate-400">AI PM IDE</div>
              <div className="mt-0.5 text-slate-600">v0.1.0-alpha</div>
            </div>
            <div className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[9px] font-medium">
              Sprint 2
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
