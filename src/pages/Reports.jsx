import React, { useState, useEffect } from 'react';
import { Download, Filter, BarChart3, Users, DollarSign, TrendingUp, Printer, Search, Calendar, MapPin, Building, FileText, PieChart } from 'lucide-react';
import { apiService } from '../services/api';

const API_BASE_URL = 'http://localhost:5001/api';

// Get current month function
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Generate all 12 months for the current year
const generateAllMonths = () => {
  const months = [];
  const currentYear = new Date().getFullYear();
  for (let i = 1; i <= 12; i++) {
    months.push(`${currentYear}-${String(i).padStart(2, '0')}`);
  }
  return months;
};

// Helper function to extract available months from customer payment data
const getAvailableMonthsFromCustomers = (customers) => {
  const monthSet = new Set();
  
  customers.forEach(customer => {
    if (customer.payments) {
      Object.keys(customer.payments).forEach(month => {
        monthSet.add(month);
      });
    }
  });
  
  // Convert to array and sort by date (newest first)
  const months = Array.from(monthSet).sort((a, b) => {
    return new Date(b + '-01') - new Date(a + '-01');
  });
  
  return months.length > 0 ? months : [getCurrentMonth()];
};

const Reports = ({ 
  customers: propCustomers = [], 
  villages: propVillages = [], 
  workers: propWorkers = [],
  zones: propZones = [],
  expenses: propExpenses = []
}) => {
  const [filters, setFilters] = useState({
    month: getCurrentMonth(),
    village: 'all',
    reportType: 'payments',
    worker: 'all'
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [customers, setCustomers] = useState(propCustomers);
  const [villages, setVillages] = useState(propVillages);
  const [workers, setWorkers] = useState(propWorkers);
  const [zones, setZones] = useState(propZones);
  const [expenses, setExpenses] = useState(propExpenses);
  const [availableMonths, setAvailableMonths] = useState([getCurrentMonth()]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // All 12 months for the current year
  const allMonths = generateAllMonths();

  // Load data if not provided via props
  useEffect(() => {
    if (propCustomers.length === 0 || propVillages.length === 0) {
      loadData();
    } else {
      setDataLoaded(true);
    }
  }, [propCustomers, propVillages]);

  // Update available months when customers data changes
  useEffect(() => {
    if (customers.length > 0) {
      const monthsFromCustomers = getAvailableMonthsFromCustomers(customers);
      setAvailableMonths(monthsFromCustomers);
      
      if (!monthsFromCustomers.includes(filters.month)) {
        setFilters(prev => ({ ...prev, month: monthsFromCustomers[0] || getCurrentMonth() }));
      }
    }
  }, [customers]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersData, villagesData, workersData, zonesData, expensesData] = await Promise.all([
        apiService.getCustomers(),
        apiService.getVillages(),
        apiService.getWorkers(),
        apiService.getZones(),
        apiService.getCompanyExpenses()
      ]);

      setCustomers(customersData || []);
      setVillages(villagesData || []);
      setWorkers(workersData || []);
      setZones(zonesData || []);
      setExpenses(expensesData || []);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate report when data is loaded and filters change
  useEffect(() => {
    if (dataLoaded && (customers.length > 0 || villages.length > 0)) {
      generateReport();
    }
  }, [filters, dataLoaded]);

  // Get payment status for selected month - UPDATED to match other components
  const getSelectedMonthPayment = (customer) => {
    if (!customer.payments) {
      return { paid: 0, remaining: customer.monthlyFee || 0, fullyPaid: false };
    }
    
    // Handle both Map and object formats like in other components
    const payment = customer.payments.get?.(filters.month) || 
                   customer.payments[filters.month] || 
                   { paid: 0, remaining: customer.monthlyFee || 0, fullyPaid: false };
    
    return payment;
  };

  const generateReport = async () => {
    if (!dataLoaded || (customers.length === 0 && villages.length === 0)) return;
    
    setLoading(true);
    
    try {
      let filteredCustomers = [...customers];
      let filteredVillages = [...villages];
      let filteredWorkers = [...workers];

      // Apply village filter
      if (filters.village !== 'all') {
        filteredCustomers = filteredCustomers.filter(c => 
          c.villageId?._id === filters.village || c.villageId === filters.village
        );
        filteredVillages = filteredVillages.filter(v => v._id === filters.village);
      }

      // Apply worker filter
      if (filters.worker !== 'all') {
        const workerVillages = villages.filter(v => 
          v.workerId === filters.worker || v.assignedWorker?.includes(filters.worker)
        );
        filteredCustomers = filteredCustomers.filter(c => 
          workerVillages.some(v => v._id === c.villageId)
        );
        filteredVillages = filteredVillages.filter(v => 
          workerVillages.some(wv => wv._id === v._id)
        );
        filteredWorkers = filteredWorkers.filter(w => w._id === filters.worker);
      }

      // Calculate payment data for the selected month
      const paidCustomers = filteredCustomers.filter(c => {
        const payment = getSelectedMonthPayment(c);
        return payment.fullyPaid;
      });

      const unpaidCustomers = filteredCustomers.filter(c => {
        const payment = getSelectedMonthPayment(c);
        return !payment.fullyPaid && payment.paid === 0;
      });

      const partialPayments = filteredCustomers.filter(c => {
        const payment = getSelectedMonthPayment(c);
        return payment.paid > 0 && !payment.fullyPaid;
      });

      const totalCollected = filteredCustomers.reduce((sum, customer) => {
        const payment = getSelectedMonthPayment(customer);
        return sum + (payment.paid || 0);
      }, 0);

      const totalDue = filteredCustomers.reduce((sum, customer) => {
        return sum + (customer.monthlyFee || 0);
      }, 0);

      const totalUnpaid = totalDue - totalCollected;

      // Village breakdown grouped by Zone (uses backend when available)
      let villageBreakdownByZone;
      try {
        const backendReport = await apiService.getVillageBreakdownReport(filters.month);
        villageBreakdownByZone = backendReport;
      } catch (e) {
        // Fallback calculation on frontend using customers data
        const villageById = new Map(villages.map(v => [String(v._id), v]));
        const zonesData = zones.map(zone => {
          const zoneCustomers = filteredCustomers.filter(c => c.zoneId?._id === zone._id || c.zoneId === zone._id);
          const villageIds = Array.from(new Set(zoneCustomers.map(c => {
            const vid = c.villageId?._id || c.villageId;
            return String(vid);
          }).filter(Boolean)));
          const villagesData = villageIds.map(vId => {
            const vCustomers = zoneCustomers.filter(c => String(c.villageId?._id || c.villageId) === vId);
            const stats = vCustomers.reduce((acc, cust) => {
              const payment = getSelectedMonthPayment(cust);
              const monthlyFee = Number(cust.monthlyFee) || 0;
              acc.totalCustomers += 1;
              acc.totalDue += monthlyFee;
              acc.totalPaid += Number(payment.paid) || 0;
              return acc;
            }, { totalCustomers: 0, totalDue: 0, totalPaid: 0 });
            const vInfo = villageById.get(vId);
            return {
              villageId: vId,
              villageName: vInfo?.name || 'Unknown',
              villageCode: vInfo?.code || '',
              collected: stats.totalPaid,
              due: stats.totalDue,
              unpaid: stats.totalDue - stats.totalPaid,
              totalCustomers: stats.totalCustomers,
              paidCustomers: vCustomers.filter(c => getSelectedMonthPayment(c).fullyPaid).length,
              unpaidCustomers: vCustomers.filter(c => { const p = getSelectedMonthPayment(c); return !p.fullyPaid && (p.paid || 0) === 0; }).length,
              partialCustomers: vCustomers.filter(c => { const p = getSelectedMonthPayment(c); return (p.paid || 0) > 0 && !p.fullyPaid; }).length,
              collectionRate: stats.totalDue > 0 ? (stats.totalPaid / stats.totalDue) * 100 : 0,
            };
          });
          const totals = villagesData.reduce((acc, v) => {
            acc.totalCustomers += v.totalCustomers;
            acc.totalRevenue += v.due;
            acc.totalPaid += v.collected;
            return acc;
          }, { totalCustomers: 0, totalRevenue: 0, totalPaid: 0 });
          return {
            _id: zone._id,
            name: zone.name,
            zoneNumber: zone.zoneNumber,
            villages: villagesData,
            stats: {
              ...totals,
              collectionRate: totals.totalRevenue > 0 ? (totals.totalPaid / totals.totalRevenue) * 100 : 0,
            }
          };
        });
        villageBreakdownByZone = { month: filters.month, zones: zonesData };
      }

      // Worker performance - UPDATED to match Workers component
      const workerPerformance = filteredWorkers.map(worker => {
        const assignedVillages = villages.filter(v => 
          v.workerId === worker._id || worker.assignedVillages?.includes(v._id)
        );
        const workerCustomers = filteredCustomers.filter(c =>
          assignedVillages.some(v => v._id === c.villageId)
        );
        
        const paidWorkerCustomers = workerCustomers.filter(c => {
          const payment = getSelectedMonthPayment(c);
          return payment.fullyPaid;
        });

        const workerRevenue = workerCustomers.reduce((sum, customer) => {
          const payment = getSelectedMonthPayment(customer);
          return sum + (payment.paid || 0);
        }, 0);

        const workerDue = workerCustomers.reduce((sum, customer) => {
          return sum + (customer.monthlyFee || 0);
        }, 0);

        return {
          workerId: worker._id,
          workerName: worker.fullName,
          assignedVillages: assignedVillages.length,
          totalCustomers: workerCustomers.length,
          paidCustomers: paidWorkerCustomers.length,
          unpaidCustomers: workerCustomers.length - paidWorkerCustomers.length,
          collectionRate: workerCustomers.length > 0 ? 
            (paidWorkerCustomers.length / workerCustomers.length) * 100 : 0,
          totalRevenue: workerRevenue,
          totalDue: workerDue,
          efficiency: workerDue > 0 ? (workerRevenue / workerDue) * 100 : 0
        };
      });

      // Customer details for customer report
      const customerDetails = filteredCustomers.map(customer => {
        const payment = getSelectedMonthPayment(customer);
        const village = villages.find(v => 
          v._id === customer.villageId?._id || v._id === customer.villageId
        );
        
        return {
          customerId: customer._id,
          customerName: customer.fullName,
          phoneNumber: customer.phoneNumber,
          villageName: village?.name || 'Unknown',
          monthlyFee: customer.monthlyFee || 0,
          paidAmount: payment.paid || 0,
          remainingAmount: payment.remaining || customer.monthlyFee || 0,
          status: payment.fullyPaid ? 'Fully Paid' : 
                 payment.paid > 0 ? 'Partial Payment' : 'Not Paid',
          lastPayment: payment.paidDate || 'No payment'
        };
      });

      // Expenses report
      const monthlyExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        const filterDate = new Date(filters.month + '-01');
        return expenseDate.getMonth() === filterDate.getMonth() && 
               expenseDate.getFullYear() === filterDate.getFullYear();
      });

      const expensesByType = monthlyExpenses.reduce((acc, expense) => {
        acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
        return acc;
      }, {});

      // Zone performance report
      const zonePerformance = zones.map(zone => {
        const zoneVillages = villages.filter(v => 
          v.zoneId === zone._id || v.zoneId?._id === zone._id
        );
        const zoneCustomers = filteredCustomers.filter(c =>
          zoneVillages.some(v => v._id === c.villageId)
        );
        
        const zoneRevenue = zoneCustomers.reduce((sum, customer) => {
          const payment = getSelectedMonthPayment(customer);
          return sum + (payment.paid || 0);
        }, 0);

        const zoneDue = zoneCustomers.reduce((sum, customer) => {
          return sum + (customer.monthlyFee || 0);
        }, 0);

        const paidZoneCustomers = zoneCustomers.filter(customer => {
          const payment = getSelectedMonthPayment(customer);
          return payment.fullyPaid;
        });

        return {
          zoneId: zone._id,
          zoneName: zone.name,
          zoneNumber: zone.zoneNumber,
          totalVillages: zoneVillages.length,
          totalCustomers: zoneCustomers.length,
          paidCustomers: paidZoneCustomers.length,
          unpaidCustomers: zoneCustomers.length - paidZoneCustomers.length,
          totalRevenue: zoneRevenue,
          totalDue: zoneDue,
          collectionRate: zoneDue > 0 ? (zoneRevenue / zoneDue) * 100 : 0
        };
      });

      setReportData({
        summary: {
          totalCollected,
          totalUnpaid,
          totalDue,
          totalCustomers: filteredCustomers.length,
          paidCustomers: paidCustomers.length,
          unpaidCustomers: unpaidCustomers.length,
          partialPayments: partialPayments.length,
          totalVillages: filteredVillages.length,
          totalWorkers: filteredWorkers.length,
          totalZones: zones.length,
          collectionRate: filteredCustomers.length > 0 ? 
            (paidCustomers.length / filteredCustomers.length) * 100 : 0,
          totalExpenses: monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0),
          netProfit: totalCollected - monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)
        },
        villageBreakdownByZone,
        workerPerformance,
        customerDetails,
        zonePerformance,
        expenses: {
          monthly: monthlyExpenses,
          byType: expensesByType,
          total: monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)
        },
        period: filters.month,
        generatedAt: new Date().toLocaleString()
      });
      
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    
    setPrintData({
      ...reportData,
      villageBreakdownByZone: reportData.villageBreakdownByZone,
      filters,
      printedDate: new Date().toLocaleDateString(),
      printedTime: new Date().toLocaleTimeString()
    });
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExport = () => {
    if (!reportData) return;
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (filters.reportType === 'payments') {
      csvContent += "Zone,Village,Code,Customers,Paid,Unpaid,Partial,Collected,Due,Unpaid Amount,Collection Rate\n";
      (reportData.villageBreakdownByZone?.zones || []).forEach(zone => {
        zone.villages.forEach(row => {
          csvContent += `"${zone.name}","${row.villageName}","${row.villageCode}",${row.totalCustomers},${row.paidCustomers},${row.unpaidCustomers},${row.partialCustomers},${row.collected},${row.due},${row.unpaid},${row.collectionRate.toFixed(1)}%\n`;
        });
      });
    } else if (filters.reportType === 'workers') {
      csvContent += "Worker,Assigned Villages,Total Customers,Paid Customers,Unpaid Customers,Collection Rate,Total Revenue,Total Due,Efficiency\n";
      reportData.workerPerformance.forEach(row => {
        csvContent += `"${row.workerName}",${row.assignedVillages},${row.totalCustomers},${row.paidCustomers},${row.unpaidCustomers},${row.collectionRate.toFixed(1)}%,${row.totalRevenue},${row.totalDue},${row.efficiency.toFixed(1)}%\n`;
      });
    } else if (filters.reportType === 'customers') {
      csvContent += "Customer Name,Phone,Village,Monthly Fee,Paid Amount,Remaining Amount,Status,Last Payment\n";
      reportData.customerDetails.forEach(customer => {
        csvContent += `"${customer.customerName}","${customer.phoneNumber}","${customer.villageName}",${customer.monthlyFee},${customer.paidAmount},${customer.remainingAmount},${customer.status},"${customer.lastPayment}"\n`;
      });
    } else if (filters.reportType === 'expenses') {
      csvContent += "Expense Type,Amount,Percentage\n";
      Object.entries(reportData.expenses.byType).forEach(([type, amount]) => {
        const percentage = (amount / reportData.expenses.total) * 100;
        csvContent += `"${type}",${amount},${percentage.toFixed(1)}%\n`;
      });
    } else if (filters.reportType === 'zones') {
      csvContent += "Zone,Zone Number,Villages,Customers,Paid,Unpaid,Revenue,Due,Collection Rate\n";
      reportData.zonePerformance.forEach(zone => {
        csvContent += `"${zone.zoneName}",${zone.zoneNumber},${zone.totalVillages},${zone.totalCustomers},${zone.paidCustomers},${zone.unpaidCustomers},${zone.totalRevenue},${zone.totalDue},${zone.collectionRate.toFixed(1)}%\n`;
      });
    }
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${filters.reportType}_${filters.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSelectedVillageName = () => {
    if (filters.village === 'all') return 'All Villages';
    const village = villages.find(v => v._id === filters.village);
    return village ? `${village.name} (${village.code})` : 'All Villages';
  };

  const getSelectedWorkerName = () => {
    if (filters.worker === 'all') return 'All Workers';
    const worker = workers.find(w => w._id === filters.worker);
    return worker ? worker.fullName : 'All Workers';
  };

  const handleMonthChange = (e) => {
    setFilters(prev => ({ ...prev, month: e.target.value }));
  };

  if (loading && !reportData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive reporting system - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={!reportData}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            <Printer className="w-5 h-5 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 no-print">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Report Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Report Type</label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({...filters, reportType: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              <option value="payments">Payments Report</option>
              <option value="customers">Customers Report</option>
              <option value="workers">Workers Performance</option>
              <option value="zones">Zones Performance</option>
              <option value="expenses">Expenses Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Month</label>
            <select
              value={filters.month}
              onChange={handleMonthChange}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              {allMonths.map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  {month === getCurrentMonth() && ' (Current)'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Village</label>
            <select
              value={filters.village}
              onChange={(e) => setFilters({...filters, village: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              <option value="all">All Villages</option>
              {villages.map(village => (
                <option key={village._id} value={village._id}>
                  {village.name} ({village.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Worker</label>
            <select
              value={filters.worker}
              onChange={(e) => setFilters({...filters, worker: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              <option value="all">All Workers</option>
              {workers.map(worker => (
                <option key={worker._id} value={worker._id}>
                  {worker.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={generateReport}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Refresh Report'}
            </button>
          </div>
        </div>
        
        {/* Month Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">Tracking:</span> {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {filters.month === getCurrentMonth() && ' (Current Month)'}
            </div>
            <div>
              <span className="font-medium">Available Data:</span> {availableMonths.length} months
            </div>
          </div>
        </div>
      </div>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Collected</p>
                  <p className="text-xl font-semibold">${reportData.summary.totalCollected.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-red-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Unpaid</p>
                  <p className="text-xl font-semibold">${reportData.summary.totalUnpaid.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-xl font-semibold">{reportData.summary.totalCustomers}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Collection Rate</p>
                  <p className="text-xl font-semibold">
                    {reportData.summary.collectionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Report Content */}
          {filters.reportType === 'payments' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 no-print">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Village Payments Breakdown by Zone - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <p className="text-gray-600 mt-1">
                  Month Date: {(() => { const md = reportData.villageBreakdownByZone?.monthDate ? new Date(reportData.villageBreakdownByZone.monthDate) : null; return md ? md.toLocaleDateString('en-US') : 'Not set'; })()} • {getSelectedWorkerName()}
                </p>
              </div>
              <div className="p-6 space-y-6">
                {(reportData.villageBreakdownByZone?.zones || []).map(zone => (
                  <div key={zone._id}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-md font-semibold text-gray-800 flex items-center"><MapPin className="w-4 h-4 mr-2" />{zone.name}</h3>
                      <div className="text-sm text-gray-600">Collection Rate: {zone.stats.collectionRate.toFixed(1)}% • Customers: {zone.stats.totalCustomers}</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Village</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collected</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unpaid</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {zone.villages.map((village) => (
                            <tr key={village.villageId} className="hover:bg-gray-50 transition duration-150">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <div>
                                  <div>{village.villageName}</div>
                                  <div className="text-gray-500 text-xs">{village.villageCode}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{village.totalCustomers}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-1">
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">{village.paidCustomers} paid</span>
                                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">{village.unpaidCustomers} unpaid</span>
                                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">{village.partialCustomers} partial</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">${village.collected.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${village.due.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">${village.unpaid.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center">
                                  <span className={`font-semibold ${village.collectionRate >= 80 ? 'text-green-600' : village.collectionRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{village.collectionRate.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filters.reportType === 'workers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 no-print">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Workers Performance - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Worker
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned Villages
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customers
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Collection Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Efficiency
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.workerPerformance.map((worker) => (
                        <tr key={worker.workerId} className="hover:bg-gray-50 transition duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {worker.workerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {worker.assignedVillages}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {worker.totalCustomers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {worker.paidCustomers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-semibold ${
                              worker.collectionRate >= 80 ? 'text-green-600' :
                              worker.collectionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {worker.collectionRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            ${worker.totalRevenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-semibold ${
                              worker.efficiency >= 80 ? 'text-green-600' :
                              worker.efficiency >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {worker.efficiency.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {filters.reportType === 'customers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 no-print">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Customers Report - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Village
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monthly Fee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remaining
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.customerDetails.map((customer) => (
                        <tr key={customer.customerId} className="hover:bg-gray-50 transition duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {customer.customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.phoneNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.villageName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${customer.monthlyFee}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            ${customer.paidAmount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                            ${customer.remainingAmount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              customer.status === 'Fully Paid' 
                                ? 'bg-green-100 text-green-800' 
                                : customer.status === 'Partial Payment'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.lastPayment}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {filters.reportType === 'zones' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 no-print">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Zones Performance - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Zone #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Villages
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customers
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Collection Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.zonePerformance.map((zone) => (
                        <tr key={zone.zoneId} className="hover:bg-gray-50 transition duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {zone.zoneName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {zone.zoneNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {zone.totalVillages}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {zone.totalCustomers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {zone.paidCustomers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            ${zone.totalRevenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-semibold ${
                              zone.collectionRate >= 80 ? 'text-green-600' :
                              zone.collectionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {zone.collectionRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {filters.reportType === 'expenses' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 no-print">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Expenses Report - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Expenses by Type</h3>
                    <div className="space-y-3">
                      {Object.entries(reportData.expenses.byType).map(([type, amount]) => {
                        const percentage = (amount / reportData.expenses.total) * 100;
                        return (
                          <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{type}</span>
                            <div className="text-right">
                              <div className="font-semibold">${amount.toLocaleString()}</div>
                              <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                        <span className="font-medium">Total Revenue</span>
                        <span className="font-semibold text-green-600">${reportData.summary.totalCollected.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                        <span className="font-medium">Total Expenses</span>
                        <span className="font-semibold text-red-600">${reportData.expenses.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium">Net Profit</span>
                        <span className={`font-semibold ${
                          reportData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${reportData.summary.netProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Print Section */}
      {printData && (
        <div className="print-section">
          <style>
            {`
              @media print {
                @page {
                  size: A4;
                  margin: 1cm;
                }
                body {
                  -webkit-print-color-adjust: exact;
                  margin: 0;
                  padding: 0;
                  font-size: 12px;
                  background: white !important;
                }
                .print-section {
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                .print-page {
                  page-break-after: always;
                  width: 100%;
                  margin: 0;
                  padding: 20px;
                  font-family: Arial, sans-serif;
                  background: white;
                }
                .print-page:last-child {
                  page-break-after: auto;
                }
                .no-print {
                  display: none !important;
                }
                .print-table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 10px;
                  table-layout: fixed;
                  margin-bottom: 20px;
                }
                .print-table th,
                .print-table td {
                  border: 1px solid #000;
                  padding: 6px 8px;
                  word-wrap: break-word;
                  overflow: hidden;
                  line-height: 1.2;
                }
                .print-table th {
                  background-color: #f3f4f6 !important;
                  font-weight: bold;
                  font-size: 9px;
                  text-align: center;
                }
                .print-header {
                  margin-bottom: 20px;
                  padding-bottom: 10px;
                  border-bottom: 2px solid #000;
                  text-align: center;
                }
                .report-title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .report-subtitle {
                  font-size: 14px;
                  margin-bottom: 10px;
                }
              }
            `}
          </style>
          
          <div className="print-page">
            <div className="print-header">
              <div className="report-title">
                {filters.reportType === 'payments' ? 'PAYMENTS REPORT' : 
                 filters.reportType === 'workers' ? 'WORKERS PERFORMANCE REPORT' : 
                 filters.reportType === 'customers' ? 'CUSTOMERS REPORT' : 
                 filters.reportType === 'zones' ? 'ZONES PERFORMANCE REPORT' : 'EXPENSES REPORT'}
              </div>
              <div className="report-subtitle">
                Period: {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} | 
                Month Date: {(() => { const md = printData.villageBreakdownByZone?.monthDate ? new Date(printData.villageBreakdownByZone.monthDate) : null; return md ? md.toLocaleDateString('en-US') : 'Not set'; })()} | 
                Generated on: {printData.printedDate} at {printData.printedTime}
              </div>
              <div style={{fontSize: '12px', fontWeight: 'bold'}}>
                Village: {getSelectedVillageName()} | Worker: {getSelectedWorkerName()}
              </div>
            </div>

            {/* Summary Stats for Print */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', fontSize: '11px'}}>
              <div>
                <p><strong>Total Collected:</strong> ${printData.summary.totalCollected.toLocaleString()}</p>
                <p><strong>Total Unpaid:</strong> ${printData.summary.totalUnpaid.toLocaleString()}</p>
                <p><strong>Total Customers:</strong> {printData.summary.totalCustomers}</p>
              </div>
              <div>
                <p><strong>Collection Rate:</strong> {printData.summary.collectionRate.toFixed(1)}%</p>
                <p><strong>Total Villages:</strong> {printData.summary.totalVillages}</p>
                <p><strong>Net Profit:</strong> ${printData.summary.netProfit.toLocaleString()}</p>
              </div>
            </div>

            {/* Report Content for Print */}
            {filters.reportType === 'payments' && (
              <div>
                {(printData.villageBreakdownByZone?.zones || []).map(zone => (
                  <div key={zone._id} style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Zone: {zone.name} (Rate {zone.stats.collectionRate.toFixed(1)}%)</div>
                    <table className="print-table">
                      <thead>
                        <tr>
                          <th>Village</th>
                          <th>Customers</th>
                          <th>Paid</th>
                          <th>Unpaid</th>
                          <th>Collected</th>
                          <th>Due</th>
                          <th>Collection Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zone.villages.map(village => (
                          <tr key={village.villageId}>
                            <td>{village.villageName}</td>
                            <td>{village.totalCustomers}</td>
                            <td>{village.paidCustomers}</td>
                            <td>{village.unpaidCustomers}</td>
                            <td>${village.collected.toLocaleString()}</td>
                            <td>${village.due.toLocaleString()}</td>
                            <td>{village.collectionRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {filters.reportType === 'workers' && (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Villages</th>
                    <th>Customers</th>
                    <th>Paid</th>
                    <th>Collection Rate</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.workerPerformance.map((worker) => (
                    <tr key={worker.workerId}>
                      <td>{worker.workerName}</td>
                      <td>{worker.assignedVillages}</td>
                      <td>{worker.totalCustomers}</td>
                      <td>{worker.paidCustomers}</td>
                      <td>{worker.collectionRate.toFixed(1)}%</td>
                      <td>${worker.totalRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="signature-section" style={{marginTop: '40px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <div>
                  <p>Prepared by: ___________________</p>
                  <p>Signature: ___________________</p>
                  <p>Date: ___________________</p>
                </div>
                <div>
                  <p>Approved by: ___________________</p>
                  <p>Signature: ___________________</p>
                  <p>Date: ___________________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!reportData && dataLoaded && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
          <p className="text-gray-600">
            {customers.length === 0 ? 'No customer data found. Please add customers first.' : 'Select filters to generate report.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;
