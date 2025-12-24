import { apiClient } from './apiClient'

const RFIS_BASE = '/rfis'

/**
 * Get all RFIs
 * @param {Object} params - Query parameters (projectId, status, priority, etc.)
 * @returns {Promise<Array>} Array of RFIs
 */
export async function getAllRFIs(params = {}) {
  const response = await apiClient.get(RFIS_BASE, { params })
  return response;
}

/**
 * Get a single RFI by ID
 * @param {string} rfiId - RFI ID
 * @returns {Promise<Object>} RFI object
 */
export async function getRFIById(rfiId) {
  const response = await apiClient.get(`${RFIS_BASE}/${rfiId}`)
  return response;
}

/**
 * Get RFIs by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of RFIs for the project
 */
export async function getRFIsByProject(projectId) {
  const response = await apiClient.get(RFIS_BASE, {
    params: { projectId }
  })
  return response;
}

/**
 * Create a new RFI
 * @param {Object} rfiData - RFI data
 * @returns {Promise<Object>} Created RFI
 */
export async function createRFI(rfiData) {
  const response = await apiClient.post(RFIS_BASE, rfiData)
  return response;
}

/**
 * Update an RFI
 * @param {string} rfiId - RFI ID
 * @param {Object} rfiData - Updated RFI data
 * @returns {Promise<Object>} Updated RFI
 */
export async function updateRFI(rfiId, rfiData) {
  const response = await apiClient.put(`${RFIS_BASE}/${rfiId}`, rfiData)
  return response;
}

/**
 * Delete an RFI
 * @param {string} rfiId - RFI ID
 * @returns {Promise<void>}
 */
export async function deleteRFI(rfiId) {
  await apiClient.delete(`${RFIS_BASE}/${rfiId}`)
}
