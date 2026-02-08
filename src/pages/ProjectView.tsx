import { useState, useEffect } from 'react';
import { Project, Settings } from '../lib/types';
import { projectsAPI, settingsAPI } from '../lib/ipc';
import ChatInterface from '../components/ChatInterface';
import ConversationHistory from '../components/ConversationHistory';
import ResizableDivider from '../components/ResizableDivider';
import TemplateLibrary from '../components/TemplateLibrary';
import TemplateEditor from '../components/TemplateEditor';
import TemplateInstanceList from '../components/TemplateInstanceList';

const MIN_HISTORY_WIDTH = 180;
const MAX_HISTORY_WIDTH = 400;
const DEFAULT_HISTORY_WIDTH = 224;

interface ProjectViewProps {
  projectId: string;
}

export default function ProjectView({ projectId }: ProjectViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'chat' | 'templates'>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [historyWidth, setHistoryWidth] = useState<number>(() => {
    const saved = localStorage.getItem('conversationHistoryWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_HISTORY_WIDTH;
  });

  // Templates state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [templatesRefreshTrigger, setTemplatesRefreshTrigger] = useState(0);

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
      console.log('🔑 API Key Check:', {
        exists: !!key,
        length: key?.length || 0,
        startsWithSkAnt: key?.startsWith('sk-ant-') || false,
        preview: key ? `${key.substring(0, 7)}...${key.substring(key.length - 4)}` : 'null'
      });
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

  // Template handlers
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditingInstanceId(null);
  };

  const handleEditInstance = (instanceId: string, templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditingInstanceId(instanceId);
  };

  const handleSaveTemplate = () => {
    setSelectedTemplateId(null);
    setEditingInstanceId(null);
    setTemplatesRefreshTrigger((prev) => prev + 1); // Trigger refresh of instance list
  };

  const handleCancelTemplate = () => {
    setSelectedTemplateId(null);
    setEditingInstanceId(null);
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
          {apiKey && (
            <span className="px-2 py-1 text-[10px] font-medium text-green-400 bg-green-500/10 rounded">
              ✓ API Key Set
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="h-10 border-b border-slate-700 bg-slate-800/20 flex items-center px-4 gap-1">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'documents'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          📄 Documents
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'chat'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'templates'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          🎯 Templates
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'documents' && (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/10 h-full">
            <div className="text-center max-w-md px-8">
              <div className="text-3xl mb-3">📄</div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Documents Coming Soon
              </h3>
              <p className="text-xs text-slate-500">
                Upload PDFs and Markdown files to build your project knowledge base.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <>
            {!apiKey ? (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/10 h-full">
                <div className="text-center max-w-md px-8">
                  <div className="text-3xl mb-3">🔑</div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    API Key Required
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Please set your OpenAI API key in Settings to start chatting with GPT.
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Click the ⚙️ Settings button in the sidebar
                  </p>
                </div>
              </div>
            ) : settings && (
              <div className="flex h-full">
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
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'templates' && (
          <div className="flex h-full">
            {/* Left: Template Library */}
            <div className="w-64 flex-shrink-0 border-r border-slate-700">
              <TemplateLibrary onSelectTemplate={handleSelectTemplate} />
            </div>

            {/* Center: Template Editor (when template selected) */}
            {selectedTemplateId ? (
              <TemplateEditor
                templateId={selectedTemplateId}
                projectId={projectId}
                instanceId={editingInstanceId || undefined}
                onSave={handleSaveTemplate}
                onCancel={handleCancelTemplate}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/10">
                <div className="text-center max-w-md px-8">
                  <div className="text-3xl mb-3">🎯</div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Select a Template
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose a template from the left to get started, or view your saved templates on the right.
                  </p>
                </div>
              </div>
            )}

            {/* Right: Saved Templates List */}
            <div className="w-80 flex-shrink-0 border-l border-slate-700">
              <TemplateInstanceList
                projectId={projectId}
                onEdit={handleEditInstance}
                refreshTrigger={templatesRefreshTrigger}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
