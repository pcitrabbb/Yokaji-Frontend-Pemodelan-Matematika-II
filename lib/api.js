import axios from 'axios';

const ADMIN_KEY = 'semangatpm2yah';

// Route-route yang butuh X-Admin-Key
const ADMIN_ROUTES = [
  '/admin/',
  '/galeri',
  '/konten',
];

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Tambah X-Admin-Key kalau URL termasuk route admin
  const isAdminRoute = ADMIN_ROUTES.some(route => config.url?.includes(route));
  if (isAdminRoute) {
    config.headers['X-Admin-Key'] = ADMIN_KEY;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const token = response.data?.token ?? response.data?.access_token;
    if (token) {
      localStorage.setItem('token', token);
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;