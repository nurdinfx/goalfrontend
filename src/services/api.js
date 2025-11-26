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
// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🔄 API Call: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor
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

// ==================== UTILITY FUNCTIONS ====================
// Handle response with different formats
const handleResponse = (response) => {
  const data = response.data;
  if (data && data.success !== undefined) {
    if (data.success) return data.data || data;
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
};

// Simulate delay for better UX
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

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

// ==================== API SERVICE ====================
export const apiService = {
  // -------------------- ADVANCE PAYMENTS --------------------
  getWorkerAdvancePayments: async (workerId) => {
    try {
      const response = await api.get(`/advance-payments/worker/${workerId}`);
      const data = handleResponse(response);
      let payments = Array.isArray(data) ? data : data?.data || data?.payments || [];
      return payments;
    } catch (error) {
      console.error('❌ Error fetching advance payments:', error.message);
      return [];
    }
  },

  getAllAdvancePayments: async () => {
    try {
      const response = await api.get('/advance-payments');
      const data = handleResponse(response);
      return Array.isArray(data) ? data : data?.data || [];
    } catch (error) {
      console.error('❌ Error fetching all advance payments:', error.message);
      return [];
    }
  },

  createAdvancePayment: async (advanceData) => {
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
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateAdvancePayment: async (paymentId, paymentData) => {
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
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteAdvancePayment: async (paymentId) => {
    try {
      const response = await api.delete(`/advance-payments/${paymentId}`);
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Error deleting advance payment:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  validateAdvancePayment: (worker, amount) => {
    const stats = calculateWorkerStats(worker);
    const advAmount = parseFloat(amount);
    if (isNaN(advAmount) || advAmount <= 0) return { isValid: false, error: 'Amount must be > 0' };
    if (advAmount > stats.finalPayment) return { isValid: false, error: `Cannot exceed remaining salary $${stats.finalPayment.toFixed(2)}` };
    return { isValid: true, error: null };
  },

  calculateWorkerStats,

  // -------------------- WORKERS --------------------
  getWorkers: async () => {
    try {
      const response = await api.get('/workers');
      const data = handleResponse(response);
      return Array.isArray(data) ? data : data?.data || [];
    } catch (error) {
      console.error('❌ Error fetching workers:', error.message);
      await delay(300);
      return [];
    }
  },

  createWorker: async (workerData) => {
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
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateWorker: async (id, workerData) => {
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
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteWorker: async (id) => {
    try {
      const response = await api.delete(`/workers/${id}`);
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Error deleting worker:', error.message);
      throw error;
    }
  },

  // -------------------- AUTH --------------------
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Login API error:', error.message);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  verifyToken: async (token) => {
    try {
      const response = await api.get('/auth/verify', { headers: { Authorization: `Bearer ${token}` } });
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      throw new Error(error.response?.data?.message || 'Authentication failed');
    }
  },

  getHealth: async () => {
    try {
      const response = await api.get('/health');
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      throw new Error('Backend server is not responding');
    }
  },

  // -------------------- FALLBACK DATA --------------------
  getFallbackZones: () => ({
    data: [
      { _id: '1', name: 'Downtown Zone', description: 'Central business district', supervisor: 'John Smith', contactNumber: '+1234567890', notes: 'High density', listNumber: 1, zoneNumber: 1, code: 'ZONE001', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { _id: '2', name: 'Residential North', description: 'Northern residential', supervisor: 'Maria Garcia', contactNumber: '+1234567891', notes: 'Medium density', listNumber: 2, zoneNumber: 2, code: 'ZONE002', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]
  }),

  getFallbackCustomers: () => ({
    data: [
      { _id: '1', fullName: 'Customer One', phoneNumber: '+1234567890', address: '123 Main St', monthlyFee: 50, villageId: '1', zoneId: '1', payments: { [new Date().toISOString().split('T')[0].substring(0, 7)]: { paid: 50, remaining: 0, fullyPaid: true } } },
      { _id: '2', fullName: 'Customer Two', phoneNumber: '+1234567891', address: '456 Oak Ave', monthlyFee: 45, villageId: '2', zoneId: '2', payments: { [new Date().toISOString().split('T')[0].substring(0, 7)]: { paid: 25, remaining: 20, fullyPaid: false } } }
    ]
  })
};

export default apiService;
