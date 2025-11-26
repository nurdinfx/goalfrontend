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
    console.error('❌ API Request Error:', error);
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

// Response handler
const handleResponse = (response) => {
  const data = response.data;
  
  // Handle different response formats
  if (data && data.success !== undefined) {
    if (data.success) {
      return data.data || data;
    } else {
      throw new Error(data.message || data.error || 'Request failed');
    }
  }
  
  return data;
};

// Simulate delay for better UX
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to calculate worker stats
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

// API Service methods
export const apiService = {
  // ==================== ADVANCE PAYMENTS ====================
  getWorkerAdvancePayments: async (workerId) => {
    try {
      console.log(`📋 Fetching advance payments for worker: ${workerId}`);
      const response = await api.get(`/advance-payments/worker/${workerId}`);
      const data = handleResponse(response);
      
      // Handle different response formats
      let payments = [];
      if (Array.isArray(data)) {
        payments = data;
      } else if (data && data.data) {
        payments = data.data;
      } else if (data && Array.isArray(data.payments)) {
        payments = data.payments;
      }
      
      console.log(`✅ Loaded ${payments.length} advance payments for worker ${workerId}`);
      return payments;
    } catch (error) {
      console.error('❌ Error fetching advance payments:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  },

  getAllAdvancePayments: async () => {
    try {
      console.log('📋 Fetching all advance payments');
      const response = await api.get('/advance-payments');
      const data = handleResponse(response);
      
      let payments = [];
      if (Array.isArray(data)) {
        payments = data;
      } else if (data && data.data) {
        payments = data.data;
      }
      
      console.log(`✅ Loaded ${payments.length} advance payments`);
      return payments;
    } catch (error) {
      console.error('❌ Error fetching all advance payments:', error.message);
      return [];
    }
  },

  createAdvancePayment: async (advanceData) => {
    try {
      console.log('💰 Creating advance payment in backend:', advanceData);
      
      // Enhanced data validation and formatting
      const backendAdvanceData = {
        workerId: advanceData.workerId,
        amount: parseFloat(advanceData.amount),
        description: advanceData.description?.trim() || 'Advance payment',
        date: advanceData.date ? new Date(advanceData.date).toISOString() : new Date().toISOString(),
        type: advanceData.type || 'advance',
        category: advanceData.category || 'general'
      };

      console.log('📤 Sending advance payment data to backend:', backendAdvanceData);

      const response = await api.post('/advance-payments', backendAdvanceData);
      
      // Enhanced response handling
      if (response.data && response.data.success) {
        console.log('✅ Advance payment created successfully in backend:', response.data.data);
        return response.data.data; // Return the actual payment data
      } else if (response.data) {
        // If response doesn't have success flag but has data, return it
        console.log('✅ Advance payment created successfully in backend:', response.data);
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Failed to create advance payment');
      }
    } catch (error) {
      console.error('❌ Error creating advance payment:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      // Enhanced error handling
      if (error.response?.status === 404) {
        throw new Error('Advance payments endpoint not found. Please check backend server.');
      } else if (error.response?.status === 400) {
        throw new Error(`Invalid data: ${error.response?.data?.message || 'Please check your input'}`);
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error(error.message || 'Failed to create advance payment');
    }
  },

  updateAdvancePayment: async (paymentId, paymentData) => {
    try {
      console.log('🔄 Updating advance payment:', paymentId, paymentData);
      
      const backendPaymentData = {
        amount: paymentData.amount ? parseFloat(paymentData.amount) : undefined,
        description: paymentData.description,
        date: paymentData.date ? new Date(paymentData.date).toISOString() : undefined,
        type: paymentData.type,
        category: paymentData.category
      };

      const response = await api.put(`/advance-payments/${paymentId}`, backendPaymentData);
      const result = handleResponse(response);
      
      console.log('✅ Advance payment updated in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error updating advance payment:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteAdvancePayment: async (paymentId) => {
    try {
      console.log('🗑️ Deleting advance payment from backend:', paymentId);
      const response = await api.delete(`/advance-payments/${paymentId}`);
      const result = handleResponse(response);
      
      console.log('✅ Advance payment deleted from backend');
      return result;
    } catch (error) {
      console.error('❌ Error deleting advance payment:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ==================== ADVANCE PAYMENT UTILITIES ====================
  validateAdvancePayment: (worker, amount) => {
    const workerStats = calculateWorkerStats(worker);
    const advanceAmount = parseFloat(amount);
    
    if (isNaN(advanceAmount) || advanceAmount <= 0) {
      return { isValid: false, error: 'Please enter a valid amount greater than 0' };
    }
    
    if (advanceAmount > workerStats.finalPayment) {
      return { 
        isValid: false, 
        error: `Advance amount cannot exceed remaining salary of $${workerStats.finalPayment.toFixed(2)}!` 
      };
    }
    
    return { isValid: true, error: null };
  },

  calculateWorkerStats: calculateWorkerStats,

  // ==================== WORKERS ====================
  getWorkers: async () => {
    try {
      const response = await api.get('/workers');
      const data = handleResponse(response);
      const workers = Array.isArray(data) ? data : (data.data || []);
      
      console.log('📦 Workers loaded from backend:', workers.length);
      return workers;
    } catch (error) {
      console.error('❌ Error fetching workers:', error.message);
      await delay(300);
      console.log('🔄 Using mock workers data');
      return [];
    }
  },

  createWorker: async (workerData) => {
    try {
      console.log('🚀 Creating worker in backend:', workerData);
      
      // Ensure data matches backend schema
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
      const result = handleResponse(response);
      
      console.log('✅ Worker created in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating worker in backend:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateWorker: async (id, workerData) => {
    try {
      console.log('🔄 Updating worker in backend:', id, workerData);
      
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
      const result = handleResponse(response);
      
      console.log('✅ Worker updated in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error updating worker in backend:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteWorker: async (id) => {
    try {
      console.log('🗑️ Deleting worker from backend:', id);
      const response = await api.delete(`/workers/${id}`);
      const result = handleResponse(response);
      
      console.log('✅ Worker deleted from backend');
      return result;
    } catch (error) {
      console.error('❌ Error deleting worker from backend:', error.message);
      throw error;
    }
  },

  // ==================== WORKER EXPENSES ====================
  getWorkerExpenses: async (workerId) => {
    try {
      console.log(`🧾 Fetching expenses for worker: ${workerId}`);
      const response = await api.get(`/workers/${workerId}/expenses`);
      const data = handleResponse(response);
      const expenses = Array.isArray(data) ? data : (data.data || []);
      console.log(`✅ Loaded ${expenses.length} expenses for worker ${workerId}`);
      return expenses;
    } catch (error) {
      console.error('❌ Error fetching worker expenses:', error.message);
      console.error('📋 Server response:', error.response?.data);
      return [];
    }
  },

  addWorkerExpense: async (workerId, expenseData) => {
    try {
      console.log('🧾 Adding worker expense:', workerId, expenseData);
      const backendExpenseData = {
        amount: parseFloat(expenseData.amount),
        description: expenseData.description?.trim() || 'Expense',
        category: expenseData.category || 'other',
        date: expenseData.date ? new Date(expenseData.date).toISOString() : new Date().toISOString()
      };

      const response = await api.post(`/workers/${workerId}/expenses`, backendExpenseData);
      const result = handleResponse(response);
      console.log('✅ Worker expense recorded:', result);
      return result;
    } catch (error) {
      console.error('❌ Error adding worker expense:', error.message);
      console.error('📋 Server response:', error.response?.data);

      if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || 'Invalid worker expense data');
      }

      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteWorkerExpense: async (workerId, expenseId) => {
    try {
      console.log('🗑️ Deleting worker expense:', workerId, expenseId);
      const response = await api.delete(`/workers/${workerId}/expenses/${expenseId}`);
      const result = handleResponse(response);
      console.log('✅ Worker expense deleted');
      return result;
    } catch (error) {
      console.error('❌ Error deleting worker expense:', error.message);
      console.error('📋 Server response:', error.response?.data);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ==================== VILLAGES ====================
  getVillages: async () => {
    try {
      const response = await api.get('/villages');
      const data = handleResponse(response);
      const villages = Array.isArray(data) ? data : (data.data || []);
      
      console.log('🏘️ Villages loaded from backend:', villages.length);
      return villages;
    } catch (error) {
      console.error('❌ Error fetching villages:', error.message);
      await delay(300);
      return [];
    }
  },

  createVillage: async (villageData) => {
    try {
      console.log('🏘️ Creating village in backend:', villageData);
      const response = await api.post('/villages', villageData);
      const result = handleResponse(response);
      
      console.log('✅ Village created in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating village:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateVillage: async (id, villageData) => {
    try {
      console.log('🔄 Updating village in backend:', id, villageData);
      const response = await api.put(`/villages/${id}`, villageData);
      const result = handleResponse(response);
      
      console.log('✅ Village updated in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error updating village:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteVillage: async (id) => {
    try {
      console.log('🗑️ Deleting village from backend:', id);
      const response = await api.delete(`/villages/${id}`);
      const result = handleResponse(response);
      
      console.log('✅ Village deleted from backend');
      return result;
    } catch (error) {
      console.error('❌ Error deleting village from backend:', error.message);
      throw error;
    }
  },

  // ==================== CUSTOMERS ====================
  getCustomers: async () => {
    try {
      const response = await api.get('/customers');
      const data = handleResponse(response);
      const customers = Array.isArray(data) ? data : (data.data || []);
      
      console.log('👥 Customers loaded from backend:', customers.length);
      return customers;
    } catch (error) {
      console.error('❌ Error fetching customers:', error.message);
      await delay(300);
      return [];
    }
  },

  createCustomer: async (customerData) => {
    try {
      console.log('👥 Creating customer in backend:', customerData);
      const response = await api.post('/customers', customerData);
      const result = handleResponse(response);
      
      console.log('✅ Customer created in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating customer:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateCustomer: async (id, customerData) => {
    try {
      console.log('🔄 Updating customer in backend:', id, customerData);
      const response = await api.put(`/customers/${id}`, customerData);
      const result = handleResponse(response);
      
      console.log('✅ Customer updated in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error updating customer:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteCustomer: async (id) => {
    try {
      console.log('🗑️ Deleting customer from backend:', id);
      const response = await api.delete(`/customers/${id}`);
      const result = handleResponse(response);
      
      console.log('✅ Customer deleted from backend');
      return result;
    } catch (error) {
      console.error('❌ Error deleting customer from backend:', error.message);
      throw error;
    }
  },

  // ==================== DASHBOARD ====================
  getDashboardStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      const data = handleResponse(response);
      return data?.data || data;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error.message);
      await delay(300);
      return {
        totalCustomers: 0,
        totalWorkers: 0,
        totalVillages: 0,
        totalCars: 0,
        monthlyRevenue: 0,
        monthlyExpenses: 0,
        activeCollections: 0,
        pendingPayments: 0
      };
    }
  },

  // ==================== REPORTS ====================
  getVillageBreakdownReport: async (month) => {
    try {
      const response = await api.get('/reports/village-breakdown', { params: { month } });
      const data = handleResponse(response);
      return data?.data || data;
    } catch (error) {
      console.error('❌ Error fetching village breakdown report:', error.message);
      await delay(300);
      throw error;
    }
  },

  // ==================== EXPENSES (General) ====================
  getExpenses: async (filters = {}) => {
    try {
      const response = await api.get('/expenses', { params: filters });
      const data = handleResponse(response);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error('❌ Error fetching expenses:', error.message);
      await delay(300);
      return [];
    }
  },

  createExpense: async (expenseData) => {
    try {
      console.log('🧾 Creating expense in backend:', expenseData);
      const response = await api.post('/expenses', expenseData);
      const result = handleResponse(response);
      
      console.log('✅ Expense created in backend');
      return result;
    } catch (error) {
      console.error('❌ Error creating expense:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ==================== CARS ====================
  getCars: async () => {
    try {
      const response = await api.get('/cars');
      const data = handleResponse(response);
      const cars = Array.isArray(data) ? data : (data.data || []);
      
      console.log('🚗 Cars loaded from backend:', cars.length);
      return cars;
    } catch (error) {
      console.error('❌ Error fetching cars:', error.message);
      await delay(300);
      return [];
    }
  },

  getCar: async (id) => {
    try {
      const response = await api.get(`/cars/${id}`);
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Error fetching car:', error.message);
      throw error;
    }
  },

  createCar: async (carData) => {
    try {
      console.log('🚗 Creating car in backend:', carData);
      const response = await api.post('/cars', carData);
      const result = handleResponse(response);
      
      console.log('✅ Car created in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating car:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateCar: async (id, carData) => {
    try {
      console.log('🔄 Updating car in backend:', id, carData);
      const response = await api.put(`/cars/${id}`, carData);
      const result = handleResponse(response);
      
      console.log('✅ Car updated in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error updating car:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteCar: async (id) => {
    try {
      console.log('🗑️ Deleting car from backend:', id);
      const response = await api.delete(`/cars/${id}`);
      const result = handleResponse(response);
      
      console.log('✅ Car deleted from backend');
      return result;
    } catch (error) {
      console.error('❌ Error deleting car from backend:', error.message);
      throw error;
    }
  },

  // ==================== CAR EXPENSES ====================
  addCarExpense: async (carId, expenseData) => {
    try {
      console.log('💰 Adding car expense:', carId, expenseData);
      const response = await api.post(`/cars/${carId}/expenses`, expenseData);
      const result = handleResponse(response);
      
      console.log('✅ Car expense added successfully');
      return result;
    } catch (error) {
      console.error('❌ Error adding car expense:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateCarExpense: async (carId, expenseId, expenseData) => {
    try {
      console.log('🔄 Updating car expense:', carId, expenseId, expenseData);
      const response = await api.put(`/cars/${carId}/expenses/${expenseId}`, expenseData);
      const result = handleResponse(response);
      
      console.log('✅ Car expense updated successfully');
      return result;
    } catch (error) {
      console.error('❌ Error updating car expense:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteCarExpense: async (carId, expenseId) => {
    try {
      console.log('🗑️ Deleting car expense:', carId, expenseId);
      const response = await api.delete(`/cars/${carId}/expenses/${expenseId}`);
      const result = handleResponse(response);
      
      console.log('✅ Car expense deleted successfully');
      return result;
    } catch (error) {
      console.error('❌ Error deleting car expense:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ==================== ZONES ====================
  getZones: async () => {
    try {
      console.log('📍 Fetching zones from backend...');
      const response = await api.get('/zones');
      const data = handleResponse(response);
      const zones = Array.isArray(data) ? data : (data.data || []);
      
      console.log(`✅ Loaded ${zones.length} zones from backend`);
      return zones;
    } catch (error) {
      console.error('❌ Error fetching zones:', error.message);
      console.error('📋 Server response:', error.response?.data);
      await delay(300);
      return [];
    }
  },

  getZone: async (id) => {
    try {
      console.log(`📍 Fetching zone with ID: ${id}`);
      const response = await api.get(`/zones/${id}`);
      const result = handleResponse(response);
      
      console.log('✅ Zone loaded from backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error fetching zone:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  createZone: async (zoneData) => {
    try {
      console.log('📍 Creating zone in backend:', zoneData);
      
      // Ensure data matches backend schema
      const backendZoneData = {
        name: zoneData.name,
        description: zoneData.description || '',
        supervisor: zoneData.supervisor || '',
        contactNumber: zoneData.contactNumber || '',
        notes: zoneData.notes || '',
        zoneNumber: zoneData.zoneNumber,
        code: zoneData.code || `ZONE${zoneData.zoneNumber}`,
        status: zoneData.status || 'active'
      };

      const response = await api.post('/zones', backendZoneData);
      const result = handleResponse(response);
      
      console.log('✅ Zone created in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating zone:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateZone: async (id, zoneData) => {
    try {
      console.log('🔄 Updating zone in backend:', id, zoneData);
      
      const backendZoneData = {
        name: zoneData.name,
        description: zoneData.description || '',
        supervisor: zoneData.supervisor || '',
        contactNumber: zoneData.contactNumber || '',
        notes: zoneData.notes || '',
        zoneNumber: zoneData.zoneNumber,
        code: zoneData.code,
        status: zoneData.status || 'active'
      };

      const response = await api.put(`/zones/${id}`, backendZoneData);
      const result = handleResponse(response);
      
      console.log('✅ Zone updated in backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error updating zone:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteZone: async (id) => {
    try {
      console.log('🗑️ Deleting zone from backend:', id);
      const response = await api.delete(`/zones/${id}`);
      const result = handleResponse(response);
      
      console.log('✅ Zone deleted from backend');
      return result;
    } catch (error) {
      console.error('❌ Error deleting zone from backend:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ==================== ZONE REPORTS ====================
  getZoneReports: async (zoneId, startDate, endDate) => {
    try {
      console.log(`📊 Fetching reports for zone ${zoneId} from ${startDate} to ${endDate}`);
      const response = await api.get(`/zones/${zoneId}/reports`, {
        params: { startDate, endDate }
      });
      const result = handleResponse(response);
      
      console.log('✅ Zone reports loaded from backend');
      return result;
    } catch (error) {
      console.error('❌ Error fetching zone reports:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  getZonePerformance: async (zoneId, period = 'monthly') => {
    try {
      console.log(`📈 Fetching performance for zone ${zoneId} for ${period}`);
      const response = await api.get(`/zones/${zoneId}/performance`, {
        params: { period }
      });
      const result = handleResponse(response);
      
      console.log('✅ Zone performance loaded from backend');
      return result;
    } catch (error) {
      console.error('❌ Error fetching zone performance:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ==================== REPORTS ====================
  getFinancialReports: async (startDate, endDate) => {
    try {
      console.log(`📈 Fetching financial reports from ${startDate} to ${endDate}`);
      const response = await api.get('/reports/financial', {
        params: { startDate, endDate }
      });
      const result = handleResponse(response);
      
      console.log('✅ Financial reports loaded from backend');
      return result;
    } catch (error) {
      console.error('❌ Error fetching financial reports:', error.message);
      await delay(300);
      return {};
    }
  },

  // ==================== TEST ALL ROUTES ====================
  testRoutes: async () => {
    try {
      console.log('🧪 Testing all backend routes...');
      const response = await api.get('/test');
      const result = handleResponse(response);
      
      console.log('✅ All routes test passed');
      return result;
    } catch (error) {
      console.error('❌ Route test failed:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  // ==================== COMPATIBILITY METHODS ====================
  // For backward compatibility with existing code
  healthCheck: async () => {
    return apiService.getHealth();
  },

  getWithdrawStats: async () => {
    return apiService.getWithdrawStats();
  },

  // ==================== AUTHENTICATION ====================
  login: async (credentials) => {
    try {
      console.log('🔐 Attempting login with credentials:', { 
        username: credentials.username,
        hasPassword: !!credentials.password 
      });
      
      const response = await api.post('/auth/login', credentials);
      const data = handleResponse(response);
      
      console.log('✅ Login successful, received:', {
        hasToken: !!data.token,
        hasUser: !!data.user,
        userRole: data.user?.role
      });
      
      return data;
    } catch (error) {
      console.error('❌ Login API error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      
      // Throw specific error messages for better UX
      if (error.response?.status === 401) {
        throw new Error('Invalid username or password');
      } else if (error.response?.status === 503) {
        throw new Error('Database connection failed. Please try again later.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Login failed. Please check your connection and try again.');
      }
    }
  },

  verifyToken: async (token) => {
    try {
      console.log('🔍 Verifying authentication token...');
      
      const response = await api.get('/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = handleResponse(response);
      console.log('✅ Token verification successful');
      return data;
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Session expired. Please login again.');
      } else if (error.response?.status === 503) {
        throw new Error('Database connection failed.');
      }
      
      throw new Error('Authentication failed. Please login again.');
    }
  },

  getHealth: async () => {
    try {
      console.log('🏥 Performing backend health check...');
      const response = await api.get('/health');
      const result = handleResponse(response);
      
      console.log('✅ Backend health check passed');
      return result;
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      throw new Error('Backend server is not responding');
    }
  },

  // ==================== WITHDRAWALS ====================
  getWithdraws: async (filters = {}) => {
    try {
      const response = await api.get('/withdraws', { params: filters });
      const data = handleResponse(response);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error('❌ Error fetching withdraws:', error.message);
      await delay(300);
      return [];
    }
  },

  getWithdrawals: async (filters = {}) => {
    try {
      const response = await api.get('/withdrawals', { params: filters });
      const data = handleResponse(response);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error('❌ Error fetching withdrawals:', error.message);
      await delay(300);
      return [];
    }
  },

  createWithdraw: async (withdrawData) => {
    try {
      console.log('💸 Creating withdraw in backend:', withdrawData);
      const response = await api.post('/withdraws', withdrawData);
      const result = handleResponse(response);
      
      console.log('✅ Withdraw created in backend');
      return result;
    } catch (error) {
      console.error('❌ Error creating withdraw:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  createWithdrawal: async (withdrawalData) => {
    try {
      console.log('💸 Creating withdrawal in backend:', withdrawalData);
      const response = await api.post('/withdrawals', withdrawalData);
      const result = handleResponse(response);
      
      console.log('✅ Withdrawal created in backend');
      return result;
    } catch (error) {
      console.error('❌ Error creating withdrawal:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateWithdraw: async (id, withdrawData) => {
    try {
      console.log('🔄 Updating withdraw in backend:', id, withdrawData);
      const response = await api.put(`/withdraws/${id}`, withdrawData);
      const result = handleResponse(response);
      
      console.log('✅ Withdraw updated in backend');
      return result;
    } catch (error) {
      console.error('❌ Error updating withdraw:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateWithdrawStatus: async (id, statusData) => {
    try {
      console.log('🔄 Updating withdraw status:', id, statusData);
      const response = await api.patch(`/withdraws/${id}/status`, statusData);
      const result = handleResponse(response);
      
      console.log('✅ Withdraw status updated in backend');
      return result;
    } catch (error) {
      console.error('❌ Error updating withdraw status:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteWithdraw: async (id) => {
    try {
      console.log('🗑️ Deleting withdraw from backend:', id);
      const response = await api.delete(`/withdraws/${id}`);
      const result = handleResponse(response);
      
      console.log('✅ Withdraw deleted from backend');
      return result;
    } catch (error) {
      console.error('❌ Error deleting withdraw from backend:', error.message);
      throw error;
    }
  },

  getWithdrawsSummary: async () => {
    try {
      const response = await api.get('/withdraws/summary');
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Error fetching withdraws summary:', error.message);
      return {
        totalWithdraws: 0,
        totalRecords: 0,
        withdrawsByType: {}
      };
    }
  },

  // ==================== WITHDRAWAL STATS ====================
  getWithdrawStats: async () => {
    try {
      console.log('📊 Fetching withdrawal stats...');
      const response = await api.get('/withdraws/stats');
      const data = handleResponse(response);
      
      console.log('✅ Withdrawal stats loaded:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching withdrawal stats:', error.message);
      
      // Return fallback stats
      return {
        totalWithdrawn: 0,
        pendingCount: 0,
        approvedCount: 0,
        completedCount: 0,
        rejectedCount: 0
      };
    }
  },

  // ==================== COMPANY EXPENSES ====================
  getCompanyExpenses: async () => {
    try {
      const response = await api.get('/company-expenses');
      const data = handleResponse(response);
      const expenses = Array.isArray(data) ? data : (data.data || []);
      
      console.log('💰 Company expenses loaded from backend:', expenses.length);
      return expenses;
    } catch (error) {
      console.error('❌ Error fetching company expenses:', error.message);
      await delay(300);
      console.log('🔄 Using mock company expenses data');
      return [];
    }
  },

  createCompanyExpense: async (expenseData) => {
    try {
      console.log('💰 Creating company expense in backend:', expenseData);
      
      // Ensure data matches backend schema
      const backendExpenseData = {
        type: expenseData.type,
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        employeeName: expenseData.employeeName || '',
        category: expenseData.category,
        notes: expenseData.notes || '',
        date: expenseData.date ? new Date(expenseData.date).toISOString() : new Date().toISOString()
      };

      const response = await api.post('/company-expenses', backendExpenseData);
      const result = handleResponse(response);
      
      console.log('✅ Company expense created in backend');
      return result;
    } catch (error) {
      console.error('❌ Error creating company expense:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateCompanyExpense: async (id, expenseData) => {
    try {
      console.log('🔄 Updating company expense in backend:', id, expenseData);
      
      const backendExpenseData = {
        type: expenseData.type,
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        employeeName: expenseData.employeeName || '',
        category: expenseData.category,
        notes: expenseData.notes || '',
        date: expenseData.date ? new Date(expenseData.date).toISOString() : undefined
      };

      const response = await api.put(`/company-expenses/${id}`, backendExpenseData);
      const result = handleResponse(response);
      
      console.log('✅ Company expense updated in backend');
      return result;
    } catch (error) {
      console.error('❌ Error updating company expense:', error.message);
      console.error('📋 Server response:', error.response?.data);
      
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteCompanyExpense: async (id) => {
    try {
      console.log('🗑️ Deleting company expense from backend:', id);
      const response = await api.delete(`/company-expenses/${id}`);
      const result = handleResponse(response);
      
      console.log('✅ Company expense deleted from backend');
      return result;
    } catch (error) {
      console.error('❌ Error deleting company expense from backend:', error.message);
      throw error;
    }
  },

  getCompanyExpensesSummary: async () => {
    try {
      const response = await api.get('/company-expenses/summary');
      return handleResponse(response);
    } catch (error) {
      console.error('❌ Error fetching company expenses summary:', error.message);
      return {
        totalExpenses: 0,
        totalRecords: 0,
        expensesByType: {}
      };
    }
  },

  // ==================== FALLBACK DATA ====================
  getFallbackZones: () => {
    console.log('🔄 Using fallback zones data');
    return {
      data: [
        {
          _id: '1',
          name: 'Downtown Zone',
          description: 'Central business district area',
          supervisor: 'John Smith',
          contactNumber: '+1234567890',
          notes: 'High density area',
          listNumber: 1,
          zoneNumber: 1,
          code: 'ZONE001',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: '2',
          name: 'Residential North',
          description: 'Northern residential neighborhoods',
          supervisor: 'Maria Garcia',
          contactNumber: '+1234567891',
          notes: 'Medium density residential area',
          listNumber: 2,
          zoneNumber: 2,
          code: 'ZONE002',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };
  },

  getFallbackCustomers: () => {
    console.log('🔄 Using fallback customers data');
    return {
      data: [
        {
          _id: '1',
          fullName: 'Customer One',
          phoneNumber: '+1234567890',
          address: '123 Main St',
          monthlyFee: 50,
          villageId: '1',
          zoneId: '1',
          payments: {
            [new Date().toISOString().split('T')[0].substring(0, 7)]: { 
              paid: 50, 
              remaining: 0, 
              fullyPaid: true 
            }
          }
        },
        {
          _id: '2',
          fullName: 'Customer Two',
          phoneNumber: '+1234567891',
          address: '456 Oak Ave',
          monthlyFee: 45,
          villageId: '2',
          zoneId: '2',
          payments: {
            [new Date().toISOString().split('T')[0].substring(0, 7)]: { 
              paid: 25, 
              remaining: 20, 
              fullyPaid: false 
            }
          }
        }
      ]
    };
  },

  // ==================== USER MANAGEMENT ====================
  getUsers: async () => {
    try {
      console.log('👥 Fetching all users');
      const response = await api.get('/users');
      const result = handleResponse(response);
      console.log('✅ Users fetched:', result);
      return Array.isArray(result) ? result : (result.data || []);
    } catch (error) {
      console.error('❌ Error fetching users:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  getUser: async (userId) => {
    try {
      console.log('👤 Fetching user:', userId);
      const response = await api.get(`/users/${userId}`);
      const result = handleResponse(response);
      console.log('✅ User fetched:', result);
      return result.data || result;
    } catch (error) {
      console.error('❌ Error fetching user:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  createUser: async (userData) => {
    try {
      console.log('➕ Creating user:', userData);
      const response = await api.post('/users', userData);
      const result = handleResponse(response);
      console.log('✅ User created:', result);
      return result.data || result;
    } catch (error) {
      console.error('❌ Error creating user:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateUser: async (userId, userData) => {
    try {
      console.log('🔄 Updating user:', userId, userData);
      const response = await api.put(`/users/${userId}`, userData);
      const result = handleResponse(response);
      console.log('✅ User updated:', result);
      return result.data || result;
    } catch (error) {
      console.error('❌ Error updating user:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteUser: async (userId) => {
    try {
      console.log('🗑️ Deleting user:', userId);
      const response = await api.delete(`/users/${userId}`);
      const result = handleResponse(response);
      console.log('✅ User deleted:', result);
      return result;
    } catch (error) {
      console.error('❌ Error deleting user:', error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  }
};

export default apiService;
