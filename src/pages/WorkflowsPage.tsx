import { useState, useEffect } from 'react';
import { Workflow, WorkflowStepDef, FrameworkDefinition } from '../lib/types';
import { workflowsAPI, frameworkDefsAPI } from '../lib/ipc';
import WorkflowEditor from '../components/WorkflowEditor';
import WorkflowRunner from '../components/WorkflowRunner';

interface WorkflowsPageProps {
  projectId: string;
  apiKey: string | null;
  onTabChange: (tab: string) => void;
}

export default function WorkflowsPage({ projectId, apiKey, onTabChange }: WorkflowsPageProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [frameworks, setFrameworks] = useState<FrameworkDefinition[]>([]);
  const [view, setView] = useState<'list' | 'editor' | 'runner'>('list');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wfs, fws] = await Promise.all([
        workflowsAPI.list(projectId),
        frameworkDefsAPI.list(),
      ]);
      setWorkflows(wfs);
      setFrameworks(fws);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const templates = workflows.filter(w => w.is_template);
  const custom = workflows.filter(w => !w.is_template);

  const getStepCount = (w: Workflow) => {
    try {
      const steps: WorkflowStepDef[] = JSON.parse(w.steps);
      return steps.length;
    } catch {
      return 0;
    }
  };

  const getStepFrameworkIcons = (w: Workflow) => {
    try {
      const steps: WorkflowStepDef[] = JSON.parse(w.steps);
      return steps.map(s => {
        const fw = frameworks.find(f => f.id === s.framework_id);
        return fw?.icon || '?';
      });
    } catch {
      return [];
    }
  };

  const handleCreate = () => {
    setSelectedWorkflowId(null);
    setView('editor');
  };

  const handleEdit = (id: string) => {
    setSelectedWorkflowId(id);
    setView('editor');
  };

  const handleRun = (id: string) => {
    setSelectedWorkflowId(id);
    setView('runner');
  };

  const handleDuplicate = async (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;
    try {
      await workflowsAPI.duplicate(id, `${wf.name} (Copy)`, projectId);
      await loadData();
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workflowsAPI.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleEditorSave = async () => {
    await loadData();
    setView('list');
  };

  const handleEditorCancel = () => {
    setView('list');
  };

  const handleRunnerDone = () => {
    setView('list');
  };

  if (view === 'editor') {
    return (
      <WorkflowEditor
        projectId={projectId}
        workflowId={selectedWorkflowId}
        frameworks={frameworks}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
      />
    );
  }

  if (view === 'runner' && selectedWorkflowId) {
    return (
      <WorkflowRunner
        projectId={projectId}
        workflowId={selectedWorkflowId}
        apiKey={apiKey}
        frameworks={frameworks}
        onDone={handleRunnerDone}
        onTabChange={onTabChange}
      />
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-codex-text-secondary">Loading workflows...</span>
      </div>
    );
  }

  const renderCard = (w: Workflow, isTemplate: boolean) => {
    const stepCount = getStepCount(w);
    const icons = getStepFrameworkIcons(w);

    return (
      <div
        key={w.id}
        className="p-4 bg-codex-surface/40 border border-codex-border rounded-lg hover:border-codex-accent/30 transition-all"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-codex-text-primary truncate">{w.name}</h3>
            <p className="text-xs text-codex-text-muted mt-0.5 line-clamp-2">{w.description}</p>
          </div>
          {isTemplate && (
            <span className="ml-2 px-1.5 py-0.5 text-[9px] bg-codex-accent/20 text-codex-accent rounded">Template</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          {icons.map((icon, i) => (
            <span key={i} className="flex items-center">
              <span className="text-xs">{icon}</span>
              {i < icons.length - 1 && <span className="text-[10px] text-codex-text-muted ml-1">→</span>}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-codex-text-muted">{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleRun(w.id)}
              disabled={!apiKey}
              className="px-2 py-1 text-[10px] bg-codex-accent text-white rounded hover:bg-codex-accent/80 disabled:opacity-50"
            >
              Run
            </button>
            <button
              onClick={() => handleEdit(w.id)}
              className="px-2 py-1 text-[10px] border border-codex-border text-codex-text-secondary rounded hover:bg-codex-surface"
            >
              Edit
            </button>
            <button
              onClick={() => handleDuplicate(w.id)}
              className="px-2 py-1 text-[10px] border border-codex-border text-codex-text-secondary rounded hover:bg-codex-surface"
            >
              Duplicate
            </button>
            {!isTemplate && (
              <button
                onClick={() => handleDelete(w.id)}
                className="px-2 py-1 text-[10px] border border-red-500/30 text-red-400 rounded hover:bg-red-500/10"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-codex-text-primary">Workflows</h1>
            <p className="text-xs text-codex-text-muted mt-0.5">Chain frameworks into automated multi-step pipelines</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 bg-codex-accent text-white rounded-lg text-xs hover:bg-codex-accent/80"
          >
            + Create Workflow
          </button>
        </div>

        {templates.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-wider text-codex-text-secondary mb-3">Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(w => renderCard(w, true))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xs uppercase tracking-wider text-codex-text-secondary mb-3">
            {custom.length > 0 ? 'Custom Workflows' : 'Your Workflows'}
          </h2>
          {custom.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-codex-border rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-xs text-codex-text-muted">No custom workflows yet. Create one or duplicate a template.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {custom.map(w => renderCard(w, false))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
