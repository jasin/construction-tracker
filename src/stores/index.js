// src/stores/index.js
import { createPinia } from 'pinia';

export const pinia = createPinia();

// Export all stores for easy importing
export { useAuthStore } from './auth';
export { useProjectStore } from './project';
export { useConstructionStore } from './construction';
export { useActivityStore } from './activity';
export { useUIStore } from './ui';
export { useTaskStore } from './task';
