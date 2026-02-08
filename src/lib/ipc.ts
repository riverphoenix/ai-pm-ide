import { invoke } from '@tauri-apps/api/core';
import { Project, Conversation, Message, Settings, SettingsUpdate, TokenUsage, TokenUsageAggregate, ContextDocument, FrameworkOutput } from './types';

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

export const contextDocumentsAPI = {
  async create(
    projectId: string,
    name: string,
    docType: 'pdf' | 'url' | 'google_doc' | 'text',
    content: string,
    url?: string,
    isGlobal: boolean = false
  ): Promise<ContextDocument> {
    return await invoke('create_context_document', {
      projectId,
      name,
      docType,
      content,
      url,
      isGlobal
    });
  },

  async list(projectId: string): Promise<ContextDocument[]> {
    return await invoke('list_context_documents', { projectId });
  },

  async get(id: string): Promise<ContextDocument | null> {
    return await invoke('get_context_document', { id });
  },

  async update(id: string, name: string, isGlobal: boolean): Promise<ContextDocument> {
    return await invoke('update_context_document', {
      id,
      name,
      isGlobal
    });
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_context_document', { id });
  }
};

export const frameworkOutputsAPI = {
  async create(
    projectId: string,
    frameworkId: string,
    category: string,
    name: string,
    userPrompt: string,
    contextDocIds: string[],
    generatedContent: string,
    format: 'markdown' | 'html' = 'markdown'
  ): Promise<FrameworkOutput> {
    return await invoke('create_framework_output', {
      projectId,
      frameworkId,
      category,
      name,
      userPrompt,
      contextDocIds: JSON.stringify(contextDocIds),
      generatedContent,
      format
    });
  },

  async list(projectId: string): Promise<FrameworkOutput[]> {
    return await invoke('list_framework_outputs', { projectId });
  },

  async get(id: string): Promise<FrameworkOutput | null> {
    return await invoke('get_framework_output', { id });
  },

  async update(id: string, name: string, generatedContent: string): Promise<FrameworkOutput> {
    return await invoke('update_framework_output', {
      id,
      name,
      generatedContent
    });
  },

  async delete(id: string): Promise<void> {
    return await invoke('delete_framework_output', { id });
  },

  async generate(
    projectId: string,
    frameworkId: string,
    contextDocIds: string[],
    userPrompt: string
  ): Promise<string> {
    try {
      const apiKey = await settingsAPI.getDecryptedApiKey();
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const response = await fetch(`${SIDECAR_URL}/generate-framework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          framework_id: frameworkId,
          context_doc_ids: contextDocIds,
          user_prompt: userPrompt,
          api_key: apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate framework: ${response.statusText}`);
      }

      const data = await response.json();
      return data.generated_content;
    } catch (error) {
      console.error('Error generating framework:', error);
      throw error;
    }
  }
};
