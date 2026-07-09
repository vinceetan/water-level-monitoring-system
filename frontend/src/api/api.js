const API_URL = 'http://localhost:8000/api';

/**
 * Base API client for Laravel backend.
 * Handles token management and JSON headers.
 */

function getToken() {
  return localStorage.getItem('admin_token');
}

export function setToken(token) {
  localStorage.setItem('admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('admin_token');
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || 'API Error');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ---- Public endpoints ----
export const publicApi = {
  getDevices: () => request('/devices'),
  getDevice: (id) => request(`/devices/${id}`),
  getLatestReadings: () => request('/sensor-readings/latest'),
  getReadingHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sensor-readings?${query}`);
  },
  getAlerts: () => request('/alerts'),
  getAlertHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/alerts/history?${query}`);
  },
  getSettings: () => request('/settings'),
};

// ---- Auth endpoints ----
export const authApi = {
  login: (email, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () =>
    request('/logout', { method: 'POST' }),
  getUser: () =>
    request('/user'),
};

// ---- Admin endpoints ----
export const adminApi = {
  getDashboard: () => request('/admin/dashboard'),

  // Users
  getUsers: () => request('/admin/users'),
  updateUser: (id, data) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) =>
    request(`/admin/users/${id}`, { method: 'DELETE' }),
  registerUser: (data) =>
    request('/register', { method: 'POST', body: JSON.stringify(data) }),

  // Devices
  createDevice: (data) =>
    request('/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (id, data) =>
    request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (id) =>
    request(`/devices/${id}`, { method: 'DELETE' }),

  // Alerts
  createAlert: (data) =>
    request('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  updateAlert: (id, data) =>
    request(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAlert: (id) =>
    request(`/alerts/${id}`, { method: 'DELETE' }),

  // Settings
  updateSettings: (data) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
