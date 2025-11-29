const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || '';
  const defaultUrl = 'https://gaol-backend.onrender.com/api';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isOriginLocal = /^(localhost|127\.0\.0\.1|::1)$/.test(host);
  const isEnvLocal = /localhost|127\.0\.0\.1|::1/.test(envUrl);
  if (!isOriginLocal && isEnvLocal) return defaultUrl;
  return envUrl || defaultUrl;
};

const config = {
  apiBaseUrl: getApiBaseUrl(),
  env: import.meta.env.VITE_NODE_ENV || 'development',
  appName: import.meta.env.VITE_APP_NAME || 'Garbage Management System',
  companyName: import.meta.env.VITE_COMPANY_NAME || 'HUDI SOMPROJECTS',
};

export default config;
