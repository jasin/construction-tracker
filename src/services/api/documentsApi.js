import { apiClient } from './apiClient'

const DOCUMENTS_BASE = '/documents'

/**
 * Get all documents
 * @param {Object} params - Query parameters (projectId, category, type, etc.)
 * @returns {Promise<Array>} Array of documents
 */
export async function getAllDocuments(params = {}) {
  const response = await apiClient.get(DOCUMENTS_BASE, { params })
  return response;
}

/**
 * Get a single document by ID
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} Document object
 */
export async function getDocumentById(documentId) {
  const response = await apiClient.get(`${DOCUMENTS_BASE}/${documentId}`)
  return response;
}

/**
 * Get documents by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of documents for the project
 */
export async function getDocumentsByProject(projectId) {
  const response = await apiClient.get(DOCUMENTS_BASE, {
    params: { projectId }
  })
  return response;
}

/**
 * Get documents by entity (linked to RFI, submittal, etc.)
 * @param {string} entityType - Entity type (rfi, submittal, task, etc.)
 * @param {string} entityId - Entity ID
 * @returns {Promise<Array>} Array of documents linked to the entity
 */
export async function getDocumentsByEntity(entityType, entityId) {
  const response = await apiClient.get(DOCUMENTS_BASE, {
    params: {
      entityType,
      linkedEntityId: entityId
    }
  })
  return response;
}

/**
 * Upload a new document
 * @param {FormData} formData - Form data containing file and metadata
 * @returns {Promise<Object>} Created document
 */
export async function uploadDocument(formData) {
  const response = await apiClient.upload(DOCUMENTS_BASE, formData)
  return response;
}

/**
 * Update document metadata
 * @param {string} documentId - Document ID
 * @param {Object} documentData - Updated document metadata
 * @returns {Promise<Object>} Updated document
 */
export async function updateDocument(documentId, documentData) {
  const response = await apiClient.put(`${DOCUMENTS_BASE}/${documentId}`, documentData)
  return response;
}

/**
 * Delete a document
 * @param {string} documentId - Document ID
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId) {
  await apiClient.delete(`${DOCUMENTS_BASE}/${documentId}`)
}

/**
 * Download a document
 * @param {string} documentId - Document ID
 * @returns {Promise<Blob>} Document file blob
 */
export async function downloadDocument(documentId) {
  const response = await apiClient.get(`${DOCUMENTS_BASE}/${documentId}/download`, {
    responseType: 'blob'
  })
  return response;
}
