import axios from 'axios';
import config from '../config/env';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== INTERCEPTORS ====================
api.interceptors.request.use(
  (requestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🔄 API Call: ${requestConfig.method?.toUpperCase()} ${requestConfig.baseURL}${requestConfig.url}`, requestConfig.data || requestConfig.params);
    return requestConfig;
  },
  (error) => {
    console.error('❌ API Request Error:', error.message);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// ==================== UTILITY HELPERS ====================
const handleResponse = (response) => {
  const data = response.data;
  if (data && data.success !== undefined) {
    if (data.success) return data.data || data;
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
};

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const toArray = (payload, fallback = []) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return fallback;
};

const formatError = (error, fallbackMessage) => error.response?.data?.message || fallbackMessage || error.message;

const withdrawBasePaths = ['/withdraws', '/withdrawals'];
const callWithdrawEndpoint = async (method, suffix = '', payload = {}, config = {}) => {
  let lastError;
  for (const base of withdrawBasePaths) {
    try {
      const url = `${base}${suffix}`;
      switch (method) {
        case 'get':
          return handleResponse(await api.get(url, { params: payload, ...config }));
        case 'post':
          return handleResponse(await api.post(url, payload, config));
        case 'put':
          return handleResponse(await api.put(url, payload, config));
        case 'patch':
          return handleResponse(await api.patch(url, payload, config));
        case 'delete':
          return handleResponse(await api.delete(url, config));
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error) {
      lastError = error;
      if (error.response?.status !== 404) {
        break;
      }
    }
  }
  throw lastError;
};

// Worker stats helper
const calculateWorkerStats = (worker) => {
  const monthlySalary = worker?.salary || worker?.monthlySalary || 0;
  const totalAdvancePayments = worker?.advancePayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const finalPayment = Math.max(0, monthlySalary - totalAdvancePayments);

  return {
    monthlySalary,
    totalAdvancePayments,
    finalPayment,
    advancePayments: worker?.advancePayments || []
  };
};

// ==================== INDIVIDUAL EXPORTED FUNCTIONS ====================

// -------------------- HEALTH --------------------
export const getHealth = async () => {
  try {
    const response = await api.get('/health');
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    throw new Error('Backend server is not responding');
  }
};

export const healthCheck = async () => getHealth();

// -------------------- VILLAGES --------------------
export const getVillages = async () => {
  try {
    const response = await api.get('/villages');
    return toArray(handleResponse(response));
  } catch (error) {
    console.error('❌ Error fetching villages:', error.message);
    throw new Error(formatError(error, 'Failed to load villages'));
  }
};

export const createVillage = async (villageData) => {
  try {
    const response = await api.post('/villages', villageData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error creating village:', error.message);
    throw new Error(formatError(error, 'Failed to create village'));
  }
};

export const updateVillage = async (id, updates) => {
  try {
    const response = await api.put(`/villages/${id}`, updates);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error updating village:', error.message);
    throw new Error(formatError(error, 'Failed to update village'));
  }
};

export const deleteVillage = async (id) => {
  try {
    const response = await api.delete(`/villages/${id}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting village:', error.message);
    throw new Error(formatError(error, 'Failed to delete village'));
  }
};

// -------------------- ZONES --------------------
export const getZones = async () => {
  try {
    const response = await api.get('/zones');
    return toArray(handleResponse(response));
  } catch (error) {
    console.error('❌ Error fetching zones:', error.message);
    throw new Error(formatError(error, 'Failed to load zones'));
  }
};

