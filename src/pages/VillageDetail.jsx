import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Printer, ArrowLeft, Calendar, Home, DollarSign, Edit3, Trash2, Users, TrendingUp } from 'lucide-react';
import VillageRecordForm from '../components/VillageRecordForm';

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
const formatDate = (d) => {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) {
    const [y, m, day] = String(d).split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const sameDay = (a, b) => {
  const toYMD = (x) => {
    if (!x) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(x))) return String(x);
    const d = new Date(x);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return toYMD(a) === toYMD(b);
};

export default function VillageDetail() {
  const { idOrName } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serverNow, setServerNow] = useState(null);
  const [filterDate, setFilterDate] = useState('');

  const query = useMemo(() => {
    const isObjectId = /^[a-fA-F0-9]{24}$/.test(idOrName || '');
    return isObjectId ? { villageId: idOrName } : { villageName: idOrName };
  }, [idOrName]);

  useEffect(() => {
    const load = async () => {
      try {
        setServerNow(new Date());
        const params = filterDate ? { ...query, date: filterDate } : query;
        const data = await apiService.getVillageCollections(params);
        const arr = Array.isArray(data) ? data : (data?.data || []);
        const normalized = arr.map(r => {
          const ymd = sameDay(r.date, r.date) ? String(r.date).slice(0, 10) : String(r.date);
          return { ...r, date: /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : (() => {
            const d = new Date(r.date);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          })() };
        });
        const sorted = normalized.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
        setRecords(sorted);
      } catch (e) {
        console.error('Error loading village data:', e);
        setRecords([]);
      }
    };
    load();
  }, [query, filterDate]);

  // Calculate totals for all time (for the print section)
  const calculateAllTimeTotals = () => {
    return records.reduce((acc, r) => ({
      customers: acc.customers + (r.householdsCollected || 0),
      amount: acc.amount + (r.amountCollected || 0),
      totalRecords: acc.totalRecords + 1
    }), { customers: 0, amount: 0, totalRecords: 0 });
  };

  // NEW: Calculate detailed summary statistics
  const calculateSummary = () => {
    if (records.length === 0) {
      return {
        totalAmount: 0,
        totalCustomers: 0,
        totalRecords: 0,
        averagePerRecord: 0,
        averagePerCustomer: 0,
        maxAmount: 0,
        minAmount: 0,
        mostProfitableDate: null
      };
    }

    const allTimeStats = calculateAllTimeTotals();
    const amounts = records.map(r => r.amountCollected || 0);
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const mostProfitableRecord = records.find(r => (r.amountCollected || 0) === maxAmount);

    return {
      totalAmount: allTimeStats.amount,
      totalCustomers: allTimeStats.customers,
      totalRecords: allTimeStats.totalRecords,
      averagePerRecord: allTimeStats.amount / allTimeStats.totalRecords,
      averagePerCustomer: allTimeStats.customers > 0 ? allTimeStats.amount / allTimeStats.customers : 0,
      maxAmount,
      minAmount,
      mostProfitableDate: mostProfitableRecord ? formatDate(mostProfitableRecord.date) : null
    };
  };

  const name = records[0]?.villageId?.name || records[0]?.villageName || idOrName;
  const today = serverNow || new Date();
  const todaysRecords = records.filter(r => r.date && sameDay(r.date, today));
  const todayStats = todaysRecords.reduce((acc, r) => ({
    customers: acc.customers + (r.householdsCollected || 0),
    amount: acc.amount + (r.amountCollected || 0)
  }), { customers: 0, amount: 0 });

  const allTimeStats = calculateAllTimeTotals();
  const summary = calculateSummary(); // NEW: Get summary statistics

  const handlePrint = () => {
    const w = window.open('', '_blank');
    const baseDate = serverNow || new Date();
    const d = baseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Village Report - ${name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 5px; }
            .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
            .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; text-align: center; }
            .card-title { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
            .card-value { font-size: 18px; font-weight: 700; color: #1f2937; }
            .card-amount { color: #059669; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #2563eb; color: #fff; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            tr:nth-child(even) { background: #f8fafc; }
            .right { text-align: right; }
            .total-row { background: #dbeafe !important; font-weight: 700; }
            .summary { margin-top: 30px; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
            .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ddd; }
            .summary-label { color: #666; }
            .summary-value { font-weight: 600; }
            .highlight { background: #fffbeb; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #fcd34d; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${name} - Collection Report</div>
            <div class="subtitle">Generated on ${d}</div>
          </div>
          
          <div class="cards">
            <div class="card">
              <div class="card-title">Today's Customers</div>
              <div class="card-value">${todayStats.customers}</div>
            </div>
            <div class="card">
              <div class="card-title">Today's Amount</div>
              <div class="card-value card-amount">${formatCurrency(todayStats.amount)}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Records</div>
              <div class="card-value">${records.length}</div>
            </div>
          </div>
          
          <div class="highlight">
            <h3>📊 Financial Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Total Amount Collected:</span>
                <span class="summary-value">${formatCurrency(summary.totalAmount)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total Customers:</span>
                <span class="summary-value">${summary.totalCustomers}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total Records:</span>
                <span class="summary-value">${summary.totalRecords}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Average per Record:</span>
                <span class="summary-value">${formatCurrency(summary.averagePerRecord)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Average per Customer:</span>
                <span class="summary-value">${formatCurrency(summary.averagePerCustomer)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Highest Collection:</span>
                <span class="summary-value">${formatCurrency(summary.maxAmount)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Lowest Collection:</span>
                <span class="summary-value">${formatCurrency(summary.minAmount)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Most Profitable Date:</span>
                <span class="summary-value">${summary.mostProfitableDate || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customers</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(r => `
                <tr>
                  <td>${formatDate(r.date)}</td>
                  <td>${r.householdsCollected || 0}</td>
                  <td class="right">${formatCurrency(r.amountCollected || 0)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>TOTAL (All Time)</strong></td>
                <td><strong>${allTimeStats.customers}</strong></td>
                <td class="right"><strong>${formatCurrency(allTimeStats.amount)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div class="summary">
            <strong>Summary:</strong> ${name} has collected ${allTimeStats.customers} customer payments totaling ${formatCurrency(allTimeStats.amount)} across ${records.length} collection days.
          </div>
          
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(() => window.close(), 800); 
            }
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const handlePrintSummary = () => {
    const w = window.open('', '_blank');
    const d = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const totals = calculateAllTimeTotals();
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Summary - ${name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .item { padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
            .label { font-size: 12px; color: #6b7280; }
            .value { font-size: 18px; font-weight: 700; color: #1f2937; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="value">${name} - Totals Summary</div>
            <div class="label">Generated on ${d}</div>
          </div>
          <div class="grid">
            <div class="item">
              <div class="label">Total Records</div>
              <div class="value">${records.length}</div>
            </div>
            <div class="item">
              <div class="label">Total Customers</div>
              <div class="value">${totals.customers}</div>
            </div>
            <div class="item">
              <div class="label">Total Amount</div>
              <div class="value">${formatCurrency(totals.amount)}</div>
            </div>
            <div class="item">
              <div class="label">Avg per Customer</div>
              <div class="value">${totals.customers > 0 ? formatCurrency(totals.amount / totals.customers) : 'N/A'}</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 800); }
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const handlePrintRecord = (r) => {
    const w = window.open('', '_blank');
    const baseDate = serverNow || new Date();
    const d = baseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Collection Record - ${name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .title { font-size: 22px; font-weight: 700; color: #1f2937; }
            .subtitle { color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #2563eb; color: #fff; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            .right { text-align: right; }
            .highlight { font-weight: 700; font-size: 16px; color: #059669; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${name}</div>
            <div class="subtitle">Collection Record | Generated on ${d}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Date</td>
                <td>${formatDate(r.date)}</td>
              </tr>
              <tr>
                <td>Customers (Households)</td>
                <td>${r.householdsCollected || 0}</td>
              </tr>
              <tr>
                <td>Amount Collected</td>
                <td class="right highlight">${formatCurrency(r.amountCollected || 0)}</td>
              </tr>
              <tr>
                <td>Average per Customer</td>
                <td class="right">${r.householdsCollected ? formatCurrency((r.amountCollected || 0) / r.householdsCollected) : 'N/A'}</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(() => window.close(), 800); 
            }
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const handleRecordCreated = (doc) => {
    const mapped = {
      ...doc,
      villageId: doc.villageId || records[0]?.villageId || undefined,
      villageName: doc.villageName || records[0]?.villageName || name,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(doc.date)) ? doc.date : (() => { const d = new Date(doc.date); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; })()
    };
    // Add to beginning and sort by date
    const updated = [mapped, ...records]
      .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    setRecords(updated);
  };

  const handleUpdateRecord = async (recordId) => {
    const r = records.find(x => x._id === recordId);
    if (!r) return;
    
    const customersStr = window.prompt('Customers', String(r.householdsCollected || 0));
    if (customersStr === null) return;
    
    const amountStr = window.prompt('Amount', String(r.amountCollected || 0));
    if (amountStr === null) return;
    
    const dateStr = window.prompt('Date (YYYY-MM-DD)', String(r.date).slice(0,10));
    if (dateStr === null) return;
    
    const customers = Number(customersStr);
    const amount = Number(amountStr);
    
    if (Number.isNaN(customers) || Number.isNaN(amount)) { 
      alert('Invalid numbers'); 
      return; 
    }
    
    const dateYmd = String(dateStr);
    const dup = records.some(x => (x._id !== r._id) && x.date && sameDay(x.date, dateYmd));
    
    if (dup) { 
      alert('A record for this date already exists'); 
      return; 
    }
    
    try {
      const updated = await apiService.updateVillageCollection(r._id, { 
        villageName: name, 
        date: dateYmd, 
        customers, 
        amountCollected: amount 
      });
      const u = Array.isArray(updated) ? updated[0] : (updated?.data || updated);
      
      const normalized = { ...u, date: /^\d{4}-\d{2}-\d{2}$/.test(String(u.date)) ? u.date : dateYmd };
      setRecords(prev => prev
        .map(x => (x._id === r._id ? normalized : x))
        .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
      );
    } catch (err) {
      alert(err?.message || 'Failed to update record');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await apiService.deleteVillageCollection(recordId);
      setRecords(prev => prev.filter(x => x._id !== recordId));
    } catch (err) {
      alert(err?.message || 'Failed to delete record');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Villages
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-gray-600 text-sm">Daily collection records for this village</p>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <button 
            onClick={handlePrint} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center hover:bg-blue-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Full Report
          </button>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setFilterDate('')}
            className="px-3 py-2 text-sm border rounded"
          >
            Clear Date
          </button>
        </div>
      </div>

      <VillageRecordForm
        villageId={/^[a-fA-F0-9]{24}$/.test(idOrName || '') ? idOrName : undefined}
        villageName={!/^[a-fA-F0-9]{24}$/.test(idOrName || '') ? idOrName : undefined}
        serverNow={serverNow}
        api={apiService}
        onCreated={handleRecordCreated}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <Home className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Today's Customers</p>
              <p className="text-lg font-semibold">{todayStats.customers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-green-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Today's Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(todayStats.amount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-purple-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">All Time Customers</p>
              <p className="text-lg font-semibold">{summary.totalCustomers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 text-orange-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">All Time Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(summary.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Detailed Summary Section */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-500" />
            Financial Summary
          </h2>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {summary.totalRecords} Records Total
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total Amount Collected</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalAmount)}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Average per Record</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.averagePerRecord)}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Average per Customer</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(summary.averagePerCustomer)}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Highest Single Collection</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(summary.maxAmount)}</p>
            {summary.mostProfitableDate && (
              <p className="text-xs text-gray-500 mt-1">on {summary.mostProfitableDate}</p>
            )}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="text-sm">
            <span className="text-gray-500">Lowest Collection:</span>
            <span className="ml-2 font-medium">{formatCurrency(summary.minAmount)}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Total Records Processed:</span>
            <span className="ml-2 font-medium">{summary.totalRecords}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Collection History ({records.length} records)</h2>
          <p className="text-xs text-gray-600">
            Total: {allTimeStats.customers} customers, {formatCurrency(allTimeStats.amount)} collected
          </p>
        </div>
        
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Calendar className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No collection records found for this village</p>
            <p className="text-xs mt-1">Add a record using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg/Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map(r => {
                  const avg = r.householdsCollected > 0 
                    ? (r.amountCollected || 0) / r.householdsCollected 
                    : 0;
                  
                  return (
                    <tr key={r._id || `${r.villageName}-${r.date}`} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="font-medium">{formatDate(r.date)}</div>
                        {r.date && sameDay(r.date, today) && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">Today</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">{r.householdsCollected || 0}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-green-600">
                        {formatCurrency(r.amountCollected || 0)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {r.householdsCollected > 0 ? formatCurrency(avg) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handlePrintRecord(r)} 
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center"
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Print
                          </button>
                          <button
                            onClick={() => handleUpdateRecord(r._id)}
                            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r._id)}
                            className="px-3 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50 flex items-center"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{allTimeStats.customers}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-700">{formatCurrency(allTimeStats.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{allTimeStats.customers > 0 ? formatCurrency(allTimeStats.amount / allTimeStats.customers) : 'N/A'}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Totals for {name}</div>
            <div className="text-sm">Records: {records.length} • Customers: {allTimeStats.customers} • Amount: {formatCurrency(allTimeStats.amount)}</div>
          </div>
          <button onClick={handlePrintSummary} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Print Summary</button>
        </div>
      </div>
    </div>
  );
}
