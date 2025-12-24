// API client wrapper with automatic JWT token injection
import { getToken, isTokenExpired, clearAuthData } from '@/services/auth/tokenService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Wrapper around fetch that automatically adds JWT token to requests
 * and handles token expiration
 *
 * @param {string} endpoint - API endpoint (e.g., '/projects')
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getToken();

  // Check if token is expired before making request
  if (token && isTokenExpired(token)) {
    console.warn('API Client: Token expired, clearing auth and redirecting to login');
    clearAuthData();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  // Build full URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Merge headers with authorization token
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized (invalid/expired token)
  if (response.status === 401) {
    console.warn('API Client: Received 401, clearing auth and redirecting to login');
    clearAuthData();
    window.location.href = '/login';
    throw new Error('Unauthorized. Please log in again.');
  }

  return response;
}

/**
 * GET request with automatic token injection
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiGet(endpoint) {
  const response = await apiFetch(endpoint, { method: 'GET' });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage =
      typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail || error);
    throw new Error(errorMessage || 'Request failed');
  }

  return await response.json();
}

/**
 * POST request with automatic token injection
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiPost(endpoint, data) {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage =
      typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail || error);
    throw new Error(errorMessage || 'Request failed');
  }

  return await response.json();
}

/**
 * PUT request with automatic token injection
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiPut(endpoint, data) {
  const response = await apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage =
      typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail || error);
    throw new Error(errorMessage || 'Request failed');
  }

  return await response.json();
}

/**
 * PATCH request with automatic token injection
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiPatch(endpoint, data) {
  const response = await apiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage =
      typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail || error);
    throw new Error(errorMessage || 'Request failed');
  }

  return await response.json();
}

/**
 * DELETE request with automatic token injection
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiDelete(endpoint) {
  const response = await apiFetch(endpoint, { method: 'DELETE' });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage =
      typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail || error);
    throw new Error(errorMessage || 'Request failed');
  }

  // DELETE might return empty response
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Upload file with automatic token injection
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - Form data with file
 * @returns {Promise<any>} - Parsed JSON response
 */
export async function apiUpload(endpoint, formData) {
  const token = getToken();

  // Check if token is expired
  if (token && isTokenExpired(token)) {
    clearAuthData();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Note: Do NOT set Content-Type for FormData - browser will set it with boundary
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) {
    clearAuthData();
    window.location.href = '/login';
    throw new Error('Unauthorized. Please log in again.');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return await response.json();
}

/**
 * API Client object for cleaner imports
 */
export const apiClient = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
  upload: apiUpload,
  fetch: apiFetch,
};
