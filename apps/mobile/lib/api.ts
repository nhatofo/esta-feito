import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    const tokens = await SecureStore.getItemAsync('auth_tokens');
    if (tokens) {
      const { accessToken } = JSON.parse(tokens);
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch { /* ignore */ }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = await SecureStore.getItemAsync('auth_tokens');
        if (stored) {
          const { refreshToken } = JSON.parse(stored);
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          await SecureStore.setItemAsync('auth_tokens', JSON.stringify(data.data));
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        }
      } catch {
        await SecureStore.deleteItemAsync('auth_tokens');
        // Navigation handled by root layout auth guard
      }
    }
    return Promise.reject(error);
  }
);

export default api;
