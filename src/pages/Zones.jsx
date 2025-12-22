import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, MapPin, DollarSign, Loader, Printer, Search, Calendar, RefreshCw, Building } from 'lucide-react';
import { apiService } from '../services/api';

// Get current month function
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Generate all 12 months for the current year to match Customers page
const generateAllMonths = () => {
  const months = [];
  const currentYear = new Date().getFullYear();
  for (let i = 1; i <= 12; i++) {
    const value = `${currentYear}-${String(i).padStart(2, '0')}`;
    const label = new Date(value + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
};

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

// Format date time for display
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

const Zones = () => {
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [formErrors, setFormErrors] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [backendConnected, setBackendConnected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const availableMonths = generateAllMonths();

  // Load all data using API service
  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Sync selected month with Customers page via localStorage
  useEffect(() => {
    try {
      const savedMonth = localStorage.getItem('selectedMonth');
      if (savedMonth) {
        setSelectedMonth(savedMonth);
      }
    } catch { }

  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setBackendConnected(true);

      console.log('🔄 Loading zones, customers, and villages data...');

      // Test backend connection first
      const healthCheck = await apiService.healthCheck();
      console.log('🏥 Backend health:', healthCheck);

      if (healthCheck.status === 'down') {
        throw new Error('Backend server is not responding');
      }


      // Load zones, customers, and villages from backend
      const [zonesResponse, customersResponse, villagesResponse] = await Promise.all([
        apiService.getZones(),
        apiService.getCustomers(),
        apiService.getVillages()
      ]);

      console.log('📦 Zones response:', zonesResponse);
      console.log('👥 Customers response:', customersResponse);
      console.log('🏘️ Villages response:', villagesResponse);


      // Handle different response formats and ensure data is properly structured
      const zonesData = Array.isArray(zonesResponse) ? zonesResponse : (zonesResponse?.data || zonesResponse || []);
      const customersData = Array.isArray(customersResponse) ? customersResponse : (customersResponse?.data || customersResponse || []);
      const villagesData = Array.isArray(villagesResponse) ? villagesResponse : (villagesResponse?.data || villagesResponse || []);

      console.log(`✅ Loaded ${zonesData.length} zones, ${customersData.length} customers, and ${villagesData.length} villages`);


      // Use the zoneNumber from backend or assign based on creation order
      const zonesWithStableNumbers = zonesData.map((zone, index) => ({
        ...zone,
        // Use existing zoneNumber if available, otherwise use list position + 1
        listNumber: zone.zoneNumber || zone.listNumber || index + 1,
        // Ensure all required fields exist
        name: zone.name || 'Unnamed Zone',
        description: zone.description || '',
        supervisor: zone.supervisor || '',
        contactNumber: zone.contactNumber || '',
        notes: zone.notes || '',
        // Ensure dates are properly formatted
        createdAt: zone.createdAt ? new Date(zone.createdAt) : new Date(),
        updatedAt: zone.updatedAt ? new Date(zone.updatedAt) : new Date()
      }));


      setZones(zonesWithStableNumbers);
      setCustomers(customersData);
      setVillages(villagesData);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('❌ Error loading data:', error);
      setBackendConnected(false);


      // Use fallback data if backend is not available
      const currentMonth = getCurrentMonth();
      const fallbackZones = [
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
          villageId: '1',
          collectionDay: 'Monday',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
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
          villageId: '2',
          collectionDay: 'Tuesday',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date()
        }
      ];


      const fallbackCustomers = [
        {
          _id: '1',
          fullName: 'Customer One',
          phoneNumber: '+1234567890',
          address: '123 Main St',
          monthlyFee: 50,
          villageId: '1',
          zoneId: '1',
          payments: {
            [currentMonth]: {
              paid: 50,
              remaining: 0,

              fullyPaid: true,
              paymentDate: new Date().toISOString()
            }
          },
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date()
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
            [currentMonth]: {
              paid: 25,
              remaining: 20,

              fullyPaid: false,
              paymentDate: new Date().toISOString()
            }
          },
          createdAt: new Date('2024-01-12'),
          updatedAt: new Date()
        }
      ];

      const fallbackVillages = [
        {
          _id: '1',
          name: 'Downtown Village',
          code: 'DV',
          description: 'Central village area',
          monthlyFee: 50,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        },
        {
          _id: '2',
          name: 'North Residential',
          code: 'NR',
          description: 'Northern residential area',
          monthlyFee: 45,
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date()
        }
      ];


      setZones(fallbackZones);
      setCustomers(fallbackCustomers);
      setVillages(fallbackVillages);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // Get village name for a zone
  const getVillageName = () => '';

  // Get previous month's remaining balance (same logic as Customers page)
  const getPreviousMonthBalance = (customer, month) => {
    if (!customer || !month) return 0;

    const [year, monthNum] = month.split('-').map(Number);
    if (isNaN(year) || isNaN(monthNum)) return 0;

    let prevYear = year;
    let prevMonth = monthNum - 1;


    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;


    // Check monthlyPayments first (new structure)
    const prevMonthlyPayment = customer.monthlyPayments?.find(p => p.month === prevMonthStr);
    if (prevMonthlyPayment) {
      // If previous month was fully paid, remaining is 0 (no carry-over)
      if (prevMonthlyPayment.fullyPaid === true) {
        return 0;
      }
      const remaining = prevMonthlyPayment.remaining;
      return (typeof remaining === 'number' && remaining > 0) ? remaining : 0;
    }


    // Fallback to old payments structure (backward compatibility)
    const prevPayment = customer.payments?.[prevMonthStr];
    if (prevPayment) {
      // If previous month was fully paid, remaining is 0 (no carry-over)
      if (prevPayment.fullyPaid === true) {
        return 0;
      }
      const remaining = prevPayment.remaining;
      return (typeof remaining === 'number' && remaining > 0) ? remaining : 0;
    }


    return 0;
  };

  // Get payment status for selected month with carry-over calculation (same as Customers page)
  const getSelectedMonthPayment = (customer) => {
    if (!customer) {
      return {
        paid: 0,
        remaining: 0,
        fullyPaid: false,
        paidDate: null,
        month: selectedMonth,
        previousBalance: 0,
        totalDue: 0,
        date: null,
        monthlyFee: 0
      };
    }


    // Always recalculate previous balance to ensure it's correct
    const previousBalance = getPreviousMonthBalance(customer, selectedMonth);
    const monthlyFee = customer.monthlyFee || 0;
    const totalDue = previousBalance + monthlyFee;


    // Check monthlyPayments first (new structure)
    const monthlyPayment = customer.monthlyPayments?.find(p => p.month === selectedMonth);
    if (monthlyPayment) {
      // Always use recalculated previousBalance and totalDue, not stored values
      const paymentMonthlyFee = monthlyPayment.monthlyFee || monthlyFee;
      const recalculatedTotalDue = previousBalance + paymentMonthlyFee;
      const paid = typeof monthlyPayment.paid === 'number' ? monthlyPayment.paid : 0;
      const recalculatedRemaining = Math.max(0, recalculatedTotalDue - paid);
      const fullyPaid = recalculatedRemaining <= 0 || monthlyPayment.fullyPaid === true;


      return {
        paid: paid,
        remaining: fullyPaid ? 0 : recalculatedRemaining,
        fullyPaid: fullyPaid,
        paidDate: monthlyPayment.paidDate || null,
        month: selectedMonth,
        previousBalance: previousBalance,
        totalDue: recalculatedTotalDue,
        date: monthlyPayment.date || null,
        monthlyFee: paymentMonthlyFee
      };
    }

    // Fallback to old payments structure (backward compatibility)
    if (!customer.payments || !customer.payments[selectedMonth]) {
      return {
        paid: 0,
        remaining: totalDue,

        fullyPaid: false,
        paidDate: null,
        month: selectedMonth,
        previousBalance: previousBalance,
        totalDue: totalDue,
        date: null,
        monthlyFee: monthlyFee
      };
    }


    const payment = customer.payments[selectedMonth];
    const paid = typeof payment.paid === 'number' ? payment.paid : 0;
    const recalculatedRemaining = Math.max(0, totalDue - paid);
    const fullyPaid = recalculatedRemaining <= 0;


    return {
      paid,
      remaining: fullyPaid ? 0 : recalculatedRemaining,
      fullyPaid,
      paidDate: payment.paidDate || null,
      month: selectedMonth,
      previousBalance: previousBalance,
      totalDue: totalDue,
      date: payment.date || null,
      monthlyFee: monthlyFee
    };
  };

  // Calculate zone statistics from real customer data
  const calculateZoneStats = (zone) => {
    // Get all customers assigned to this zone
    const zoneCustomers = customers.filter(customer => {
      return customer.zoneId === zone._id ||
        (customer.zoneId && customer.zoneId._id === zone._id);
    });

    const totalCustomers = zoneCustomers.length;


    // Calculate payment statistics for selected month
    const monthlyStats = zoneCustomers.reduce((stats, customer) => {
      // Get payment for selected month (with carry-over calculation)
      const payment = getSelectedMonthPayment(customer);


      const monthlyFee = Number(payment.monthlyFee || customer.monthlyFee) || 0;
      const totalDue = Number(payment.totalDue) || monthlyFee;
      const paidAmount = Number(payment.paid) || 0;
      const remainingAmount = Number(payment.remaining) || (totalDue - paidAmount);
      const isFullyPaid = payment.fullyPaid || remainingAmount <= 0;
      const isPartiallyPaid = paidAmount > 0 && !isFullyPaid;
      const hasNotPaid = paidAmount === 0;

      return {
        totalDue: stats.totalDue + totalDue, // Use totalDue (includes previous balance)
        totalPaid: stats.totalPaid + paidAmount,
        totalRemaining: stats.totalRemaining + remainingAmount,
        paidCustomers: stats.paidCustomers + (isFullyPaid ? 1 : 0),
        unpaidCustomers: stats.unpaidCustomers + (hasNotPaid ? 1 : 0),
        partialPayments: stats.partialPayments + (isPartiallyPaid ? 1 : 0),
        totalMonthlyFee: stats.totalMonthlyFee + monthlyFee
      };
    }, {
      totalDue: 0,
      totalPaid: 0,
      totalRemaining: 0,
      paidCustomers: 0,
      unpaidCustomers: 0,
      partialPayments: 0,
      totalMonthlyFee: 0
    });

    // Calculate financial metrics
    const totalRevenue = monthlyStats.totalDue;
    const unpaidAmount = monthlyStats.totalRemaining;
    const netProfit = monthlyStats.totalPaid;

    // Calculate collection rate with decimal precision
    const collectionRate = monthlyStats.totalDue > 0 ?

      (monthlyStats.totalPaid / monthlyStats.totalDue) * 100 : 0;

    // Calculate customer percentage (if this zone has customers compared to total)
    const totalAllCustomers = customers.length;
    const customerPercentage = totalAllCustomers > 0 ?

      (totalCustomers / totalAllCustomers) * 100 : 0;

    return {
      totalCustomers,
      ...monthlyStats,
      totalRevenue,
      unpaidAmount,
      netProfit,
      collectionRate,
      customerPercentage,
      zoneCustomers
    };
  };

  // Calculate overall statistics across all zones
  const calculateOverallStats = () => {
    return zones.reduce((stats, zone) => {
      const zoneStats = calculateZoneStats(zone);
      return {
        totalZones: stats.totalZones + 1,
        totalCustomers: stats.totalCustomers + zoneStats.totalCustomers,
        totalRevenue: stats.totalRevenue + zoneStats.totalRevenue,
        totalPaid: stats.totalPaid + zoneStats.totalPaid,
        totalUnpaidAmount: stats.totalUnpaidAmount + zoneStats.unpaidAmount,
        totalNetProfit: stats.totalNetProfit + zoneStats.netProfit,
        totalPaidCustomers: stats.totalPaidCustomers + zoneStats.paidCustomers,
        totalUnpaidCustomers: stats.totalUnpaidCustomers + zoneStats.unpaidCustomers,
        totalPartialPayments: stats.totalPartialPayments + zoneStats.partialPayments,
      };
    }, {
      totalZones: 0,
      totalCustomers: 0,
      totalRevenue: 0,
      totalPaid: 0,
      totalUnpaidAmount: 0,
      totalNetProfit: 0,
      totalPaidCustomers: 0,
      totalUnpaidCustomers: 0,
      totalPartialPayments: 0,
    });
  };

  const overallStats = calculateOverallStats();

  // Get next available list number for new zones
  const getNextListNumber = () => {
    if (zones.length === 0) return 1;


    // Find the highest existing list number and add 1
    const maxNumber = Math.max(...zones.map(zone => zone.listNumber || 0));
    return maxNumber + 1;
  };

  // Filter zones based on search
  const filteredZones = zones.filter(zone => {
    const searchLower = searchTerm?.toLowerCase() || '';



    return (
      zone?.name?.toLowerCase().includes(searchLower) ||
      zone?.listNumber?.toString().includes(searchTerm) ||
      zone?.description?.toLowerCase().includes(searchLower) ||
      zone?.supervisor?.toLowerCase().includes(searchLower) ||
      zone?.code?.toLowerCase().includes(searchLower)
    );
  });

  // Validate form data
  const validateForm = (formData) => {
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = 'Zone name is required';
    }

    if (formData.name?.trim().length < 2) {
      errors.name = 'Zone name must be at least 2 characters long';
    }


    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormErrors({});

    const formData = new FormData(e.target);


    const zoneData = {
      name: formData.get('name').trim(),
      description: formData.get('description')?.trim() || '',
      supervisor: formData.get('supervisor')?.trim() || '',
      contactNumber: formData.get('contactNumber')?.trim() || '',
      notes: formData.get('notes')?.trim() || '',
      // Include zoneNumber for new zones to maintain stable numbering
      zoneNumber: editingZone ? editingZone.zoneNumber : getNextListNumber(),
      code: `ZONE${String(editingZone ? editingZone.zoneNumber : getNextListNumber()).padStart(3, '0')}`,
      status: 'active'
    };

    const errors = validateForm(zoneData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormLoading(false);
      return;
    }

    try {
      console.log('🚀 Saving zone data:', zoneData);


      let result;
      if (editingZone) {
        result = await apiService.updateZone(editingZone._id, zoneData);
        console.log('✅ Zone updated:', result);
      } else {
        result = await apiService.createZone(zoneData);
        console.log('✅ Zone created:', result);
      }


      setShowModal(false);
      setEditingZone(null);
      setFormErrors({});
      setRefreshTrigger(prev => prev + 1);


      alert(`Zone ${editingZone ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('❌ Error saving zone:', error);
      alert(`Failed to save zone: ${error.message || 'Please try again.'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (zoneId) => {
    if (window.confirm('Are you sure you want to delete this zone? This action cannot be undone.')) {
      try {
        console.log('🗑️ Deleting zone:', zoneId);
        await apiService.deleteZone(zoneId);
        setRefreshTrigger(prev => prev + 1);
        alert('Zone deleted successfully!');
      } catch (error) {
        console.error('❌ Error deleting zone:', error);
        alert(`Failed to delete zone: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handlePrintZonePayments = (zone) => {
    const zoneStats = calculateZoneStats(zone);


    const zoneForPrint = {
      ...zone,
      stats: zoneStats,
      printedDate: new Date().toLocaleDateString(),
      printedTime: new Date().toLocaleTimeString(),
      selectedMonth: selectedMonth,
      type: 'single-zone'
    };
    setPrintData(zoneForPrint);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Print all zones information
  const handlePrintAllZones = () => {
    const allZonesData = filteredZones.map(zone => {
      const stats = calculateZoneStats(zone);


      return {
        ...zone,
        stats: stats
      };
    });


    const printAllData = {
      zones: allZonesData,
      overallStats: calculateOverallStats(),
      printedDate: new Date().toLocaleDateString(),
      printedTime: new Date().toLocaleTimeString(),
      selectedMonth: selectedMonth,
      type: 'all-zones'
    };


    setPrintData(printAllData);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const openCreateModal = () => {
    setEditingZone(null);
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (zone) => {
    setEditingZone(zone);
    setFormErrors({});
    setShowModal(true);
  };

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Get month name for display
  const getMonthName = (monthString) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Inject print styles into document head to avoid JSX parsing issues
  useEffect(() => {
    const css = `
      @media print {
        @page { size: A4; margin: 0.3cm; }
        .no-print { display: none !important; }
        .print-section { display: block !important; }
        .print-page { page-break-after: always; font-family: Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; }
        .print-page:last-child { page-break-after: auto; }
        body { margin: 0; padding: 0; background: white !important; }
        .print-section table { width: 100%; border-collapse: collapse; font-size: 8px; table-layout: fixed; }
        .print-section thead th { border: 1px solid #000; padding: 2px 3px; text-align: left; line-height: 1.2; background-color: #f0f0f0; font-weight: bold; font-size: 8px; }
        .print-section tbody td { border: 1px solid #000; padding: 2px 3px; text-align: left; line-height: 1.2; font-size: 8px; vertical-align: middle; }
        .print-section h1 { font-size: 14px; margin: 0.1cm 0; line-height: 1.2; }
        .print-section p { font-size: 8px; margin: 0.05cm 0; line-height: 1.2; }
        .print-section .print-page > div { padding: 0.3cm; }
        .print-section .border-b { padding-bottom: 0.1cm; margin-bottom: 0.1cm; }
        .print-section .border-t { padding-top: 0.1cm; margin-top: 0.1cm; }
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-zones-print', 'true');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    return () => {
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    };
  }, []);

  // Read the real monthly date from Customers data for the selected month
  const getSelectedMonthRealDate = () => {
    const dates = [];
    for (const c of customers) {
      const mp = c.monthlyPayments?.find(p => p.month === selectedMonth && p.date);
      if (mp?.date) dates.push(mp.date);
      const legacy = c.payments?.[selectedMonth];
      if (legacy?.date) dates.push(legacy.date);
    }
    if (dates.length === 0) return null;
    const freq = dates.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {});
    const common = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return common;
  };

  const getMonthRealDateFor = (month) => {
    const dates = [];
    for (const c of customers) {
      const mp = c.monthlyPayments?.find(p => p.month === month && p.date);
      if (mp?.date) dates.push(mp.date);
      const legacy = c.payments?.[month];
      if (legacy?.date) dates.push(legacy.date);
    }
    if (dates.length === 0) return null;
    const freq = dates.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {});
    const common = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return common;
  };

  // Villages Statistics
  const villagesStats = {
    totalVillages: villages.length,
    totalVillageCustomers: villages.reduce((total, village) => {
      const villageCustomers = customers.filter(c =>

        c.villageId?._id === village._id || c.villageId === village._id
      );
      return total + villageCustomers.length;
    }, 0),
    averageMonthlyFee: villages.length > 0

      ? villages.reduce((sum, village) => sum + (village.monthlyFee || 0), 0) / villages.length
      : 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-4 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Connection Status */}
        {!backendConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Demo Mode</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Backend connection failed. Using demo data. Some features may be limited.
                  </p>
                  {lastUpdated && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Last updated: {formatDateTime(lastUpdated)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={refreshData}
                className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg hover:bg-yellow-200 transition-colors duration-200 text-sm font-medium whitespace-nowrap"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Zones Management</h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
              Manage zones, track payments, and monitor collection performance - {getMonthName(selectedMonth)}
            </p>
            <p className="text-gray-600 text-sm md:text-base">
              Month Date: {(() => { const d = getSelectedMonthRealDate(); return d ? new Date(d).toLocaleDateString('en-US') : 'Not set'; })()}
            </p>
            {lastUpdated && backendConnected && (
              <p className="text-xs text-gray-500 mt-1">
                Last synced: {formatDateTime(lastUpdated)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={handlePrintAllZones}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium flex-1 lg:flex-none min-w-[120px]"
              title="Print All Zones"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print All
            </button>
            <button
              onClick={refreshData}
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm font-medium flex-1 lg:flex-none min-w-[120px]"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium flex-1 lg:flex-none min-w-[120px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Zone
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
            <div className="flex items-center justify-center space-x-3">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-700 font-medium">Loading data from server...</span>
            </div>
          </div>
        )}


        {/* Month Selection and Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 no-print mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search zones by name, number, description, supervisor, village, or collection day..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Month for Payment Tracking:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => { const m = e.target.value; setSelectedMonth(m); try { localStorage.setItem('selectedMonth', m); } catch { } }}

                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm bg-white"
              >
                {availableMonths.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}{month.value === getCurrentMonth() ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-600 mt-2">
                Month Date: {(() => {
                  const d = getSelectedMonthRealDate();
                  return d ? new Date(d).toLocaleDateString('en-US') : 'Not set';
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4 no-print">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Zones</p>
              <p className="text-xl font-semibold text-gray-900">{zones.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Customers</p>
              <p className="text-xl font-semibold text-gray-900">{customers.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Villages</p>
              <p className="text-xl font-semibold text-gray-900">{villages.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Revenue</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(overallStats.totalRevenue)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Net Profit</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(overallStats.totalNetProfit)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Village Fee</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(villagesStats.averageMonthlyFee)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-3 no-print">
          <div className="rounded-xl p-4 text-white bg-gradient-to-r from-green-500 to-green-600 shadow-sm">
            <p className="text-sm">Paid Customers</p>
            <p className="text-2xl font-bold">{overallStats.totalPaidCustomers}</p>
          </div>
          <div className="rounded-xl p-4 text-white bg-gradient-to-r from-red-500 to-red-600 shadow-sm">
            <p className="text-sm">Unpaid Customers</p>
            <p className="text-2xl font-bold">{overallStats.totalUnpaidCustomers}</p>
          </div>
          <div className="rounded-xl p-4 text-white bg-gradient-to-r from-purple-500 to-purple-600 shadow-sm">
            <p className="text-sm">Collection Rate</p>
            <p className="text-2xl font-bold">{(overallStats.totalRevenue > 0 ? (overallStats.totalPaid / overallStats.totalRevenue) * 100 : 0).toFixed(1)}%</p>
          </div>
        </div>

        {/* Zones Table - Updated column order as requested */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[150px]">Zone Details</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Customers</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Paid</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Unpaid</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">% of Total</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Revenue</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Net Profit</th>
                  {/* Collection Rate Removed */}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredZones.map((zone) => {
                  const stats = calculateZoneStats(zone);

                  return (
                    <tr key={zone._id} className="hover:bg-gray-50 transition-colors duration-150">
                      {/* List Number */}
                      <td className="px-3 py-4">
                        <div className="text-sm font-bold text-blue-600 text-center">
                          {zone.listNumber}
                        </div>
                        {zone.code && (
                          <div className="text-xs text-gray-500 text-center mt-1">
                            {zone.code}
                          </div>
                        )}
                      </td>


                      {/* Zone Details */}
                      <td className="px-3 py-4">
                        <div className="text-sm font-semibold text-gray-900">{zone.name}</div>
                        {zone.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">{zone.description}</div>
                        )}
                        {zone.supervisor && (
                          <div className="text-xs text-gray-500 mt-1">Supervisor: {zone.supervisor}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Created: {formatDate(zone.createdAt)}
                        </div>
                      </td>


                      {/* Total Customers */}
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-900 font-semibold text-center">
                          {stats.totalCustomers}
                        </div>
                      </td>

                      {/* Paid Customers */}
                      <td className="px-3 py-4">
                        <div className="text-sm text-green-600 font-semibold text-center">
                          {stats.paidCustomers}
                        </div>
                      </td>


                      {/* Unpaid Customers */}
                      <td className="px-3 py-4">
                        <div className="text-sm text-red-600 font-semibold text-center">
                          {stats.unpaidCustomers}
                        </div>
                      </td>


                      {/* Percentage of Customers */}
                      <td className="px-3 py-4">
                        <div className="text-sm text-purple-600 font-semibold text-center">
                          {stats.customerPercentage.toFixed(1)}%
                        </div>
                      </td>


                      {/* Total Revenue */}
                      <td className="px-3 py-4">
                        <div className="text-sm text-blue-600 font-semibold text-center">
                          {formatCurrency(stats.totalRevenue)}
                        </div>
                      </td>

                      {/* Net Profit */}
                      <td className="px-3 py-4">
                        <div className={`text-sm font-semibold text-center ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {formatCurrency(stats.netProfit)}
                        </div>
                      </td>


                      {/* Actions */}
                      <td className="px-3 py-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handlePrintZonePayments(zone)}
                            className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors duration-200 touch-manipulation"
                            title="Print Payments"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(zone)}
                            className="text-yellow-600 hover:text-yellow-800 p-2 rounded-lg hover:bg-yellow-50 transition-colors duration-200 touch-manipulation"
                            title="Edit Zone"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(zone._id)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200 touch-manipulation"
                            title="Delete Zone"
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
          </div>

          {filteredZones.length === 0 && !loading && (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No zones found' : 'No zones created yet'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first zone to organize your garbage collection operations.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={openCreateModal}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  Create Your First Zone
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingZone ? 'Edit Zone' : 'Create New Zone'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zone Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      minLength="2"
                      defaultValue={editingZone?.name}
                      className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}

                      placeholder="Enter zone name"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-2">{formErrors.name}</p>
                    )}
                  </div>


                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows="2"
                      defaultValue={editingZone?.description}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="Enter zone description (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supervisor
                    </label>
                    <input
                      type="text"
                      name="supervisor"
                      defaultValue={editingZone?.supervisor}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter supervisor name (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      name="contactNumber"
                      defaultValue={editingZone?.contactNumber}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter contact number (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      rows="2"
                      defaultValue={editingZone?.notes}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="Enter any additional notes (optional)"
                    />
                  </div>

                  {editingZone && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-sm font-medium text-gray-700">
                        <strong>List Number:</strong> {editingZone.listNumber}
                      </p>
                      <p className="text-sm font-medium text-gray-700">
                        <strong>Zone Code:</strong> {editingZone.code || `ZONE${String(editingZone.zoneNumber).padStart(3, '0')}`}
                      </p>
                      {editingZone.createdAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {formatDateTime(editingZone.createdAt)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        List numbers and codes are permanent and cannot be changed to maintain data consistency.
                      </p>
                    </div>
                  )}


                  {!editingZone && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <p className="text-sm font-medium text-blue-700">
                        <strong>Next List Number:</strong> {getNextListNumber()}
                      </p>
                      <p className="text-sm font-medium text-blue-700">
                        <strong>Zone Code:</strong> ZONE{String(getNextListNumber()).padStart(3, '0')}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        This zone will be assigned number {getNextListNumber()} and code ZONE{String(getNextListNumber()).padStart(3, '0')} permanently.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingZone(null);
                      setFormErrors({});
                    }}
                    className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 rounded-lg hover:bg-gray-100"
                    disabled={formLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center"
                  >
                    {formLoading && <Loader className="w-4 h-4 animate-spin mr-2" />}
                    {editingZone ? 'Update Zone' : 'Create Zone'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Print Section */}
        {printData && (
          <div className="print-section hidden print:block">
            <div className="p-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {printData.type === 'single-zone' ? `${printData.name} - Zone Report` : 'All Zones Report'}
                </h1>
                <p className="text-gray-600">
                  Generated on {printData.printedDate} at {printData.printedTime}
                </p>
                <p className="text-gray-600">
                  Month: {getMonthName(printData.selectedMonth)}
                </p>
                <p className="text-gray-600">
                  Month Date: {(() => { const d = getMonthRealDateFor(printData.selectedMonth); return d ? new Date(d).toLocaleDateString('en-US') : 'Not set'; })()}
                </p>
              </div>


              {printData.type !== 'single-zone' ? (
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Overall Statistics:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>Total Zones: {printData.overallStats.totalZones}</li>
                        <li>Total Customers: {printData.overallStats.totalCustomers}</li>
                        <li>Total Revenue: {formatCurrency(printData.overallStats.totalRevenue)}</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Payment Summary:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>Paid Customers: {printData.overallStats.totalPaidCustomers}</li>
                        <li>Unpaid Customers: {printData.overallStats.totalUnpaidCustomers}</li>
                        <li>Net Profit: {formatCurrency(printData.overallStats.totalNetProfit)}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}

              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">#</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Zone Name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Customers</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Paid</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Unpaid</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">% of Total</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Revenue</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Net Profit</th>
                    {/* Collection Rate Removed from print as well */}
                  </tr>
                </thead>
                <tbody>
                  {(printData.type === 'single-zone' ? [printData] : printData.zones).map((zone, index) => {
                    const stats = printData.type === 'single-zone' ? printData.stats : zone.stats;
                    return (
                      <tr key={zone._id}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{zone.listNumber}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{zone.name}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{stats.totalCustomers}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{stats.paidCustomers}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{stats.unpaidCustomers}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{stats.customerPercentage.toFixed(1)}%</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(stats.totalRevenue)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(stats.netProfit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {printData.type === 'single-zone' && (
                <div className="mt-4 text-sm">
                  <strong>Statistics:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>Total Customers: {printData.stats.totalCustomers}</li>
                    <li>Paid Customers: {printData.stats.paidCustomers}</li>
                    <li>Unpaid Customers: {printData.stats.unpaidCustomers}</li>
                    <li>Total Revenue: {formatCurrency(printData.stats.totalRevenue)}</li>
                    <li>Net Profit: {formatCurrency(printData.stats.netProfit)}</li>
                    <li>Collection Rate: {printData.stats.collectionRate.toFixed(1)}%</li>
                  </ul>
                </div>
              )}

              <div className="mt-6 text-center text-sm text-gray-500">
                <p>End of report - {printData.type === 'single-zone' ? 'Single Zone' : `Total ${printData.zones.length} zones`}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Zones;

