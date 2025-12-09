import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Phone, Mail, Calendar, DollarSign, MapPin, Loader, Printer, Search, RefreshCw, CreditCard, FileText } from 'lucide-react';
import { apiService } from '../services/api';

const Workers = () => {
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedWorkerExpenses, setSelectedWorkerExpenses] = useState(null);
  const [expenseFormData, setExpenseFormData] = useState({
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
    category: 'other'
  });
  const [expenseLoading, setExpenseLoading] = useState(false);
  const expenseCategories = ['transport', 'materials', 'food', 'accommodation', 'other'];

  // Load all data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workersData, villagesData] = await Promise.all([
        apiService.getWorkers(),
        apiService.getVillages()
      ]);
      
      // Load expenses for each worker
      const workersWithExpenses = await Promise.all(
        (workersData || []).map(async (worker) => {
          try {
            const expenses = await apiService.getWorkerExpenses(worker._id);
            
            const sortedExpenses = (expenses || [])
              .map(expense => ({
                ...expense,
                date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
              }))
              .sort((a, b) => new Date(b.date) - new Date(a.date));
            
            return {
              ...worker,
              expenses: sortedExpenses
            };
          } catch (error) {
            console.error(`Error loading expenses for worker ${worker._id}:`, error);
            return {
              ...worker,
              expenses: []
            };
          }
        })
      );
      
      setWorkers(workersWithExpenses);
      setVillages(villagesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter workers based on search
  const filteredWorkers = workers.filter(worker => {
    const searchLower = searchTerm?.toLowerCase() || '';
    return (
      worker?.fullName?.toLowerCase().includes(searchLower) ||
      worker?.email?.toLowerCase().includes(searchLower) ||
      worker?.phoneNumber?.includes(searchTerm) ||
      worker?.workerId?.toLowerCase().includes(searchLower)
    );
  });

  // Generate worker ID
  const generateWorkerId = () => {
    const lastWorker = workers[workers.length - 1];
    if (!lastWorker || !lastWorker.workerId) {
      return 'W001';
    }
    
    const lastNumber = parseInt(lastWorker.workerId.replace('W', '')) || 0;
    const newNumber = lastNumber + 1;
    return `W${newNumber.toString().padStart(3, '0')}`;
  };

  // Validate form data
  const validateForm = (formData) => {
    const errors = {};
    
    if (!formData.fullName?.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!formData.phoneNumber?.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }
    if (!formData.salary || formData.salary <= 0) {
      errors.salary = 'Valid salary is required';
    }
    if (!formData.hireDate) {
      errors.hireDate = 'Hire date is required';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormErrors({});

    const formData = new FormData(e.target);
    
    const workerData = {
      fullName: formData.get('fullName').trim(),
      phoneNumber: formData.get('phoneNumber').trim(),
      email: formData.get('email')?.trim() || '',
      address: formData.get('address')?.trim() || 'Not provided',
      salary: parseFloat(formData.get('salary')) || 0,
      position: formData.get('position') || 'Worker',
      hireDate: formData.get('hireDate'),
      status: formData.get('status') || 'active',
      assignedVillages: formData.getAll('assignedVillages') || []
    };

    // Add worker ID for new workers
    if (!editingWorker) {
      workerData.workerId = generateWorkerId();
    }

    // Validate form data
    const errors = validateForm(workerData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormLoading(false);
      return;
    }

    try {
      let result;
      if (editingWorker) {
        result = await apiService.updateWorker(editingWorker._id, workerData);
        setWorkers(prev => prev.map(w => w._id === editingWorker._id ? result : w));
      } else {
        result = await apiService.createWorker(workerData);
        setWorkers(prev => [...prev, result]);
      }
      
      setShowModal(false);
      setEditingWorker(null);
      setFormErrors({});
      await loadData(); // Reload data to ensure consistency
      alert('Worker saved successfully!');
    } catch (error) {
      console.error('Error saving worker:', error);
      alert(`Failed to save worker: ${error.message || 'Please try again.'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (workerId) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      try {
        await apiService.deleteWorker(workerId);
        setWorkers(prev => prev.filter(w => w._id !== workerId));
        alert('Worker deleted successfully!');
      } catch (error) {
        console.error('Error deleting worker:', error);
        alert(`Failed to delete worker: ${error.message || 'Please try again.'}`);
      }
    }
  };

  // Worker Expense Functions
  const handleAddExpense = (worker) => {
    setSelectedWorkerExpenses(worker);
    setExpenseFormData({
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      description: '',
      category: 'other'
    });
    setShowExpenseModal(true);
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!selectedWorkerExpenses) return;

    setExpenseLoading(true);

    try {
      const expenseAmount = parseFloat(expenseFormData.amount);

      if (expenseAmount <= 0 || isNaN(expenseAmount)) {
        alert('Please enter a valid amount greater than 0');
        setExpenseLoading(false);
        return;
      }

      const expenseData = {
        amount: expenseAmount,
        description: expenseFormData.description,
        category: expenseFormData.category,
        date: expenseFormData.expenseDate
      };

      const savedExpense = await apiService.addWorkerExpense(selectedWorkerExpenses._id, expenseData);

      const formattedExpense = {
        ...savedExpense,
        date: savedExpense?.date
          ? new Date(savedExpense.date).toISOString().split('T')[0]
          : expenseFormData.expenseDate
      };

      setWorkers(prev => prev.map(worker => {
        if (worker._id === selectedWorkerExpenses._id) {
          const updatedExpenses = [...(worker.expenses || []), formattedExpense]
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          return {
            ...worker,
            expenses: updatedExpenses
          };
        }
        return worker;
      }));

      setShowExpenseModal(false);
      setSelectedWorkerExpenses(null);
      setExpenseFormData({
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        description: '',
        category: 'other'
      });

      alert('Worker expense recorded successfully!');
      await loadData();
    } catch (error) {
      console.error('❌ Error recording worker expense:', error);
      alert(`Failed to record worker expense: ${error.message || 'Please try again.'}`);
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (workerId, expenseId) => {
    if (window.confirm('Are you sure you want to delete this worker expense?')) {
      try {
        await apiService.deleteWorkerExpense(workerId, expenseId);

        setWorkers(prev => prev.map(worker => {
          if (worker._id === workerId) {
            return {
              ...worker,
              expenses: (worker.expenses || []).filter(expense => expense._id !== expenseId)
            };
          }
          return worker;
        }));

        await loadData();
        alert('Worker expense deleted successfully!');
      } catch (error) {
        console.error('Error deleting worker expense:', error);
        alert(`Failed to delete worker expense: ${error.message || 'Please try again.'}`);
      }
    }
  };

  // Calculate worker statistics
  const calculateWorkerStats = (worker) => {
    const monthlySalary = worker?.salary || worker?.monthlySalary || 0;
    const totalExpenses = worker?.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
    const finalPayment = Math.max(0, monthlySalary - totalExpenses);

    return {
      monthlySalary,
      totalExpenses,
      finalPayment,
      expenses: worker?.expenses || []
    };
  };

  // Calculate overall statistics
  const calculateOverallStats = () => {
    return workers.reduce((stats, worker) => {
      const workerStats = calculateWorkerStats(worker);
      return {
        totalWorkers: stats.totalWorkers + 1,
        activeWorkers: stats.activeWorkers + (worker?.status === 'active' ? 1 : 0),
        totalMonthlySalary: stats.totalMonthlySalary + workerStats.monthlySalary,
        totalWorkerExpenses: stats.totalWorkerExpenses + workerStats.totalExpenses,
        totalFinalPayment: stats.totalFinalPayment + workerStats.finalPayment
      };
    }, {
      totalWorkers: 0,
      activeWorkers: 0,
      totalMonthlySalary: 0,
      totalWorkerExpenses: 0,
      totalFinalPayment: 0
    });
  };

  const overallStats = calculateOverallStats();

  // Format date for display - improved to handle different date formats
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Handle both ISO string and YYYY-MM-DD formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  const selectedExpenseStats = selectedWorkerExpenses ? calculateWorkerStats(selectedWorkerExpenses) : null;
  const selectedExpenseTotalDisplay = selectedExpenseStats ? selectedExpenseStats.totalExpenses.toFixed(2) : '0.00';
  const selectedExpenseLastDate = selectedExpenseStats?.expenses?.[0]?.date
    ? formatDate(selectedExpenseStats.expenses[0].date)
    : 'N/A';

  // Print all workers - Updated version without status column
  const handlePrintAllWorkers = () => {
    const printWindow = window.open('', '_blank');
    const allWorkersData = filteredWorkers.map(worker => {
      const workerStats = calculateWorkerStats(worker);
      return {
        ...worker,
        ...workerStats
      };
    });

    const printContent = `
      <html>
        <head>
          <title>Workers Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 14px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 10px; 
            }
            .stats { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 15px; 
              margin-bottom: 20px; 
            }
            .stat-card { 
              border: 1px solid #ddd; 
              padding: 15px; 
              text-align: center; 
              border-radius: 5px; 
              background-color: #f9f9f9;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
              font-size: 12px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .total-row { 
              font-weight: bold; 
              background-color: #f0f0f0; 
            }
            @media print {
              body { margin: 0.5cm; }
              .no-print { display: none; }
            }
            @media (max-width: 768px) {
              body { margin: 10px; font-size: 12px; }
              table { font-size: 10px; }
              th, td { padding: 4px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Workers Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            <p>Total Workers: ${filteredWorkers.length}</p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <h3>Total Salary</h3>
              <p>$${overallStats.totalMonthlySalary.toFixed(2)}</p>
            </div>
            <div class="stat-card">
              <h3>Total Expenses</h3>
              <p>$${overallStats.totalWorkerExpenses.toFixed(2)}</p>
            </div>
            <div class="stat-card">
              <h3>Net Payment</h3>
              <p>$${overallStats.totalFinalPayment.toFixed(2)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Worker ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Hire Date</th>
                <th>Salary</th>
                <th>Expenses</th>
                <th>Final Pay</th>
              </tr>
            </thead>
            <tbody>
              ${allWorkersData.map((worker, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${worker.workerId || 'N/A'}</td>
                  <td>${worker.fullName}</td>
                  <td>${worker.phoneNumber}</td>
                  <td>${formatDate(worker.hireDate)}</td>
                  <td>$${worker.monthlySalary.toFixed(2)}</td>
                  <td>$${worker.totalExpenses.toFixed(2)}</td>
                  <td>$${worker.finalPayment.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const openCreateModal = () => {
    setEditingWorker(null);
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (worker) => {
    setEditingWorker(worker);
    setFormErrors({});
    setShowModal(true);
  };

  const refreshData = () => {
    loadData();
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    
    const statusText = {
      active: 'Active',
      inactive: 'Inactive'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusText[status] || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header - Responsive */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Workers Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage company workers, salaries, expenses, and village assignments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handlePrintAllWorkers}
            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center hover:bg-green-700 transition duration-200 text-sm sm:text-base flex-1 sm:flex-none"
            disabled={workers.length === 0}
          >
            <Printer className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Print All</span>
            <span className="sm:hidden">Print</span>
          </button>
          <button
            onClick={refreshData}
            className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center hover:bg-gray-700 transition duration-200 text-sm sm:text-base flex-1 sm:flex-none"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-700 transition duration-200 text-sm sm:text-base flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Add Worker</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded no-print">
          <div className="flex items-center">
            <Loader className="w-5 h-5 animate-spin mr-2" />
            Loading workers data...
          </div>
        </div>
      )}

      {/* Workers Statistics - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Total Workers</p>
          <p className="text-lg sm:text-xl font-semibold">{overallStats.totalWorkers}</p>
          <p className="text-xs text-green-600">{overallStats.activeWorkers} active</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadowSm border border-gray-200 text-center">
          <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Monthly Salary</p>
          <p className="text-lg sm:text-xl font-semibold">${overallStats.totalMonthlySalary.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Total Expenses</p>
          <p className="text-lg sm:text-xl font-semibold">${overallStats.totalWorkerExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Net Payment</p>
          <p className="text-lg sm:text-xl font-semibold">${overallStats.totalFinalPayment.toFixed(2)}</p>
        </div>
      </div>

      {/* Search - Responsive */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search workers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
            />
          </div>
          <div className="flex items-center justify-end">
            <p className="text-sm text-gray-600">
              Showing {filteredWorkers.length} of {workers.length} workers
            </p>
          </div>
        </div>
      </div>

      {/* Workers Table - Responsive */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker Info</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Contact</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Salary Info</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorkers.map((worker, index) => {
                const workerStats = calculateWorkerStats(worker);
                
                return (
                  <tr key={worker._id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-4 text-sm text-gray-500 text-center">
                      {index + 1}
                    </td>
                    <td className="px-3 sm:px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{worker.fullName}</div>
                          <div className="text-xs text-gray-500 truncate">
                            ID: {worker.workerId || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Hired: {formatDate(worker.hireDate)}
                          </div>
                          <div className="mt-1">
                            <StatusBadge status={worker.status} />
                          </div>
                          {worker.assignedVillages && worker.assignedVillages.length > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              {worker.assignedVillages.length} village(s)
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-4 hidden sm:table-cell">
                      <div className="text-sm text-gray-900 space-y-1">
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{worker.phoneNumber}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{worker.email || 'No email'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-4 hidden md:table-cell">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-900">
                          Salary: ${workerStats.monthlySalary.toFixed(2)}
                        </div>
                        <div className="text-sm font-semibold text-orange-600">
                          Expenses: ${workerStats.totalExpenses.toFixed(2)}
                        </div>
                        <div className={`text-sm font-bold ${workerStats.finalPayment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Final: ${workerStats.finalPayment.toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-4">
                      <div className="space-y-2">
                        {workerStats.expenses.length > 0 ? (
                          <div className="text-xs text-gray-600 space-y-1 max-h-24 overflow-y-auto">
                            {workerStats.expenses.slice(0, 3).map((expense) => (
                              <div key={expense._id} className="flex justify-between items-start border-b border-gray-100 pb-1">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{formatDate(expense.date)}</div>
                                  <div className="text-gray-400 text-xs capitalize">{expense.category || 'other'}</div>
                                  {expense.description && expense.description !== 'Expense' && (
                                    <div className="text-gray-400 text-xs truncate">{expense.description}</div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                                  <span className="font-semibold text-xs">${expense.amount.toFixed(2)}</span>
                                  <button
                                    onClick={() => handleDeleteExpense(worker._id, expense._id)}
                                    className="text-red-500 hover:text-red-700 text-xs ml-1"
                                    title="Delete expense"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {workerStats.expenses.length > 3 && (
                              <div className="text-xs text-gray-500 text-center pt-1">
                                +{workerStats.expenses.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No expenses</span>
                        )}
                        <button
                          onClick={() => handleAddExpense(worker)}
                          className="text-xs px-3 py-2 rounded transition duration-200 mt-2 w-full bg-orange-600 text-white hover:bg-orange-700"
                        >
                          Add Expense
                        </button>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-4">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => openEditModal(worker)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded transition duration-200 border border-blue-200 hover:bg-blue-50 flex items-center justify-center"
                          title="Edit Worker"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(worker._id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded transition duration-200 border border-red-200 hover:bg-red-50 flex items-center justify-center"
                          title="Delete Worker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredWorkers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No workers found' : 'No workers registered yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first worker'}
              </p>
              {!searchTerm && (
                <button
                  onClick={openCreateModal}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  <Plus className="w-5 h-5 mr-2 inline" />
                  Add Worker
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingWorker ? 'Edit Worker Information' : 'Add New Worker'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Worker ID Display */}
              {editingWorker && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Worker ID
                  </label>
                  <div className="text-lg font-semibold text-blue-800">
                    {editingWorker.workerId || 'N/A'}
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Worker ID cannot be changed
                  </p>
                </div>
              )}

              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      defaultValue={editingWorker?.fullName}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${
                        formErrors.fullName ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Enter full name"
                    />
                    {formErrors.fullName && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      required
                      defaultValue={editingWorker?.phoneNumber}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${
                        formErrors.phoneNumber ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {formErrors.phoneNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.phoneNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingWorker?.email}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      name="position"
                      defaultValue={editingWorker?.position || 'Worker'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                      placeholder="Enter position"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hire Date *
                    </label>
                    <input
                      type="date"
                      name="hireDate"
                      required
                      defaultValue={editingWorker?.hireDate ? new Date(editingWorker.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${
                        formErrors.hireDate ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                    />
                    {formErrors.hireDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.hireDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary ($) *
                    </label>
                    <input
                      type="number"
                      name="salary"
                      required
                      min="0"
                      step="0.01"
                      defaultValue={editingWorker?.salary || editingWorker?.monthlySalary}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${
                        formErrors.salary ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Enter salary"
                    />
                    {formErrors.salary && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.salary}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    name="address"
                    rows="2"
                    defaultValue={editingWorker?.address}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Village Assignments */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Village Assignments</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Villages</label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {villages.map(village => (
                      <label key={village._id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="assignedVillages"
                          value={village._id}
                          defaultChecked={editingWorker?.assignedVillages?.includes(village._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {village.name} ({village.code})
                        </span>
                      </label>
                    ))}
                  </div>
                  {villages.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">No villages available. Create villages first.</p>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Additional Information</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingWorker?.status || 'active'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingWorker(null);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200 text-sm sm:text-base order-2 sm:order-1"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center text-sm sm:text-base order-1 sm:order-2"
                >
                  {formLoading && <Loader className="w-4 h-4 animate-spin mr-2" />}
                  {editingWorker ? 'Update' : 'Add'} Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker Expense Modal */}
      {showExpenseModal && selectedWorkerExpenses && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md mx-2 sm:mx-4">
            <h2 className="text-xl font-semibold mb-4">
              Record Worker Expense - {selectedWorkerExpenses.fullName}
            </h2>

            <div className="bg-orange-50 p-3 rounded-lg mb-4">
              <div className="text-sm text-orange-700 space-y-1">
                <div><strong>Worker Salary:</strong> ${((selectedWorkerExpenses?.salary || selectedWorkerExpenses?.monthlySalary || 0)).toFixed(2)}</div>
                <div><strong>Total Expenses:</strong> ${selectedExpenseTotalDisplay}</div>
                <div><strong>Remaining Salary:</strong> ${selectedExpenseStats ? selectedExpenseStats.finalPayment.toFixed(2) : '0.00'}</div>
              </div>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={expenseFormData.amount}
                  onChange={(e) => setExpenseFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  required
                  value={expenseFormData.expenseDate}
                  onChange={(e) => setExpenseFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={expenseFormData.category}
                  onChange={(e) => setExpenseFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                >
                  {expenseCategories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                  placeholder="Enter expense description"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseModal(false);
                    setSelectedWorkerExpenses(null);
                    setExpenseFormData({
                      amount: '',
                      expenseDate: new Date().toISOString().split('T')[0],
                      description: '',
                      category: 'other'
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200 text-sm sm:text-base order-2 sm:order-1"
                  disabled={expenseLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseLoading}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center text-sm sm:text-base order-1 sm:order-2"
                >
                  {expenseLoading && <Loader className="w-4 h-4 animate-spin mr-2" />}
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;
