// src/services/api/activityLogsApi.js
import { apiClient } from './apiClient';

const ACTIVITY_BASE = '/activity-logs';

/**
 * Get activity logs with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.project_id - Filter by project
 * @param {number} params.user_id - Filter by user
 * @param {string} params.action - Filter by action type
 * @param {string} params.entity_type - Filter by entity type
 * @param {number} params.limit - Limit number of results
 * @returns {Promise<Array>} List of activity logs
 */
export async function getActivityLogs(params = {}) {
  const response = await apiClient.get(ACTIVITY_BASE, { params });
  return response;
}

/**
 * Get recent activity logs
 * @param {number} limit - Number of recent logs to fetch (default: 50)
 * @returns {Promise<Array>} List of recent activity logs
 */
export async function getRecentActivityLogs(limit = 50) {
  const response = await apiClient.get(`${ACTIVITY_BASE}/recent`, {
    params: { limit },
  });
  return response;
}

/**
 * Get activity summary by user
 * @param {Object} params - Query parameters
 * @param {number} params.project_id - Filter by project
 * @returns {Promise<Array>} Activity summary grouped by user
 */
export async function getActivitySummaryByUser(params = {}) {
  const response = await apiClient.get(`${ACTIVITY_BASE}/summary/by-user`, { params });
  return response;
}

/**
 * Get activity summary by action type
 * @param {Object} params - Query parameters
 * @param {number} params.project_id - Filter by project
 * @returns {Promise<Array>} Activity summary grouped by action
 */
export async function getActivitySummaryByAction(params = {}) {
  const response = await apiClient.get(`${ACTIVITY_BASE}/summary/by-action`, { params });
  return response;
}

/**
 * Get a single activity log by ID
 * @param {number} logId - Activity log ID
 * @returns {Promise<Object>} Activity log data
 */
export async function getActivityLogById(logId) {
  const response = await apiClient.get(`${ACTIVITY_BASE}/${logId}`);
  return response;
}

/**
 * Delete old activity logs
 * @param {number} daysOld - Delete logs older than this many days
 * @returns {Promise<Object>} Response message with count of deleted logs
 */
export async function cleanupOldLogs(daysOld) {
  const response = await apiClient.delete(`${ACTIVITY_BASE}/cleanup`, {
    params: { days_old: daysOld },
  });
  return response;
}
