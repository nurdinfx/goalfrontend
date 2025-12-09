import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Zones from './pages/Zones';
import Customers from './pages/Customers';
import Payments from './pages/Payments';
import Workers from './pages/Workers';
import Cars from './pages/Cars';
import Reports from './pages/Reports';
import VillageDetail from './pages/VillageDetail';
import VillageDetails from './pages/VillageDetails';
import CompanyExpenses from './pages/CompanyExpenses';
import Withdraws from './pages/Withdraws';
import Users from './pages/Users';
import Login from './pages/Login';
import { Toaster } from 'react-hot-toast';
import { apiService } from './services/api';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppContent() {
  const { user } = useAuth();
  const [villages, setVillages] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [companyExpenses, setCompanyExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setDataLoading(true);
      
      const [villagesRes, customersRes, workersRes, carsRes] = await Promise.allSettled([
        apiService.getVillages(),
        apiService.getCustomers(),
        apiService.getWorkers(),
        apiService.getCars()
      ]);

      setVillages(
        villagesRes.status === 'fulfilled'
          ? (Array.isArray(villagesRes.value) ? villagesRes.value : (villagesRes.value?.data || []))
          : []
      );
      setCustomers(
        customersRes.status === 'fulfilled'
          ? (Array.isArray(customersRes.value) ? customersRes.value : (customersRes.value?.data || []))
          : []
      );
      setWorkers(
        workersRes.status === 'fulfilled'
          ? (Array.isArray(workersRes.value) ? workersRes.value : (workersRes.value?.data || []))
          : []
      );
      setCars(
        carsRes.status === 'fulfilled'
          ? (Array.isArray(carsRes.value) ? carsRes.value : (carsRes.value?.cars || carsRes.value?.data || []))
          : []
      );

      // Initialize empty arrays for other data
      setCompanyExpenses([]);
      setEmployees([]);
      setWithdraws([]);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // CRUD operations for villages
  const addVillage = async (villageData: any) => {
    try {
      const response = await apiService.createVillage(villageData);
      const newVillage = response.data;
      setVillages(prev => [...prev, newVillage]);
      return newVillage;
    } catch (error) {
      throw error;
    }
  };

  const updateVillage = async (id: string, updates: any) => {
    try {
      const response = await apiService.updateVillage(id, updates);
      const updatedVillage = response.data;
      setVillages(prev => prev.map(v => v._id === id ? updatedVillage : v));
      return updatedVillage;
    } catch (error) {
      throw error;
    }
  };

  const deleteVillage = async (id: string) => {
    try {
      await apiService.deleteVillage(id);
      setVillages(prev => prev.filter(v => v._id !== id));
    } catch (error) {
      throw error;
    }
  };

  // CRUD operations for customers
  const addCustomer = async (customerData: any) => {
    try {
      const response = await apiService.createCustomer(customerData);
      const newCustomer = response.data;
      setCustomers(prev => [...prev, newCustomer]);
      return newCustomer;
    } catch (error) {
      throw error;
    }
  };

  const updateCustomer = async (id: string, updates: any) => {
    try {
      const response = await apiService.updateCustomer(id, updates);
      const updatedCustomer = response.data;
      setCustomers(prev => prev.map(c => c._id === id ? updatedCustomer : c));
      return updatedCustomer;
    } catch (error) {
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await apiService.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c._id !== id));
    } catch (error) {
      throw error;
    }
  };

  // CRUD operations for workers
  const addWorker = async (workerData: any) => {
    try {
      const response = await apiService.createWorker(workerData);
      const newWorker = response.data;
      setWorkers(prev => [...prev, newWorker]);
      return newWorker;
    } catch (error) {
      throw error;
    }
  };

  const updateWorker = async (id: string, updates: any) => {
    try {
      const response = await apiService.updateWorker(id, updates);
      const updatedWorker = response.data;
      setWorkers(prev => prev.map(w => w._id === id ? updatedWorker : w));
      return updatedWorker;
    } catch (error) {
      throw error;
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      await apiService.deleteWorker(id);
      setWorkers(prev => prev.filter(w => w._id !== id));
    } catch (error) {
      throw error;
    }
  };

  // CRUD operations for cars
  const addCar = async (carData: any) => {
    try {
      const newCar = {
        _id: Date.now().toString(),
        ...carData,
        createdAt: new Date().toISOString()
      };
      setCars(prev => [...prev, newCar]);
      return newCar;
    } catch (error) {
      throw error;
    }
  };

  const updateCar = async (id: string, updates: any) => {
    try {
      const updatedCar = {
        ...updates,
        _id: id,
        updatedAt: new Date().toISOString()
      };
      setCars(prev => prev.map(c => c._id === id ? updatedCar : c));
      return updatedCar;
    } catch (error) {
      throw error;
    }
  };

  const deleteCar = async (id: string) => {
    try {
      setCars(prev => prev.filter(c => c._id !== id));
    } catch (error) {
      throw error;
    }
  };

  // Company Expenses CRUD operations
  const addCompanyExpense = async (expenseData: any) => {
    try {
      const newExpense = {
        _id: Date.now().toString(),
        ...expenseData,
        createdAt: new Date().toISOString()
      };
      setCompanyExpenses(prev => [...prev, newExpense]);
      return newExpense;
    } catch (error) {
      throw error;
    }
  };

  const updateCompanyExpense = async (id: string, updates: any) => {
    try {
      const updatedExpense = {
        ...updates,
        _id: id,
        updatedAt: new Date().toISOString()
      };
      setCompanyExpenses(prev => prev.map(e => e._id === id ? updatedExpense : e));
      return updatedExpense;
    } catch (error) {
      throw error;
    }
  };

  const deleteCompanyExpense = async (id: string) => {
    try {
      setCompanyExpenses(prev => prev.filter(e => e._id !== id));
    } catch (error) {
      throw error;
    }
  };

  // Employees CRUD operations
  const addEmployee = async (employeeData: any) => {
    try {
      const newEmployee = {
        _id: Date.now().toString(),
        ...employeeData,
        createdAt: new Date().toISOString()
      };
      setEmployees(prev => [...prev, newEmployee]);
      return newEmployee;
    } catch (error) {
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: any) => {
    try {
      const updatedEmployee = {
        ...updates,
        _id: id,
        updatedAt: new Date().toISOString()
      };
      setEmployees(prev => prev.map(e => e._id === id ? updatedEmployee : e));
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      setEmployees(prev => prev.filter(e => e._id !== id));
    } catch (error) {
      throw error;
    }
  };

  // Withdraws CRUD operations
  const addWithdraw = async (withdrawData: any) => {
    try {
      const newWithdraw = {
        _id: Date.now().toString(),
        ...withdrawData,
        referenceNumber: `WD${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setWithdraws(prev => [...prev, newWithdraw]);
      return newWithdraw;
    } catch (error) {
      throw error;
    }
  };

  const updateWithdraw = async (id: string, updates: any) => {
    try {
      const updatedWithdraw = {
        ...updates,
        _id: id,
        updatedAt: new Date().toISOString()
      };
      setWithdraws(prev => prev.map(w => w._id === id ? updatedWithdraw : w));
      return updatedWithdraw;
    } catch (error) {
      throw error;
    }
  };

  const deleteWithdraw = async (id: string) => {
    try {
      setWithdraws(prev => prev.filter(w => w._id !== id));
    } catch (error) {
      throw error;
    }
  };

  const updateWithdrawStatus = async (id: string, statusData: any) => {
    try {
      const updatedWithdraw = {
        ...statusData,
        _id: id,
        updatedAt: new Date().toISOString()
      };
      setWithdraws(prev => prev.map(w => w._id === id ? { ...w, ...updatedWithdraw } : w));
      return updatedWithdraw;
    } catch (error) {
      throw error;
    }
  };

  const refreshData = () => {
    fetchAllData();
  };

  

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={
                  <Dashboard 
                    villages={villages} 
                    customers={customers} 
                    workers={workers} 
                    companyExpenses={companyExpenses}
                    refreshData={refreshData}
                  />
                } />
                <Route path="/zones" element={
                  <Zones 
                    villages={villages} 
                    customers={customers} 
                    workers={workers} 
                    addVillage={addVillage} 
                    updateVillage={updateVillage} 
                    deleteVillage={deleteVillage} 
                    refreshData={refreshData}
                  />
                } />
                <Route path="/customers" element={
                  <Customers 
                    villages={villages} 
                    customers={customers} 
                    workers={workers} 
                    addCustomer={addCustomer} 
                    updateCustomer={updateCustomer} 
                    deleteCustomer={deleteCustomer} 
                    refreshData={refreshData}
                  />
                } />
                <Route path="/village/:idOrName" element={<VillageDetail />} />
                <Route path="/village-details" element={<VillageDetails />} />
                <Route path="/payments" element={
                  <Payments 
                    villages={villages} 
                    customers={customers} 
                    updateCustomer={updateCustomer} 
                    refreshData={refreshData}
                  />
                } />
                <Route path="/workers" element={
                  <Workers 
                    villages={villages} 
                    customers={customers} 
                    workers={workers} 
                    addWorker={addWorker} 
                    updateWorker={updateWorker} 
                    deleteWorker={deleteWorker} 
                    refreshData={refreshData}
                  />
                } />
                <Route path="/cars" element={
                  <Cars 
                    cars={cars} 
                    drivers={workers} 
                    addCar={addCar} 
                    updateCar={updateCar} 
                    deleteCar={deleteCar} 
                    loading={dataLoading} 
                    refreshData={refreshData}
                  />
                } />
                <Route path="/reports" element={
                  <Reports 
                    villages={villages} 
                    customers={customers} 
                    workers={workers} 
                    companyExpenses={companyExpenses}
                    refreshData={refreshData}
                  />
                } />
                <Route path="/company-expenses" element={
                  <CompanyExpenses 
                    companyExpenses={companyExpenses}
                    employees={employees}
                    addCompanyExpense={addCompanyExpense}
                    updateCompanyExpense={updateCompanyExpense}
                    deleteCompanyExpense={deleteCompanyExpense}
                    addEmployee={addEmployee}
                    updateEmployee={updateEmployee}
                    deleteEmployee={deleteEmployee}
                    refreshData={refreshData}
                  />
                } />
                <Route path="/withdraws" element={
                  <Withdraws 
                    withdraws={withdraws}
                    addWithdraw={addWithdraw}
                    updateWithdraw={updateWithdraw}
                    deleteWithdraw={deleteWithdraw}
                    updateWithdrawStatus={updateWithdrawStatus}
                    refreshData={refreshData}
                  />
                } />
                <Route path="/users" element={<Users />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}

export default App;
