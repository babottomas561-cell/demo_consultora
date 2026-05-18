import axios from 'axios';
import useAuthStore from '../store/authStore';

const runtimeApiUrl = window.__API_URL__;
const apiUrl = runtimeApiUrl && runtimeApiUrl !== '__PLACEHOLDER_API_URL__'
  ? runtimeApiUrl
  : import.meta.env.VITE_API_URL || '';
// Empty apiUrl = relative URL so the Vite dev proxy (or nginx) handles routing
const baseURL = apiUrl ? `${apiUrl}/api/v1` : '/api/v1';

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401s globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and force logout if unauthorized
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
