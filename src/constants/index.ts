// Application constants
export const APP_NAME = 'Construction Tracker'

export const USER_ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project-manager',
  SUPERINTENDENT: 'superintendent',
  FOREMAN: 'foreman',
  USER: 'user'
} as const

export const PROJECT_PHASES = {
  PRE_CONSTRUCTION: 'pre-construction',
  CONSTRUCTION: 'construction',
  CLOSE_OUT: 'close-out',
  COMPLETE: 'complete'
} as const

export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  REVIEW: 'review',
  COMPLETE: 'complete',
  ON_HOLD: 'on-hold'
} as const

export const TASK_PRIORITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const

// Type exports for use in TypeScript files
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
export type ProjectPhase = typeof PROJECT_PHASES[keyof typeof PROJECT_PHASES]
export type TaskStatus = typeof TASK_STATUSES[keyof typeof TASK_STATUSES]
export type TaskPriority = typeof TASK_PRIORITIES[keyof typeof TASK_PRIORITIES]
