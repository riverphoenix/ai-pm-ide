import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopActionBar from './components/TopActionBar';
import ProjectView from './pages/ProjectView';
import Settings from './pages/Settings';
import ResizableDivider from './components/ResizableDivider';
import { projectsAPI } from './lib/ipc';

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

  // Get current project name for TopActionBar
  const [currentProjectName, setCurrentProjectName] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>('gpt-5');

  useEffect(() => {
    if (currentProjectId) {
      projectsAPI.list().then(projects => {
        const project = projects.find(p => p.id === currentProjectId);
        if (project) {
          setCurrentProjectName(project.name);
        }
      });
    } else {
      setCurrentProjectName('');
    }
  }, [currentProjectId]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }} className="bg-codex-bg text-codex-text-primary">
      <Sidebar
        onProjectSelect={handleProjectSelect}
        onSettingsClick={handleSettingsClick}
        onHomeClick={handleHomeClick}
        currentProjectId={currentProjectId}
        currentView={currentView}
        width={sidebarWidth}
      />
      <ResizableDivider onResize={handleSidebarResize} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <TopActionBar
          projectName={currentProjectName}
          currentModel={currentModel}
          onOpenFile={() => {/* TODO: Implement */}}
          onCommit={() => {/* TODO: Implement */}}
          onToggleTerminal={() => {/* TODO: Implement */}}
          onToggleIDE={() => {/* TODO: Implement */}}
        />
        {currentView === 'project' && currentProjectId ? (
          <ProjectView
            key={`${currentProjectId}-${initialTab}`}
            projectId={currentProjectId}
            initialTab={initialTab}
            onModelChange={setCurrentModel}
          />
        ) : currentView === 'settings' ? (
          <Settings />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-codex-bg via-codex-surface to-codex-accent/5">
          <div className="text-center max-w-2xl px-8">
            <button
              onClick={handleHomeClick}
              className="inline-block p-5 bg-codex-surface/60 rounded-2xl shadow-xl mb-6 backdrop-blur-sm border border-codex-border hover:bg-codex-surface-hover transition-all duration-200 cursor-pointer"
            >
              <div className="text-5xl">🚀</div>
            </button>

            <h1
              onClick={handleHomeClick}
              className="text-3xl font-bold mb-3 bg-gradient-to-r from-codex-text-primary via-indigo-200 to-purple-300 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity duration-200"
            >
              Welcome to AI PM IDE
            </h1>

            <p className="text-codex-text-secondary mb-8 text-sm leading-relaxed max-w-lg mx-auto">
              Your AI-powered workspace for Product Management. Build better products with
              AI assistance, manage context across projects, and apply PM frameworks seamlessly.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => {
                  console.log('💬 AI Chat button clicked');
                  // Navigate to first project's chat tab (create if needed)
                  const createAndNavigate = async () => {
                    try {
                      let projects = await projectsAPI.list();
                      console.log('📊 Projects loaded:', projects?.length || 0);

                      // If no projects exist, create a default one
                      if (!projects || projects.length === 0) {
                        console.log('🆕 No projects found, creating default project...');
                        const newProject = await projectsAPI.create('My First Project');

                        if (!newProject || !newProject.id) {
                          console.error('❌ Failed to create project:', newProject);
                          alert('Failed to create project. Please check that the app is running correctly.');
                          return;
                        }

                        console.log('✅ Created project:', newProject.id);
                        handleProjectSelect(newProject.id, 'chat');
                      } else {
                        console.log('✅ Calling handleProjectSelect with chat tab');
                        handleProjectSelect(projects[0].id, 'chat');
                      }
                    } catch (e) {
                      console.error('Failed to navigate:', e);
                    }
                  };
                  createAndNavigate();
                }}
                className="p-4 bg-codex-surface/40 rounded-lg border border-codex-border hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all duration-200 cursor-pointer text-left"
              >
                <div className="text-xl mb-2">💬</div>
                <div className="text-xs font-semibold text-codex-text-primary mb-1">AI Chat</div>
                <div className="text-[10px] text-codex-text-muted leading-relaxed">
                  Chat with GPT about your product strategy
                </div>
              </button>
              <button
                onClick={() => {
                  console.log('🎯 PM Frameworks button clicked');
                  // Navigate to first project's frameworks tab (create if needed)
                  const createAndNavigate = async () => {
                    try {
                      let projects = await projectsAPI.list();
                      console.log('📊 Projects loaded:', projects?.length || 0);

                      // If no projects exist, create a default one
                      if (!projects || projects.length === 0) {
                        console.log('🆕 No projects found, creating default project...');
                        const newProject = await projectsAPI.create('My First Project');

                        if (!newProject || !newProject.id) {
                          console.error('❌ Failed to create project:', newProject);
                          alert('Failed to create project. Please check that the app is running correctly.');
                          return;
                        }

                        console.log('✅ Created project:', newProject.id);
                        handleProjectSelect(newProject.id, 'frameworks');
                      } else {
                        console.log('✅ Calling handleProjectSelect with frameworks tab');
                        handleProjectSelect(projects[0].id, 'frameworks');
                      }
                    } catch (e) {
                      console.error('Failed to navigate:', e);
                    }
                  };
                  createAndNavigate();
                }}
                className="p-4 bg-codex-surface/40 rounded-lg border border-codex-border hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all duration-200 cursor-pointer text-left"
              >
                <div className="text-xl mb-2">🎯</div>
                <div className="text-xs font-semibold text-codex-text-primary mb-1">PM Frameworks</div>
                <div className="text-[10px] text-codex-text-muted leading-relaxed">
                  Apply Strategy, RICE, JTBD and 40+ frameworks
                </div>
              </button>
              <button
                onClick={() => {
                  // Workflows coming soon
                  alert('Workflows feature coming in Phase 4!');
                }}
                className="p-4 bg-codex-surface/40 rounded-lg border border-codex-border hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all duration-200 cursor-pointer text-left opacity-50"
              >
                <div className="text-xl mb-2">⚡</div>
                <div className="text-xs font-semibold text-codex-text-primary mb-1">Workflows</div>
                <div className="text-[10px] text-codex-text-muted leading-relaxed">
                  Automate repetitive PM tasks (Coming Soon)
                </div>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="text-lg">👈</span>
              <span className="text-xs text-codex-text-muted font-medium">Create your first project to get started</span>
            </div>

            <div className="pt-6 border-t border-codex-border">
              <div className="flex items-center justify-center gap-6 text-[10px] text-codex-text-muted">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Phase 1: UI Redesign</span>
                </div>
                <div>Mac Desktop</div>
                <div>Tauri + React</div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default App;
