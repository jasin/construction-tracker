// src/services/api/projectsApi.js
import { apiClient } from './apiClient';

const PROJECTS_BASE = '/api/projects';

/**
 * Get all projects with optional filters
 * @param {Object} params - Query parameters
 * @param {string} params.phase - Filter by phase
 * @param {number} params.client_id - Filter by client
 * @param {number} params.manager_id - Filter by project manager
 * @returns {Promise<Array>} List of projects
 */
export async function getAllProjects(params = {}) {
  const response = await apiClient.get(PROJECTS_BASE, { params });
  return response.data || [];
}

/**
 * Get active projects only
 * @returns {Promise<Array>} List of active projects
 */
export async function getActiveProjects() {
  const response = await apiClient.get(`${PROJECTS_BASE}/active`);
  return response.data;
}

/**
 * Search projects by name or job number
 * @param {string} query - Search query
 * @returns {Promise<Array>} List of matching projects
 */
export async function searchProjects(query) {
  const response = await apiClient.get(`${PROJECTS_BASE}/search`, {
    params: { q: query },
  });
  return response.data;
}

/**
 * Get a project by job number
 * @param {string} jobNumber - Job number
 * @returns {Promise<Object>} Project data
 */
export async function getProjectByJobNumber(jobNumber) {
  const response = await apiClient.get(`${PROJECTS_BASE}/job-number/${jobNumber}`);
  return response.data;
}

/**
 * Get a single project by ID
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Project data
 */
export async function getProjectById(projectId) {
  const response = await apiClient.get(`${PROJECTS_BASE}/${projectId}`);
  return response.data;
}

/**
 * Create a new project
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project data
 */
export async function createProject(projectData) {
  const response = await apiClient.post(PROJECTS_BASE, projectData);
  return response.data;
}

/**
 * Update a project
 * @param {number} projectId - Project ID
 * @param {Object} projectData - Updated project data
 * @returns {Promise<Object>} Updated project data
 */
export async function updateProject(projectId, projectData) {
  const response = await apiClient.patch(`${PROJECTS_BASE}/${projectId}`, projectData);
  return response.data;
}

/**
 * Delete a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Object>} Response message
 */
export async function deleteProject(projectId) {
  const response = await apiClient.delete(`${PROJECTS_BASE}/${projectId}`);
  return response.data;
}
