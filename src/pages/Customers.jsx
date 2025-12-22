import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Phone, MapPin, DollarSign, Users, CheckCircle, XCircle, Printer, Calendar, Building, Map, CheckSquare, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

// Generate all 12 months for the current year
const generateAllMonths = () => {
  const months = [];
  const currentYear = new Date().getFullYear();
  for (let i = 1; i <= 12; i++) {
    months.push(`${currentYear}-${String(i).padStart(2, '0')}`);
  }
  return months;
};

// Get current month
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [villages, setVillages] = useState([]); // retained for compatibility; hidden in UI
  const [zones, setZones] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVillageModal, setShowVillageModal] = useState(false); // deprecated in UI
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingVillage, setEditingVillage] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [villageFilter, setVillageFilter] = useState('all'); // deprecated in UI
  const [zoneFilter, setZoneFilter] = useState('all');
  const [printData, setPrintData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [availableMonths, setAvailableMonths] = useState([getCurrentMonth()]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [currentPrintPage, setCurrentPrintPage] = useState(1);
  const getSelectedMonthRealDate = () => {
    const dates = [];
    for (const c of customers) {
      const mp = c?.monthlyPayments?.find(p => p.month === selectedMonth && p.date);
      if (mp?.date) dates.push(mp.date);
      const legacy = c?.payments?.[selectedMonth];
      if (legacy?.date) dates.push(legacy.date);
    }
    if (dates.length === 0) return null;
    const freq = dates.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {});
    const common = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return common;
  };
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [monthlyDate, setMonthlyDate] = useState('');

  // All 12 months for the current year
  const [wbJsondata, setWbJsondata] = useState([]);
  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [importOptions, setImportOptions] = useState({ defaultAddress: '', defaultZoneId: '' });
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());

  const allMonths = generateAllMonths();

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Enhanced API functions with better error handling
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
      console.log(`🔄 API Call: ${options.method || 'GET'} ${API_BASE_URL}${url}`);
      const response = await fetch(`${API_BASE_URL}${url}`, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error Response:`, errorText);
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
          // Attach error data to error object
          const error = new Error(errorMessage);
          error.response = { data: errorData, status: response.status };
          throw error;
        } catch (parseError) {
          const error = new Error(errorMessage);
          error.response = { data: { message: errorText }, status: response.status };
          throw error;
        }
      }

      const data = await response.json();
      console.log(`✅ API Success: ${options.method || 'GET'} ${url}`, data);

      return data;
    } catch (error) {
      console.error(`❌ API Error: ${options.method || 'GET'} ${url}`, error);
      throw error;
    }
  };

  // Get previous month's remaining balance
  // This function ensures consistent calculation for ALL customers
  // Key logic: If previous month was fully paid, return 0 (no carry-over)
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
      // CRITICAL: If previous month was fully paid, remaining is 0 (no carry-over)
      if (prevMonthlyPayment.fullyPaid === true) {
        return 0;
      }
      // Return remaining balance, ensuring it's a valid number
      const remaining = prevMonthlyPayment.remaining;
      return (typeof remaining === 'number' && remaining > 0) ? remaining : 0;
    }

    // Fallback to old payments structure (backward compatibility)
    const prevPayment = customer.payments?.[prevMonthStr];
    if (prevPayment) {
      // CRITICAL: If previous month was fully paid, remaining is 0 (no carry-over)
      if (prevPayment.fullyPaid === true) {
        return 0;
      }
      // Return remaining balance, ensuring it's a valid number
      const remaining = prevPayment.remaining;
      return (typeof remaining === 'number' && remaining > 0) ? remaining : 0;
    }

    // No previous month data found, return 0 (no carry-over)
    return 0;
  };

  // Check if previous month was fully paid
  // This ensures consistent behavior for ALL customers
  const isPreviousMonthFullyPaid = (customer, month) => {
    if (!customer || !month) return false;

    const [year, monthNum] = month.split('-').map(Number);
    if (isNaN(year) || isNaN(monthNum)) return false;

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
      return prevMonthlyPayment.fullyPaid === true;
    }

    // Fallback to old payments structure (backward compatibility)
    const prevPayment = customer.payments?.[prevMonthStr];
    if (prevPayment) {
      return prevPayment.fullyPaid === true;
    }

    return false;
  };

  // Get payment status for selected month with carry-over calculation
  // This function ensures ALL customers get consistent payment calculations
  // Key behavior: If previous month was fully paid, next month shows only monthly fee
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

    // Always recalculate previous balance to ensure it's correct for ALL customers
    // This ensures that if previous month was fully paid, we get 0 previous balance
    const previousBalance = getPreviousMonthBalance(customer, selectedMonth);
    const monthlyFee = customer.monthlyFee || 0;
    const totalDue = previousBalance + monthlyFee;

    // Check monthlyPayments first (new structure)
    const monthlyPayment = customer.monthlyPayments?.find(p => p.month === selectedMonth);
    if (monthlyPayment) {
      // Always use recalculated previousBalance and totalDue, not stored values
      // This ensures that if previous month was fully paid, we get 0 previous balance
      // This is CRITICAL for consistency across ALL customers
      const paymentMonthlyFee = monthlyPayment.monthlyFee || monthlyFee;
      const recalculatedTotalDue = previousBalance + paymentMonthlyFee;
      const paid = typeof monthlyPayment.paid === 'number' ? monthlyPayment.paid : 0;
      const recalculatedRemaining = Math.max(0, recalculatedTotalDue - paid);
      // Customer is fully paid if remaining is 0 or explicitly marked as fully paid
      const fullyPaid = recalculatedRemaining <= 0 || monthlyPayment.fullyPaid === true;

      return {
        paid: paid,
        remaining: fullyPaid ? 0 : recalculatedRemaining,
        fullyPaid: fullyPaid,
        paidDate: monthlyPayment.paidDate || null,
        month: selectedMonth,
        previousBalance: previousBalance, // Always use recalculated value (0 if prev month was fully paid)
        totalDue: recalculatedTotalDue, // Always use recalculated value
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
        previousBalance: previousBalance, // Always use recalculated value (0 if prev month was fully paid)
        totalDue: totalDue, // Always use recalculated value
        date: null,
        monthlyFee: monthlyFee
      };
    }

    const payment = customer.payments[selectedMonth];
    const paid = typeof payment.paid === 'number' ? payment.paid : 0;
    // Always use recalculated totalDue, not stored value
    // This ensures consistency: if previous month was fully paid, totalDue = monthlyFee only
    const recalculatedRemaining = Math.max(0, totalDue - paid);
    const fullyPaid = recalculatedRemaining <= 0 || payment.fullyPaid === true;

    return {
      paid,
      remaining: fullyPaid ? 0 : recalculatedRemaining,
      fullyPaid,
      paidDate: payment.paidDate || null,
      month: selectedMonth,
      previousBalance: previousBalance, // Always use recalculated value (0 if prev month was fully paid)
      totalDue: totalDue, // Always use recalculated value
      date: payment.date || null,
      monthlyFee: monthlyFee
    };
  };

  const getZoneName = (customer) => {
    if (customer.zoneId && typeof customer.zoneId === 'object') {
      return customer.zoneId.name || 'Unknown Zone';
    }
    const zone = zones.find(z => z._id === customer.zoneId);
    return zone ? zone.name : 'Unknown Zone';
  };

  // Zone name for print
  const getVillageNameForPrint = (customer) => {
    // If customer has zoneId (as object or ID), find the zone
    let zone = null;
    if (customer.zoneId) {
      if (typeof customer.zoneId === 'object' && customer.zoneId._id) {
        zone = zones.find(z => z._id === customer.zoneId._id);
      } else {
        zone = zones.find(z => z._id === customer.zoneId);
      }
    }

    if (zone) {
      return zone.name || '';
    }

    // If no zone, return empty string
    return '';
  };

  const getVillageFromZone = () => null; // deprecated

  // Load data from backend
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    try {
      const savedMonth = localStorage.getItem('selectedMonth');
      if (savedMonth) setSelectedMonth(savedMonth);
    } catch { }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersResponse, zonesResponse] = await Promise.all([
        apiRequest('/customers'),
        apiRequest('/zones')
      ]);

      // Ensure we have proper array data
      const customersData = Array.isArray(customersResponse) ? customersResponse : (customersResponse.data || []);
      const zonesData = Array.isArray(zonesResponse) ? zonesResponse : (zonesResponse.data || []);

      setCustomers(customersData);
      setZones(zonesData);

      console.log(`✅ Loaded ${customersData.length} customers and ${zonesData.length} zones`);

    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search, zone, payment status, and selected month
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phoneNumber?.includes(searchTerm) ||
      customer.address?.toLowerCase().includes(searchTerm.toLowerCase());

    const payment = getSelectedMonthPayment(customer);
    const isPaid = payment.fullyPaid;

    const matchesPayment = paymentFilter === 'all' ||
      (paymentFilter === 'paid' && isPaid) ||
      (paymentFilter === 'unpaid' && !isPaid);

    const matchesZone = zoneFilter === 'all' ||
      customer.zoneId?._id === zoneFilter ||
      customer.zoneId === zoneFilter;

    return matchesSearch && matchesPayment && matchesZone;
  });

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c._id)));
    }
  };

  // Toggle select individual customer
  const toggleSelectCustomer = (customerId) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customers? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/customers/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ customerIds: Array.from(selectedCustomers) })
      });

      setCustomers(prev => prev.filter(c => !selectedCustomers.has(c._id)));
      setSelectedCustomers(new Set());
      alert('Selected customers deleted successfully!');
    } catch (error) {
      console.error('Error deleting customers:', error);
      alert('Error deleting customers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle partial payment - UPDATED: Only affects current month
  const handlePartialPayment = (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount('');
    setShowPaymentModal(true);
  };

  // Initialize monthly payment with date
  const initializeMonthlyPayment = async (customerId, month, date) => {
    try {
      const response = await apiRequest(`/customers/${customerId}/monthly-payment`, {
        method: 'POST',
        body: JSON.stringify({ month, date })
      });
      return response.data || response;
    } catch (error) {
      console.error('Error initializing monthly payment:', error);
      throw error;
    }
  };

  // Enhanced payment processing with carry-over calculation
  const processPayment = async () => {
    if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const customer = selectedCustomer;
    const currentPayment = getSelectedMonthPayment(customer);

    if (amount > currentPayment.remaining) {
      alert(`Payment amount cannot exceed remaining balance of $${currentPayment.remaining.toFixed(2)}`);
      return;
    }

    setActionLoading('processing-payment');

    try {
      // Ensure monthly payment is initialized with date if not exists
      if (!currentPayment.date) {
        const today = new Date().toISOString().split('T')[0];
        try {
          await initializeMonthlyPayment(customer._id, selectedMonth, today);
        } catch (initError) {
          console.error('Error initializing monthly payment, continuing anyway:', initError);
          // Continue with payment even if initialization fails
        }
      }

      // Use the new partial payment endpoint
      const response = await apiRequest(`/customers/${customer._id}/partial-payment`, {
        method: 'POST',
        body: JSON.stringify({
          month: selectedMonth,
          amount: amount,
          paidDate: new Date().toISOString(),
          method: 'cash'
        })
      });

      const updatedCustomer = response.data || response;

      // Update local state
      setCustomers(prev => prev.map(c =>
        c._id === customer._id ? updatedCustomer : c
      ));

      setShowPaymentModal(false);
      setSelectedCustomer(null);
      setPaymentAmount('');
      await loadData(); // Reload to get updated calculations
      alert(`Payment of $${amount} processed successfully for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}!`);
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
      alert('Error processing payment: ' + errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Enhanced payment toggle with carry-over calculation
  const handlePaymentToggle = async (customerId) => {
    setActionLoading(`toggle-${customerId}`);

    const customer = customers.find(c => c._id === customerId);
    if (!customer) return;

    const currentPayment = getSelectedMonthPayment(customer);
    const newFullyPaid = !currentPayment.fullyPaid;

    try {
      // Ensure monthly payment is initialized with date if not exists
      if (!currentPayment.date) {
        const today = new Date().toISOString().split('T')[0];
        await initializeMonthlyPayment(customerId, selectedMonth, today);
      }

      // Use the payment endpoint with total due
      const paid = newFullyPaid ? currentPayment.totalDue : 0;

      await apiRequest(`/customers/${customerId}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({
          month: selectedMonth,
          paid: paid,
          paidDate: newFullyPaid ? new Date().toISOString() : null,
          method: 'cash'
        })
      });

      // Reload data to get updated calculations
      await loadData();

    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error updating payment status: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Set monthly date for all customers
  const handleSetMonthlyDate = async () => {
    if (!monthlyDate) {
      alert('Please select a date');
      return;
    }

    setActionLoading('setting-date');

    try {
      // Initialize monthly payment for all customers with the selected date
      const updatePromises = customers.map(async (customer) => {
        try {
          return await initializeMonthlyPayment(customer._id, selectedMonth, monthlyDate);
        } catch (error) {
          console.error(`Error setting date for customer ${customer._id}:`, error);
          return null;
        }
      });

      await Promise.all(updatePromises);
      await loadData();

      setShowDateModal(false);
      setMonthlyDate('');
      alert(`Monthly date set successfully for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
    } catch (error) {
      console.error('Error setting monthly date:', error);
      alert('Error setting monthly date: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Mark all filtered customers as paid with carry-over calculation
  const handleMarkAllAsPaid = async () => {
    if (filteredCustomers.length === 0) {
      alert('No customers to mark as paid');
      return;
    }

    if (!window.confirm(`Are you sure you want to mark ALL ${filteredCustomers.length} filtered customers as paid for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}?`)) {
      return;
    }

    setMarkAllLoading(true);

    try {
      // Use the backend endpoint that handles carry-over calculations
      await apiRequest('/customers/payments/mark-all-paid', {
        method: 'PATCH',
        body: JSON.stringify({ month: selectedMonth })
      });

      // Reload data to get updated payment status
      await loadData();

      alert(`Successfully marked ${filteredCustomers.length} customers as paid for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
    } catch (error) {
      console.error('Error marking all as paid:', error);
      alert('Error marking all as paid: ' + error.message);
    } finally {
      setMarkAllLoading(false);
    }
  };

  // Add/Edit customer - UPDATED VERSION (adds to end of list)
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const customerData = {
      fullName: formData.get('fullName'),
      phoneNumber: formData.get('phoneNumber'),
      address: formData.get('address'),
      zoneId: formData.get('zoneId'),
      monthlyFee: parseFloat(formData.get('monthlyFee'))
    };

    try {
      if (editingCustomer) {
        const response = await apiRequest(`/customers/${editingCustomer._id}`, {
          method: 'PUT',
          body: JSON.stringify(customerData)
        });

        // Ensure we get the updated customer data
        const updatedCustomer = response.data || response;

        setCustomers(prev => prev.map(c =>
          c._id === editingCustomer._id ? updatedCustomer : c
        ));

        alert('Customer updated successfully!');
      } else {
        const response = await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify(customerData)
        });

        // Ensure we get the new customer data
        const newCustomer = response.data || response;

        // Add the new customer to the END of the list to maintain sequential numbering
        setCustomers(prev => [...prev, newCustomer]);

        alert('Customer created successfully!');
      }
      setShowCustomerModal(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Import customers from Excel - UPDATED WITH SMART HEADER DETECTION
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Read as array of arrays to handle custom headers/titles
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rawData || rawData.length === 0) {
        throw new Error("File appears to be empty");
      }

      // Smart Header Detection
      const nameKeys = ['Name', 'Full Name', 'Customer Name', 'Customer', 'Magaca', 'Macamiilka', 'Names', 'Client Name', 'Macaamiil'];
      const phoneKeys = ['Phone', 'Mobile', 'Tel', 'Number', 'Phone Number', 'Telefoonka', 'Tell', 'No', 'S/No', 'Mobile Number', 'Telephone'];
      const feeKeys = ['Fee', 'Monthly Fee', 'Amount', 'Price', 'Qiimaha', 'Lacagta', 'Bishii', 'Cost', 'Rate', 'Heshiis', 'T/Lacag', 'T/Lacag bixnta'];
      const addrKeys = ['Address', 'Location', 'City', 'Goobta', 'Magaalada', 'Addresska', 'Hoyga'];
      const zoneKeys = ['Zone', 'Area', 'Xaafada', 'Dagmada', 'Zone Name', 'Village', 'Tuulada'];

      let headerRowIndex = 0;
      let maxMatches = 0;
      let columnIndices = {
        name: -1,
        phone: -1,
        fee: -1,
        address: -1,
        zone: -1
      };

      // Scan first 20 rows to find the best header row
      const rowsToScan = Math.min(rawData.length, 20);
      for (let i = 0; i < rowsToScan; i++) {
        const row = rawData[i];
        let matches = 0;
        let currentIndices = { name: -1, phone: -1, fee: -1, address: -1, zone: -1 };

        row.forEach((cell, index) => {
          if (!cell || typeof cell !== 'string') return;
          const cellLower = cell.trim().toLowerCase();

          if (nameKeys.some(k => cellLower === k.toLowerCase() || cellLower.includes(k.toLowerCase()))) { matches++; currentIndices.name = index; }
          else if (phoneKeys.some(k => cellLower === k.toLowerCase() || cellLower.includes(k.toLowerCase()))) { matches++; currentIndices.phone = index; }
          else if (feeKeys.some(k => cellLower === k.toLowerCase() || cellLower.includes(k.toLowerCase()))) {
            matches++;
            // Smart Priority Logic for Fees (prioritize Heshiis/Monthly Fee > Generic Amount)
            const pKeys = ['heshiis', 'monthly fee', 'qiimaha', 'bishii', 'lacagta'];
            const isPriority = pKeys.some(pk => cellLower.includes(pk));
            const isExact = feeKeys.some(k => cellLower === k.toLowerCase());

            if (currentIndices.fee === -1) {
              currentIndices.fee = index;
              currentIndices.feePriority = isPriority;
              currentIndices.feeExact = isExact;
            } else {
              // Only overwrite if we found a significantly better match
              // Rule 1: Priority match overwrites non-priority
              // Rule 2: Exact match overwrites non-exact (if priority is same)
              const curP = currentIndices.feePriority;
              const curE = currentIndices.feeExact;

              if ((isPriority && !curP) || (isExact && !curE && isPriority === curP)) {
                currentIndices.fee = index;
                currentIndices.feePriority = isPriority;
                currentIndices.feeExact = isExact;
              }
            }
          }
          else if (addrKeys.some(k => cellLower === k.toLowerCase() || cellLower.includes(k.toLowerCase()))) { matches++; currentIndices.address = index; }
          else if (zoneKeys.some(k => cellLower === k.toLowerCase() || cellLower.includes(k.toLowerCase()))) { matches++; currentIndices.zone = index; }
        });

        // We prioritize rows that have at least Name and Phone
        if (matches > maxMatches) {
          maxMatches = matches;
          headerRowIndex = i;
          columnIndices = currentIndices;
        }
      }

      console.log(`Smart Import: Found header at row ${headerRowIndex}`, columnIndices);

      // If no good header found, fallback
      if (columnIndices.name === -1 && columnIndices.phone === -1) {
        console.warn("Smart Import: No headers found, attempting heuristic fallback");
        // Check if column 0 looks like S/N (numbers) and column 1 looks like names
        const firstDataRow = rawData.length > 1 ? rawData[1] : rawData[0]; // Guess row 1 if exists

        // Basic Heuristic: If Col 0 is small number/S-N, Name is probably Col 1
        columnIndices.name = 1;
        columnIndices.phone = 2;
        columnIndices.fee = 3;

        // Adjust if file has fewer columns
        if (rawData[0].length <= 2) {
          columnIndices.name = 0;
          columnIndices.phone = 1;
        }
      }

      // Extract and Normalize Data
      const normalizedData = [];
      // Start reading FROM THE ROW AFTER headers
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        // Skip empty rows
        if (!row || row.length === 0) continue;

        const rawName = columnIndices.name > -1 ? row[columnIndices.name] : '';
        const rawPhone = columnIndices.phone > -1 ? row[columnIndices.phone] : '';

        // Skip if Name AND Phone are empty (likely an empty row or footer)
        if (!rawName && !rawPhone) continue;

        const rawFee = columnIndices.fee > -1 ? row[columnIndices.fee] : 0;
        const rawAddress = columnIndices.address > -1 ? row[columnIndices.address] : '';
        const rawZone = columnIndices.zone > -1 ? row[columnIndices.zone] : '';

        normalizedData.push({
          fullName: rawName,
          phoneNumber: rawPhone,
          monthlyFee: rawFee,
          address: rawAddress,
          zoneName: rawZone
        });
      }

      setWbJsondata(normalizedData);
      setShowImportOptionsModal(true);

      // Reset input
      e.target.value = '';
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Error importing Excel: ' + error.message);
      e.target.value = '';
    } finally {
      setLoading(false);
    }
  };

  const processImport = async () => {
    setShowImportOptionsModal(false);
    setLoading(true);

    const jsonData = wbJsondata;
    let successCount = 0;
    let failCount = 0;
    let lastError = null;

    for (const row of jsonData) {
      // Data is already normalized by handleExcelUpload
      let { fullName, phoneNumber, monthlyFee, address, zoneName } = row;

      // Basic Cleaning
      fullName = String(fullName || '').trim();
      phoneNumber = String(phoneNumber || '').trim();

      if (!fullName && !phoneNumber) {
        failCount++;
        continue;
      }

      if (!address && importOptions.defaultAddress) {
        address = importOptions.defaultAddress;
      }

      // Clean Fee
      let cleanFee = 0;
      if (typeof monthlyFee === 'number') {
        cleanFee = monthlyFee;
      } else if (typeof monthlyFee === 'string') {
        // Remove currency symbols and non-numeric chars except dot
        const numStr = monthlyFee.replace(/[^0-9.]/g, '');
        cleanFee = parseFloat(numStr) || 0;
      }

      // Resolve Zone
      let zoneId = null;
      if (zoneName) {
        const zoneStr = String(zoneName).toLowerCase();
        const matchedZone = zones.find(z =>
          z.name?.toLowerCase() === zoneStr ||
          z.code?.toLowerCase() === zoneStr
        );
        if (matchedZone) zoneId = matchedZone._id;
      }

      if (!zoneId && importOptions.defaultZoneId) {
        zoneId = importOptions.defaultZoneId;
      }

      const customerData = {
        fullName,
        phoneNumber,
        address: address ? String(address) : '',
        monthlyFee: cleanFee,
        zoneId
      };

      try {
        await apiRequest('/customers', {
          method: 'POST',
          body: JSON.stringify(customerData)
        });
        successCount++;
      } catch (err) {
        console.error("Import error for row", row, err);
        lastError = err.message || JSON.stringify(err);
        failCount++;
      }
    }

    // Delay slightly to confirm all processed
    setTimeout(async () => {
      let msg = `Import process completed!\n\nSuccessfully Imported: ${successCount}\nFailed/Skipped: ${failCount}`;
      if (failCount > 0) {
        msg += `\n\nSome rows were skipped because they lacked a Name or Phone number, or were duplicates.`;
      }
      alert(msg);

      // Clear data
      setWbJsondata([]);
      setImportOptions({ defaultAddress: '', defaultZoneId: '' });

      // Reload data
      await loadData();
      setLoading(false);
    }, 500);

  };

  // Add/Edit village
  const handleVillageSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const villageData = {
      name: formData.get('name'),
      code: formData.get('code'),
      description: formData.get('description'),
      monthlyFee: parseFloat(formData.get('monthlyFee'))
    };

    try {
      if (editingVillage) {
        const updatedVillage = await apiRequest(`/villages/${editingVillage._id}`, {
          method: 'PUT',
          body: JSON.stringify(villageData)
        });
        setVillages(prev => prev.map(v =>
          v._id === editingVillage._id ? updatedVillage : v
        ));
        alert('Village updated successfully!');
      } else {
        const newVillage = await apiRequest('/villages', {
          method: 'POST',
          body: JSON.stringify(villageData)
        });
        setVillages(prev => [...prev, newVillage]);
        alert('Village created successfully!');
      }
      setShowVillageModal(false);
      setEditingVillage(null);
    } catch (error) {
      console.error('Error saving village:', error);
      alert('Error saving village: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add/Edit zone
  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const zoneData = {
      name: formData.get('name'),
      code: formData.get('code'),
      description: formData.get('description')
    };

    try {
      if (editingZone) {
        const updatedZone = await apiRequest(`/zones/${editingZone._id}`, {
          method: 'PUT',
          body: JSON.stringify(zoneData)
        });
        setZones(prev => prev.map(z =>
          z._id === editingZone._id ? updatedZone : z
        ));
        alert('Zone updated successfully!');
      } else {
        const newZone = await apiRequest('/zones', {
          method: 'POST',
          body: JSON.stringify(zoneData)
        });
        setZones(prev => [...prev, newZone]);
        alert('Zone created successfully!');
      }
      setShowZoneModal(false);
      setEditingZone(null);
    } catch (error) {
      console.error('Error saving zone:', error);
      alert('Error saving zone: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete customer
  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setActionLoading(`delete-${customerId}`);
      try {
        await apiRequest(`/customers/${customerId}`, { method: 'DELETE' });
        setCustomers(prev => prev.filter(c => c._id !== customerId));
        alert('Customer deleted successfully!');
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer: ' + error.message);
      } finally {
        setActionLoading(null);
      }
    }
  };

  // Delete village
  const handleDeleteVillage = async (villageId) => {
    if (window.confirm('Are you sure you want to delete this village?')) {
      setActionLoading(`delete-village-${villageId}`);
      try {
        await apiRequest(`/villages/${villageId}`, { method: 'DELETE' });
        setVillages(prev => prev.filter(v => v._id !== villageId));
        alert('Village deleted successfully!');
      } catch (error) {
        console.error('Error deleting village:', error);
        alert('Error deleting village: ' + error.message);
      } finally {
        setActionLoading(null);
      }
    }
  };

  // Delete zone
  const handleDeleteZone = async (zoneId) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      setActionLoading(`delete-zone-${zoneId}`);
      try {
        await apiRequest(`/zones/${zoneId}`, { method: 'DELETE' });
        setZones(prev => prev.filter(z => z._id !== zoneId));
        alert('Zone deleted successfully!');
      } catch (error) {
        console.error('Error deleting zone:', error);
        alert('Error deleting zone: ' + error.message);
      } finally {
        setActionLoading(null);
      }
    }
  };

  // Print function - Updated for zone-specific printing
  const handlePrintCustomerList = () => {
    const selectedZone = zoneFilter !== 'all' ? zones.find(z => z._id === zoneFilter) : null;

    setPrintData({
      customers: filteredCustomers,
      filters: {
        zone: selectedZone?.name || 'All Zones',
        payment: paymentFilter === 'all' ? 'All Payments' : paymentFilter === 'paid' ? 'Paid Only' : 'Unpaid Only',
        search: searchTerm || 'None',
        month: selectedMonth
      },
      printedDate: new Date().toLocaleDateString(),
      printedTime: new Date().toLocaleTimeString(),
      totalCount: filteredCustomers.length,
      zoneName: selectedZone?.name || null
    });

    // Use setTimeout to ensure state is updated before printing
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Statistics - UPDATED: Only count current month payments
  const totalCustomers = customers.length;
  const paidCustomers = customers.filter(c => {
    const payment = getSelectedMonthPayment(c);
    return payment.fullyPaid;
  }).length;
  const unpaidCustomers = totalCustomers - paidCustomers;

  // Handle month change
  const handleMonthChange = (e) => {
    const m = e.target.value;
    setSelectedMonth(m);
    try { localStorage.setItem('selectedMonth', m); } catch { }
  };

  // Get customers for current print page (50 per page)
  const getCustomersForPrintPage = (page) => {
    const startIndex = (page - 1) * 48;
    const endIndex = startIndex + 48;
    return printData.customers.slice(startIndex, endIndex);
  };

  // Calculate total print pages
  const totalPrintPages = printData ? Math.ceil(printData.customers.length / 48) : 0;

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Customers Management</h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Monthly Payment Tracking System</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowZoneModal(true)}
            className="bg-indigo-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center hover:bg-indigo-700 transition duration-200 text-sm md:text-base flex-1 sm:flex-none justify-center"
          >
            <Map className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Manage Zones
          </button>
          <label className="bg-green-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center hover:bg-green-700 transition duration-200 text-sm md:text-base flex-1 sm:flex-none justify-center cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Import Excel
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleExcelUpload}
            />
          </label>
          <button
            onClick={() => setShowCustomerModal(true)}
            className="bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center hover:bg-blue-700 transition duration-200 text-sm md:text-base flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Add Customer
          </button>
        </div>
      </div>



      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 no-print">
        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-500 mx-auto mb-1 md:mb-2" />
          <p className="text-xs md:text-sm text-gray-600">Total Customers</p>
          <p className="text-lg md:text-xl font-semibold">{totalCustomers}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-green-500 mx-auto mb-1 md:mb-2" />
          <p className="text-xs md:text-sm text-gray-600">Paid ({new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})</p>
          <p className="text-lg md:text-xl font-semibold">{paidCustomers}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <XCircle className="w-6 h-6 md:w-8 md:h-8 text-red-500 mx-auto mb-1 md:mb-2" />
          <p className="text-xs md:text-sm text-gray-600">Unpaid ({new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})</p>
          <p className="text-lg md:text-xl font-semibold">{unpaidCustomers}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 no-print">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
            />
          </div>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          >
            <option value="all">All Zones</option>
            {zones.map(zone => {
              return (
                <option key={zone._id} value={zone._id}>
                  {zone.name}
                </option>
              );
            })}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid Only</option>
            <option value="unpaid">Unpaid Only</option>
          </select>
          <button
            onClick={handlePrintCustomerList}
            className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg flex items-center justify-center hover:bg-green-700 text-sm md:text-base"
          >
            <Printer className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Print List
          </button>
        </div>

        {/* Month Selection and Mark All Button */}
        <div className="mt-3 md:mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Month for Payment Tracking:
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 text-sm md:text-base"
            >
              {allMonths.map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  {month === getCurrentMonth() && ' (Current)'}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Showing:</span> {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Month Date:</span> {(() => { const d = getSelectedMonthRealDate(); return d ? new Date(d).toLocaleDateString('en-US') : 'Not set'; })()}
            </div>
            <button
              onClick={() => {
                const customerWithDate = customers.find(c => {
                  const payment = getSelectedMonthPayment(c);
                  return payment.date;
                });
                const defaultDate = customerWithDate
                  ? new Date(getSelectedMonthPayment(customerWithDate).date).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0];
                setMonthlyDate(defaultDate);
                setShowDateModal(true);
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-purple-700 transition duration-200 text-sm md:text-base"
            >
              <Calendar className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Set Month Date
            </button>
            <button
              onClick={handleMarkAllAsPaid}
              disabled={markAllLoading || filteredCustomers.length === 0}
              className={`bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition duration-200 text-sm md:text-base ${markAllLoading || filteredCustomers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {markAllLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Mark All as Paid ({filteredCustomers.length})
                </>
              )}
            </button>
            {selectedCustomers.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-700 transition duration-200 text-sm md:text-base"
              >
                <Trash2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Delete Selected ({selectedCustomers.size})
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 <strong>Note:</strong> Previous month's remaining balance carries over to the next month. Total Due = Previous Balance + Monthly Fee.
          </p>
        </div>
      </div>

      {/* Customers Table - ALWAYS VISIBLE */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={filteredCustomers.length > 0 && selectedCustomers.size === filteredCustomers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Info
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zone
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status ({new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                </th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer, index) => {
                const payment = getSelectedMonthPayment(customer);
                const isToggleLoading = actionLoading === `toggle-${customer._id}`;
                const isDeleteLoading = actionLoading === `delete-${customer._id}`;

                return (
                  <tr key={customer._id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 md:px-6 md:py-4 text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        checked={selectedCustomers.has(customer._id)}
                        onChange={() => toggleSelectCustomer(customer._id)}
                      />
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <div className="text-sm font-medium text-gray-900">{customer.fullName}</div>
                      <div className="text-sm text-gray-500">{customer.phoneNumber}</div>
                      <div className="text-sm text-gray-500">{customer.address}</div>
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <div className="flex items-center text-sm text-gray-900 mb-2">
                        <Map className="w-4 h-4 mr-2 text-green-500" />
                        {getZoneName(customer)}
                      </div>
                      <div className="flex items-center text-sm text-gray-900 mt-2">
                        <DollarSign className="w-4 h-4 mr-2 text-green-500" />
                        ${(() => {
                          const payment = getSelectedMonthPayment(customer);
                          return payment.totalDue.toFixed(2);
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <div className="space-y-2">
                        {/* Payment Status */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handlePaymentToggle(customer._id)}
                            disabled={isToggleLoading}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition duration-200 min-w-[100px] justify-center ${payment.fullyPaid
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              } ${isToggleLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isToggleLoading ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : payment.fullyPaid ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-semibold text-sm">Paid</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4" />
                                <span className="font-semibold text-sm">Unpaid</span>
                              </>
                            )}
                          </button>

                          {!payment.fullyPaid && payment.remaining > 0 && (
                            <button
                              onClick={() => handlePartialPayment(customer)}
                              className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 text-sm"
                            >
                              Add Payment
                            </button>
                          )}
                        </div>

                        {/* Payment Details */}
                        <div className="text-sm space-y-1 bg-blue-50 p-2 md:p-3 rounded-lg">
                          {payment.previousBalance > 0 && !payment.fullyPaid && (
                            <div className="flex justify-between border-b border-blue-200 pb-1 mb-1">
                              <span className="text-xs md:text-sm">Previous Balance:</span>
                              <strong className="text-orange-600 text-xs md:text-sm">${payment.previousBalance.toFixed(2)}</strong>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-xs md:text-sm">Monthly Fee:</span>
                            <strong className="text-blue-600 text-xs md:text-sm">${payment.monthlyFee}</strong>
                          </div>
                          {payment.previousBalance > 0 && !payment.fullyPaid && (
                            <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                              <span className="text-xs md:text-sm font-semibold">Total Due:</span>
                              <strong className="text-purple-600 text-xs md:text-sm">${payment.totalDue.toFixed(2)}</strong>
                            </div>
                          )}
                          {!payment.fullyPaid && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-xs md:text-sm">Paid:</span>
                                <strong className="text-green-600 text-xs md:text-sm">${payment.paid.toFixed(2)}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs md:text-sm">Remaining:</span>
                                <strong className="text-red-600 text-xs md:text-sm">${payment.remaining.toFixed(2)}</strong>
                              </div>
                            </>
                          )}
                          {payment.paidDate && (
                            <div className="text-xs text-gray-500">
                              Last payment: {new Date(payment.paidDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 space-x-1 md:space-x-2">
                      <button
                        onClick={() => {
                          setEditingCustomer(customer);
                          setShowCustomerModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 md:p-2"
                        title="Edit Customer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer._id)}
                        disabled={isDeleteLoading}
                        className={`text-red-600 hover:text-red-900 p-1 md:p-2 ${isDeleteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Delete Customer"
                      >
                        {isDeleteLoading ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-600 mb-4 text-sm md:text-base">
              {searchTerm || paymentFilter !== 'all' || zoneFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first customer to get started'}
            </p>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2 inline" />
              Add Customer
            </button>
          </div>
        )}
      </div>

      {/* Print Section - UPDATED WITH ZONE-SPECIFIC TITLES AND REMOVED ZONE COLUMN */}
      {printData && (
        <div className="print-section hidden print:block">
          {/* Generate pages for printing */}
          {Array.from({ length: totalPrintPages }, (_, pageIndex) => {
            const currentPage = pageIndex + 1;
            const pageCustomers = getCustomersForPrintPage(currentPage);
            const startNumber = (currentPage - 1) * 48 + 1;

            return (
              <div key={`page-${currentPage}`} className="print-page flex flex-col" style={{ pageBreakAfter: 'always', margin: 0, padding: 0 }}>
                <div className="p-0">
                  {/* Header - SHOW ONLY ON FIRST PAGE */}
                  {currentPage === 1 && (
                    <div className="text-center mb-1 border-b border-gray-300 pb-0.5">
                      <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                        {printData.zoneName
                          ? `${printData.zoneName} - SHIRKADA NADAAFADA EE GOOL`
                          : 'SHIRKADA NADAAFADA EE GOOL'}
                      </h1>
                      <p className="text-[9px] font-semibold text-gray-700 my-0.5">powered by HUDI SOMPROJECT</p>
                      <div className="flex justify-between items-end px-2">
                        <p className="text-[10px] text-gray-600">Month: {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        <p className="text-[10px] text-gray-600">Date: {printData.printedDate}</p>
                        <p className="text-[10px] text-gray-600">Page {currentPage}/{totalPrintPages}</p>
                      </div>
                    </div>
                  )}

                  {/* Customers Table - UPDATED: Ultra compact */}
                  <table className="w-full border-collapse border border-gray-300 table-fixed" style={{ fontSize: '10px' }}>
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-1 py-0.5 text-left font-medium" style={{ width: '5%' }}>#</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-left font-medium" style={{ width: '30%' }}>Name</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-left font-medium" style={{ width: '15%' }}>Phone</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-left font-medium" style={{ width: '15%' }}>Fee</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-left font-medium" style={{ width: '20%' }}>Sign</th>
                        <th className="border border-gray-300 px-1 py-0.5 text-left font-medium" style={{ width: '15%' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 48 }).map((_, i) => {
                        const customer = pageCustomers[i];
                        if (!customer) {
                          return (
                            <tr key={`empty-${i}`} style={{ height: '19px' }}>
                              <td className="border border-gray-300 px-1 py-0" />
                              <td className="border border-gray-300 px-1 py-0" />
                              <td className="border border-gray-300 px-1 py-0" />
                              <td className="border border-gray-300 px-1 py-0" />
                              <td className="border border-gray-300 px-1 py-0" />
                              <td className="border border-gray-300 px-1 py-0" />
                            </tr>
                          );
                        }

                        const payment = getSelectedMonthPayment(customer);
                        return (
                          <tr key={customer._id} style={{ height: '19px' }}>
                            <td className="border border-gray-300 px-1 py-0 align-middle leading-none">{startNumber + i}</td>
                            <td className="border border-gray-300 px-1 py-0 align-middle leading-none truncate">{customer.fullName}</td>
                            <td className="border border-gray-300 px-1 py-0 align-middle leading-none">{customer.phoneNumber}</td>
                            <td className="border border-gray-300 px-1 py-0 align-middle leading-none text-right">
                              {(() => {
                                const prevMonthFullyPaid = isPreviousMonthFullyPaid(customer, selectedMonth);
                                if (prevMonthFullyPaid) return `$${payment.monthlyFee.toFixed(2)}`;
                                if (payment.previousBalance > 0 && !payment.fullyPaid) return `$${payment.totalDue.toFixed(2)}`;
                                return `$${payment.monthlyFee.toFixed(2)}`;
                              })()}
                            </td>
                            <td className="border border-gray-300 px-1 py-0 align-middle text-center"></td>
                            <td className="border border-gray-300 px-1 py-0 align-middle text-center"></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Set Monthly Date</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Month: <strong>{new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date for this month *
                </label>
                <input
                  type="date"
                  value={monthlyDate}
                  onChange={(e) => setMonthlyDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This date will be used for all customers for this month. Each month should have its own date.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDateModal(false);
                    setMonthlyDate('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetMonthlyDate}
                  disabled={actionLoading === 'setting-date' || !monthlyDate}
                  className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center ${actionLoading === 'setting-date' || !monthlyDate ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {actionLoading === 'setting-date' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Setting...
                    </>
                  ) : (
                    'Set Date'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Add Payment</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Customer: <strong>{selectedCustomer.fullName}</strong></p>
                <p className="text-sm text-gray-600">Month: <strong>{new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong></p>

                <div className="mt-2 p-3 bg-blue-50 rounded-lg space-y-2">
                  {(() => {
                    const payment = getSelectedMonthPayment(selectedCustomer);
                    return (
                      <>
                        {payment.previousBalance > 0 && !payment.fullyPaid && (
                          <div className="flex justify-between border-b border-blue-200 pb-2">
                            <span className="text-sm">Previous Balance:</span>
                            <strong className="text-orange-600">${payment.previousBalance.toFixed(2)}</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm">Monthly Fee:</span>
                          <strong className="text-blue-600">${payment.monthlyFee}</strong>
                        </div>
                        {payment.previousBalance > 0 && !payment.fullyPaid && (
                          <div className="flex justify-between border-t border-blue-200 pt-2 font-semibold">
                            <span className="text-sm">Total Due:</span>
                            <strong className="text-purple-600">${payment.totalDue.toFixed(2)}</strong>
                          </div>
                        )}
                        {!payment.fullyPaid && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm">Already Paid:</span>
                              <strong className="text-green-600">${payment.paid.toFixed(2)}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Remaining:</span>
                              <strong className="text-red-600">${payment.remaining.toFixed(2)}</strong>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0.01"
                  max={getSelectedMonthPayment(selectedCustomer).remaining.toFixed(2)}
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter payment amount"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: ${getSelectedMonthPayment(selectedCustomer).remaining.toFixed(2)}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedCustomer(null);
                    setPaymentAmount('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={actionLoading === 'processing-payment'}
                  className={`bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center ${actionLoading === 'processing-payment' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {actionLoading === 'processing-payment' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Process Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </h2>
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  defaultValue={editingCustomer?.fullName}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  defaultValue={editingCustomer?.phoneNumber}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  defaultValue={editingCustomer?.address}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Complete address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone *
                </label>
                <select
                  name="zoneId"
                  required
                  defaultValue={editingCustomer?.zoneId?._id || editingCustomer?.zoneId}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Zone</option>
                  {zones.map(zone => (
                    <option key={zone._id} value={zone._id}>
                      {zone.name} ({zone.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Zone includes village information and collection day
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Fee ($) *
                </label>
                <input
                  type="number"
                  name="monthlyFee"
                  required
                  min="0"
                  step="0.01"
                  defaultValue={editingCustomer?.monthlyFee}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Monthly fee amount"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setEditingCustomer(null);
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
                  {loading ? 'Saving...' : (editingCustomer ? 'Update' : 'Add') + ' Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zone Management Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Manage Zones</h2>
              <button
                onClick={() => {
                  setShowZoneModal(false);
                  setEditingZone(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Add/Edit Zone Form */}
            <div className="mb-4 md:mb-6">
              <h3 className="text-lg font-semibold mb-3 md:mb-4">
                {editingZone ? 'Edit Zone' : 'Add New Zone'}
              </h3>
              <form onSubmit={handleZoneSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingZone?.name}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter zone name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    defaultValue={editingZone?.code}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter code (e.g., Z1)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows="3"
                    defaultValue={editingZone?.description}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter zone description"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingZone(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel Edit
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (editingZone ? 'Update' : 'Add') + ' Zone'}
                  </button>
                </div>
              </form>
            </div>

            {/* Zones List */}
            <div>
              <h3 className="text-lg font-semibold mb-3 md:mb-4">Existing Zones ({zones.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {zones.map(zone => {
                  const village = villages.find(v => v._id === zone.villageId);
                  const zoneCustomers = customers.filter(c =>
                    c.zoneId?._id === zone._id || c.zoneId === zone._id
                  );
                  const isDeleteLoading = actionLoading === `delete-zone-${zone._id}`;

                  return (
                    <div key={zone._id} className="bg-gray-50 p-3 md:p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2 md:mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{zone.name}</h4>
                          <p className="text-sm text-gray-600">Code: {zone.code}</p>
                          <p className="text-sm text-gray-600">Village: {village?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">Collection Day: <strong>{zone.collectionDay}</strong></p>
                          {zone.description && (
                            <p className="text-sm text-gray-600 mt-1">{zone.description}</p>
                          )}
                        </div>
                        <div className="flex space-x-1 md:space-x-2">
                          <button
                            onClick={() => setEditingZone(zone)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Zone"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone._id)}
                            disabled={isDeleteLoading}
                            className={`text-red-600 hover:text-red-800 ${isDeleteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Delete Zone"
                          >
                            {isDeleteLoading ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Customers: <strong>{zoneCustomers.length}</strong></p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {zones.length === 0 && (
                <div className="text-center py-6 md:py-8">
                  <Map className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" />
                  <p className="text-gray-600">No zones added yet. Create your first zone above.</p>
                </div>
              )}
            </div>
          </div>
        </div >
      )}

      {/* Import Options Modal */}
      {
        showImportOptionsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-white rounded-xl p-4 md:p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Import Options</h2>
              <p className="text-sm text-gray-600 mb-4">
                Found {wbJsondata.length} rows used in this excel file.
                <br />
                You can set default values for missing fields below.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address (Applied if missing/empty in Excel)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter default address for all..."
                    value={importOptions.defaultAddress}
                    onChange={(e) => setImportOptions({ ...importOptions, defaultAddress: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zone / Village (Applied if missing/empty in Excel)
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={importOptions.defaultZoneId}
                    onChange={(e) => setImportOptions({ ...importOptions, defaultZoneId: e.target.value })}
                  >
                    <option value="">-- Select Zone/Village to Apply --</option>
                    {zones.map(z => (
                      <option key={z._id} value={z._id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => {
                    setShowImportOptionsModal(false);
                    setWbJsondata([]);
                    setImportOptions({ defaultAddress: '', defaultZoneId: '' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={processImport}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Start Import
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Print Styles */}
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 0.1cm;
            }
            .no-print {
              display: none !important;
            }
            .print-section {
              display: block !important;
            }
            .print-page {
              page-break-after: always;
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
            }
            .print-page:last-child {
              page-break-after: auto;
            }
            body {
              margin: 0;
              padding: 0;
              background: white !important;
            }
            .print-section table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8px;
              table-layout: fixed;
            }
            .print-section thead th {
              border: 1px solid #000;
              padding: 3px 2px;
              text-align: left;
              background-color: #f0f0f0;
              font-weight: bold;
              font-size: 8px;
              height: 14px;
            }
            .print-section tbody td {
              border: 1px solid #000;
              padding: 2px 2px;
              text-align: left;
              font-size: 8px;
              height: 11px;
              vertical-align: middle;
            }
            .print-section h1 {
              font-size: 14px;
              margin: 3px 0;
              line-height: 1.1;
            }
            .print-section p {
              font-size: 8px;
              margin: 1px 0;
              line-height: 1.1;
            }
            .print-section .print-page > div {
              padding: 5px;
            }
            .print-section .border-b {
              padding-bottom: 3px;
              margin-bottom: 3px;
            }
            .print-section .border-t {
              padding-top: 3px;
              margin-top: 3px;
            }
          }
        `}
      </style>
    </div >
  );
};

export default Customers;
