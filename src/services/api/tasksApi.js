import { apiClient } from './apiClient'

const TASKS_BASE = '/tasks'

/**
 * Get all tasks
 * @param {Object} params - Query parameters (projectId, assignedTo, status, priority, etc.)
 * @returns {Promise<Array>} Array of tasks
 */
export async function getAllTasks(params = {}) {
  const response = await apiClient.get(TASKS_BASE, { params })
  return response;
}

/**
 * Get a single task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Task object
 */
export async function getTaskById(taskId) {
  const response = await apiClient.get(`${TASKS_BASE}/${taskId}`)
  return response;
}

/**
 * Get tasks by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of tasks for the project
 */
export async function getTasksByProject(projectId) {
  const response = await apiClient.get(TASKS_BASE, {
    params: { projectId }
  })
  return response;
}

/**
 * Get tasks assigned to a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of tasks assigned to the user
 */
export async function getTasksByAssignee(userId) {
  const response = await apiClient.get(TASKS_BASE, {
    params: { assignedTo: userId }
  })
  return response;
}

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData) {
  const response = await apiClient.post(TASKS_BASE, taskData)
  return response;
}

/**
 * Update a task
 * @param {string} taskId - Task ID
 * @param {Object} taskData - Updated task data
 * @returns {Promise<Object>} Updated task
 */
export async function updateTask(taskId, taskData) {
  const response = await apiClient.put(`${TASKS_BASE}/${taskId}`, taskData)
  return response;
}

/**
 * Delete a task
 * @param {string} taskId - Task ID
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  await apiClient.delete(`${TASKS_BASE}/${taskId}`)
}

/**
 * Bulk update tasks
 * @param {Array<Object>} tasks - Array of tasks with id and data to update
 * @returns {Promise<Array>} Updated tasks
 */
export async function bulkUpdateTasks(tasks) {
  const response = await apiClient.post(`${TASKS_BASE}/bulk`, tasks)
  return response;
}
