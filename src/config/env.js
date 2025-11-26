const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL || 'https://gaol-backend.onrender.com/api', // default to live
  env: import.meta.env.VITE_NODE_ENV || 'development',
  appName: import.meta.env.VITE_APP_NAME || 'Garbage Management System',
  companyName: import.meta.env.VITE_COMPANY_NAME || 'HUDI SOMPROJECTS',
};

export default config;
