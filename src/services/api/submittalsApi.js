import { apiClient } from './apiClient'

const SUBMITTALS_BASE = '/submittals'

/**
 * Get all submittals
 * @param {Object} params - Query parameters (projectId, status, etc.)
 * @returns {Promise<Array>} Array of submittals
 */
export async function getAllSubmittals(params = {}) {
  const response = await apiClient.get(SUBMITTALS_BASE, { params })
  return response.data || []
}

/**
 * Get a single submittal by ID
 * @param {string} submittalId - Submittal ID
 * @returns {Promise<Object>} Submittal object
 */
export async function getSubmittalById(submittalId) {
  const response = await apiClient.get(`${SUBMITTALS_BASE}/${submittalId}`)
  return response.data
}

/**
 * Get submittals by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of submittals for the project
 */
export async function getSubmittalsByProject(projectId) {
  const response = await apiClient.get(SUBMITTALS_BASE, {
    params: { projectId }
  })
  return response.data || []
}

/**
 * Create a new submittal
 * @param {Object} submittalData - Submittal data
 * @returns {Promise<Object>} Created submittal
 */
export async function createSubmittal(submittalData) {
  const response = await apiClient.post(SUBMITTALS_BASE, submittalData)
  return response.data
}

/**
 * Update a submittal
 * @param {string} submittalId - Submittal ID
 * @param {Object} submittalData - Updated submittal data
 * @returns {Promise<Object>} Updated submittal
 */
export async function updateSubmittal(submittalId, submittalData) {
  const response = await apiClient.put(`${SUBMITTALS_BASE}/${submittalId}`, submittalData)
  return response.data
}

/**
 * Delete a submittal
 * @param {string} submittalId - Submittal ID
 * @returns {Promise<void>}
 */
export async function deleteSubmittal(submittalId) {
  await apiClient.delete(`${SUBMITTALS_BASE}/${submittalId}`)
}
