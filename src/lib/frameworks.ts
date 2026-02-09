import { FrameworkDefinition, FrameworkCategory } from './types';

// Import category definitions
import categoriesData from '../frameworks/categories.json';

// Import framework definitions
// Strategy
import businessModelCanvas from '../frameworks/strategy/business-model-canvas.json';
import swot from '../frameworks/strategy/swot.json';

// Prioritization
import rice from '../frameworks/prioritization/rice.json';

// Discovery
import jtbd from '../frameworks/discovery/jtbd.json';
import customerJourneyMap from '../frameworks/discovery/customer-journey-map.json';

// Execution
import okrs from '../frameworks/execution/okrs.json';

// Communication
import prd from '../frameworks/communication/prd.json';
import userStories from '../frameworks/communication/user-stories.json';

// All framework definitions
const allFrameworks: FrameworkDefinition[] = [
  // Strategy
  businessModelCanvas as FrameworkDefinition,
  swot as FrameworkDefinition,

  // Prioritization
  rice as FrameworkDefinition,

  // Discovery
  jtbd as FrameworkDefinition,
  customerJourneyMap as FrameworkDefinition,

  // Execution
  okrs as FrameworkDefinition,

  // Communication
  prd as FrameworkDefinition,
  userStories as FrameworkDefinition,
];

/**
 * Get all framework categories with their associated frameworks
 */
export function getCategories(): FrameworkCategory[] {
  const categories = categoriesData as Omit<FrameworkCategory, 'frameworks'>[];

  return categories.map(category => ({
    ...category,
    frameworks: allFrameworks.filter(f => f.category === category.id)
  }));
}

/**
 * Get a specific framework by ID
 */
export function getFramework(id: string): FrameworkDefinition | undefined {
  return allFrameworks.find(f => f.id === id);
}

/**
 * Get all frameworks in a specific category
 */
export function getFrameworksByCategory(categoryId: string): FrameworkDefinition[] {
  return allFrameworks.filter(f => f.category === categoryId);
}

/**
 * Search frameworks by name or description
 */
export function searchFrameworks(query: string): FrameworkDefinition[] {
  const lowerQuery = query.toLowerCase();
  return allFrameworks.filter(f =>
    f.name.toLowerCase().includes(lowerQuery) ||
    f.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get frameworks that support visual generation
 */
export function getVisualFrameworks(): FrameworkDefinition[] {
  return allFrameworks.filter(f => f.supports_visuals);
}

/**
 * Get framework statistics
 */
export function getFrameworkStats() {
  const categories = getCategories();
  const totalFrameworks = allFrameworks.length;
  const visualFrameworks = getVisualFrameworks().length;

  return {
    totalFrameworks,
    totalCategories: categories.length,
    visualFrameworks,
    frameworksByCategory: categories.map(c => ({
      category: c.name,
      count: c.frameworks.length
    }))
  };
}
