import { useState, useEffect } from 'react';
import { Project, Settings } from '../lib/types';
import { projectsAPI, settingsAPI } from '../lib/ipc';
import ChatInterface from '../components/ChatInterface';
import ConversationHistory from '../components/ConversationHistory';
import ResizableDivider from '../components/ResizableDivider';
import FrameworksHome from './FrameworksHome';
import FrameworkGenerator from '../components/FrameworkGenerator';
import FrameworkManager from '../components/FrameworkManager';
import ContextManager from './ContextManager';
import OutputsLibrary from './OutputsLibrary';
import DocumentsExplorer from './DocumentsExplorer';
import PromptsLibrary from './PromptsLibrary';
import WorkflowsPage from './WorkflowsPage';
import InsightsPanel from '../components/InsightsPanel';

const MIN_HISTORY_WIDTH = 180;
const MAX_HISTORY_WIDTH = 400;
const DEFAULT_HISTORY_WIDTH = 224;

type Tab = 'documents' | 'chat' | 'frameworks' | 'prompts' | 'context' | 'outputs' | 'workflows';

interface ProjectViewProps {
  projectId: string;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onModelChange?: (model: string) => void;
}

export default function ProjectView({ projectId, activeTab, onTabChange, onModelChange }: ProjectViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [historyWidth, setHistoryWidth] = useState<number>(() => {
    const saved = localStorage.getItem('conversationHistoryWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_HISTORY_WIDTH;
  });

  const [showInsights, setShowInsights] = useState(false);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);
  const [_selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [frameworksView, setFrameworksView] = useState<'home' | 'generator' | 'manager'>('home');

  useEffect(() => {
    loadProjectAndSettings();
  }, [projectId]);

  const loadProjectAndSettings = async () => {
    setLoading(true);
    try {
      const [proj, sett, key] = await Promise.all([
        projectsAPI.get(projectId),
        settingsAPI.get(),
        settingsAPI.getDecryptedApiKey(),
      ]);
      setProject(proj);
      setSettings(sett);
      setApiKey(key);
    } catch (error) {
      console.error('Failed to load project or settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(undefined);
  };

  const handleHistoryResize = (deltaX: number) => {
    setHistoryWidth((prev) => {
      const newWidth = Math.max(MIN_HISTORY_WIDTH, Math.min(MAX_HISTORY_WIDTH, prev + deltaX));
      return newWidth;
    });
  };

  useEffect(() => {
    localStorage.setItem('conversationHistoryWidth', historyWidth.toString());
  }, [historyWidth]);

  const handleSelectFramework = (frameworkId: string, categoryId: string) => {
    setSelectedFrameworkId(frameworkId);
    setSelectedCategoryId(categoryId);
    setFrameworksView('generator');
  };

  const handleBackToFrameworksHome = () => {
    setSelectedFrameworkId(null);
    setSelectedCategoryId(null);
    setFrameworksView('home');
  };

  const handleFrameworkSave = () => {
    onTabChange('outputs');
    handleBackToFrameworksHome();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-codex-bg">
        <div className="text-codex-text-secondary">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-codex-bg">
        <div className="text-codex-text-secondary">Project not found</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="bg-codex-bg">
      {/* Top Bar */}
      <div style={{ flexShrink: 0 }} className="h-10 border-b border-codex-border bg-codex-sidebar flex items-center px-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-codex-accent rounded flex items-center justify-center">
              <span className="text-sm">📁</span>
            </div>
            <div>
              <h1 className="text-sm text-codex-text-primary">{project.name}</h1>
              {project.description && (
                <p className="text-[10px] text-codex-text-muted">{project.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ flexShrink: 0 }} className="h-8 border-b border-codex-border bg-codex-surface/30 flex items-center px-4 gap-1">
        {(['chat', 'documents', 'frameworks', 'prompts', 'context', 'outputs', 'workflows'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => {
              onTabChange(tab);
              if (tab === 'frameworks') handleBackToFrameworksHome();
            }}
            className={`relative px-2 py-1.5 text-xs transition-all duration-200 ${
              activeTab === tab
                ? 'text-codex-text-primary'
                : 'text-codex-text-secondary hover:text-codex-text-primary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-codex-accent" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowInsights(!showInsights)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showInsights ? 'bg-codex-accent/20 text-codex-accent' : 'text-codex-text-secondary hover:text-codex-text-primary'
          }`}
        >
          Insights
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'chat' && (
          <>
            {!apiKey ? (
              <div className="h-full flex items-center justify-center bg-gradient-to-br from-codex-bg via-codex-surface to-codex-accent/5">
                <div className="text-center max-w-md px-8">
                  <div className="text-3xl mb-3">🔑</div>
                  <h3 className="text-sm text-codex-text-primary mb-1">
                    API Key Required
                  </h3>
                  <p className="text-xs text-codex-text-muted mb-4">
                    Please set your OpenAI API key in Settings to start chatting with GPT.
                  </p>
                  <p className="text-[10px] text-codex-text-muted">
                    Click the ⚙️ Settings button in the sidebar
                  </p>
                </div>
              </div>
            ) : settings && (
              <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                <ConversationHistory
                  projectId={projectId}
                  currentConversationId={currentConversationId}
                  onConversationSelect={handleConversationSelect}
                  onNewConversation={handleNewConversation}
                  width={historyWidth}
                />
                <ResizableDivider onResize={handleHistoryResize} />
                <ChatInterface
                  projectId={projectId}
                  conversationId={currentConversationId}
                  apiKey={apiKey}
                  settings={settings}
                  model="gpt-5"
                  onModelChange={onModelChange}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'frameworks' && (
          <>
            {frameworksView === 'home' ? (
              <FrameworksHome
                onSelectFramework={handleSelectFramework}
                onManage={() => setFrameworksView('manager')}
              />
            ) : frameworksView === 'manager' ? (
              <FrameworkManager onClose={handleBackToFrameworksHome} />
            ) : selectedFrameworkId ? (
              <FrameworkGenerator
                projectId={projectId}
                frameworkId={selectedFrameworkId}
                onSave={handleFrameworkSave}
                onCancel={handleBackToFrameworksHome}
              />
            ) : null}
          </>
        )}

        {activeTab === 'documents' && (
          <DocumentsExplorer projectId={projectId} />
        )}

        {activeTab === 'prompts' && (
          <PromptsLibrary projectId={projectId} />
        )}

        {activeTab === 'context' && (
          <ContextManager projectId={projectId} />
        )}

        {activeTab === 'outputs' && (
          <OutputsLibrary projectId={projectId} />
        )}

        {activeTab === 'workflows' && (
          <WorkflowsPage projectId={projectId} apiKey={apiKey} onTabChange={(tab: string) => onTabChange(tab as Tab)} />
        )}
      </div>

      {showInsights && (
        <InsightsPanel
          projectId={projectId}
          apiKey={apiKey}
          onNavigateToFramework={(frameworkId) => {
            setSelectedFrameworkId(frameworkId);
            setFrameworksView('generator');
            onTabChange('frameworks');
            setShowInsights(false);
          }}
          onClose={() => setShowInsights(false)}
        />
      )}
    </div>
  );
}
