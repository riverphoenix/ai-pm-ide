import { useState, useEffect } from 'react';
import { Project } from '../lib/types';
import { projectsAPI } from '../lib/ipc';

interface ProjectViewProps {
  projectId: string;
}

export default function ProjectView({ projectId }: ProjectViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const proj = await projectsAPI.get(projectId);
      setProject(proj);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Project not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900">
      {/* Top Bar */}
      <div className="h-12 border-b border-slate-700 bg-slate-800/30 flex items-center px-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center">
              <span className="text-sm">📁</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">{project.name}</h1>
              {project.description && (
                <p className="text-[10px] text-slate-500">{project.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors">
            Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/10">
        <div className="text-center max-w-2xl px-8">
          <div className="inline-block p-4 bg-slate-800/40 rounded-xl shadow-xl mb-5 border border-slate-700/30">
            <div className="text-4xl">📁</div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {project.name}
          </h2>

          <p className="text-slate-400 mb-6 text-sm">
            Your AI-powered product workspace
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 bg-slate-800/20 rounded-lg border border-slate-700/30">
              <div className="text-lg mb-1">📄</div>
              <div className="text-xs font-semibold text-white mb-0.5">Documents</div>
              <div className="text-[10px] text-slate-500">Sprint 1</div>
            </div>
            <div className="p-3 bg-slate-800/20 rounded-lg border border-slate-700/30">
              <div className="text-lg mb-1">💬</div>
              <div className="text-xs font-semibold text-white mb-0.5">Chat with Claude</div>
              <div className="text-[10px] text-slate-500">Sprint 2</div>
            </div>
            <div className="p-3 bg-slate-800/20 rounded-lg border border-slate-700/30">
              <div className="text-lg mb-1">🎯</div>
              <div className="text-xs font-semibold text-white mb-0.5">PM Frameworks</div>
              <div className="text-[10px] text-slate-500">Sprint 3</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-md hover:shadow-lg transition-all">
              Get Started
            </button>
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-semibold border border-slate-700 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
