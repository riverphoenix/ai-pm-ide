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
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700 bg-slate-800/30 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategoryId(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white mb-1">
                {selectedCategory ? selectedCategory.name : 'PM Frameworks'}
              </h1>
              <p className="text-xs text-slate-400">
                {selectedCategory
                  ? `${selectedCategory.frameworks.length} frameworks in this category`
                  : `${stats.totalFrameworks} frameworks across ${stats.totalCategories} categories`
                }
              </p>
            </div>
          </div>
          {!selectedCategory && (
            <div className="text-xs text-slate-500">
              {stats.visualFrameworks} with visual generation
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search frameworks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {filteredContent.showingResults && (
          <div className="mt-2 text-xs text-slate-400">
            Found {filteredContent.categories.reduce((sum, cat) => sum + cat.frameworks.length, 0)} frameworks
          </div>
        )}
      </div>

      {/* Categories Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedCategory ? (
          // Show frameworks in selected category
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCategory.frameworks.map((framework) => (
                <div
                  key={framework.id}
                  onClick={() => onSelectFramework(framework.id, selectedCategory.id)}
                  className="bg-slate-800/40 border border-slate-700 rounded-lg p-5 hover:bg-slate-800/60 hover:border-indigo-500/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{framework.icon}</span>
                      <h3 className="text-sm font-semibold text-white">
                        {framework.name}
                      </h3>
                    </div>
                    {framework.supports_visuals && (
                      <span className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                        Visuals
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
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
                className="bg-slate-800/40 border border-slate-700 rounded-lg p-5 hover:bg-slate-800/60 hover:border-indigo-500/50 transition-all cursor-pointer group"
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
                  <div className="px-2 py-1 bg-slate-700/50 rounded text-xs font-medium text-slate-300">
                    {category.frameworks.length} frameworks
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {category.description}
                </p>
                {category.frameworks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex flex-wrap gap-1">
                      {category.frameworks.slice(0, 3).map((fw) => (
                        <span
                          key={fw.id}
                          className="text-[10px] px-2 py-1 bg-slate-700/30 text-slate-400 rounded"
                        >
                          {fw.name}
                        </span>
                      ))}
                      {category.frameworks.length > 3 && (
                        <span className="text-[10px] px-2 py-1 text-slate-500">
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
                  <h2 className="text-sm font-semibold text-white">{category.name}</h2>
                  <span className="text-xs text-slate-500">
                    ({category.frameworks.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.frameworks.map((framework) => (
                    <div
                      key={framework.id}
                      onClick={() => onSelectFramework(framework.id, category.id)}
                      className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/60 hover:border-indigo-500/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{framework.icon}</span>
                          <h3 className="text-sm font-semibold text-white">
                            {framework.name}
                          </h3>
                        </div>
                        {framework.supports_visuals && (
                          <span className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                            Visuals
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
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
            <h3 className="text-sm font-semibold text-white mb-1">No frameworks found</h3>
            <p className="text-xs text-slate-400">
              Try a different search term
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
