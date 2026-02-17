import { FrameworkDefinition, FrameworkCategory } from './types';
import { frameworkCategoriesAPI, frameworkDefsAPI } from './ipc';

let cachedCategories: FrameworkCategory[] | null = null;
let cachedFrameworks: FrameworkDefinition[] | null = null;

export function invalidateCache() {
  cachedCategories = null;
  cachedFrameworks = null;
}

async function getAllFrameworks(): Promise<FrameworkDefinition[]> {
  if (cachedFrameworks) return cachedFrameworks;
  cachedFrameworks = await frameworkDefsAPI.list();
  return cachedFrameworks;
}

export async function getCategories(): Promise<FrameworkCategory[]> {
  if (cachedCategories) return cachedCategories;

  const [cats, frameworks] = await Promise.all([
    frameworkCategoriesAPI.list(),
    getAllFrameworks(),
  ]);

  cachedCategories = cats.map(cat => ({
    ...cat,
    frameworks: frameworks.filter(f => f.category === cat.id),
  }));

  return cachedCategories;
}

export async function getFramework(id: string): Promise<FrameworkDefinition | null> {
  const all = await getAllFrameworks();
  return all.find(f => f.id === id) || null;
}

export async function getFrameworksByCategory(categoryId: string): Promise<FrameworkDefinition[]> {
  const all = await getAllFrameworks();
  return all.filter(f => f.category === categoryId);
}

export async function searchFrameworks(query: string): Promise<FrameworkDefinition[]> {
  return frameworkDefsAPI.search(query);
}

export async function getVisualFrameworks(): Promise<FrameworkDefinition[]> {
  const all = await getAllFrameworks();
  return all.filter(f => f.supports_visuals);
}

export async function getFrameworkStats() {
  const categories = await getCategories();
  const all = await getAllFrameworks();
  const visualFrameworks = all.filter(f => f.supports_visuals).length;

  return {
    totalFrameworks: all.length,
    totalCategories: categories.length,
    visualFrameworks,
    frameworksByCategory: categories.map(c => ({
      category: c.name,
      count: c.frameworks.length,
    })),
  };
}
