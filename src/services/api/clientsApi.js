// src/services/api/clientsApi.js
import { apiClient } from './apiClient';

const CLIENTS_BASE = '/clients';

/**
 * Get all clients with optional filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} List of clients
 */
export async function getAllClients(params = {}) {
  return await apiClient.get(CLIENTS_BASE, { params });
}

/**
 * Get a single client by ID
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} Client data
 */
export async function getClientById(clientId) {
  return await apiClient.get(`${CLIENTS_BASE}/${clientId}`);
}

/**
 * Search clients by name, email, or company
 * @param {string} query - Search query
 * @returns {Promise<Array>} List of matching clients
 */
export async function searchClients(query) {
  return await apiClient.get(`${CLIENTS_BASE}/search`, {
    params: { q: query },
  });
}

/**
 * Create a new client
 * @param {Object} clientData - Client data to create
 * @returns {Promise<Object>} Created client data
 */
export async function createClient(clientData) {
  return await apiClient.post(CLIENTS_BASE, clientData);
}

/**
 * Update a client
 * @param {string} clientId - Client ID
 * @param {Object} clientData - Updated client data
 * @returns {Promise<Object>} Updated client data
 */
export async function updateClient(clientId, clientData) {
  return await apiClient.patch(`${CLIENTS_BASE}/${clientId}`, clientData);
}

/**
 * Delete a client
 * @param {string} clientId - Client ID
 * @returns {Promise<Object>} Response message
 */
export async function deleteClient(clientId) {
  return await apiClient.delete(`${CLIENTS_BASE}/${clientId}`);
}

/**
 * Get projects associated with a client
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} List of client projects
 */
export async function getClientProjects(clientId) {
  return await apiClient.get(`${CLIENTS_BASE}/${clientId}/projects`);
}
