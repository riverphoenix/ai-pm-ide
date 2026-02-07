import { invoke } from '@tauri-apps/api/core';
import { Project } from './types';

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
