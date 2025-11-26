// src/config/env.js
const config = {
  apiBaseUrl: 
    import.meta.env?.REACT_APP_API_BASE_URL || 
    process.env?.REACT_APP_API_BASE_URL || 
    window._env_?.REACT_APP_API_BASE_URL || 
    'http://localhost:5001/api',
};

export default config;