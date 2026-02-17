import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import TopActionBar from './components/TopActionBar';
import ProjectView from './pages/ProjectView';
import Settings from './pages/Settings';
import ResizableDivider from './components/ResizableDivider';
import { projectsAPI } from './lib/ipc';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import CommandPalette from './components/CommandPalette';
import BottomPanel from './components/BottomPanel';
import { Command } from './lib/commandRegistry';

type View = 'welcome' | 'project' | 'settings';
type Tab = 'documents' | 'chat' | 'frameworks' | 'context' | 'outputs';

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 208;

const MIN_BOTTOM_PANEL_HEIGHT = 100;
const MAX_BOTTOM_PANEL_RATIO = 0.5;
const DEFAULT_BOTTOM_PANEL_HEIGHT = 200;

function App() {
  const [currentView, setCurrentView] = useState<View>('welcome');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [bottomPanelVisible, setBottomPanelVisible] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState<number>(() => {
    const saved = localStorage.getItem('bottomPanelHeight');
    return saved ? parseInt(saved, 10) : DEFAULT_BOTTOM_PANEL_HEIGHT;
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const handleProjectSelect = (projectId: string, tab: Tab = 'chat') => {
    setCurrentProjectId(projectId);
    setActiveTab(tab);
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

  const handleBottomPanelResize = (delta: number) => {
    setBottomPanelHeight((prev) => {
      const maxHeight = window.innerHeight * MAX_BOTTOM_PANEL_RATIO;
      return Math.max(MIN_BOTTOM_PANEL_HEIGHT, Math.min(maxHeight, prev + delta));
    });
  };

  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('bottomPanelHeight', bottomPanelHeight.toString());
  }, [bottomPanelHeight]);

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

  const shortcutHandlers = useMemo(() => ({
    'cmd-palette': () => setCommandPaletteOpen(v => !v),
    'tab-chat': () => { if (currentProjectId) { setActiveTab('chat'); setCurrentView('project'); } },
    'tab-documents': () => { if (currentProjectId) { setActiveTab('documents'); setCurrentView('project'); } },
    'tab-frameworks': () => { if (currentProjectId) { setActiveTab('frameworks'); setCurrentView('project'); } },
    'tab-context': () => { if (currentProjectId) { setActiveTab('context'); setCurrentView('project'); } },
    'tab-outputs': () => { if (currentProjectId) { setActiveTab('outputs'); setCurrentView('project'); } },
    'toggle-terminal': () => setBottomPanelVisible(v => !v),
    'toggle-sidebar': () => setSidebarVisible(v => !v),
  }), [currentProjectId]);

  useKeyboardShortcuts(shortcutHandlers);

  const paletteCommands: Command[] = useMemo(() => [
    { id: 'nav-chat', label: 'Chat', category: 'Navigation', shortcut: '\u23181', keywords: ['conversation', 'ai'], action: () => { if (currentProjectId) { setActiveTab('chat'); setCurrentView('project'); } } },
    { id: 'nav-documents', label: 'Documents', category: 'Navigation', shortcut: '\u23182', keywords: ['files', 'folders'], action: () => { if (currentProjectId) { setActiveTab('documents'); setCurrentView('project'); } } },
    { id: 'nav-frameworks', label: 'Frameworks', category: 'Navigation', shortcut: '\u23183', keywords: ['rice', 'prd', 'jtbd'], action: () => { if (currentProjectId) { setActiveTab('frameworks'); setCurrentView('project'); } } },
    { id: 'nav-context', label: 'Context', category: 'Navigation', shortcut: '\u23184', keywords: ['docs', 'upload'], action: () => { if (currentProjectId) { setActiveTab('context'); setCurrentView('project'); } } },
    { id: 'nav-outputs', label: 'Outputs', category: 'Navigation', shortcut: '\u23185', keywords: ['generated', 'library'], action: () => { if (currentProjectId) { setActiveTab('outputs'); setCurrentView('project'); } } },
    { id: 'panel-terminal', label: 'Toggle Terminal', category: 'Panels', shortcut: '\u2318`', action: () => setBottomPanelVisible(v => !v) },
    { id: 'panel-sidebar', label: 'Toggle Sidebar', category: 'Panels', shortcut: '\u2318B', action: () => setSidebarVisible(v => !v) },
    { id: 'action-settings', label: 'Settings', category: 'Actions', keywords: ['preferences', 'api key'], action: handleSettingsClick },
    { id: 'action-home', label: 'Home', category: 'Actions', keywords: ['welcome', 'dashboard'], action: handleHomeClick },
  ], [currentProjectId]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }} className="bg-codex-bg text-codex-text-primary">
      {sidebarVisible && (
        <>
          <Sidebar
            onProjectSelect={handleProjectSelect}
            onSettingsClick={handleSettingsClick}
            onHomeClick={handleHomeClick}
            currentProjectId={currentProjectId}
            currentView={currentView}
            width={sidebarWidth}
          />
          <ResizableDivider onResize={handleSidebarResize} />
        </>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <TopActionBar
          projectName={currentProjectName}
          currentModel={currentModel}
          onOpenFile={() => {}}
          onCommit={() => {}}
          onToggleTerminal={() => setBottomPanelVisible(v => !v)}
          onToggleIDE={() => {}}
          terminalActive={bottomPanelVisible}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {currentView === 'project' && currentProjectId ? (
            <ProjectView
              key={currentProjectId}
              projectId={currentProjectId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onModelChange={setCurrentModel}
            />
          ) : currentView === 'settings' ? (
            <Settings />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-codex-bg via-codex-surface to-codex-accent/5" style={{ height: '100%' }}>
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
                    const createAndNavigate = async () => {
                      try {
                        let projects = await projectsAPI.list();
                        if (!projects || projects.length === 0) {
                          const newProject = await projectsAPI.create('My First Project');
                          if (!newProject || !newProject.id) {
                            alert('Failed to create project. Please check that the app is running correctly.');
                            return;
                          }
                          handleProjectSelect(newProject.id, 'chat');
                        } else {
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
                    const createAndNavigate = async () => {
                      try {
                        let projects = await projectsAPI.list();
                        if (!projects || projects.length === 0) {
                          const newProject = await projectsAPI.create('My First Project');
                          if (!newProject || !newProject.id) {
                            alert('Failed to create project. Please check that the app is running correctly.');
                            return;
                          }
                          handleProjectSelect(newProject.id, 'frameworks');
                        } else {
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
                    <span>Phase 3: Console</span>
                  </div>
                  <div>Mac Desktop</div>
                  <div>Tauri + React</div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
        {bottomPanelVisible && (
          <>
            <ResizableDivider orientation="horizontal" onResize={handleBottomPanelResize} />
            <BottomPanel
              height={bottomPanelHeight}
              projectId={currentProjectId}
              onClose={() => setBottomPanelVisible(false)}
            />
          </>
        )}
      </div>
      {commandPaletteOpen && (
        <CommandPalette
          commands={paletteCommands}
          onClose={() => setCommandPaletteOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
