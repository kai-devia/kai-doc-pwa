const API_BASE = '/api';

/**
 * Get stored auth token
 */
export function getToken() {
  return localStorage.getItem('kai-doc-token');
}

/**
 * Set auth token
 */
export function setToken(token) {
  localStorage.setItem('kai-doc-token', token);
}

/**
 * Clear auth token
 */
export function clearToken() {
  localStorage.removeItem('kai-doc-token');
}

/**
 * API client with auth headers
 */
async function request(path, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('No autorizado');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Error de servidor');
  }
  
  return data;
}

/**
 * Login
 */
export async function login(user, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user, password }),
  });
  setToken(data.token);
  return data;
}

/**
 * Logout
 */
export function logout() {
  clearToken();
  window.location.href = '/login';
}

/**
 * Get file tree
 */
export async function getFileTree() {
  return request('/files');
}

/**
 * Get flat file list
 */
export async function getFileList() {
  return request('/files/flat');
}

/**
 * Get file content
 */
export async function getFileContent(path) {
  return request(`/files/content?path=${encodeURIComponent(path)}`);
}

/**
 * Save file content
 */
export async function saveFileContent(path, content) {
  return request(`/files/content?path=${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getToken();
}
