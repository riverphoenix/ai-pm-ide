import { useState, useEffect } from 'react';
import { ask, save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { frameworkOutputsAPI } from '../lib/ipc';
import { getFramework } from '../lib/frameworks';
import { FrameworkOutput } from '../lib/types';
import MarkdownWithMermaid from '../components/MarkdownWithMermaid';
import ResizableDivider from '../components/ResizableDivider';

interface OutputsLibraryProps {
  projectId: string;
  onEdit?: (outputId: string) => void;
}

export default function OutputsLibrary({ projectId, onEdit }: OutputsLibraryProps) {
  const [outputs, setOutputs] = useState<FrameworkOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOutput, setSelectedOutput] = useState<FrameworkOutput | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Panel resize state
  const [listWidth, setListWidth] = useState(384); // 384px = 96 * 4 (w-96)

  const handlePanelResize = (deltaX: number) => {
    setListWidth(prev => Math.max(280, Math.min(600, prev + deltaX)));
  };

  useEffect(() => {
    loadOutputs();
  }, [projectId]);

  const loadOutputs = async () => {
    setLoading(true);
    try {
      const data = await frameworkOutputsAPI.list(projectId);
      setOutputs(data);
    } catch (err) {
      console.error('Failed to load outputs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await ask('Are you sure you want to delete this output?', {
      title: 'Confirm Delete',
      kind: 'warning',
    });

    if (!confirmed) return;

    try {
      await frameworkOutputsAPI.delete(id);
      await loadOutputs();
      if (selectedOutput?.id === id) {
        setSelectedOutput(null);
      }
    } catch (err) {
      console.error('Failed to delete output:', err);
    }
  };

  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadMarkdown = async (output: FrameworkOutput) => {
    try {
      const filename = `${output.name}.md`;
      console.log('📥 Opening save dialog for:', filename);

      const filePath = await save({
        defaultPath: filename,
        filters: [{
          name: 'Markdown',
          extensions: ['md']
        }]
      });

      if (!filePath) {
        console.log('⚠️ Save cancelled by user');
        return;
      }

      await writeTextFile(filePath, output.generated_content);
      console.log('✅ File saved successfully to:', filePath);
    } catch (err) {
      console.error('❌ Failed to save file:', err);
    }
  };

  // Filter outputs
  const filteredOutputs = outputs.filter(output => {
    const matchesCategory = filterCategory === 'all' || output.category === filterCategory;
    const matchesSearch = !searchQuery.trim() ||
      output.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      output.generated_content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category
  const categories = Array.from(new Set(outputs.map(o => o.category)));
  const categoryCounts = categories.map(cat => ({
    category: cat,
    count: outputs.filter(o => o.category === cat).length
  }));

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700 bg-slate-800/30 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">
              Framework Outputs
            </h1>
            <p className="text-xs text-slate-400">
              {outputs.length} saved framework outputs
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search outputs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories ({outputs.length})</option>
            {categoryCounts.map(({ category, count }) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400">Loading outputs...</div>
        </div>
      ) : outputs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-8">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-sm font-semibold text-white mb-1">No outputs yet</h3>
            <p className="text-xs text-slate-400">
              Generate your first PM framework to see it here
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 items-stretch">
          {/* Outputs List */}
          <div
            className="flex-shrink-0 border-r border-slate-700 overflow-y-auto"
            style={{ width: `${listWidth}px` }}
          >
            {filteredOutputs.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-slate-400 text-sm">No matching outputs</div>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredOutputs.map((output) => {
                  const framework = getFramework(output.framework_id);
                  const isSelected = selectedOutput?.id === output.id;

                  return (
                    <div
                      key={output.id}
                      onClick={() => setSelectedOutput(output)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/50'
                          : 'bg-slate-800/40 border border-slate-700 hover:bg-slate-800/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        {framework && (
                          <span className="text-lg flex-shrink-0">{framework.icon}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {output.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            {framework && <span>{framework.name}</span>}
                            <span>•</span>
                            <span>{new Date(output.created_at * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      {output.user_prompt && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {output.user_prompt}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resizable Divider */}
          <ResizableDivider onResize={handlePanelResize} />

          {/* Output Preview */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedOutput ? (
              <>
                <div className="flex-shrink-0 border-b border-slate-700 bg-slate-800/30 px-6 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{selectedOutput.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>Created {new Date(selectedOutput.created_at * 1000).toLocaleDateString()}</span>
                      {selectedOutput.updated_at !== selectedOutput.created_at && (
                        <>
                          <span>•</span>
                          <span>Updated {new Date(selectedOutput.updated_at * 1000).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyToClipboard(selectedOutput.generated_content)}
                      className={`px-3 py-1 text-xs transition-colors ${
                        copied
                          ? 'text-green-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Copy to clipboard"
                    >
                      {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    <button
                      onClick={() => handleDownloadMarkdown(selectedOutput)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                      title="Download as markdown"
                    >
                      ⬇️ Download
                    </button>
                    <button
                      onClick={() => handleDelete(selectedOutput.id)}
                      className="px-3 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* User Prompt */}
                {selectedOutput.user_prompt && (
                  <div className="flex-shrink-0 border-b border-slate-700 bg-slate-800/20 px-6 py-3">
                    <div className="text-[10px] font-medium text-slate-500 uppercase mb-1">
                      Prompt
                    </div>
                    <div className="text-xs text-slate-300">
                      {selectedOutput.user_prompt}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div
                  className="flex-1 p-6"
                  style={{
                    minHeight: 0,
                    overflow: 'hidden auto'
                  }}
                >
                  <MarkdownWithMermaid content={selectedOutput.generated_content} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md px-8">
                  <div className="text-3xl mb-3">👈</div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Select an output
                  </h3>
                  <p className="text-xs text-slate-400">
                    Choose an output from the list to view its content
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
