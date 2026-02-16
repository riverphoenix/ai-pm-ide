import { useState, useMemo } from 'react';
import { getCategories, searchFrameworks, getFrameworkStats } from '../lib/frameworks';
import { FrameworkCategory } from '../lib/types';

interface FrameworksHomeProps {
  onSelectFramework: (frameworkId: string, categoryId: string) => void;
}

export default function FrameworksHome({ onSelectFramework }: FrameworksHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const categories = getCategories();
  const stats = getFrameworkStats();

  // Filter categories and frameworks based on search
  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) {
      return { categories, showingResults: false };
    }

    const results = searchFrameworks(searchQuery);
    const resultsGrouped: FrameworkCategory[] = categories.map(cat => ({
      ...cat,
      frameworks: results.filter(f => f.category === cat.id)
    })).filter(cat => cat.frameworks.length > 0);

    return { categories: resultsGrouped, showingResults: true };
  }, [searchQuery, categories]);

  const selectedCategory = selectedCategoryId
    ? categories.find(cat => cat.id === selectedCategoryId)
    : null;

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
      <div style={{ flex: 1, overflowY: 'auto' }} className="px-8 pb-8">
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
          // Show category cards when not searching
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-codex-surface/60 border border-codex-border rounded-lg p-5 hover:bg-codex-surface-hover hover:border-codex-accent/50 transition-all duration-200 cursor-pointer group"
                onClick={() => {
                  // If only 1 framework, open it directly
                  if (category.frameworks.length === 1) {
                    onSelectFramework(category.frameworks[0].id, category.id);
                  } else if (category.frameworks.length > 1) {
                    // If multiple frameworks, show category drill-down
                    setSelectedCategoryId(category.id);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{category.icon}</div>
                  <div className="px-2 py-1 bg-codex-surface/50 rounded text-xs font-medium text-codex-text-secondary">
                    {category.frameworks.length} frameworks
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-codex-text-primary mb-1 group-hover:text-codex-accent transition-colors">
                  {category.name}
                </h3>
                <p className="text-[10px] text-codex-text-muted leading-relaxed">
                  {category.description}
                </p>
                {category.frameworks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-codex-border/50">
                    <div className="flex flex-wrap gap-1">
                      {category.frameworks.slice(0, 3).map((fw) => (
                        <span
                          key={fw.id}
                          className="text-[10px] px-2 py-1 bg-codex-surface/30 text-codex-text-secondary rounded"
                        >
                          {fw.name}
                        </span>
                      ))}
                      {category.frameworks.length > 3 && (
                        <span className="text-[10px] px-2 py-1 text-codex-text-muted">
                          +{category.frameworks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
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
