import axios from 'axios';
import { supabase } from '../lib/supabase';

// Read the backend base URL from the .env file (VITE_ prefix makes it available client-side).
// Falls back to localhost during development if the env var is not set.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

// One shared Axios instance — all services use this, so the base URL is defined in one place.
const apiClient = axios.create({
  baseURL: BASE_URL,
  // Set a generous timeout because PDF processing can take a few seconds.
  timeout: 60000,
});

// Attach the current user's access token to each API request.
// interceptors.request.use(...) runs before Axios sends each request.
// getSession() retrieves the current Supabase session.
// config.headers.Authorization adds the token to the HTTP request.
// return config allows Axios to continue sending the request.
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

export default apiClient;
