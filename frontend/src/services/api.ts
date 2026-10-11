import axios from 'axios';

// Read the backend base URL from the .env file (VITE_ prefix makes it available client-side).
// Falls back to localhost during development if the env var is not set.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// One shared Axios instance — all services use this, so the base URL is defined in one place.
const apiClient = axios.create({
  baseURL: BASE_URL,
  // Set a generous timeout because PDF processing can take a few seconds.
  timeout: 60000,
});

export default apiClient;
