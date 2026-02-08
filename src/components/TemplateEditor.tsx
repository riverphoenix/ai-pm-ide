import { useState, useEffect } from 'react';
import { TemplateDefinition, TemplateField } from '../lib/types';
import { templatesAPI } from '../lib/ipc';
import MarkdownRenderer from './MarkdownRenderer';

// Import template definitions
import riceTemplate from '../templates/definitions/rice.json';
import prdTemplate from '../templates/definitions/prd.json';
import userStoryTemplate from '../templates/definitions/user-story.json';

const TEMPLATES: Record<string, TemplateDefinition> = {
  'rice': riceTemplate as TemplateDefinition,
  'prd': prdTemplate as TemplateDefinition,
  'user-story': userStoryTemplate as TemplateDefinition,
};

interface TemplateEditorProps {
  templateId: string;
  projectId: string;
  instanceId?: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function TemplateEditor({
  templateId,
  projectId,
  instanceId,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const [templateDef, setTemplateDef] = useState<TemplateDefinition | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [previewMarkdown, setPreviewMarkdown] = useState('');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load template definition and existing instance if editing
  useEffect(() => {
    const loadTemplate = async () => {
      const template = TEMPLATES[templateId];
      if (!template) {
        setError('Template not found');
        return;
      }
      setTemplateDef(template);

      // If editing existing instance, load its data
      if (instanceId) {
        const instance = await templatesAPI.get(instanceId);
        if (instance) {
          setInstanceName(instance.name);
          setFieldValues(instance.field_values);
        }
      } else {
        // Initialize with empty values
        const initialValues: Record<string, any> = {};
        template.fields.forEach((field) => {
          if (field.type === 'checkbox') {
            initialValues[field.id] = false;
          } else if (field.type === 'number') {
            initialValues[field.id] = '';
          } else {
            initialValues[field.id] = '';
          }
        });
        setFieldValues(initialValues);
        setInstanceName(`New ${template.name}`);
      }
    };

    loadTemplate();
  }, [templateId, instanceId]);

  // Update preview whenever field values change
  useEffect(() => {
    if (templateDef) {
      const markdown = generateMarkdown(templateDef, fieldValues);
      setPreviewMarkdown(markdown);
    }
  }, [fieldValues, templateDef]);

  const generateMarkdown = (
    template: TemplateDefinition,
    values: Record<string, any>
  ): string => {
    // Calculate computed fields first
    const computedValues: Record<string, any> = { ...values };
    if (template.computed_fields) {
      template.computed_fields.forEach((computed) => {
        try {
          computedValues[computed.id] = evaluateFormula(computed.formula, values);
        } catch (e) {
          computedValues[computed.id] = 'N/A';
        }
      });
    }

    // Replace {{variable}} placeholders in output template
    let output = template.output_template;
    Object.entries(computedValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      output = output.replace(regex, String(value || ''));
    });

    return output;
  };

  const evaluateFormula = (formula: string, values: Record<string, any>): number => {
    // Simple formula evaluation for MVP
    // Parse formula like "(reach * impact * confidence / 100) / effort"
    try {
      const evalFunc = new Function(
        ...Object.keys(values),
        `return ${formula}`
      );
      const result = evalFunc(...Object.values(values));
      return Math.round(result * 100) / 100; // Round to 2 decimals
    } catch (e) {
      console.error('Formula evaluation error:', e);
      return 0;
    }
  };

  const handleAiAssist = async (field: TemplateField) => {
    if (!field.ai_assist_prompt) return;

    setAiLoading(field.id);
    setError(null);

    try {
      const suggestion = await templatesAPI.suggestField(
        projectId,
        templateId,
        field.id,
        field.ai_assist_prompt,
        fieldValues
      );

      setFieldValues((prev) => ({ ...prev, [field.id]: suggestion }));
    } catch (err) {
      console.error('AI assist error:', err);
      setError('Failed to get AI suggestion. Please check your API key.');
    } finally {
      setAiLoading(null);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    const missingFields = templateDef?.fields
      .filter((field) => field.required && !fieldValues[field.id])
      .map((field) => field.label);

    if (missingFields && missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (instanceId) {
        // Update existing instance
        await templatesAPI.update(instanceId, instanceName, fieldValues, previewMarkdown);
      } else {
        // Create new instance
        await templatesAPI.create(projectId, templateId, instanceName, fieldValues);
      }
      onSave();
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!templateDef) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading template...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{templateDef.icon}</span>
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              className="text-lg font-semibold text-white bg-transparent border-b border-transparent hover:border-slate-600 focus:border-indigo-500 focus:outline-none px-1 -ml-1"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {error && (
          <div className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Content: Form + Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Form Fields */}
        <div className="w-1/2 overflow-y-auto p-6 border-r border-slate-700">
          <div className="space-y-6">
            {templateDef.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>

                <div className="flex gap-2">
                  {/* Field Input */}
                  <div className="flex-1">
                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        value={fieldValues[field.id] || ''}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        rows={4}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}

                    {field.type === 'select' && (
                      <select
                        value={fieldValues[field.id] || ''}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === 'checkbox' && (
                      <input
                        type="checkbox"
                        checked={fieldValues[field.id] || false}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [field.id]: e.target.checked }))
                        }
                        className="w-4 h-4 bg-slate-800 border border-slate-700 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  {/* AI Assist Button */}
                  {field.ai_assist_prompt && (
                    <button
                      onClick={() => handleAiAssist(field)}
                      disabled={aiLoading === field.id}
                      className="px-3 py-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1"
                      title="AI Assist"
                    >
                      {aiLoading === field.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <span>✨</span>
                      )}
                    </button>
                  )}
                </div>

                {field.placeholder && field.type !== 'text' && field.type !== 'number' && (
                  <div className="text-xs text-slate-500">{field.placeholder}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="w-1/2 overflow-y-auto bg-slate-950/50">
          <div className="p-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Preview
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={previewMarkdown} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
