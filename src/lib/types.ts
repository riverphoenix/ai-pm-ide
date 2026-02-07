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
