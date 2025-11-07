// src/constants/activityActions.js

/**
 * Activity Action Constants
 * Defines all activity action types and their categories
 * Categories determine how activities are displayed and filtered
 */

/**
 * Activity Categories
 * - CHANGE: Meaningful changes that should appear in dashboard recent activity
 * - VIEW: User navigation/viewing activities (informational only)
 * - SYSTEM: System-level events
 */
export const ACTIVITY_CATEGORIES = {
  CHANGE: 'change',
  VIEW: 'view',
  SYSTEM: 'system',
}

/**
 * Meaningful activity actions that represent actual changes to data
 * These will be shown in the dashboard's "Recent Projects" section
 */
export const MEANINGFUL_ACTIONS = [
  // Project changes
  'created_project',
  'updated_project',
  'deleted_project',
  'updated_project_status',

  // Task changes
  'created_task',
  'updated_task',
  'deleted_task',
  'updated_task_status',
  'task_completed',
  'task_assigned',
  'task_unassigned',

  // RFI changes
  'created_rfi',
  'updated_rfi',
  'deleted_rfi',
  'updated_rfi_status',
  'rfi_submitted',
  'rfi_responded',

  // Submittal changes
  'created_submittal',
  'updated_submittal',
  'deleted_submittal',
  'updated_submittal_status',
  'submittal_submitted',
  'submittal_reviewed',

  // Change Order changes
  'created_change_order',
  'updated_change_order',
  'deleted_change_order',
  'updated_change_order_status',
  'change_order_approved',
  'change_order_rejected',

  // Document changes
  'uploaded_document',
  'deleted_document',
  'updated_document',

  // Comment changes
  'created_comment',
  'deleted_comment',
]

/**
 * View-only actions that don't represent data changes
 * These are logged for audit purposes but not shown in recent activity
 */
export const VIEW_ONLY_ACTIONS = [
  'project_selected',
  'viewed_project',
  'viewed_task',
  'viewed_rfi',
  'viewed_submittal',
  'viewed_change_order',
  'viewed_document',
  'downloaded_document',
  'exported_report',
  'exported_data',
]

/**
 * System-level actions
 */
export const SYSTEM_ACTIONS = [
  'system_backup',
  'system_cleanup',
  'system_migration',
  'user_login',
  'user_logout',
  'user_created',
  'user_updated',
]

/**
 * Determine the category of an activity action
 * @param {string} action - The activity action type
 * @returns {string} The category ('change', 'view', or 'system')
 */
export function getActivityCategory(action) {
  if (MEANINGFUL_ACTIONS.includes(action)) {
    return ACTIVITY_CATEGORIES.CHANGE
  }

  if (VIEW_ONLY_ACTIONS.includes(action)) {
    return ACTIVITY_CATEGORIES.VIEW
  }

  if (SYSTEM_ACTIONS.includes(action)) {
    return ACTIVITY_CATEGORIES.SYSTEM
  }

  // Default to 'change' for unknown actions (to be safe and show them)
  // Log a warning so we can add them to the appropriate list
  console.warn(`[ActivityActions] Unknown action type: ${action}. Defaulting to 'change' category.`)
  return ACTIVITY_CATEGORIES.CHANGE
}

/**
 * Check if an action represents a meaningful change
 * @param {string} action - The activity action type
 * @returns {boolean} True if the action is meaningful
 */
export function isMeaningfulAction(action) {
  return getActivityCategory(action) === ACTIVITY_CATEGORIES.CHANGE
}

/**
 * Check if an action is view-only
 * @param {string} action - The activity action type
 * @returns {boolean} True if the action is view-only
 */
export function isViewOnlyAction(action) {
  return getActivityCategory(action) === ACTIVITY_CATEGORIES.VIEW
}
