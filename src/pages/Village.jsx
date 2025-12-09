import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, MapPin, Home, Calendar, DollarSign, Printer, Search, Loader } from 'lucide-react';
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

const Villages = () => {
  const [villages, setVillages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVillage, setEditingVillage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const printRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const collectionsResponse = await apiService.getVillageCollections();
      const items = Array.isArray(collectionsResponse) ? collectionsResponse : (collectionsResponse?.data || []);
      const mapped = items.map(i => ({
        ...i,
        name: i.villageId?.name || i.villageName || 'Unknown',
        dateCollected: i.date
      }));
      setVillages(mapped);
    } catch (error) {
      console.error('Error loading villages:', error);
      setVillages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    const formData = new FormData(e.target);
    const payload = {
      villageName: String(formData.get('name') || '').trim(),
      customers: parseInt(formData.get('householdsCollected')),
      amountCollected: parseFloat(formData.get('amountCollected')),
      date: formData.get('dateCollected')
    };

    try {
      const existing = await apiService.getVillageCollections({ villageName: payload.villageName, date: payload.date });
      const arr = Array.isArray(existing) ? existing : (existing?.data || []);
      if (!editingVillage && arr.length > 0) {
        alert('A record for this village and date already exists');
        return;
      }
      let result;
      if (editingVillage) {
        result = await apiService.updateVillageCollection(editingVillage._id, payload);
        const saved = result.data || result;
        const mapped = {
          ...saved,
          name: saved.villageId?.name || saved.villageName || payload.villageName,
          dateCollected: saved.date
        };
        setVillages(prev => prev.map(v => v._id === editingVillage._id ? mapped : v));
      } else {
        result = await apiService.createVillageCollection(payload);
        const saved = result.data || result;
        const mapped = {
          ...saved,
          name: saved.villageId?.name || saved.villageName || payload.villageName,
          dateCollected: saved.date
        };
        setVillages(prev => [...prev, mapped]);
      }
      
      setShowModal(false);
      setEditingVillage(null);
      alert('Village saved successfully!');
    } catch (error) {
      console.error('Error saving village:', error);
      alert('Error saving village: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this village record?')) {
      try {
        await apiService.deleteVillageCollection(id);
        setVillages(prev => prev.filter(v => v._id !== id));
        alert('Village record deleted successfully!');
      } catch (error) {
        console.error('Error deleting village:', error);
        alert('Error deleting village: ' + error.message);
      }
    }
  };

  const filteredVillages = villages.filter(village => {
    const matchesSearch = village.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const villageDate = new Date(village.dateCollected);
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;
    
    const matchesDate = (!startDate || villageDate >= startDate) && 
                       (!endDate || villageDate <= endDate);
    
    return matchesSearch && matchesDate;
  });

  const totalStats = filteredVillages.reduce((stats, village) => {
    return {
      totalAmount: stats.totalAmount + (village.amountCollected || 0),
      totalHouseholds: stats.totalHouseholds + (village.householdsCollected || 0),
      totalVillages: stats.totalVillages + 1
    };
  }, { totalAmount: 0, totalHouseholds: 0, totalVillages: 0 });

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

    printDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Villages Collection Report</title>
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
              grid-template-columns: repeat(3, 1fr);
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
            .number {
              text-align: center;
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
            <div class="report-title">VILLAGES COLLECTION REPORT</div>
            <div class="report-info">
              <div>Generated on: ${currentDate}</div>
              <div>Period: ${reportDateRange}</div>
              <div>Total Records: ${filteredVillages.length}</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-value">${formatCurrency(totalStats.totalAmount)}</div>
              <div class="summary-label">Total Collected</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${totalStats.totalHouseholds}</div>
              <div class="summary-label">Total Households</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${totalStats.totalVillages}</div>
              <div class="summary-label">Villages Covered</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Village Name</th>
                <th>Date Collected</th>
                <th>Households</th>
                <th>Amount Collected</th>
              </tr>
            </thead>
            <tbody>
              ${filteredVillages.map((village, index) => `
                <tr>
                  <td class="number">${index + 1}</td>
                  <td>${village.name}</td>
                  <td>${formatDate(village.dateCollected)}</td>
                  <td class="number">${village.householdsCollected}</td>
                  <td class="amount">${formatCurrency(village.amountCollected)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding-right: 20px;"><strong>GRAND TOTAL:</strong></td>
                <td class="number"><strong>${totalStats.totalHouseholds}</strong></td>
                <td class="amount"><strong>${formatCurrency(totalStats.totalAmount)}</strong></td>
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

  const openCreateModal = () => {
    setEditingVillage(null);
    setShowModal(true);
  };

  const openEditModal = (village) => {
    setEditingVillage(village);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Villages Collection</h1>
          <p className="text-gray-600 mt-2">Manage village collection records and amounts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrintReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 text-sm"
            disabled={villages.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </button>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Village
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-green-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Total Collected</p>
              <p className="text-lg font-semibold">{formatCurrency(totalStats.totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Home className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Total Households</p>
              <p className="text-lg font-semibold">{totalStats.totalHouseholds}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <MapPin className="w-6 h-6 text-purple-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Villages Covered</p>
              <p className="text-lg font-semibold">{totalStats.totalVillages}</p>
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
              placeholder="Search villages..."
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

      {/* Villages Table */}
      <div ref={printRef} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Village Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Collected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Households</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount Collected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVillages.map((village) => (
                  <tr key={village._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const id = village.villageId?._id || village.villageId || null;
                          const slug = id || (village.name || '').trim();
                          navigate(`/village/${encodeURIComponent(slug)}`);
                        }}
                        className="flex items-center text-left w-full"
                      >
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-blue-700 hover:underline">{village.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(village.dateCollected)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {village.householdsCollected}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(village.amountCollected)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => openEditModal(village)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(village._id)}
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
        )}

        {filteredVillages.length === 0 && !loading && (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No villages found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || dateRange.start || dateRange.end
                ? 'Try adjusting your filters' 
                : 'Add your first village collection record to get started'
              }
            </p>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Add Village
            </button>
          </div>
        )}
      </div>

      {/* Village Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingVillage ? 'Edit Village Record' : 'Add New Village Record'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Village Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingVillage?.name}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter village name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Households Collected *</label>
                  <input
                    type="number"
                    name="householdsCollected"
                    required
                    min="1"
                    defaultValue={editingVillage?.householdsCollected}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Number of households"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount Collected ($) *</label>
                  <input
                    type="number"
                    name="amountCollected"
                    required
                    min="0"
                    step="0.01"
                    defaultValue={editingVillage?.amountCollected}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date Collected *</label>
                  <input
                    type="date"
                    name="dateCollected"
                    required
                    defaultValue={editingVillage?.dateCollected ? new Date(editingVillage.dateCollected).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingVillage(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center"
                >
                  {formLoading && <Loader className="w-4 h-4 animate-spin mr-2" />}
                  {editingVillage ? 'Update' : 'Save'} Village
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Villages;
