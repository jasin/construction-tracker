// src/services/api/clientsApi.js
import { apiClient } from './apiClient'

const CLIENTS_BASE = '/api/clients'

/**
 * Get all clients with optional filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} List of clients
 */
export async function getAllClients(params = {}) {
  const response = await apiClient.get(CLIENTS_BASE, { params })
  return response.data
}

/**
 * Get a single client by ID
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} Client data
 */
export async function getClientById(clientId) {
  const response = await apiClient.get(`${CLIENTS_BASE}/${clientId}`)
  return response.data
}

/**
 * Search clients by name, email, or company
 * @param {string} query - Search query
 * @returns {Promise<Array>} List of matching clients
 */
export async function searchClients(query) {
  const response = await apiClient.get(`${CLIENTS_BASE}/search`, {
    params: { q: query }
  })
  return response.data
}

/**
 * Create a new client
 * @param {Object} clientData - Client data to create
 * @returns {Promise<Object>} Created client data
 */
export async function createClient(clientData) {
  const response = await apiClient.post(CLIENTS_BASE, clientData)
  return response.data
}

/**
 * Update a client
 * @param {string} clientId - Client ID
 * @param {Object} clientData - Updated client data
 * @returns {Promise<Object>} Updated client data
 */
export async function updateClient(clientId, clientData) {
  const response = await apiClient.patch(`${CLIENTS_BASE}/${clientId}`, clientData)
  return response.data
}

/**
 * Delete a client
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} Response message
 */
export async function deleteClient(clientId) {
  const response = await apiClient.delete(`${CLIENTS_BASE}/${clientId}`)
  return response.data
}

/**
 * Get projects associated with a client
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} List of client projects
 */
export async function getClientProjects(clientId) {
  const response = await apiClient.get(`${CLIENTS_BASE}/${clientId}/projects`)
  return response.data
}
