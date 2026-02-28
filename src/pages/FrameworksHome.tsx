import { useState, useEffect, useMemo, useCallback } from 'react';
import { getCategories, searchFrameworks, getFrameworkStats } from '../lib/frameworks';
import { FrameworkCategory, FrameworkDefinition } from '../lib/types';

interface FrameworksHomeProps {
  onSelectFramework: (frameworkId: string, categoryId: string) => void;
  onManage?: () => void;
}

export default function FrameworksHome({ onSelectFramework, onManage }: FrameworksHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<FrameworkCategory[]>([]);
  const [stats, setStats] = useState({ totalFrameworks: 0, totalCategories: 0, visualFrameworks: 0, frameworksByCategory: [] as { category: string; count: number }[] });
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<FrameworkDefinition[] | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, s] = await Promise.all([getCategories(), getFrameworkStats()]);
      setCategories(cats);
      setStats(s);
    } catch (err) {
      console.error('Failed to load frameworks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    searchFrameworks(searchQuery).then(results => {
      if (!cancelled) setSearchResults(results);
    });
    return () => { cancelled = true; };
  }, [searchQuery]);

  const filteredContent = useMemo(() => {
    if (!searchQuery.trim() || !searchResults) {
      return { categories, showingResults: false };
    }

    const resultsGrouped: FrameworkCategory[] = categories.map(cat => ({
      ...cat,
      frameworks: searchResults.filter(f => f.category === cat.id)
    })).filter(cat => cat.frameworks.length > 0);

    return { categories: resultsGrouped, showingResults: true };
  }, [searchQuery, searchResults, categories]);

  const selectedCategory = selectedCategoryId
    ? categories.find(cat => cat.id === selectedCategoryId)
    : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="bg-codex-bg">
        <div className="h-full flex items-center justify-center">
          <div className="text-codex-text-secondary">Loading frameworks...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="bg-codex-bg">
      {/* Header */}
      <div style={{ flexShrink: 0 }} className="px-8 pt-8 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="text-sm text-codex-text-secondary hover:text-codex-text-primary transition-colors mb-2 block"
              >
                ← Back
              </button>
            )}
            <h1 className="text-2xl font-semibold text-codex-text-primary">
              {selectedCategory ? selectedCategory.name : 'Frameworks'}
            </h1>
            <p className="text-sm text-codex-text-secondary mt-1">
              {selectedCategory
                ? `${selectedCategory.frameworks.length} frameworks in this category`
                : `${stats.totalFrameworks} frameworks across ${stats.totalCategories} categories. ${stats.visualFrameworks} with visual generation.`
              }
            </p>
          </div>
          {onManage && (
            <button
              onClick={onManage}
              className="px-3 py-1.5 text-xs text-codex-text-secondary hover:text-codex-text-primary bg-codex-surface border border-codex-border rounded-md transition-colors"
            >
              Manage
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search frameworks..."
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

        {filteredContent.showingResults && (
          <div className="mt-2 text-xs text-codex-text-muted">
            Found {filteredContent.categories.reduce((sum, cat) => sum + cat.frameworks.length, 0)} frameworks
          </div>
        )}
      </div>

      {/* Categories Grid */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="px-8 pb-8">
        {selectedCategory ? (
          // Show frameworks in selected category
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCategory.frameworks.map((framework) => (
                <div
                  key={framework.id}
                  onClick={() => onSelectFramework(framework.id, selectedCategory.id)}
                  className="bg-codex-surface/60 border border-codex-border rounded-lg p-5 hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{framework.icon}</span>
                      <h3 className="text-sm font-semibold text-codex-text-primary">
                        {framework.name}
                      </h3>
                    </div>
                    {framework.supports_visuals && (
                      <span className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                        Visuals
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-codex-text-muted leading-relaxed">
                    {framework.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : !filteredContent.showingResults ? (
          // Show category cards + all frameworks below
          <div className="max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-codex-surface/60 border border-codex-border rounded-lg p-5 hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    if (category.frameworks.length === 1) {
                      onSelectFramework(category.frameworks[0].id, category.id);
                    } else if (category.frameworks.length > 1) {
                      setSelectedCategoryId(category.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{category.icon}</div>
                    <div className="px-2 py-1 bg-codex-surface/50 rounded text-xs font-medium text-codex-text-secondary">
                      {category.frameworks.length}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-codex-text-primary mb-1 group-hover:text-codex-accent transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-[10px] text-codex-text-muted leading-relaxed">
                    {category.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-codex-border pt-6">
              <h2 className="text-sm font-semibold text-codex-text-primary mb-4">
                All Frameworks ({stats.totalFrameworks})
              </h2>
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{category.icon}</span>
                      <h3 className="text-xs font-medium text-codex-text-secondary">{category.name}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-7">
                      {category.frameworks.map((framework) => (
                        <div
                          key={framework.id}
                          onClick={() => onSelectFramework(framework.id, category.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-codex-surface/40 border border-codex-border rounded hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all cursor-pointer"
                        >
                          <span className="text-base">{framework.icon}</span>
                          <span className="text-xs text-codex-text-primary truncate">{framework.name}</span>
                          {framework.supports_visuals && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded ml-auto flex-shrink-0">V</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Show search results grouped by category
          <div className="max-w-4xl space-y-6">
            {filteredContent.categories.map((category) => (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{category.icon}</span>
                  <h2 className="text-sm font-semibold text-codex-text-primary">{category.name}</h2>
                  <span className="text-xs text-codex-text-muted">
                    ({category.frameworks.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.frameworks.map((framework) => (
                    <div
                      key={framework.id}
                      onClick={() => onSelectFramework(framework.id, category.id)}
                      className="bg-codex-surface/60 border border-codex-border rounded-lg p-4 hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{framework.icon}</span>
                          <h3 className="text-sm font-semibold text-codex-text-primary">
                            {framework.name}
                          </h3>
                        </div>
                        {framework.supports_visuals && (
                          <span className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                            Visuals
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-codex-text-muted">
                        {framework.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredContent.showingResults && filteredContent.categories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-sm font-semibold text-codex-text-primary mb-1">No frameworks found</h3>
            <p className="text-[10px] text-codex-text-muted">
              Try a different search term
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
