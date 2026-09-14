const API_URL = 'http://localhost:5000/api';

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Serverda xatolik yuz berdi');
  }
  return data;
};

export const api = {
  auth: {
    sendCode: (email) => request('/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
    register: (registrationData) => request('/auth/register', { method: 'POST', body: JSON.stringify(registrationData) }),
    login: (loginIdentifier, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ loginIdentifier, password }) }),
    me: () => request('/auth/me'),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (email, code, newPassword) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) }),
  },
  projects: {
    getAll: () => request('/projects'),
    getOne: (id) => request(`/projects/${id}`),
    create: (name) => request('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id, updates) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
    getByShareToken: (token) => request(`/projects/share/${token}`),
  },
  roles: {
    getAllByProject: (projectId) => request(`/projects/${projectId}/roles`),
    create: (roleData) => request('/roles', { method: 'POST', body: JSON.stringify(roleData) }),
    update: (id, updates) => request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (ids) => request('/roles', { method: 'DELETE', body: JSON.stringify({ ids }) }),
  },
  admin: {
    login: (password) => request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
    getStats: (adminKey) => request('/admin/stats', { headers: { 'x-admin-key': adminKey } }),
    getUsers: (adminKey) => request('/admin/users', { headers: { 'x-admin-key': adminKey } }),
    getLogs: (adminKey) => request('/admin/logs', { headers: { 'x-admin-key': adminKey } }),
    getNotifications: (adminKey) => request('/admin/notifications', { headers: { 'x-admin-key': adminKey } }),
    markNotificationsRead: (adminKey) => request('/admin/notifications/read', { method: 'POST', headers: { 'x-admin-key': adminKey } }),
    deleteNotification: (adminKey, id) => request(`/admin/notifications/${id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey } }),
    deleteUser: (adminKey, id) => request(`/admin/users/${id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey } }),
  }
};
