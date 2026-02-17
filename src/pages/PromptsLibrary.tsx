import { useState, useEffect, useCallback, useMemo } from 'react';
import { SavedPrompt } from '../lib/types';
import { savedPromptsAPI } from '../lib/ipc';
import PromptEditorModal from '../components/PromptEditorModal';

const PROMPT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'prd', label: 'PRD' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'stories', label: 'Stories' },
  { id: 'communication', label: 'Communication' },
  { id: 'data', label: 'Data' },
  { id: 'prioritization', label: 'Prioritization' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'general', label: 'General' },
];

type SortOption = 'most-used' | 'recent' | 'alpha' | 'favorites';

interface PromptsLibraryProps {
  projectId: string;
}

export default function PromptsLibrary({ projectId: _projectId }: PromptsLibraryProps) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('most-used');
  const [searchResults, setSearchResults] = useState<SavedPrompt[] | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const all = await savedPromptsAPI.list();
      setPrompts(all);
    } catch (err) {
      console.error('Failed to load prompts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    savedPromptsAPI.search(searchQuery).then(results => {
      if (!cancelled) setSearchResults(results);
    });
    return () => { cancelled = true; };
  }, [searchQuery]);

  const filteredPrompts = useMemo(() => {
    let list = searchResults ?? prompts;

    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    switch (sortBy) {
      case 'most-used':
        return [...list].sort((a, b) => b.usage_count - a.usage_count);
      case 'recent':
        return [...list].sort((a, b) => b.created_at - a.created_at);
      case 'alpha':
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case 'favorites':
        return [...list].sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0) || b.usage_count - a.usage_count);
      default:
        return list;
    }
  }, [prompts, searchResults, selectedCategory, sortBy]);

  const handleToggleFavorite = async (prompt: SavedPrompt) => {
    try {
      await savedPromptsAPI.update(prompt.id, { isFavorite: !prompt.is_favorite });
      await loadPrompts();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDuplicate = async (prompt: SavedPrompt) => {
    try {
      await savedPromptsAPI.duplicate(prompt.id, `${prompt.name} (Copy)`);
      await loadPrompts();
    } catch (err) {
      console.error('Failed to duplicate prompt:', err);
    }
  };

  const handleDelete = async (prompt: SavedPrompt) => {
    if (prompt.is_builtin) return;
    try {
      await savedPromptsAPI.delete(prompt.id);
      await loadPrompts();
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  const handleEditorSave = async () => {
    setShowEditor(false);
    setEditingPrompt(null);
    await loadPrompts();
  };

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of prompts) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [prompts]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="bg-codex-bg">
        <div className="h-full flex items-center justify-center">
          <div className="text-codex-text-secondary">Loading prompts...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="bg-codex-bg">
      <div style={{ flexShrink: 0 }} className="px-8 pt-8 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-codex-text-primary">Prompts Library</h1>
            <p className="text-sm text-codex-text-secondary mt-1">
              {prompts.length} saved prompts across {Object.keys(categoryStats).length} categories
            </p>
          </div>
          <button
            onClick={() => { setEditingPrompt(null); setShowEditor(true); }}
            className="px-3 py-1.5 text-xs text-white bg-codex-accent hover:bg-codex-accent/80 rounded-md transition-colors"
          >
            + New Prompt
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-sm placeholder-codex-text-muted focus:outline-none focus:ring-1 focus:ring-codex-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-codex-text-muted hover:text-codex-text-primary"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2 py-2 bg-codex-surface border border-codex-border rounded-md text-codex-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-codex-accent"
          >
            <option value="most-used">Most Used</option>
            <option value="recent">Recently Created</option>
            <option value="alpha">Alphabetical</option>
            <option value="favorites">Favorites First</option>
          </select>
        </div>

        <div className="flex gap-1 flex-wrap">
          {PROMPT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-codex-accent text-white'
                  : 'bg-codex-surface text-codex-text-secondary hover:text-codex-text-primary border border-codex-border'
              }`}
            >
              {cat.label}
              {cat.id !== 'all' && categoryStats[cat.id] ? ` (${categoryStats[cat.id]})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }} className="px-8 pb-8">
        {filteredPrompts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{searchQuery ? '🔍' : '📝'}</div>
            <h3 className="text-sm font-semibold text-codex-text-primary mb-1">
              {searchQuery ? 'No prompts found' : 'No prompts yet'}
            </h3>
            <p className="text-xs text-codex-text-muted mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first reusable prompt template'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => { setEditingPrompt(null); setShowEditor(true); }}
                className="px-4 py-2 text-xs text-white bg-codex-accent hover:bg-codex-accent/80 rounded-md transition-colors"
              >
                Create Prompt
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
            {filteredPrompts.map(prompt => (
              <div
                key={prompt.id}
                className="bg-codex-surface/60 border border-codex-border rounded-lg p-4 hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-codex-text-primary group-hover:text-codex-accent transition-colors flex-1 mr-2">
                    {prompt.name}
                  </h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(prompt); }}
                    className={`text-sm flex-shrink-0 ${prompt.is_favorite ? 'text-yellow-400' : 'text-codex-text-muted hover:text-yellow-400'}`}
                  >
                    {prompt.is_favorite ? '★' : '☆'}
                  </button>
                </div>

                <p className="text-[10px] text-codex-text-muted leading-relaxed mb-3 line-clamp-2">
                  {prompt.description || prompt.prompt_text}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-2 py-0.5 bg-codex-surface/30 text-codex-text-secondary rounded">
                    {prompt.category}
                  </span>
                  {prompt.variables.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
                      {prompt.variables.length} var{prompt.variables.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {prompt.is_builtin && (
                    <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-300 rounded">
                      Built-in
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-codex-border/50">
                  <span className="text-[10px] text-codex-text-muted">
                    Used {prompt.usage_count}x
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingPrompt(prompt); setShowEditor(true); }}
                      className="text-[10px] px-2 py-1 text-codex-text-secondary hover:text-codex-text-primary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(prompt)}
                      className="text-[10px] px-2 py-1 text-codex-text-secondary hover:text-codex-text-primary"
                    >
                      Duplicate
                    </button>
                    {!prompt.is_builtin && (
                      <button
                        onClick={() => handleDelete(prompt)}
                        className="text-[10px] px-2 py-1 text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        <PromptEditorModal
          prompt={editingPrompt}
          onSave={handleEditorSave}
          onClose={() => { setShowEditor(false); setEditingPrompt(null); }}
        />
      )}
    </div>
  );
}
