// src/config/env.js

// Default URLs
const LOCAL_API_URL = 'http://localhost:5001/api';
const LIVE_API_URL = 'https://gaol-backend.onrender.com/api';

const config = {
  // Try Vite environment variable first
  apiBaseUrl: import.meta.env?.VITE_API_URL 
    || process.env?.VITE_API_URL  // Node environment fallback
    || window._env_?.VITE_API_URL // Runtime injected env (optional)
    || (import.meta.env?.MODE === 'development' ? LOCAL_API_URL : LIVE_API_URL),
};

export default config;
