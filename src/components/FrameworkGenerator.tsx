import { useState, useEffect } from 'react';
import { getFramework } from '../lib/frameworks';
import { contextDocumentsAPI, frameworkOutputsAPI, settingsAPI } from '../lib/ipc';
import { FrameworkDefinition, ContextDocument } from '../lib/types';
import ReactMarkdown from 'react-markdown';

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

  const handleGenerate = async () => {
    if (!framework) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');

    try {
      const apiKey = await settingsAPI.getDecryptedApiKey();
      if (!apiKey) {
        throw new Error('API key not configured. Please set it in Settings.');
      }

      // Fetch full document content for selected docs
      const selectedDocs = await Promise.all(
        selectedDocIds.map(id => contextDocumentsAPI.get(id))
      );
      const docs = selectedDocs.filter((d): d is ContextDocument => d !== null);

      // Call generate endpoint
      const response = await fetch('http://127.0.0.1:8000/generate-framework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          user_prompt: userPrompt || `Generate a ${framework.name} based on the context provided.`,
          api_key: apiKey,
          model: 'gpt-5'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Generation failed');
      }

      const data = await response.json();
      setGeneratedContent(data.generated_content);
      setShowSaveDialog(true);

    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
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

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outputName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!framework) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Framework not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Context Input */}
        <div className="w-1/2 flex flex-col border-r border-slate-700">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  onClick={() => {/* TODO: Open add document dialog */}}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  + Add Document
                </button>
              </div>

              {availableDocs.length === 0 ? (
                <div className="text-center py-8 bg-slate-800/40 border border-slate-700 rounded">
                  <div className="text-2xl mb-2">📄</div>
                  <p className="text-xs text-slate-400 mb-3">
                    No context documents yet
                  </p>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300">
                    Upload your first document
                  </button>
                </div>
              ) : (
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
                          if (e.target.checked) {
                            setSelectedDocIds([...selectedDocIds, doc.id]);
                          } else {
                            setSelectedDocIds(selectedDocIds.filter(id => id !== doc.id));
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
              )}
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
            <button
              onClick={handleGenerate}
              disabled={isGenerating || selectedDocIds.length === 0}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
            >
              {isGenerating ? 'Generating...' : `Generate ${framework.name}`}
            </button>
          </div>
        </div>

        {/* Right Panel: Output Preview */}
        <div className="w-1/2 flex flex-col bg-slate-900">
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
                    : 'Add context and click Generate to create your framework'}
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
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                    title="Copy to clipboard"
                  >
                    📋 Copy
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
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </div>
              </div>
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
