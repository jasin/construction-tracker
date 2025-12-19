import { apiClient } from './apiClient'

const CHANGE_ORDERS_BASE = '/change-orders'

/**
 * Get all change orders
 * @param {Object} params - Query parameters (projectId, status, etc.)
 * @returns {Promise<Array>} Array of change orders
 */
export async function getAllChangeOrders(params = {}) {
  const response = await apiClient.get(CHANGE_ORDERS_BASE, { params })
  return response.data || []
}

/**
 * Get a single change order by ID
 * @param {string} changeOrderId - Change order ID
 * @returns {Promise<Object>} Change order object
 */
export async function getChangeOrderById(changeOrderId) {
  const response = await apiClient.get(`${CHANGE_ORDERS_BASE}/${changeOrderId}`)
  return response.data
}

/**
 * Get change orders by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of change orders for the project
 */
export async function getChangeOrdersByProject(projectId) {
  const response = await apiClient.get(CHANGE_ORDERS_BASE, {
    params: { projectId }
  })
  return response.data || []
}

/**
 * Create a new change order
 * @param {Object} changeOrderData - Change order data
 * @returns {Promise<Object>} Created change order
 */
export async function createChangeOrder(changeOrderData) {
  const response = await apiClient.post(CHANGE_ORDERS_BASE, changeOrderData)
  return response.data
}

/**
 * Update a change order
 * @param {string} changeOrderId - Change order ID
 * @param {Object} changeOrderData - Updated change order data
 * @returns {Promise<Object>} Updated change order
 */
export async function updateChangeOrder(changeOrderId, changeOrderData) {
  const response = await apiClient.put(`${CHANGE_ORDERS_BASE}/${changeOrderId}`, changeOrderData)
  return response.data
}

/**
 * Delete a change order
 * @param {string} changeOrderId - Change order ID
 * @returns {Promise<void>}
 */
export async function deleteChangeOrder(changeOrderId) {
  await apiClient.delete(`${CHANGE_ORDERS_BASE}/${changeOrderId}`)
}
