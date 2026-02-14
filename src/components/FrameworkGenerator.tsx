import { useState, useEffect, useRef } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { getFramework } from '../lib/frameworks';
import { contextDocumentsAPI, frameworkOutputsAPI, settingsAPI } from '../lib/ipc';
import { FrameworkDefinition, ContextDocument } from '../lib/types';
import MarkdownWithMermaid from './MarkdownWithMermaid';
import ResizableDivider from './ResizableDivider';

interface FrameworkGeneratorProps {
  projectId: string;
  frameworkId: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export default function FrameworkGenerator({
  projectId,
  frameworkId,
  onSave,
  onCancel,
}: FrameworkGeneratorProps) {
  const [framework, setFramework] = useState<FrameworkDefinition | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [availableDocs, setAvailableDocs] = useState<ContextDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputName, setOutputName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5');
  const [availableModels] = useState<string[]>([
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
  ]);
  const [apiKey, setApiKey] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Chat refinement state
  const [showRefinementChat, setShowRefinementChat] = useState(false);
  const [refinementMessages, setRefinementMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [refinementInput, setRefinementInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [selectedRefinementDocs, setSelectedRefinementDocs] = useState<string[]>([]);

  // Panel resize state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage

  // Add document state
  const [showAddDocPanel, setShowAddDocPanel] = useState(false);
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocUrl, setNewDocUrl] = useState('');

  const handlePanelResize = (deltaX: number) => {
    const containerWidth = window.innerWidth - 260; // Subtract sidebar width
    const deltaPercent = (deltaX / containerWidth) * 100;
    setLeftPanelWidth(prev => Math.max(30, Math.min(70, prev + deltaPercent)));
  };

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const key = await settingsAPI.getDecryptedApiKey();
        if (key) {
          setApiKey(key);
        }
      } catch (err) {
        console.error('Failed to load API key:', err);
      }
    };

