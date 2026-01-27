import axios from 'axios';
import { store } from '../store/store';
import { refreshToken, logoutUser } from '../store/slices/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh token
        await store.dispatch(refreshToken()).unwrap();
        
        // Retry original request with new token
        const state = store.getState();
        const newToken = state.auth.accessToken;
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        store.dispatch(logoutUser());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getCurrentUser: () => api.get('/auth/me'),
};

export const formsAPI = {
  getForms: (params) => api.get('/forms', { params }),
  getForm: (id) => api.get(`/forms/${id}`),
  createForm: (formData) => api.post('/forms', formData),
  updateForm: (id, formData) => api.put(`/forms/${id}`, formData),
  deleteForm: (id) => api.delete(`/forms/${id}`),
  publishForm: (id) => api.post(`/forms/${id}/publish`),
  getPublicForm: (publicLink) => api.get(`/forms/public/${publicLink}`),
  generateQRCode: (id) => api.get(`/forms/${id}/qrcode`),
  addCollaborator: (id, collaboratorData) => api.post(`/forms/${id}/collaborators`, collaboratorData),
};

export const responsesAPI = {
  submitResponse: (formId, responseData) => api.post(`/responses/${formId}/submit`, responseData),
  getResponses: (formId, params) => api.get(`/responses/${formId}`, { params }),
  getResponse: (formId, responseId) => api.get(`/responses/${formId}/responses/${responseId}`),
  exportResponses: (formId) => api.get(`/responses/${formId}/export`),
  deleteResponse: (formId, responseId) => api.delete(`/responses/${formId}/responses/${responseId}`),
};

export const analyticsAPI = {
  getFormAnalytics: (formId) => api.get(`/analytics/${formId}`),
  getQuestionAnalytics: (formId) => api.get(`/analytics/${formId}/questions`),
  getRealtimeStats: (formId) => api.get(`/analytics/${formId}/realtime`),
};

export default api;