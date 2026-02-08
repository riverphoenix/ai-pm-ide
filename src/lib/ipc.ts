import { invoke } from '@tauri-apps/api/core';
import { Project, Conversation, Message, Settings, SettingsUpdate, TokenUsage, TokenUsageAggregate, TemplateInstance } from './types';

export const projectsAPI = {
  async create(name: string, description?: string): Promise<Project> {
    return await invoke('create_project', { name, description });
  },

  async list(): Promise<Project[]> {
    return await invoke('list_projects');
  },

  async get(id: string): Promise<Project | null> {
    return await invoke('get_project', { id });
  },

  async update(id: string, name: string, description?: string): Promise<Project> {
    return await invoke('update_project', { id, name, description });
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_project', { id });
  },
};

export const conversationsAPI = {
  async create(
    projectId: string,
    title?: string,
    model: string = 'gpt-5'
  ): Promise<Conversation> {
    return await invoke('create_conversation', {
      projectId,
      title,
      model,
    });
  },

  async list(projectId: string): Promise<Conversation[]> {
    return await invoke('list_conversations', { projectId });
  },

  async get(id: string): Promise<Conversation | null> {
    return await invoke('get_conversation', { id });
  },

  async updateStats(
    id: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    return await invoke('update_conversation_stats', {
      id,
      tokens,
      cost,
    });
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_conversation', { id });
  },
};

export const messagesAPI = {
  async add(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    tokens: number = 0
  ): Promise<Message> {
    return await invoke('add_message', {
      conversationId,
      role,
      content,
      tokens,
    });
  },

  async list(conversationId: string): Promise<Message[]> {
    return await invoke('get_messages', { conversationId });
  },
};

export const settingsAPI = {
  async get(): Promise<Settings> {
    return await invoke('get_settings');
  },

  async update(settings: SettingsUpdate): Promise<Settings> {
    return await invoke('update_settings', { settings });
  },

  async getDecryptedApiKey(): Promise<string | null> {
    return await invoke('get_decrypted_api_key');
  },

  async deleteApiKey(): Promise<void> {
    return await invoke('delete_api_key');
  },
};

export const tokenUsageAPI = {
  async record(
    conversationId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<string> {
    return await invoke('record_token_usage', {
      conversationId,
      model,
      inputTokens,
      outputTokens,
      cost,
    });
  },

  async getByDateRange(
    startDate: string,
    endDate: string,
    viewType: 'daily' | 'monthly'
  ): Promise<TokenUsageAggregate[]> {
    return await invoke('get_token_usage_by_date_range', {
      startDate,
      endDate,
      viewType,
    });
  },

  async getAll(): Promise<TokenUsage[]> {
    return await invoke('get_all_token_usage');
  },
};

// Python sidecar API (direct HTTP calls)
const SIDECAR_URL = 'http://127.0.0.1:8000';

export const modelsAPI = {
  async list(apiKey: string): Promise<string[]> {
    try {
      const response = await fetch(`${SIDECAR_URL}/models?api_key=${encodeURIComponent(apiKey)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      // Return Frontier models as fallback (GPT-5 generation)
      return [
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
      ];
    }
  },
};

export const templatesAPI = {
  async create(projectId: string, templateId: string, name: string, fieldValues: Record<string, any>): Promise<TemplateInstance> {
    return await invoke('create_template_instance', {
      projectId,
      templateId,
      name,
      fieldValues: JSON.stringify(fieldValues)
    });
  },

  async list(projectId: string): Promise<TemplateInstance[]> {
    const instances = await invoke<TemplateInstance[]>('list_template_instances', { projectId });
    // Parse field_values JSON string back to object
    return instances.map(instance => ({
      ...instance,
      field_values: typeof instance.field_values === 'string'
        ? JSON.parse(instance.field_values)
        : instance.field_values
    }));
  },

  async get(id: string): Promise<TemplateInstance | null> {
    const instance = await invoke<TemplateInstance | null>('get_template_instance', { id });
    if (instance) {
      return {
        ...instance,
        field_values: typeof instance.field_values === 'string'
          ? JSON.parse(instance.field_values)
          : instance.field_values
      };
    }
    return null;
  },

  async update(id: string, name: string, fieldValues: Record<string, any>, outputMarkdown?: string): Promise<TemplateInstance> {
    return await invoke('update_template_instance', {
      id,
      name,
      fieldValues: JSON.stringify(fieldValues),
      outputMarkdown
    });
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_template_instance', { id });
  },

  async suggestField(
    projectId: string,
    templateId: string,
    fieldId: string,
    aiPrompt: string,
    currentValues: Record<string, any>
  ): Promise<string> {
    try {
      const apiKey = await settingsAPI.getDecryptedApiKey();
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const response = await fetch(`${SIDECAR_URL}/suggest-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          template_id: templateId,
          field_id: fieldId,
          field_prompt: aiPrompt,
          current_values: currentValues,
          api_key: apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get suggestion: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestion;
    } catch (error) {
      console.error('Error getting field suggestion:', error);
      throw error;
    }
  }
};
