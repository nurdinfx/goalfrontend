import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load all data once when app starts
  const loadAllData = async () => {
    try {
      setLoading(true);
      console.log('Loading all data from MongoDB...');
      
      const [customersData, villagesData, workersData, carsData] = await Promise.all([
        apiService.getCustomers(),
        apiService.getVillages(),
        apiService.getWorkers(),
        apiService.getCars()
      ]);

      setCustomers(customersData);
      setVillages(villagesData);
      setWorkers(workersData);
      setCars(carsData);
      setLastUpdated(new Date());
      
      console.log('All data loaded successfully!', {
        customers: customersData.length,
        villages: villagesData.length,
        workers: workersData.length,
        cars: carsData.length
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh specific data
  const refreshData = async (type = 'all') => {
    try {
      if (type === 'all' || type === 'customers') {
        const customersData = await apiService.getCustomers();
        setCustomers(customersData);
      }
      if (type === 'all' || type === 'villages') {
        const villagesData = await apiService.getVillages();
        setVillages(villagesData);
      }
      if (type === 'all' || type === 'workers') {
        const workersData = await apiService.getWorkers();
        setWorkers(workersData);
      }
      if (type === 'all' || type === 'cars') {
        const carsData = await apiService.getCars();
        setCars(carsData);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const value = {
    customers,
    villages,
    workers,
    cars,
    loading,
    lastUpdated,
    refreshData,
    loadAllData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};