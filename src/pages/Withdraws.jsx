import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Search, DollarSign, Calendar, FileText, CheckCircle, XCircle, Clock, Loader, Download, Printer } from 'lucide-react';
import { apiService } from '../services/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [stats, setStats] = useState({
    totalWithdrawn: 0,
    totalCount: 0
  });

  const printRef = useRef();

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await apiService.getWithdraws();
      
      // FIX: Handle both array and object response formats
      if (Array.isArray(response)) {
        setWithdrawals(response);
        calculateStats(response);
      } else if (response && response.data) {
        setWithdrawals(response.data);
        calculateStats(response.data);
      } else {
        console.error('Invalid response format:', response);
        setWithdrawals([]);
      }
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      alert('Error loading withdrawals: ' + (error.message || 'Please check your connection'));
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (withdrawalsData) => {
    const totalWithdrawn = withdrawalsData.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
    const totalCount = withdrawalsData.length;
    
    setStats({
      totalWithdrawn,
      totalCount
    });
  };

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    const formData = new FormData(e.target);
    const withdrawalData = {
      amount: parseFloat(formData.get('amount')),
      description: formData.get('description'),
      withdrawDate: formData.get('withdrawDate'),
      bankDetails: {
        bankName: formData.get('bankName'),
        accountNumber: formData.get('accountNumber'),
      },
      notes: formData.get('notes')
    };

    // Validate required fields
    if (!withdrawalData.amount || withdrawalData.amount <= 0) {
      alert('Please enter a valid amount');
      setFormLoading(false);
      return;
    }

    try {
      let result;
      if (editingWithdrawal) {
        result = await apiService.updateWithdraw(editingWithdrawal._id, withdrawalData);
        // FIX: More flexible response handling
        if (result && (result.data || result._id)) {
          const updatedWithdrawal = result.data || result;
          setWithdrawals(prev => prev.map(w => 
            w._id === editingWithdrawal._id ? updatedWithdrawal : w
          ));
          calculateStats(withdrawals.map(w => w._id === editingWithdrawal._id ? updatedWithdrawal : w));
        } else {
          throw new Error('Invalid response from server');
        }
      } else {
        result = await apiService.createWithdraw(withdrawalData);
        console.log('Create response:', result); // Debug log
        // FIX: More flexible response handling
        if (result && (result.data || result._id)) {
          const newWithdrawal = result.data || result;
          setWithdrawals(prev => [...prev, newWithdrawal]);
          calculateStats([...withdrawals, newWithdrawal]);
        } else {
          throw new Error('Invalid response from server');
        }
      }
      
      setShowWithdrawalModal(false);
      setEditingWithdrawal(null);
      alert('Withdrawal saved successfully!');
    } catch (error) {
      console.error('Error saving withdrawal:', error);
      alert('Error saving withdrawal: ' + (error.message || 'Please try again'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteWithdrawal = async (withdrawalId) => {
    if (window.confirm('Are you sure you want to delete this withdrawal?')) {
      try {
        console.log('Deleting withdrawal with ID:', withdrawalId);
        
        const result = await apiService.deleteWithdraw(withdrawalId);
        console.log('Delete response:', result);
        
        // FIX: Handle different response formats
        if (result) {
          // If result has success property and it's true, or if we get any response at all
          if ((result.success !== undefined && result.success) || result._id) {
            const updatedWithdrawals = withdrawals.filter(w => w._id !== withdrawalId);
            setWithdrawals(updatedWithdrawals);
            calculateStats(updatedWithdrawals);
            alert('Withdrawal deleted successfully!');
          } else if (result.success === false) {
            throw new Error(result.message || 'Failed to delete withdrawal');
          } else {
            // If we get here but no error was thrown, assume success
            const updatedWithdrawals = withdrawals.filter(w => w._id !== withdrawalId);
            setWithdrawals(updatedWithdrawals);
            calculateStats(updatedWithdrawals);
            alert('Withdrawal deleted successfully!');
          }
        } else {
          // If result is undefined but no error was thrown, assume success
          const updatedWithdrawals = withdrawals.filter(w => w._id !== withdrawalId);
          setWithdrawals(updatedWithdrawals);
          calculateStats(updatedWithdrawals);
          alert('Withdrawal deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting withdrawal:', error);
        alert('Error deleting withdrawal: ' + (error.message || 'Please try again'));
      }
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = 
      (withdrawal.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (withdrawal.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (withdrawal.bankDetails?.accountHolder?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (withdrawal.bankDetails?.bankName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  

  // Professional Print Function
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const printDate = new Date().toLocaleDateString();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Withdrawals Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .header h1 { 
              margin: 0; 
              color: #2c5282;
            }
            .header .subtitle {
              color: #666;
              margin-top: 5px;
            }
            .summary {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-value {
              font-size: 18px;
              font-weight: bold;
              color: #2c5282;
            }
            .summary-label {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #2c5282;
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
              font-size: 12px;
            }
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Withdrawals Report</h1>
            <div class="subtitle">Generated on ${printDate}</div>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${formatCurrency(stats.totalWithdrawn)}</div>
              <div class="summary-label">Total Withdrawn</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${stats.totalCount}</div>
              <div class="summary-label">Total Withdrawals</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Bank Name</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredWithdrawals.map(withdrawal => `
                <tr>
                  <td>${withdrawal.referenceNumber || 'N/A'}</td>
                  <td>
                    <div><strong>${withdrawal.description}</strong></div>
                  </td>
                  <td><strong>${formatCurrency(withdrawal.amount)}</strong></td>
                  <td>
                    <div>${withdrawal.bankDetails?.bankName || 'N/A'}</div>
                    <div style="color: #666; font-size: 10px;">${withdrawal.bankDetails?.accountHolder || 'N/A'}</div>
                  </td>
                  <td>${withdrawal.withdrawDate ? new Date(withdrawal.withdrawDate).toLocaleDateString() : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Total Records: ${filteredWithdrawals.length} | Generated by Business Management System</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const resetForm = () => {
    setShowWithdrawalModal(false);
    setEditingWithdrawal(null);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-gray-600 mt-2">Manage business fund withdrawals</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrint}
            disabled={filteredWithdrawals.length === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </button>
          <button
            onClick={() => setShowWithdrawalModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 text-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Withdrawal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-xs text-gray-600">Total Withdrawn</p>
          <p className="text-lg font-semibold">{formatCurrency(stats.totalWithdrawn)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-xs text-gray-600">Total Withdrawals</p>
          <p className="text-lg font-semibold">{stats.totalCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search withdrawals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredWithdrawals.map(withdrawal => (
                  <tr key={withdrawal._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {withdrawal.referenceNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{withdrawal.description}</div>
                      
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-red-600">
                      {formatCurrency(withdrawal.amount)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {withdrawal.bankDetails?.bankName || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {withdrawal.bankDetails?.accountHolder || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {withdrawal.bankDetails?.accountNumber ? `****${withdrawal.bankDetails.accountNumber.slice(-4)}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {withdrawal.withdrawDate ? new Date(withdrawal.withdrawDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => {
                            setEditingWithdrawal(withdrawal);
                            setShowWithdrawalModal(true);
                          }}
                          className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteWithdrawal(withdrawal._id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        {filteredWithdrawals.length === 0 && !loading && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No withdrawals found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Get started by creating your first withdrawal'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingWithdrawal ? 'Edit Withdrawal' : 'New Withdrawal'}
            </h2>
            <form onSubmit={handleWithdrawalSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0.01"
                    step="0.01"
                    defaultValue={editingWithdrawal?.amount}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    name="description"
                    required
                    defaultValue={editingWithdrawal?.description}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Enter withdrawal description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Date</label>
                  <input
                    type="date"
                    name="withdrawDate"
                    required
                    defaultValue={editingWithdrawal?.withdrawDate ? new Date(editingWithdrawal.withdrawDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Bank Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        name="bankName"
                        required
                        defaultValue={editingWithdrawal?.bankDetails?.bankName}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        name="accountNumber"
                        required
                        defaultValue={editingWithdrawal?.bankDetails?.accountNumber}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Enter account number"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows="3"
                    defaultValue={editingWithdrawal?.notes}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={formLoading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                >
                  {formLoading ? (
                    <span className="flex items-center">
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </span>
                  ) : (
                    editingWithdrawal ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Withdrawals;
