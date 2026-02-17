import { useState, useEffect } from 'react';
import { WorkflowStepDef, FrameworkDefinition, ContextDocument } from '../lib/types';
import { workflowsAPI, contextDocumentsAPI } from '../lib/ipc';

interface WorkflowEditorProps {
  projectId: string;
  workflowId: string | null;
  frameworks: FrameworkDefinition[];
  onSave: () => void;
  onCancel: () => void;
}

const MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'];

export default function WorkflowEditor({ projectId, workflowId, frameworks, onSave, onCancel }: WorkflowEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<WorkflowStepDef[]>([]);
  const [contextDocs, setContextDocs] = useState<ContextDocument[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    loadContextDocs();
    if (workflowId) loadWorkflow();
  }, [workflowId]);

  const loadContextDocs = async () => {
    try {
      const docs = await contextDocumentsAPI.list(projectId);
      setContextDocs(docs);
    } catch (err) {
      console.error('Failed to load context docs:', err);
    }
  };

  const loadWorkflow = async () => {
    if (!workflowId) return;
    try {
      const wf = await workflowsAPI.get(workflowId);
      setName(wf.name);
      setDescription(wf.description);
      setSteps(JSON.parse(wf.steps));
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  };

  const addStep = () => {
    const defaultFw = frameworks[0];
    setSteps(prev => [...prev, {
      framework_id: defaultFw?.id || '',
      label: defaultFw?.name || 'New Step',
      prompt_template: '',
      context_doc_ids: [],
      model: 'gpt-5',
    }]);
    setExpandedStep(steps.length);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
    setExpandedStep(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setSteps(updated);
    setExpandedStep(target);
  };

  const updateStep = (index: number, updates: Partial<WorkflowStepDef>) => {
    setSteps(prev => prev.map((s, i) => {
      if (i !== index) return s;
      const updated = { ...s, ...updates };
      if (updates.framework_id && updates.framework_id !== s.framework_id) {
        const fw = frameworks.find(f => f.id === updates.framework_id);
        if (fw) updated.label = fw.name;
      }
      return updated;
    }));
  };

  const toggleContextDoc = (stepIndex: number, docId: string) => {
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIndex) return s;
      const ids = s.context_doc_ids.includes(docId)
        ? s.context_doc_ids.filter(id => id !== docId)
        : [...s.context_doc_ids, docId];
      return { ...s, context_doc_ids: ids };
    }));
  };

  const handleSave = async () => {
    if (!name.trim() || steps.length === 0) return;
    setSaving(true);
    try {
      const stepsJson = JSON.stringify(steps);
      if (workflowId) {
        await workflowsAPI.update(workflowId, name, description, stepsJson);
      } else {
        await workflowsAPI.create(projectId, name, description, stepsJson);
      }
      onSave();
    } catch (err) {
      console.error('Failed to save workflow:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-5 py-3 border-b border-codex-border bg-codex-surface/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-xs text-codex-text-secondary hover:text-codex-text-primary">
            ← Back
          </button>
          <h2 className="text-sm font-semibold text-codex-text-primary">
            {workflowId ? 'Edit Workflow' : 'New Workflow'}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 border border-codex-border rounded text-xs text-codex-text-secondary hover:bg-codex-surface">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || steps.length === 0}
            className="px-3 py-1.5 bg-codex-accent text-white rounded text-xs hover:bg-codex-accent/80 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Workflow name..."
              className="w-full px-3 py-2 bg-codex-surface border border-codex-border rounded-lg text-sm text-codex-text-primary placeholder:text-codex-text-muted focus:outline-none focus:border-codex-accent"
            />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)..."
              rows={2}
              className="w-full px-3 py-2 bg-codex-surface border border-codex-border rounded-lg text-xs text-codex-text-primary placeholder:text-codex-text-muted focus:outline-none focus:border-codex-accent resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-codex-text-secondary">Steps ({steps.length})</h3>
              <button
                onClick={addStep}
                className="px-2 py-1 text-[10px] bg-codex-accent/20 text-codex-accent rounded hover:bg-codex-accent/30"
              >
                + Add Step
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((step, index) => {
                const fw = frameworks.find(f => f.id === step.framework_id);
                const isExpanded = expandedStep === index;

                return (
                  <div key={index} className="border border-codex-border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 bg-codex-surface/40 cursor-pointer hover:bg-codex-surface/60"
                      onClick={() => setExpandedStep(isExpanded ? null : index)}
                    >
                      <span className="text-[10px] text-codex-text-muted w-5 text-center">{index + 1}</span>
                      <span className="text-sm">{fw?.icon || '?'}</span>
                      <span className="text-xs font-medium text-codex-text-primary flex-1 truncate">{step.label}</span>
                      {step.context_doc_ids.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-codex-accent/20 text-codex-accent rounded">
                          {step.context_doc_ids.length} doc{step.context_doc_ids.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-[10px] text-codex-text-muted">{step.model}</span>
                      <div className="flex gap-0.5">
                        <button
                          onClick={e => { e.stopPropagation(); moveStep(index, 'up'); }}
                          disabled={index === 0}
                          className="px-1 text-[10px] text-codex-text-muted hover:text-codex-text-primary disabled:opacity-30"
                        >↑</button>
                        <button
                          onClick={e => { e.stopPropagation(); moveStep(index, 'down'); }}
                          disabled={index === steps.length - 1}
                          className="px-1 text-[10px] text-codex-text-muted hover:text-codex-text-primary disabled:opacity-30"
                        >↓</button>
                        <button
                          onClick={e => { e.stopPropagation(); removeStep(index); }}
                          className="px-1 text-[10px] text-red-400 hover:text-red-300"
                        >×</button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 py-3 border-t border-codex-border space-y-3">
                        <div>
                          <label className="text-[10px] text-codex-text-muted block mb-1">Framework</label>
                          <select
                            value={step.framework_id}
                            onChange={e => updateStep(index, { framework_id: e.target.value })}
                            className="w-full px-2 py-1.5 bg-codex-surface border border-codex-border rounded text-xs text-codex-text-primary focus:outline-none"
                          >
                            {frameworks.map(f => (
                              <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-codex-text-muted block mb-1">
                            Prompt Template
                            {index > 0 && <span className="ml-1 text-codex-accent">Use {'{prev_output}'} to chain</span>}
                          </label>
                          <textarea
                            value={step.prompt_template}
                            onChange={e => updateStep(index, { prompt_template: e.target.value })}
                            placeholder={index > 0 ? 'Use {prev_output} to reference the previous step\'s output...' : 'Enter your prompt for this step...'}
                            rows={4}
                            className="w-full px-2 py-1.5 bg-codex-surface border border-codex-border rounded text-xs text-codex-text-primary placeholder:text-codex-text-muted focus:outline-none resize-none font-mono"
                          />
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-[10px] text-codex-text-muted block mb-1">Model</label>
                            <select
                              value={step.model}
                              onChange={e => updateStep(index, { model: e.target.value })}
                              className="w-full px-2 py-1.5 bg-codex-surface border border-codex-border rounded text-xs text-codex-text-primary focus:outline-none"
                            >
                              {MODELS.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-codex-text-muted block mb-1">Step Label</label>
                            <input
                              type="text"
                              value={step.label}
                              onChange={e => updateStep(index, { label: e.target.value })}
                              className="w-full px-2 py-1.5 bg-codex-surface border border-codex-border rounded text-xs text-codex-text-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        {contextDocs.length > 0 && (
                          <div>
                            <label className="text-[10px] text-codex-text-muted block mb-1">Context Documents</label>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {contextDocs.map(doc => (
                                <label key={doc.id} className="flex items-center gap-2 text-xs text-codex-text-primary cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={step.context_doc_ids.includes(doc.id)}
                                    onChange={() => toggleContextDoc(index, doc.id)}
                                    className="rounded border-codex-border text-codex-accent"
                                  />
                                  <span className="truncate">{doc.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {steps.length === 0 && (
              <div className="p-8 text-center border border-dashed border-codex-border rounded-lg">
                <p className="text-xs text-codex-text-muted mb-2">No steps yet. Add a step to start building your workflow.</p>
                <button
                  onClick={addStep}
                  className="px-3 py-1.5 bg-codex-accent text-white rounded text-xs hover:bg-codex-accent/80"
                >
                  + Add First Step
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