export const createZone = async (zoneData) => {
  try {
    const response = await api.post('/zones', zoneData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error creating zone:', error.message);
    throw new Error(formatError(error, 'Failed to create zone'));
  }
};

export const updateZone = async (id, zoneData) => {
  try {
    const response = await api.put(`/zones/${id}`, zoneData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error updating zone:', error.message);
    throw new Error(formatError(error, 'Failed to update zone'));
  }
};

export const deleteZone = async (id) => {
  try {
    const response = await api.delete(`/zones/${id}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting zone:', error.message);
    throw new Error(formatError(error, 'Failed to delete zone'));
  }
};

// -------------------- CUSTOMERS --------------------
export const getCustomers = async () => {
  try {
    const response = await api.get('/customers');
    return toArray(handleResponse(response));
  } catch (error) {
    console.error('❌ Error fetching customers:', error.message);
    throw new Error(formatError(error, 'Failed to load customers'));
  }
};

export const createCustomer = async (customerData) => {
  try {
    const response = await api.post('/customers', customerData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error creating customer:', error.message);
    throw new Error(formatError(error, 'Failed to create customer'));
  }
};

export const updateCustomer = async (id, updates) => {
  try {
    const response = await api.put(`/customers/${id}`, updates);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error updating customer:', error.message);
    throw new Error(formatError(error, 'Failed to update customer'));
  }
};

export const deleteCustomer = async (id) => {
  try {
    const response = await api.delete(`/customers/${id}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting customer:', error.message);
    throw new Error(formatError(error, 'Failed to delete customer'));
  }
};

// -------------------- CARS --------------------
export const getCars = async () => {
  try {
    const response = await api.get('/cars');
    return toArray(handleResponse(response));
  } catch (error) {
    console.error('❌ Error fetching cars:', error.message);
    throw new Error(formatError(error, 'Failed to load cars'));
  }
};

export const createCar = async (carData) => {
  try {
    const response = await api.post('/cars', carData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error creating car:', error.message);
    throw new Error(formatError(error, 'Failed to create car'));
  }
};

export const updateCar = async (id, updates) => {
  try {
    const response = await api.put(`/cars/${id}`, updates);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error updating car:', error.message);
    throw new Error(formatError(error, 'Failed to update car'));
  }
};

export const deleteCar = async (id) => {
  try {
    const response = await api.delete(`/cars/${id}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting car:', error.message);
    throw new Error(formatError(error, 'Failed to delete car'));
  }
};

// -------------------- WORKERS --------------------
export const getWorkers = async () => {
  try {
    const response = await api.get('/workers');
    const data = handleResponse(response);
    return Array.isArray(data) ? data : data?.data || [];
  } catch (error) {
    console.error('❌ Error fetching workers:', error.message);
    await delay(300);
    return [];
  }
};

export const createWorker = async (workerData) => {
  try {
    const backendWorkerData = {
      fullName: workerData.fullName,
      phoneNumber: workerData.phoneNumber,
      email: workerData.email || '',
      address: workerData.address || 'Not provided',
      salary: workerData.salary,
      position: workerData.position || 'Worker',
      hireDate: workerData.hireDate,
      status: workerData.status || 'active',
      workerId: workerData.workerId,
      assignedVillages: workerData.assignedVillages || []
    };
    const response = await api.post('/workers', backendWorkerData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error creating worker:', error.message);
    throw new Error(formatError(error, 'Failed to create worker'));
  }
};

export const updateWorker = async (id, workerData) => {
  try {
    const backendWorkerData = {
      fullName: workerData.fullName,
      phoneNumber: workerData.phoneNumber,
      email: workerData.email || '',
      address: workerData.address || 'Not provided',
      salary: workerData.salary,
      position: workerData.position || 'Worker',
      hireDate: workerData.hireDate,
      status: workerData.status || 'active',
      assignedVillages: workerData.assignedVillages || []
    };
    const response = await api.put(`/workers/${id}`, backendWorkerData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error updating worker:', error.message);
    throw new Error(formatError(error, 'Failed to update worker'));
  }
};

export const deleteWorker = async (id) => {
  try {
    const response = await api.delete(`/workers/${id}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting worker:', error.message);
    throw new Error(formatError(error, 'Failed to delete worker'));
  }
};

export const getWorkerExpenses = async (workerId) => {
  try {
    const response = await api.get(`/workers/${workerId}/expenses`);
    return toArray(handleResponse(response));
  } catch (error) {
    console.error('❌ Error fetching worker expenses:', error.message);
    throw new Error(formatError(error, 'Failed to load worker expenses'));
  }
};

export const addWorkerExpense = async (workerId, expenseData) => {
  try {
    const response = await api.post(`/workers/${workerId}/expenses`, expenseData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error recording worker expense:', error.message);
    throw new Error(formatError(error, 'Failed to record worker expense'));
  }
};

export const deleteWorkerExpense = async (workerId, expenseId) => {
  try {
    const response = await api.delete(`/workers/${workerId}/expenses/${expenseId}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting worker expense:', error.message);
    throw new Error(formatError(error, 'Failed to delete worker expense'));
  }
};

// -------------------- COMPANY EXPENSES --------------------
export const getCompanyExpenses = async () => {
  try {
    const response = await api.get('/company-expenses');
    return toArray(handleResponse(response));
  } catch (error) {
    console.error('❌ Error fetching company expenses:', error.message);
    throw new Error(formatError(error, 'Failed to load company expenses'));
  }
};

export const createCompanyExpense = async (expenseData) => {
  try {
    const response = await api.post('/company-expenses', expenseData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error creating company expense:', error.message);
    throw new Error(formatError(error, 'Failed to create company expense'));
  }
};

export const updateCompanyExpense = async (id, expenseData) => {
  try {
    const response = await api.put(`/company-expenses/${id}`, expenseData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error updating company expense:', error.message);
    throw new Error(formatError(error, 'Failed to update company expense'));
  }
};

export const deleteCompanyExpense = async (id) => {
  try {
    const response = await api.delete(`/company-expenses/${id}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting company expense:', error.message);
    throw new Error(formatError(error, 'Failed to delete company expense'));
  }
};

// -------------------- WITHDRAWS --------------------
export const getWithdraws = async (filters = {}) => {
  try {
    const data = await callWithdrawEndpoint('get', '', filters);
    return Array.isArray(data) ? data : toArray(data);
  } catch (error) {
    console.error('❌ Error fetching withdrawals:', error.message);
    throw new Error(formatError(error, 'Failed to load withdrawals'));
  }
};

export const createWithdraw = async (payload) => {
  try {
    const response = await callWithdrawEndpoint('post', '', payload);
    return response;
  } catch (error) {
    console.error('❌ Error creating withdrawal:', error.message);
    throw new Error(formatError(error, 'Failed to create withdrawal'));
  }
};

export const updateWithdraw = async (id, payload) => {
  try {
    const response = await callWithdrawEndpoint('put', `/${id}`, payload);
    return response;
  } catch (error) {
    console.error('❌ Error updating withdrawal:', error.message);
    throw new Error(formatError(error, 'Failed to update withdrawal'));
  }
};

export const updateWithdrawStatus = async (id, payload) => {
  try {
    const response = await callWithdrawEndpoint('patch', `/${id}/status`, payload);
    return response;
  } catch (error) {
    console.error('❌ Error updating withdrawal status:', error.message);
    throw new Error(formatError(error, 'Failed to update withdrawal status'));
  }
};

export const deleteWithdraw = async (id) => {
  try {
    const response = await callWithdrawEndpoint('delete', `/${id}`);
    return response;
  } catch (error) {
    console.error('❌ Error deleting withdrawal:', error.message);
    throw new Error(formatError(error, 'Failed to delete withdrawal'));
  }
};

// -------------------- ADVANCE PAYMENTS --------------------
export const getWorkerAdvancePayments = async (workerId) => {
  try {
    const response = await api.get(`/advance-payments/worker/${workerId}`);
    const data = handleResponse(response);
    return Array.isArray(data) ? data : data?.data || data?.payments || [];
  } catch (error) {
    console.error('❌ Error fetching advance payments:', error.message);
    return [];
  }
};

export const getAllAdvancePayments = async () => {
  try {
    const response = await api.get('/advance-payments');
    const data = handleResponse(response);
    return Array.isArray(data) ? data : data?.data || [];
  } catch (error) {
    console.error('❌ Error fetching all advance payments:', error.message);
    return [];
  }
};

export const createAdvancePayment = async (advanceData) => {
  try {
    const backendAdvanceData = {
      workerId: advanceData.workerId,
      amount: parseFloat(advanceData.amount),
      description: advanceData.description?.trim() || 'Advance payment',
      date: advanceData.date ? new Date(advanceData.date).toISOString() : new Date().toISOString(),
      type: advanceData.type || 'advance',
      category: advanceData.category || 'general'
    };
    const response = await api.post('/advance-payments', backendAdvanceData);
    return response.data?.success ? response.data.data : response.data;
  } catch (error) {
    console.error('❌ Error creating advance payment:', error.message);
    throw new Error(formatError(error, 'Failed to create advance payment'));
  }
};

export const updateAdvancePayment = async (paymentId, paymentData) => {
  try {
    const backendPaymentData = {
      amount: paymentData.amount ? parseFloat(paymentData.amount) : undefined,
      description: paymentData.description,
      date: paymentData.date ? new Date(paymentData.date).toISOString() : undefined,
      type: paymentData.type,
      category: paymentData.category
    };
    const response = await api.put(`/advance-payments/${paymentId}`, backendPaymentData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error updating advance payment:', error.message);
    throw new Error(formatError(error, 'Failed to update advance payment'));
  }
};

export const deleteAdvancePayment = async (paymentId) => {
  try {
    const response = await api.delete(`/advance-payments/${paymentId}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting advance payment:', error.message);
    throw new Error(formatError(error, 'Failed to delete advance payment'));
  }
};

export const validateAdvancePayment = (worker, amount) => {
  const stats = calculateWorkerStats(worker);
  const advAmount = parseFloat(amount);
  if (isNaN(advAmount) || advAmount <= 0) return { isValid: false, error: 'Amount must be > 0' };
  if (advAmount > stats.finalPayment) return { isValid: false, error: `Cannot exceed remaining salary $${stats.finalPayment.toFixed(2)}` };
  return { isValid: true, error: null };
};

export { calculateWorkerStats };

// -------------------- AUTH --------------------
export const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Login API error:', error.message);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

export const verifyToken = async (token) => {
  try {
    const response = await api.get('/auth/verify', { headers: { Authorization: `Bearer ${token}` } });
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    throw new Error(error.response?.data?.message || 'Authentication failed');
  }
};

// -------------------- USERS --------------------
export const getUsers = async () => {
  try {
    const response = await api.get('/users');
    return toArray(handleResponse(response));
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    throw new Error(formatError(error, 'Failed to load users'));
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    throw new Error(formatError(error, 'Failed to create user'));
  }
};

export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`/users/${id}`, userData);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
    throw new Error(formatError(error, 'Failed to update user'));
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    throw new Error(formatError(error, 'Failed to delete user'));
  }
};

// -------------------- REPORTS --------------------
export const getDashboardStats = async (params = {}) => {
  try {
    const response = await api.get('/dashboard/stats', { params });
    return handleResponse(response);
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error.message);
    throw new Error(formatError(error, 'Failed to load dashboard stats'));
  }
};

export const getVillageBreakdownReport = async (month) => {
  try {
    const response = await api.get('/dashboard/stats', { params: { month } });
    const data = handleResponse(response);
    if (data?.zones) {
      return data;
    }
    return {
      month: month || new Date().toISOString().slice(0, 7),
      zones: []
    };
  } catch (error) {
    console.error('❌ Error fetching backend village breakdown:', error.message);
    throw new Error(formatError(error, 'Failed to load backend report'));
  }
};

// -------------------- FALLBACK DATA --------------------
export const getFallbackZones = () => ({
  data: [
    { _id: '1', name: 'Downtown Zone', description: 'Central business district', supervisor: 'John Smith', contactNumber: '+1234567890', notes: 'High density', listNumber: 1, zoneNumber: 1, code: 'ZONE001', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: '2', name: 'Residential North', description: 'Northern residential', supervisor: 'Maria Garcia', contactNumber: '+1234567891', notes: 'Medium density', listNumber: 2, zoneNumber: 2, code: 'ZONE002', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]
});

export const getFallbackCustomers = () => ({
  data: [
    { _id: '1', fullName: 'Customer One', phoneNumber: '+1234567890', address: '123 Main St', monthlyFee: 50, villageId: '1', zoneId: '1', payments: { [new Date().toISOString().split('T')[0].substring(0, 7)]: { paid: 50, remaining: 0, fullyPaid: true } } },
    { _id: '2', fullName: 'Customer Two', phoneNumber: '+1234567891', address: '456 Oak Ave', monthlyFee: 45, villageId: '2', zoneId: '2', payments: { [new Date().toISOString().split('T')[0].substring(0, 7)]: { paid: 25, remaining: 20, fullyPaid: false } } }
  ]
});

// ==================== API SERVICE OBJECT (for backward compatibility) ====================
const apiService = {
  // Health
  getHealth,
  healthCheck,
  
  // Villages
  getVillages,
  createVillage,
  updateVillage,
  deleteVillage,
  
  // Zones
  getZones,
  createZone,
  updateZone,
  deleteZone,
  
  // Customers
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  
  // Cars
  getCars,
  createCar,
  updateCar,
  deleteCar,
  
  // Workers
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  getWorkerExpenses,
  addWorkerExpense,
  deleteWorkerExpense,
  
  // Company Expenses
  getCompanyExpenses,
  createCompanyExpense,
  updateCompanyExpense,
  deleteCompanyExpense,
  
  // Withdrawals
  getWithdraws,
  createWithdraw,
  updateWithdraw,
  updateWithdrawStatus,
  deleteWithdraw,
  
  // Advance Payments
  getWorkerAdvancePayments,
  getAllAdvancePayments,
  createAdvancePayment,
  updateAdvancePayment,
  deleteAdvancePayment,
  validateAdvancePayment,
  calculateWorkerStats,
  
  // Auth
  login,
  verifyToken,
  
  // Users
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  
  // Reports
  getDashboardStats,
  getVillageBreakdownReport,
  
  // Fallback Data
  getFallbackZones,
  getFallbackCustomers
};

export default apiService;