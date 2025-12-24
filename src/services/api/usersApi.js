// src/services/api/usersApi.js
import { apiClient } from './apiClient';

const USERS_BASE = '/users';

/**
 * Get all users with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.project_id - Filter by project
 * @param {string} params.role - Filter by role
 * @param {boolean} params.active - Filter by active status
 * @returns {Promise<Array>} List of users
 */
export async function getAllUsers(params = {}) {
  return await apiClient.get(USERS_BASE, { params });
}

/**
 * Get active users only
 * @returns {Promise<Array>} List of active users
 */
export async function getActiveUsers() {
  return await apiClient.get(USERS_BASE, {
    params: { active: true },
  });
}

/**
 * Search users by name or email
 * @param {string} query - Search query
 * @returns {Promise<Array>} List of matching users
 */
export async function searchUsers(query) {
  return await apiClient.get(`${USERS_BASE}/search`, {
    params: { q: query },
  });
}

/**
 * Get a single user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User data
 */
export async function getUserById(userId) {
  return await apiClient.get(`${USERS_BASE}/${userId}`);
}

/**
 * Update a user
 * @param {number} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUser(userId, userData) {
  return await apiClient.patch(`${USERS_BASE}/${userId}`, userData);
}

/**
 * Deactivate a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Response message
 */
export async function deactivateUser(userId) {
  return await apiClient.post(`${USERS_BASE}/${userId}/deactivate`);
}

/**
 * Activate a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Response message
 */
export async function activateUser(userId) {
  return await apiClient.post(`${USERS_BASE}/${userId}/activate`);
}

/**
 * Delete a user (soft delete)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Response message
 */
export async function deleteUser(userId) {
  return await apiClient.delete(`${USERS_BASE}/${userId}`);
}
