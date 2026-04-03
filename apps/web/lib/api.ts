import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('esta-feito-auth');
      if (raw) {
        const { state } = JSON.parse(raw);
        if (state?.tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${state.tokens.accessToken}`;
        }
      }
    } catch { /* ignore */ }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const raw = localStorage.getItem('esta-feito-auth');
        if (raw) {
          const { state } = JSON.parse(raw);
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'}/auth/refresh`,
            { refreshToken: state?.tokens?.refreshToken }
          );
          // Update stored tokens
          const updated = { ...JSON.parse(raw), state: { ...state, tokens: data.data } };
          localStorage.setItem('esta-feito-auth', JSON.stringify(updated));
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem('esta-feito-auth');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
