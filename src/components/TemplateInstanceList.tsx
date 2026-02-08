import { useState, useEffect } from 'react';
import { TemplateInstance } from '../lib/types';
import { templatesAPI } from '../lib/ipc';

// Import template definitions to get icons
import riceTemplate from '../templates/definitions/rice.json';
import prdTemplate from '../templates/definitions/prd.json';
import userStoryTemplate from '../templates/definitions/user-story.json';

const TEMPLATE_ICONS: Record<string, string> = {
  'rice': riceTemplate.icon,
  'prd': prdTemplate.icon,
  'user-story': userStoryTemplate.icon,
};

interface TemplateInstanceListProps {
  projectId: string;
  onEdit: (instanceId: string, templateId: string) => void;
  refreshTrigger?: number; // Used to force refresh after save
}

export default function TemplateInstanceList({
  projectId,
  onEdit,
  refreshTrigger,
}: TemplateInstanceListProps) {
  const [instances, setInstances] = useState<TemplateInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadInstances();
  }, [projectId, refreshTrigger]);

  const loadInstances = async () => {
    setLoading(true);
    try {
      const data = await templatesAPI.list(projectId);
      setInstances(data);
    } catch (error) {
      console.error('Failed to load template instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template instance? This cannot be undone.')) {
      return;
    }

    setDeleting(id);
    try {
      await templatesAPI.delete(id);
      await loadInstances(); // Refresh list
    } catch (error) {
      console.error('Failed to delete template instance:', error);
      alert('Failed to delete template. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Saved Templates</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white">Saved Templates</h2>
        <div className="text-xs text-slate-500 mt-1">{instances.length} saved</div>
      </div>

      {/* Instance List */}
      <div className="flex-1 overflow-y-auto">
        {instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-4xl mb-4">📋</div>
            <div className="text-sm text-slate-400 mb-1">No saved templates yet</div>
            <div className="text-xs text-slate-500">
              Create one from the templates on the left
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {instances.map((instance) => (
              <div
                key={instance.id}
                className="group p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg hover:bg-slate-800/60 hover:border-slate-600 transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Template Icon */}
                  <div className="text-xl flex-shrink-0">
                    {TEMPLATE_ICONS[instance.template_id] || '📄'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {instance.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatDate(instance.updated_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(instance.id, instance.template_id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                      title="Edit"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(instance.id)}
                      disabled={deleting === instance.id}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      {deleting === instance.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
