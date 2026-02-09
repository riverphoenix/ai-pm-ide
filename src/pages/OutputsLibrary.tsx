import { useState, useEffect } from 'react';
import { frameworkOutputsAPI } from '../lib/ipc';
import { getFramework } from '../lib/frameworks';
import { FrameworkOutput } from '../lib/types';
import ReactMarkdown from 'react-markdown';

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
    if (!confirm('Are you sure you want to delete this output?')) return;

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

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleDownloadMarkdown = (output: FrameworkOutput) => {
    const blob = new Blob([output.generated_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${output.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="flex-1 flex overflow-hidden">
          {/* Outputs List */}
          <div className="w-96 flex-shrink-0 border-r border-slate-700 overflow-y-auto">
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

          {/* Output Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      📋 Copy
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
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{selectedOutput.generated_content}</ReactMarkdown>
                  </div>
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
  );
}
