import { useState, useEffect } from 'react';
import { TemplateDefinition } from '../lib/types';

interface TemplateLibraryProps {
  onSelectTemplate: (templateId: string) => void;
}

// Template definitions - in MVP we'll import them directly
// In future versions, could be loaded dynamically
import riceTemplate from '../templates/definitions/rice.json';
import prdTemplate from '../templates/definitions/prd.json';
import userStoryTemplate from '../templates/definitions/user-story.json';

const TEMPLATES: TemplateDefinition[] = [
  riceTemplate as TemplateDefinition,
  prdTemplate as TemplateDefinition,
  userStoryTemplate as TemplateDefinition,
];

export default function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateDefinition[]>(TEMPLATES);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTemplates(TEMPLATES);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTemplates(
        TEMPLATES.filter(
          (template) =>
            template.name.toLowerCase().includes(query) ||
            template.description.toLowerCase().includes(query) ||
            template.category.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery]);

  // Group templates by category
  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, TemplateDefinition[]>);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-3">Templates</h2>
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Template Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(templatesByCategory).map(([category, templates]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {category}
            </h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template.id)}
                  className="w-full text-left p-4 bg-slate-800/40 border border-slate-700/30 rounded-lg hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                        {template.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {template.description}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-sm text-slate-400">No templates found</div>
            <div className="text-xs text-slate-500 mt-1">Try a different search term</div>
          </div>
        )}
      </div>
    </div>
  );
}
