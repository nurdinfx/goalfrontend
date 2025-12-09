import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Car, User, DollarSign, Palette, Printer, Phone, FileText } from 'lucide-react';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

// Get current month function
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const Cars = () => {
  const [cars, setCars] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCarModal, setShowCarModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [formErrors, setFormErrors] = useState({});
  
  const [showExpenseHistoryModal, setShowExpenseHistoryModal] = useState(false);
  const [expenseHistoryCar, setExpenseHistoryCar] = useState(null);

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // API functions
  const apiRequest = async (url, options = {}) => {
    const token = getAuthToken();
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      ...options
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  // Load data from backend
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (expenseHistoryCar) {
      const latestCar = cars.find(car => car._id === expenseHistoryCar._id);
      if (latestCar) {
        setExpenseHistoryCar(latestCar);
      }
    }
  }, [cars]);

  const loadData = async () => {
    try {
      setLoading(true);
      const carsData = await apiRequest('/cars');
      setCars(Array.isArray(carsData?.data) ? carsData.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data: ' + error.message);
      setCars([]);
    } finally {
      setLoading(false);
    }
  };

  const formatExpenseDate = (value) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'N/A';
    }
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter cars
  const filteredCars = cars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    return (
      car.plateNumber?.toLowerCase().includes(searchLower) ||
      car.carType?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate car statistics
  const calculateCarStats = (car) => {
    const totalExpenses = car.expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    return { totalExpenses };
  };

  const getSortedExpenses = (car) => {
    return [...(car?.expenses || [])].sort((a, b) => {
      const dateA = new Date(a.expenseDate || a.date || 0);
      const dateB = new Date(b.expenseDate || b.date || 0);
      return dateB - dateA;
    });
  };

  // Validate car form
  const validateCarForm = (formData) => {
    const errors = {};
    
    if (!formData.plateNumber?.trim()) {
      errors.plateNumber = 'Plate number is required';
    }
    
    if (!formData.carType?.trim()) {
      errors.carType = 'Car type is required';
    }
    
    return errors;
  };

  // Validate expense form
  const validateExpenseForm = (formData) => {
    const errors = {};
    
    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    if (!formData.type?.trim()) {
      errors.type = 'Expense type is required';
    }
    
    if (!formData.description?.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!formData.expenseDate) {
      errors.expenseDate = 'Expense date is required';
    }

    return errors;
  };

  // Add/Edit car
  const handleCarSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});
    
    const formData = new FormData(e.target);
    const carData = {
      plateNumber: formData.get('plateNumber').trim(),
      carType: formData.get('carType').trim(),
      status: formData.get('status') || 'active'
    };

    // Validate form data
    const errors = validateCarForm(carData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setLoading(false);
      return;
    }

    try {
      if (editingCar) {
        const updatedCar = await apiRequest(`/cars/${editingCar._id}`, {
          method: 'PUT',
          body: JSON.stringify(carData)
        });
        setCars(prev => prev.map(c => 
          c._id === editingCar._id ? updatedCar.data : c
        ));
      } else {
        const newCar = await apiRequest('/cars', {
          method: 'POST',
          body: JSON.stringify(carData)
        });
        setCars(prev => [...prev, newCar.data]);
      }
      setShowCarModal(false);
      setEditingCar(null);
      setFormErrors({});
      alert('Car saved successfully!');
    } catch (error) {
      console.error('Error saving car:', error);
      alert('Error saving car: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add/Edit expense
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCar) return;

    setLoading(true);
    setFormErrors({});
    
    const formData = new FormData(e.target);
    const expenseData = {
      amount: parseFloat(formData.get('amount')) || 0,
      type: formData.get('type').trim(),
      description: formData.get('description').trim(),
      expenseDate: formData.get('expenseDate') || new Date().toISOString().split('T')[0]
    };

    // Validate form data
    const errors = validateExpenseForm(expenseData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setLoading(false);
      return;
    }

    try {
      if (editingExpense?._id) {
        const updatedCar = await apiRequest(`/cars/${selectedCar._id}/expenses/${editingExpense._id}`, {
          method: 'PUT',
          body: JSON.stringify(expenseData)
        });
        setCars(prev => prev.map(c => 
          c._id === selectedCar._id ? updatedCar.data : c
        ));
      } else {
        const updatedCar = await apiRequest(`/cars/${selectedCar._id}/expenses`, {
          method: 'POST',
          body: JSON.stringify(expenseData)
        });
        setCars(prev => prev.map(c => 
          c._id === selectedCar._id ? updatedCar.data : c
        ));
      }
      setShowExpenseModal(false);
      setEditingExpense(null);
      setSelectedCar(null);
      setFormErrors({});
      alert('Expense saved successfully!');
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete car
  const handleDeleteCar = async (carId) => {
    if (window.confirm('Are you sure you want to delete this car?')) {
      try {
        await apiRequest(`/cars/${carId}`, { method: 'DELETE' });
        setCars(prev => prev.filter(c => c._id !== carId));
        alert('Car deleted successfully!');
      } catch (error) {
        console.error('Error deleting car:', error);
        alert('Error deleting car: ' + error.message);
      }
    }
  };

  // Delete expense
  const handleDeleteExpense = async (carId, expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const updatedCar = await apiRequest(`/cars/${carId}/expenses/${expenseId}`, { 
          method: 'DELETE' 
        });
        setCars(prev => prev.map(c => 
          c._id === carId ? updatedCar.data : c
        ));
        alert('Expense deleted successfully!');
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense: ' + error.message);
      }
    }
  };

  // Open expense modal
  const openExpenseModal = (car, expense = null) => {
    setSelectedCar(car);
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const openExpenseHistory = (car) => {
    setExpenseHistoryCar(car);
    setShowExpenseHistoryModal(true);
  };

  

  // Print function - FIXED
  const handlePrintCarList = () => {
    const printContent = generatePrintContent();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Car Management Report</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              font-size: 12px;
              line-height: 1.4;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .print-header h1 {
              margin: 0;
              font-size: 24px;
              color: #2c5282;
            }
            .print-header p {
              margin: 5px 0;
              color: #666;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 20px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .stat-item {
              text-align: center;
              padding: 10px;
            }
            .stat-value {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .stat-label {
              font-size: 11px;
              color: #666;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 10px;
            }
            .print-table th {
              background-color: #2c5282;
              color: white;
              padding: 8px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #ddd;
            }
            .print-table td {
              padding: 8px;
              border: 1px solid #ddd;
            }
            .print-table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .status-active {
              color: #059669;
              font-weight: bold;
            }
            .status-maintenance {
              color: #d97706;
              font-weight: bold;
            }
            .status-inactive {
              color: #dc2626;
              font-weight: bold;
            }
            .print-footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 11px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      // Optional: close window after printing
      // printWindow.afterprint = () => printWindow.close();
    }, 250);
  };

  // Generate print content
  const generatePrintContent = () => {
    const totalCars = cars.length;
    const activeCars = cars.filter(car => car.status === 'active').length;
    const totalExpenses = cars.reduce((sum, car) => sum + (car.expenses?.reduce((expSum, exp) => expSum + exp.amount, 0) || 0), 0);
    const totalExpenseEntries = cars.reduce((sum, car) => sum + (car.expenses?.length || 0), 0);
    const printedDate = new Date().toLocaleDateString();
    const printedTime = new Date().toLocaleTimeString();

    return `
      <div class="print-header">
        <h1>Car Management Report</h1>
        <p>Generated on ${printedDate} at ${printedTime}</p>
        <p>Period: ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${totalCars}</div>
          <div class="stat-label">Total Cars</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${activeCars}</div>
          <div class="stat-label">Active Cars</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">$${totalExpenses.toFixed(2)}</div>
          <div class="stat-label">Total Expenses</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${totalExpenseEntries}</div>
          <div class="stat-label">Expense Entries</div>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Plate Number</th>
            <th>Car Type</th>
            <th>Status</th>
            <th>Total Expenses</th>
            <th>Expense Count</th>
            <th>Last Expense Date</th>
          </tr>
        </thead>
        <tbody>
          ${filteredCars.map((car, index) => {
            const { totalExpenses } = calculateCarStats(car);
            const sortedExpenses = getSortedExpenses(car);
            const latestExpense = sortedExpenses[0];
            const statusClass = `status-${car.status}`;
            
            return `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${car.plateNumber}</strong></td>
                <td>${car.carType}</td>
                <td class="${statusClass}">${car.status?.toUpperCase()}</td>
                <td>$${totalExpenses.toFixed(2)}</td>
                <td>${car.expenses?.length || 0}</td>
                <td>${latestExpense ? formatExpenseDate(latestExpense.expenseDate || latestExpense.date) : 'N/A'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="print-footer">
        <p>Total Records: ${filteredCars.length} | Generated by Car Management System</p>
        <p>This report is generated automatically and contains confidential business information</p>
      </div>
    `;
  };

  // Statistics
  const totalCars = cars.length;
  const activeCars = cars.filter(car => car.status === 'active').length;
  const totalExpenses = cars.reduce((sum, car) => sum + (car.expenses?.reduce((expSum, exp) => expSum + exp.amount, 0) || 0), 0);
  const totalExpenseEntries = cars.reduce((sum, car) => sum + (car.expenses?.length || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Car Management</h1>
          <p className="text-gray-600 mt-2">Manage cars and expenses</p>
        </div>
        <button
          onClick={() => {
            setEditingCar(null);
            setShowCarModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Car
        </button>
      </div>

      

      {/* Rest of your existing component remains exactly the same */}
      {/* Expense History Modal, Stats, Search and Controls, Cars Table, Modals */}
      
      {/* Expense History Modal */}
      {showExpenseHistoryModal && expenseHistoryCar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-2">
              Expense History - {expenseHistoryCar.plateNumber}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Type: {expenseHistoryCar.carType || 'N/A'}
            </p>

            {(() => {
              const entries = getSortedExpenses(expenseHistoryCar);
              const total = entries.reduce((sum, expense) => sum + (expense.amount || 0), 0);
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                      <p className="text-xs uppercase text-blue-600">Total Expenses</p>
                      <p className="text-xl font-semibold text-blue-900">${total.toFixed(2)}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 p-3 rounded-lg">
                      <p className="text-xs uppercase text-green-600">Entries Recorded</p>
                      <p className="text-xl font-semibold text-green-900">{entries.length}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg">
                      <p className="text-xs uppercase text-purple-600">Most Recent</p>
                      <p className="text-sm font-semibold text-purple-900">
                        {entries.length > 0 ? formatExpenseDate(entries[0].expenseDate || entries[0].date) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {entries.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {entries.map((expense) => (
                            <tr key={expense._id || `${expense.type}-${expense.expenseDate}`}>
                              <td className="px-4 py-2 text-gray-900">
                                {formatExpenseDate(expense.expenseDate || expense.date)}
                              </td>
                              <td className="px-4 py-2 text-gray-700 capitalize">{expense.type}</td>
                              <td className="px-4 py-2 text-gray-600">{expense.description || 'No description'}</td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-900">
                                ${Number(expense.amount || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                      No expenses recorded yet for this car.
                    </div>
                  )}
                </>
              );
            })()}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowExpenseHistoryModal(false);
                  setExpenseHistoryCar(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <Car className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Total Cars</p>
          <p className="text-xl font-semibold">{totalCars}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <User className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Active Cars</p>
          <p className="text-xl font-semibold">{activeCars}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <DollarSign className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Total Expenses</p>
          <p className="text-xl font-semibold">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <FileText className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Expense Entries</p>
          <p className="text-xl font-semibold">{totalExpenseEntries}</p>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cars by plate number or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={getCurrentMonth()}>Current Month</option>
          </select>
          <div className="flex space-x-2">
            
            <button
              onClick={handlePrintCarList}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-green-700 flex-1"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Cars Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Car Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCars.map((car, index) => {
                const { totalExpenses } = calculateCarStats(car);
                const sortedExpenses = getSortedExpenses(car);
                const latestExpense = sortedExpenses[0];
                
                return (
                  <tr key={car._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        Plate: {car.plateNumber}
                      </div>
                      <div className="text-sm text-gray-500">Type: {car.carType}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Status: <span className={`font-semibold ${car.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                          {car.status?.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-900">
                          <span>Total Expenses:</span>
                          <strong>${totalExpenses.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Last Expense:</span>
                          <strong>
                            {latestExpense
                              ? formatExpenseDate(latestExpense.expenseDate || latestExpense.date)
                              : 'No entries'}
                          </strong>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          Expenses: {car.expenses?.length || 0}
                        </div>
                        {sortedExpenses.slice(0, 2).map(expense => (
                          <div key={expense._id} className="text-xs text-gray-500 truncate">
                            • {expense.type}: ${expense.amount}
                          </div>
                        ))}
                        {sortedExpenses.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{sortedExpenses.length - 2} more
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => openExpenseHistory(car)}
                        className="text-purple-600 hover:text-purple-900 p-2"
                        title="View Expenses"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openExpenseModal(car)}
                        className="text-green-600 hover:text-green-900 p-2"
                        title="Add Expense"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCar(car);
                          setShowCarModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-2"
                        title="Edit Car"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCar(car._id)}
                        className="text-red-600 hover:text-red-900 p-2"
                        title="Delete Car"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCars.length === 0 && (
          <div className="text-center py-12">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No cars found' : 'No cars registered yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Add your first car to get started'}
            </p>
            <button
              onClick={() => {
                setEditingCar(null);
                setShowCarModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2 inline" />
              Add Car
            </button>
          </div>
        )}
      </div>

      {/* Car Modal */}
      {showCarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingCar ? 'Edit Car' : 'Add New Car'}
            </h2>
            <form onSubmit={handleCarSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plate Number *
                </label>
                <input
                  type="text"
                  name="plateNumber"
                  required
                  defaultValue={editingCar?.plateNumber}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.plateNumber ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Enter plate number"
                />
                {formErrors.plateNumber && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.plateNumber}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Car Type *
                </label>
                <input
                  type="text"
                  name="carType"
                  required
                  defaultValue={editingCar?.carType}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.carType ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="e.g., Sedan, SUV, Truck"
                />
                {formErrors.carType && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.carType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editingCar?.status || 'active'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCarModal(false);
                    setEditingCar(null);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingCar ? 'Update' : 'Add')} Car
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && selectedCar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Car: {selectedCar.plateNumber} ({selectedCar.carType})
            </p>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  step="0.01"
                  min="0.01"
                  defaultValue={editingExpense?.amount}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.amount ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="0.00"
                />
                {formErrors.amount && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Type *
                </label>
                <select
                  name="type"
                  required
                  defaultValue={editingExpense?.type}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.type ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">Select type</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="fuel">Fuel</option>
                  <option value="repair">Repair</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
                {formErrors.type && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.type}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  name="description"
                  required
                  defaultValue={editingExpense?.description}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.description ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="What was this expense for?"
                />
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  name="expenseDate"
                  required
                  defaultValue={editingExpense?.expenseDate || new Date().toISOString().split('T')[0]}
                  className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.expenseDate ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
                {formErrors.expenseDate && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.expenseDate}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseModal(false);
                    setEditingExpense(null);
                    setSelectedCar(null);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingExpense ? 'Update' : 'Add')} Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cars;
