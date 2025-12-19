// Token management service for JWT authentication

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * Save JWT token to localStorage
 * @param {string} token - JWT token
 */
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get JWT token from localStorage
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove JWT token from localStorage
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Save user data to localStorage
 * @param {Object} user - User object
 */
export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get user data from localStorage
 * @returns {Object|null}
 */
export function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

/**
 * Remove user data from localStorage
 */
export function removeUser() {
  localStorage.removeItem(USER_KEY);
}

/**
 * Clear all authentication data
 */
export function clearAuthData() {
  removeToken();
  removeUser();
}

/**
 * Decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null}
 */
export function decodeToken(token) {
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  if (!token) return true;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
  return decoded.exp * 1000 < Date.now();
}

/**
 * Get token expiration date
 * @param {string} token - JWT token
 * @returns {Date|null}
 */
export function getTokenExpiration(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;

  return new Date(decoded.exp * 1000);
}
