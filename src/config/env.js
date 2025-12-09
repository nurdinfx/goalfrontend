const getApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const defaultUrl = 'https://gaol-backend.onrender.com/api';

  // Prefer explicit env override, otherwise always hit the hosted backend.
  if (envUrl) return envUrl;
  return defaultUrl;
};

const config = {
  apiBaseUrl: getApiBaseUrl(),
  env: import.meta.env.VITE_NODE_ENV || 'development',
  appName: import.meta.env.VITE_APP_NAME || 'Garbage Management System',
  companyName: import.meta.env.VITE_COMPANY_NAME || 'HUDI SOMPROJECTS',
};

export default config;
