import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ProjectView from './pages/ProjectView';
import Settings from './pages/Settings';
import ResizableDivider from './components/ResizableDivider';

type View = 'welcome' | 'project' | 'settings';

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 208;

function App() {
  const [currentView, setCurrentView] = useState<View>('welcome');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<'documents' | 'chat' | 'frameworks' | 'context' | 'outputs'>('chat');
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });

  const handleProjectSelect = (projectId: string, tab: 'documents' | 'chat' | 'frameworks' | 'context' | 'outputs' = 'chat') => {
    console.log('🔵 handleProjectSelect called:', { projectId, tab });
    setCurrentProjectId(projectId);
    setInitialTab(tab);
    setCurrentView('project');
  };

  const handleSettingsClick = () => {
    setCurrentView('settings');
    setCurrentProjectId(null);
  };

  const handleHomeClick = () => {
    setCurrentView('welcome');
    setCurrentProjectId(null);
  };

  const handleSidebarResize = (deltaX: number) => {
    setSidebarWidth((prev) => {
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, prev + deltaX));
      return newWidth;
    });
  };

  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <Sidebar
        onProjectSelect={handleProjectSelect}
        onSettingsClick={handleSettingsClick}
        onHomeClick={handleHomeClick}
        currentProjectId={currentProjectId}
        currentView={currentView}
        width={sidebarWidth}
      />
      <ResizableDivider onResize={handleSidebarResize} />
      {currentView === 'project' && currentProjectId ? (
        <ProjectView
          key={`${currentProjectId}-${initialTab}`}
          projectId={currentProjectId}
          initialTab={initialTab}
        />
      ) : currentView === 'settings' ? (
        <Settings />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/10">
          <div className="text-center max-w-2xl px-8">
            <button
              onClick={handleHomeClick}
              className="inline-block p-5 bg-slate-800/40 rounded-2xl shadow-xl mb-6 backdrop-blur-sm border border-slate-700/30 hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <div className="text-5xl">🚀</div>
            </button>

            <h1
              onClick={handleHomeClick}
              className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            >
              Welcome to AI PM IDE
            </h1>

            <p className="text-slate-400 mb-8 text-sm leading-relaxed max-w-lg mx-auto">
              Your AI-powered workspace for Product Management. Build better products with
              AI assistance, manage context across projects, and apply PM frameworks seamlessly.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => {
                  console.log('💬 AI Chat button clicked');
                  // Navigate to first project's chat tab
                  const createAndNavigate = async () => {
                    try {
                      const projects = await (window as any).projectsAPI?.list();
                      console.log('📊 Projects loaded:', projects?.length || 0);
                      if (projects && projects.length > 0) {
                        console.log('✅ Calling handleProjectSelect with chat tab');
                        handleProjectSelect(projects[0].id, 'chat');
                      } else {
                        console.log('❌ No projects found');
                      }
                    } catch (e) {
                      console.error('Failed to navigate:', e);
                    }
                  };
                  createAndNavigate();
                }}
                className="p-4 bg-slate-800/20 rounded-lg border border-slate-700/30 hover:bg-slate-800/40 hover:border-indigo-500/30 transition-all cursor-pointer text-left"
              >
                <div className="text-xl mb-2">💬</div>
                <div className="text-xs font-semibold text-white mb-1">AI Chat</div>
                <div className="text-[10px] text-slate-500 leading-relaxed">
                  Chat with GPT about your product strategy
                </div>
              </button>
              <button
                onClick={() => {
                  console.log('🎯 PM Frameworks button clicked');
                  // Navigate to first project's frameworks tab
                  const createAndNavigate = async () => {
                    try {
                      const projects = await (window as any).projectsAPI?.list();
                      console.log('📊 Projects loaded:', projects?.length || 0);
                      if (projects && projects.length > 0) {
                        console.log('✅ Calling handleProjectSelect with frameworks tab');
                        handleProjectSelect(projects[0].id, 'frameworks');
                      } else {
                        console.log('❌ No projects found');
                      }
                    } catch (e) {
                      console.error('Failed to navigate:', e);
                    }
                  };
                  createAndNavigate();
                }}
                className="p-4 bg-slate-800/20 rounded-lg border border-slate-700/30 hover:bg-slate-800/40 hover:border-indigo-500/30 transition-all cursor-pointer text-left"
              >
                <div className="text-xl mb-2">🎯</div>
                <div className="text-xs font-semibold text-white mb-1">PM Frameworks</div>
                <div className="text-[10px] text-slate-500 leading-relaxed">
                  Apply Strategy, RICE, JTBD and 40+ frameworks
                </div>
              </button>
              <button
                onClick={() => {
                  // Workflows coming soon
                  alert('Workflows feature coming in Sprint 4!');
                }}
                className="p-4 bg-slate-800/20 rounded-lg border border-slate-700/30 hover:bg-slate-800/40 hover:border-indigo-500/30 transition-all cursor-pointer text-left opacity-50"
              >
                <div className="text-xl mb-2">⚡</div>
                <div className="text-xs font-semibold text-white mb-1">Workflows</div>
                <div className="text-[10px] text-slate-500 leading-relaxed">
                  Automate repetitive PM tasks (Coming Soon)
                </div>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="text-lg">👈</span>
              <span className="text-xs text-slate-500 font-medium">Create your first project to get started</span>
            </div>

            <div className="pt-6 border-t border-slate-800/50">
              <div className="flex items-center justify-center gap-6 text-[10px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Sprint 1 P0 MVP</span>
                </div>
                <div>Mac Desktop</div>
                <div>Tauri + React</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
