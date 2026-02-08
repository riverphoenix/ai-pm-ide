export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  updated_at: number;
}

export interface Document {
  id: string;
  project_id: string;
  name: string;
  type: 'markdown' | 'pdf';
  content?: string;
  file_path?: string;
  created_at: number;
}

export interface DocumentEmbedding {
  id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding?: ArrayBuffer;
}

export interface Conversation {
  id: string;
  project_id: string;
  title?: string;
  model: string;
  total_tokens: number;
  total_cost: number;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens: number;
  created_at: number;
}

export interface ChatStreamEvent {
  type: 'conversation_id' | 'content_block_delta' | 'message_stop' | 'error';
  conversation_id?: string;
  delta?: {
    text: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  cost?: number;
  error?: string;
}

export interface Settings {
  id: string;
  api_key_encrypted?: string;
  username?: string;
  name?: string;
  surname?: string;
  job_title?: string;
  company?: string;
  company_url?: string;
  profile_pic?: string;
  about_me?: string;
  about_role?: string;
  created_at: number;
  updated_at: number;
}

export interface SettingsUpdate {
  api_key?: string;
  username?: string;
  name?: string;
  surname?: string;
  job_title?: string;
  company?: string;
  company_url?: string;
  profile_pic?: string;
  about_me?: string;
  about_role?: string;
}

export interface TokenUsage {
  id: string;
  conversation_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: number;
  date: string;
}

export interface TokenUsageAggregate {
  date: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  conversation_count: number;
}
