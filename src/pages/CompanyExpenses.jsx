import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, DollarSign, Users, Printer, Search, Calendar, PieChart } from 'lucide-react';
import { apiService } from '../services/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const CompanyExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  
  const printRef = useRef();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expensesResponse, employeesResponse] = await Promise.all([
        apiService.getCompanyExpenses(),
        apiService.getWorkers()
      ]);
      
      setExpenses(expensesResponse?.data || expensesResponse || []);
      setEmployees(employeesResponse?.data || employeesResponse || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setExpenses([]);
      setEmployees([]);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    const formData = new FormData(e.target);
    const notes = formData.get('notes')?.trim() || '';
    const expenseData = {
      amount: parseFloat(formData.get('amount')),
      category: formData.get('category'),
      type: formData.get('category') || 'general',
      notes,
      description: notes || `Expense`,
      date: formData.get('date')
    };

    // Ensure date is always set - use existing date for edits or current date for new entries
    if (!expenseData.date) {
      expenseData.date = editingExpense?.date || new Date().toISOString().split('T')[0];
    }

    try {
      let result;
      if (editingExpense) {
        result = await apiService.updateCompanyExpense(editingExpense._id, expenseData);
        setExpenses(prev => prev.map(exp => 
          exp._id === editingExpense._id ? result.data : exp
        ));
      } else {
        result = await apiService.createCompanyExpense(expenseData);
        setExpenses(prev => [...prev, result.data || result]);
      }
      
      setShowExpenseModal(false);
      setEditingExpense(null);
      alert('Expense saved successfully!');
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    const formData = new FormData(e.target);
    const employeeData = {
      fullName: formData.get('name'),
      position: formData.get('position'),
      monthlySalary: parseFloat(formData.get('salary')),
      phoneNumber: formData.get('phone'),
      address: formData.get('address'),
      bankAccount: {
        bankName: formData.get('bankName'),
        accountNumber: formData.get('accountNumber')
      },
      hireDate: formData.get('hireDate') || new Date().toISOString().split('T')[0]
    };

    try {
      let result;
      if (editingEmployee) {
        result = await apiService.updateWorker(editingEmployee._id, employeeData);
        setEmployees(prev => prev.map(emp => 
          emp._id === editingEmployee._id ? result.data : emp
        ));
      } else {
        result = await apiService.createWorker(employeeData);
        setEmployees(prev => [...prev, result.data || result]);
      }
      
      setShowEmployeeModal(false);
      setEditingEmployee(null);
      alert('Employee saved successfully!');
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await apiService.deleteCompanyExpense(id);
        setExpenses(prev => prev.filter(exp => exp._id !== id));
        alert('Expense deleted successfully!');
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense: ' + error.message);
      }
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await apiService.deleteWorker(id);
        setEmployees(prev => prev.filter(emp => emp._id !== id));
        alert('Employee deleted successfully!');
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee: ' + error.message);
      }
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const expenseDate = new Date(expense.date);
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;
    
    const matchesDate = (!startDate || expenseDate >= startDate) && 
                       (!endDate || expenseDate <= endDate);
    
    return matchesSearch && matchesDate;
  });

  // Professional Print Function
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    const printDocument = printWindow.document;

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const reportDateRange = dateRange.start && dateRange.end 
      ? `${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`
      : 'All Time';

    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

    printDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Company Expenses Report</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .report-title {
              font-size: 20px;
              color: #666;
              margin-bottom: 10px;
            }
            .report-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              font-size: 14px;
              color: #666;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
              background: #f8fafc;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .summary-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #2563eb;
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .amount {
              text-align: right;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .total-row {
              background-color: #dbeafe !important;
              font-weight: bold;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">GARBAGE MANAGEMENT SYSTEM</div>
            <div class="report-title">COMPANY EXPENSES REPORT</div>
            <div class="report-info">
              <div>Generated on: ${currentDate}</div>
              <div>Period: ${reportDateRange}</div>
              <div>Total Records: ${filteredExpenses.length}</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-value">${formatCurrency(totalAmount)}</div>
              <div class="summary-label">Total Expenses</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${filteredExpenses.length}</div>
              <div class="summary-label">Total Records</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Notes</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map(expense => `
                <tr>
                  <td>${formatDate(expense.date)}</td>
                  <td>${expense.category || '-'}</td>
                  <td>${expense.notes || '-'}</td>
                  <td class="amount">${formatCurrency(expense.amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding-right: 20px;"><strong>GRAND TOTAL:</strong></td>
                <td class="amount">${formatCurrency(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>This is an automated report generated by Garbage Management System</p>
            <p>For inquiries, please contact the administration department</p>
          </div>
        </body>
      </html>
    `);

    printDocument.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const summary = {
    totalExpenses: expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
    totalRecords: expenses.length
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Company Expenses</h1>
          <p className="text-gray-600 mt-2">Track all company expenses and employee payments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrintReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 text-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </button>
          <button
            onClick={() => setShowEmployeeModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700 text-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Employees
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-red-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Total Expenses</p>
              <p className="text-lg font-semibold">{formatCurrency(summary.totalExpenses)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <PieChart className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Total Records</p>
              <p className="text-lg font-semibold">{summary.totalRecords}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div ref={printRef} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{expense.description}</div>
                      {expense.notes && (
                        <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setEditingExpense(expense);
                          setShowExpenseModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || dateRange.start || dateRange.end
                ? 'Try adjusting your filters' 
                : 'Add your first expense to get started'
              }
            </p>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Expense
            </button>
        </div>
        )}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <form onSubmit={handleExpenseSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={editingExpense?.date ? new Date(editingExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0"
                    step="0.01"
                    defaultValue={editingExpense?.amount}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    name="category"
                    required
                    defaultValue={editingExpense?.category}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="e.g., Office, Operations, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    rows="3"
                    defaultValue={editingExpense?.notes}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseModal(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {formLoading ? 'Saving...' : (editingExpense ? 'Update' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <form onSubmit={handleEmployeeSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingEmployee?.fullName}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input
                    type="text"
                    name="position"
                    required
                    defaultValue={editingEmployee?.position}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Salary ($)</label>
                  <input
                    type="number"
                    name="salary"
                    required
                    min="0"
                    step="0.01"
                    defaultValue={editingEmployee?.monthlySalary}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingEmployee?.phoneNumber}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    name="address"
                    rows="2"
                    defaultValue={editingEmployee?.address}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    defaultValue={editingEmployee?.bankAccount?.bankName}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    defaultValue={editingEmployee?.bankAccount?.accountNumber}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                  <input
                    type="date"
                    name="hireDate"
                    defaultValue={editingEmployee?.hireDate ? new Date(editingEmployee.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmployeeModal(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {formLoading ? 'Saving...' : (editingEmployee ? 'Update' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyExpenses;
