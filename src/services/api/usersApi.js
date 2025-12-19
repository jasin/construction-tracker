// src/services/api/usersApi.js
import { apiClient } from './apiClient'

const USERS_BASE = '/api/users'

/**
 * Get all users with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.project_id - Filter by project
 * @param {string} params.role - Filter by role
 * @param {boolean} params.active - Filter by active status
 * @returns {Promise<Array>} List of users
 */
export async function getAllUsers(params = {}) {
  const response = await apiClient.get(USERS_BASE, { params })
  return response.data
}

/**
 * Get active users only
 * @returns {Promise<Array>} List of active users
 */
export async function getActiveUsers() {
  const response = await apiClient.get(USERS_BASE, {
    params: { active: true }
  })
  return response.data
}

/**
 * Search users by name or email
 * @param {string} query - Search query
 * @returns {Promise<Array>} List of matching users
 */
export async function searchUsers(query) {
  const response = await apiClient.get(`${USERS_BASE}/search`, {
    params: { q: query }
  })
  return response.data
}

/**
 * Get a single user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User data
 */
export async function getUserById(userId) {
  const response = await apiClient.get(`${USERS_BASE}/${userId}`)
  return response.data
}

/**
 * Update a user
 * @param {number} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUser(userId, userData) {
  const response = await apiClient.patch(`${USERS_BASE}/${userId}`, userData)
  return response.data
}

/**
 * Deactivate a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Response message
 */
export async function deactivateUser(userId) {
  const response = await apiClient.post(`${USERS_BASE}/${userId}/deactivate`)
  return response.data
}

/**
 * Activate a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Response message
 */
export async function activateUser(userId) {
  const response = await apiClient.post(`${USERS_BASE}/${userId}/activate`)
  return response.data
}

/**
 * Delete a user (soft delete)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Response message
 */
export async function deleteUser(userId) {
  const response = await apiClient.delete(`${USERS_BASE}/${userId}`)
  return response.data
}