    loadApiKey();
  }, []);

  useEffect(() => {
    const loadFramework = () => {
      const fw = getFramework(frameworkId);
      setFramework(fw || null);
      if (fw) {
        setOutputName(`${fw.name} - ${new Date().toLocaleDateString()}`);
      }
    };

    const loadDocs = async () => {
      try {
        const docs = await contextDocumentsAPI.list(projectId);
        setAvailableDocs(docs);
        // Auto-select global docs
        setSelectedDocIds(docs.filter(d => d.is_global).map(d => d.id));
      } catch (err) {
        console.error('Failed to load documents:', err);
      }
    };

    loadFramework();
    loadDocs();
  }, [projectId, frameworkId]);

  // Autoscroll as content generates
  useEffect(() => {
    if (isGenerating && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [generatedContent, isGenerating]);

  const handleGenerate = async () => {
    if (!framework) return;

    console.log('🎯 Generate button clicked', {
      framework: framework.name,
      model: selectedModel,
      documentsSelected: selectedDocIds.length,
      hasApiKey: !!apiKey,
      hasPrompt: !!userPrompt
    });

    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');

    try {
      if (!apiKey) {
        throw new Error('❌ API key not configured. Please go to Settings and add your OpenAI API key.');
      }

      console.log('✅ API key found');

      // Fetch full document content for selected docs
      const selectedDocs = await Promise.all(
        selectedDocIds.map(id => contextDocumentsAPI.get(id))
      );
      const docs = selectedDocs.filter((d): d is ContextDocument => d !== null);

      // Add file content if provided
      if (newDocFile) {
        try {
          console.log('📎 Reading uploaded file:', newDocFile.name);
          const fileContent = await newDocFile.text();
          docs.push({
            id: 'temp-file',
            project_id: projectId,
            name: newDocFile.name,
            type: 'file',
            content: fileContent,
            size_bytes: newDocFile.size,
            created_at: Date.now() / 1000,
            is_global: false
          });
          console.log('✅ File added to context');
        } catch (err) {
          console.error('❌ Failed to read file:', err);
          setError('Failed to read uploaded file');
          setIsGenerating(false);
          return;
        }
      }

      // Fetch URL content if provided
      if (newDocUrl.trim()) {
        try {
          console.log('🔗 Fetching URL:', newDocUrl.trim());
          const response = await fetch('http://127.0.0.1:8000/fetch-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: newDocUrl.trim() }),
          });
          if (response.ok) {
            const data = await response.json();
            docs.push({
              id: 'temp-url',
              project_id: projectId,
              name: newDocUrl.trim(),
              type: 'url',
              content: data.content,
              size_bytes: data.content.length,
              created_at: Date.now() / 1000,
              is_global: false
            });
            console.log('✅ URL content added to context');
          } else {
            console.error('❌ Failed to fetch URL');
            setError('Failed to fetch URL content');
            setIsGenerating(false);
            return;
          }
        } catch (err) {
          console.error('❌ Failed to fetch URL:', err);
          setError('Failed to fetch URL content');
          setIsGenerating(false);
          return;
        }
      }

      console.log(`📚 Loaded ${docs.length} documents for context (including temporary uploads)`);

      const prompt = userPrompt || `Generate a ${framework.name} based on the context provided.`;
      console.log('📝 Using prompt:', prompt.substring(0, 100) + '...');

      // Call STREAMING endpoint
      const url = 'http://127.0.0.1:8000/generate-framework/stream';
      console.log('🌐 Calling streaming endpoint:', url);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          project_id: projectId,
          framework_id: frameworkId,
          context_documents: docs.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            content: d.content,
            url: d.url
          })),
          user_prompt: prompt,
          api_key: apiKey,
          model: selectedModel
        })
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error response:', errorText);
        let errorMessage = 'Failed to generate framework';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';

      console.log('📡 Starting to read stream...');

      if (reader) {
        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('✅ Stream complete. Total chunks:', chunkCount, 'Content length:', streamedContent.length);
            break;
          }

          chunkCount++;
          const chunk = decoder.decode(value);
          console.log(`📦 Chunk ${chunkCount} (${chunk.length} bytes):`, chunk.substring(0, 100));
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              try {
                const event = JSON.parse(data);
                console.log('📨 Event:', event.type, event);

                if (event.type === 'content_block_delta' && event.delta?.text) {
                  streamedContent += event.delta.text;
                  setGeneratedContent(streamedContent);
                  console.log('✍️ Content length now:', streamedContent.length);
                } else if (event.type === 'message_stop') {
                  console.log('✅ Message complete, final length:', streamedContent.length);
                } else if (event.type === 'error') {
                  console.error('❌ Stream error:', event.error);
                  throw new Error(event.error);
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
                if (data.trim() && !(e instanceof SyntaxError)) {
                  console.warn('⚠️ Failed to parse event:', data.substring(0, 100), e);
                }
              }
            }
          }
        }
      } else {
        console.error('❌ No reader available from response');
        throw new Error('No reader available from response');
      }

      if (!streamedContent) {
        throw new Error('No content received from stream');
      }
      // Don't auto-show save dialog - let user click Save button

    } catch (err) {
      // Ignore abort errors (user cancelled)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('⚠️ Generation cancelled by user');
        return;
      }

      console.error('❌ Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      // Show alert if API key is missing
      if (!apiKey) {
        alert('Please configure your OpenAI API key in Settings before generating frameworks.');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setGeneratedContent('');
      setError(null);
      console.log('🛑 Generation cancelled and cleared');
    }
  };

  const handleRefinement = async () => {
    if (!refinementInput.trim() || !framework) return;

    setIsRefining(true);
    setError(null);

    // Add user message to history
    const userMessage = { role: 'user' as const, content: refinementInput };
    setRefinementMessages(prev => [...prev, userMessage]);
    setRefinementInput('');

    try {
      // Load selected documents
      const docs = await Promise.all(
        selectedRefinementDocs.map(id => contextDocumentsAPI.get(id))
      );
      const validDocs = docs.filter((d): d is ContextDocument => d !== null);

      // Build conversation context
      const messages = [
        { role: 'user', content: `Original request: ${userPrompt || `Generate a ${framework.name}`}` },
        { role: 'assistant', content: generatedContent },
        ...refinementMessages.map(m => ({ role: m.role, content: m.content })),
        userMessage
      ];

      // Add document context if any
      let contextPrompt = '';
      if (validDocs.length > 0) {
        contextPrompt = `\n\nContext Documents:\n${validDocs.map(d => `${d.name}:\n${d.content}`).join('\n\n')}`;
      }

      // Stream refinement
      const url = 'http://127.0.0.1:8000/chat/stream';
      abortControllerRef.current = new AbortController();

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          project_id: projectId,
          messages: messages.map(m => ({ role: m.role, content: m.content + (m.role === 'user' && contextPrompt ? contextPrompt : '') })),
          conversation_id: 'refinement-' + Date.now(), // Temporary ID for refinement
          api_key: apiKey,
          model: selectedModel,
          max_tokens: 100000
        })
      });

      console.log('📡 Refinement response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Refinement failed:', response.status, errorText);
        throw new Error(`Failed to get refinement response: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              try {
                const event = JSON.parse(data);
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  assistantResponse += event.delta.text;
                  // Update the last message in real-time
                  setRefinementMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                      newMessages[newMessages.length - 1].content = assistantResponse;
                    } else {
                      newMessages.push({ role: 'assistant', content: assistantResponse });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Update generated content with the latest refinement
      setGeneratedContent(assistantResponse);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('⚠️ Refinement cancelled');
        return;
      }
      console.error('❌ Refinement error:', err);
      setError(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setIsRefining(false);
      abortControllerRef.current = null;
    }
  };

  const handleSaveOutput = async () => {
    if (!framework || !generatedContent) return;

    try {
      await frameworkOutputsAPI.create(
        projectId,
        frameworkId,
        framework.category,
        outputName,
        userPrompt,
        selectedDocIds,
        generatedContent,
        'markdown'
      );
      setShowSaveDialog(false);
      if (onSave) onSave();
    } catch (err) {
      console.error('Failed to save output:', err);
      setError('Failed to save output');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadMarkdown = async () => {
    try {
      const defaultFilename = `${outputName || framework?.name || 'framework'}.md`;
      console.log('📥 Opening save dialog for:', defaultFilename);

      const filePath = await save({
        defaultPath: defaultFilename,
        filters: [{
          name: 'Markdown',
          extensions: ['md']
        }]
      });

      if (!filePath) {
        console.log('⚠️ Save cancelled by user');
        return;
      }

      await writeTextFile(filePath, generatedContent);
      console.log('✅ File saved successfully to:', filePath);
    } catch (err) {
      console.error('❌ Failed to save file:', err);
    }
  };

  if (!framework) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Framework not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700 bg-slate-800/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{framework.icon}</span>
            <div>
              <h2 className="text-sm font-semibold text-white">{framework.name}</h2>
              <p className="text-xs text-slate-400">{framework.description}</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 items-stretch">
        {/* Left Panel: Context Input */}
        <div
          className="flex-shrink-0 flex flex-col border-r border-slate-700 h-full"
          style={{ width: `${leftPanelWidth}%` }}
        >

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* User Prompt */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                What do you want to generate?
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={`e.g., "Prioritize these 3 features for Q2" or "Create a PRD for dark mode"`}
                className="w-full h-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Context Documents */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-300">
                  Context Documents ({selectedDocIds.length} selected)
                </label>
                <button
                  onClick={() => setShowAddDocPanel(!showAddDocPanel)}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {showAddDocPanel ? '✕ Close' : '+ Add Document'}
                </button>
              </div>

              {/* Add Document Panel */}
              {showAddDocPanel && (
                <div className="mb-3 p-3 bg-slate-800/30 border border-slate-700 rounded space-y-3">
                  <div className="text-[10px] text-slate-500 mb-2">
                    Add files or URLs to create new context documents
                  </div>

                  {/* File Upload */}
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1.5 uppercase font-medium">
                      Upload File
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewDocFile(file);
                          }
                        }}
                        className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600 file:cursor-pointer"
                      />
                      {newDocFile && (
                        <button
                          onClick={() => setNewDocFile(null)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* URL Input */}
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1.5 uppercase font-medium">
                      Fetch URL
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newDocUrl}
                        onChange={(e) => setNewDocUrl(e.target.value)}
                        placeholder="https://example.com/document"
                        className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {newDocUrl.trim() && (
                        <button
                          onClick={() => setNewDocUrl('')}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 italic">
                    Note: These will be added as temporary context for this generation only. Save them in Context tab for reuse.
                  </div>
                </div>
              )}

              {availableDocs.length === 0 && !showAddDocPanel ? (
                <div className="text-center py-8 bg-slate-800/40 border border-slate-700 rounded">
                  <div className="text-2xl mb-2">📄</div>
                  <p className="text-xs text-slate-400 mb-3">
                    No context documents yet
                  </p>
                  <button
                    onClick={() => setShowAddDocPanel(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Upload your first document
                  </button>
                </div>
              ) : availableDocs.length > 0 ? (
                <div className="space-y-2">
                  {availableDocs.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-start gap-3 p-3 bg-slate-800/40 border border-slate-700 rounded hover:bg-slate-800/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={(e) => {
                          console.log('📄 Checkbox clicked for:', doc.name, 'checked:', e.target.checked);
                          if (e.target.checked) {
                            const newIds = [...selectedDocIds, doc.id];
                            console.log('✅ Adding document, new selection:', newIds);
                            setSelectedDocIds(newIds);
                          } else {
                            const newIds = selectedDocIds.filter(id => id !== doc.id);
                            console.log('❌ Removing document, new selection:', newIds);
                            setSelectedDocIds(newIds);
                          }
                        }}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">
                            {doc.name}
                          </span>
                          {doc.is_global && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                              Global
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="capitalize">{doc.type}</span>
                          <span>•</span>
                          <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Guiding Questions */}
            {framework.guiding_questions.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Guiding Questions
                </label>
                <div className="bg-slate-800/40 border border-slate-700 rounded p-3 space-y-1">
                  {framework.guiding_questions.map((question, idx) => (
                    <div key={idx} className="text-xs text-slate-400">
                      • {question}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex-shrink-0 border-t border-slate-700 p-4">
            {error && (
              <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Model Selector */}
            <div className="mb-3 flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isGenerating}
                className="flex-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model === 'gpt-5' ? '🌟 GPT-5' :
                     model === 'gpt-5-mini' ? '⚡ GPT-5 Mini' :
                     model === 'gpt-5-nano' ? '💨 GPT-5 Nano' : model}
                  </option>
                ))}
              </select>
            </div>

            {isGenerating ? (
              <button
                onClick={handleCancel}
                className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
              >
                🛑 Stop Generation
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded transition-colors"
              >
                Generate {framework.name}
              </button>
            )}
          </div>
        </div>

        {/* Resizable Divider */}
        <ResizableDivider onResize={handlePanelResize} />

        {/* Right Panel: Output Preview - Scrollable */}
        <div
          className="flex-shrink-0 flex flex-col bg-slate-900 h-full overflow-x-hidden"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          {!generatedContent ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-8">
                <div className="text-3xl mb-3">{framework.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  {isGenerating ? 'Generating...' : 'Ready to Generate'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isGenerating
                    ? 'AI is creating your framework output...'
                    : 'Click Generate to create your framework (context documents optional)'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 border-b border-slate-700 bg-slate-800/30 px-6 py-3 flex items-center justify-between">
                <h3 className="text-xs font-medium text-slate-300">Generated Output</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyToClipboard}
                    className={`px-2 py-1 text-xs transition-colors ${
                      copied
                        ? 'text-green-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Copy to clipboard"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                    title="Download as markdown"
                  >
                    ⬇️ Download
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div ref={contentRef} className={`${showRefinementChat ? 'flex-[2]' : 'flex-1'} overflow-y-auto p-6`}>
                <MarkdownWithMermaid content={generatedContent} />
              </div>

              {/* Refinement Chat Toggle */}
              {!showRefinementChat && !isGenerating && (
                <div className="flex-shrink-0 border-t border-slate-700 p-3 bg-slate-800/20">
                  <button
                    onClick={() => setShowRefinementChat(true)}
                    className="w-full px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-sm font-medium rounded transition-colors"
                  >
                    💬 Refine Output
                  </button>
                </div>
              )}

              {/* Refinement Chat Interface */}
              {showRefinementChat && (
                <div className="flex-1 flex flex-col border-t border-slate-700 bg-slate-800/10 min-h-0">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {refinementMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-200'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="flex-shrink-0 p-4 border-t border-slate-700">
                    {/* Document Selection */}
                    <div className="mb-2 flex gap-2 flex-wrap">
                      {availableDocs.map(doc => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            if (selectedRefinementDocs.includes(doc.id)) {
                              setSelectedRefinementDocs(prev => prev.filter(id => id !== doc.id));
                            } else {
                              setSelectedRefinementDocs(prev => [...prev, doc.id]);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            selectedRefinementDocs.includes(doc.id)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          📄 {doc.name}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={refinementInput}
                        onChange={(e) => setRefinementInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isRefining && handleRefinement()}
                        placeholder="Ask for changes or clarifications..."
                        disabled={isRefining}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <button
                        onClick={handleRefinement}
                        disabled={isRefining || !refinementInput.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                      >
                        {isRefining ? '...' : 'Send'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRefinementChat(false);
                          setRefinementMessages([]);
                          setRefinementInput('');
                        }}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-96">
            <h3 className="text-sm font-semibold text-white mb-4">Save Framework Output</h3>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="Output name"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOutput}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
