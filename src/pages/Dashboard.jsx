import React, { useState, useEffect, useCallback } from 'react';
import { Users, DollarSign, CheckCircle, XCircle, Building, MapPin, TrendingUp, Calendar, Loader, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

// Get current month function - FIXED
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Get month name for display
const getMonthName = (monthString) => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Get available months from current date (last 12 months)
const getAvailableMonths = () => {
  const months = [];
  const current = new Date();


  for (let i = 0; i < 12; i++) {
    const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
    const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(monthString);
  }


  return months;
};

// Helper function to extract available months from customer payment data - IMPROVED
const getAvailableMonthsFromCustomers = (customers) => {
  const monthSet = new Set();

  // Always include current month
  monthSet.add(getCurrentMonth());


  customers.forEach(customer => {
    if (customer.payments && typeof customer.payments === 'object') {
      Object.keys(customer.payments).forEach(month => {
        if (month && typeof month === 'string' && month.match(/^\d{4}-\d{2}$/)) {
          monthSet.add(month);
        }
      });
    }
  });


  // Convert to array and sort by date (newest first)
  const months = Array.from(monthSet).sort((a, b) => {
    return new Date(b + '-01') - new Date(a + '-01');
  });


  return months.length > 0 ? months : [getCurrentMonth()];
};

// Custom hook for real-time data fetching
const useRealtimeData = (selectedMonth) => {
  const [data, setData] = useState({
    customers: [],
    villages: [],
    workers: [],
    loading: true,
    lastUpdated: null,
    error: null
  });

  const fetchData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));


      const [customersResponse, villagesResponse, workersResponse] = await Promise.all([
        apiService.getCustomers(),
        apiService.getVillages(),
        apiService.getWorkers()
      ]);

      // Handle different response formats
      const customersData = Array.isArray(customersResponse) ? customersResponse : (customersResponse?.data || []);
      const villagesData = Array.isArray(villagesResponse) ? villagesResponse : (villagesResponse?.data || []);
      const workersData = Array.isArray(workersResponse) ? workersResponse : (workersResponse?.data || []);

      console.log(`📊 Data loaded: ${customersData.length} customers, ${villagesData.length} villages, ${workersData.length} workers`);

      const newData = {
        customers: customersData,
        villages: villagesData,
        workers: workersData,
        loading: false,
        lastUpdated: new Date(),
        error: null
      };

      setData(newData);
      return newData;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorData = {
        customers: [],
        villages: [],
        workers: [],
        loading: false,
        lastUpdated: new Date(),
        error: error.message
      };
      setData(errorData);
      return errorData;
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time updates (polling every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return { ...data, refetch: fetchData };
};

// Payment calculation helper - IMPROVED
const calculatePaymentData = (customer, selectedMonth) => {
  const monthlyFee = Number(customer.monthlyFee) || 0;


  // If no payments object or no payment for selected month
  if (!customer.payments || !customer.payments[selectedMonth]) {
    return {
      paid: 0,
      remaining: monthlyFee,
      fullyPaid: false,
      status: 'unpaid'
    };
  }


  const payment = customer.payments[selectedMonth];
  const paid = Number(payment.paid) || 0;
  const remaining = Number(payment.remaining) || (monthlyFee - paid);
  const fullyPaid = payment.fullyPaid || paid >= monthlyFee;


  return {
    paid,
    remaining,
    fullyPaid,
    status: fullyPaid ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
  };
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [availableMonths, setAvailableMonths] = useState(getAvailableMonths());



  const { customers, villages, workers, loading, lastUpdated, error, refetch } = useRealtimeData(selectedMonth);

  // Update available months when customers data changes
  useEffect(() => {
    if (customers.length > 0) {
      const monthsFromCustomers = getAvailableMonthsFromCustomers(customers);
      const allMonths = [...new Set([...monthsFromCustomers, ...getAvailableMonths()])]
        .sort((a, b) => new Date(b + '-01') - new Date(a + '-01'));

      setAvailableMonths(allMonths);


      // Auto-select the most recent month if current selection is not in available months
      if (!allMonths.includes(selectedMonth)) {
        setSelectedMonth(allMonths[0]);
      }
    }
  }, [customers, selectedMonth]);

  // Calculate derived stats - IMPROVED
  const stats = React.useMemo(() => {
    const totalCustomers = customers.length;

    const paymentData = customers.map(customer =>
      calculatePaymentData(customer, selectedMonth)
    );

    const paidCustomers = paymentData.filter(payment => payment.fullyPaid).length;
    const unpaidCustomers = totalCustomers - paidCustomers;


    const totalRevenue = paymentData.reduce((sum, payment) => sum + payment.paid, 0);
    const totalDue = customers.reduce((sum, customer) => sum + (Number(customer.monthlyFee) || 0), 0);
    const collectionRate = totalDue > 0 ? (totalRevenue / totalDue) * 100 : 0;

    return {
      totalCustomers,
      totalVillages: villages.length,
      totalWorkers: workers.length,
      paidCustomers,
      unpaidCustomers,
      totalRevenue,
      totalDue,
      collectionRate
    };
  }, [customers, villages, workers, selectedMonth]);

  // Calculate village statistics - IMPROVED
  const villageStats = React.useMemo(() => {
    return villages.map(village => {
      const villageCustomers = customers.filter(customer => customer.villageId === village._id);
      const villageRevenue = villageCustomers.reduce((sum, customer) => {
        const payment = calculatePaymentData(customer, selectedMonth);
        return sum + payment.paid;
      }, 0);

      const villageDue = villageCustomers.reduce((sum, customer) =>
        sum + (Number(customer.monthlyFee) || 0), 0
      );


      const villageCollectionRate = villageDue > 0 ? (villageRevenue / villageDue) * 100 : 0;

      return {
        id: village._id,
        name: village.name,
        totalCustomers: villageCustomers.length,
        revenue: villageRevenue,
        due: villageDue,
        collectionRate: villageCollectionRate
      };
    }).filter(village => village.totalCustomers > 0); // Only show villages with customers
  }, [customers, villages, selectedMonth]);

  // Get recent payment activity - IMPROVED
  const recentPayments = React.useMemo(() => {
    return customers
      .map(customer => {
        const payment = calculatePaymentData(customer, selectedMonth);
        return {
          customerId: customer._id,
          customerName: customer.fullName || 'Unknown Customer',
          amount: payment.paid,
          status: payment.fullyPaid ? 'Fully Paid' : payment.paid > 0 ? 'Partial Payment' : 'Unpaid',
          date: selectedMonth,
          villageId: customer.villageId
        };
      })
      .filter(payment => payment.amount > 0) // Only show payments with actual payments
      .sort((a, b) => b.amount - a.amount) // Sort by payment amount (highest first)
      .slice(0, 10); // Top 10 payments
  }, [customers, selectedMonth]);




  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
    console.log(`📅 Month changed to: ${newMonth} (${getMonthName(newMonth)})`);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Format time
  const formatTime = (date) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  if (loading && !lastUpdated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>


          </div>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
            Overview of your garbage collection business - {getMonthName(selectedMonth)}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {formatTime(lastUpdated)}
              {error && <span className="text-red-500 ml-2"> • Error: {error}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto text-sm md:text-base touch-manipulation bg-white"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 text-sm">
              Failed to load some data. Showing available information.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {/* Total Customers */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-xl md:text-2xl font-semibold text-gray-900 mt-1">{stats.totalCustomers}</p>
            </div>
            <div className="bg-blue-100 p-2 md:p-3 rounded-full">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm text-gray-600">
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-500 mr-1" />
            Active customers across all villages
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-xl md:text-2xl font-semibold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="bg-green-100 p-2 md:p-3 rounded-full">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 md:mt-4">
            <div className="flex justify-between text-xs md:text-sm text-gray-600">
              <span>Collection Rate</span>
              <span className="font-semibold">{stats.collectionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2 mt-1">
              <div
                className="bg-green-500 h-1.5 md:h-2 rounded-full transition-all duration-500"

                style={{ width: `${Math.min(stats.collectionRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Paid vs Unpaid */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Payment Status</p>
              <div className="mt-1 space-y-1">
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-500 mr-2" />
                  <span className="text-xs md:text-sm text-gray-900">{stats.paidCustomers} Paid</span>
                </div>
                <div className="flex items-center">
                  <XCircle className="w-3 h-3 md:w-4 md:h-4 text-red-500 mr-2" />
                  <span className="text-xs md:text-sm text-gray-900">{stats.unpaidCustomers} Unpaid</span>
                </div>
              </div>
            </div>
            <div className="bg-purple-100 p-2 md:p-3 rounded-full">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Villages & Workers */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Operations</p>
              <div className="mt-1 space-y-1">
                <div className="flex items-center">
                  <Building className="w-3 h-3 md:w-4 md:h-4 text-orange-500 mr-2" />
                  <span className="text-xs md:text-sm text-gray-900">{stats.totalVillages} Villages</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-500 mr-2" />
                  <span className="text-xs md:text-sm text-gray-900">{stats.totalWorkers} Workers</span>
                </div>
              </div>
            </div>
            <div className="bg-orange-100 p-2 md:p-3 rounded-full">
              <MapPin className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Village Performance */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
            Village Performance - {getMonthName(selectedMonth)}
          </h3>
          <div className="space-y-3 md:space-y-4 max-h-96 overflow-y-auto">
            {villageStats.length > 0 ? (
              villageStats.map((village) => (
                <div key={village.id} className="flex items-center justify-between p-2 md:p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs md:text-sm mb-1">
                      <span className="font-medium text-gray-900 truncate mr-2">{village.name}</span>
                      <span className="text-gray-600 whitespace-nowrap">
                        {formatCurrency(village.revenue)} / {formatCurrency(village.due)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                      <div
                        className="bg-blue-500 h-1.5 md:h-2 rounded-full transition-all duration-500"

                        style={{ width: `${Math.min(village.collectionRate, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{village.totalCustomers} customers</span>
                      <span>{village.collectionRate.toFixed(1)}% collected</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 md:py-8 text-gray-500">
                <Building className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 text-gray-300" />
                <p className="text-sm md:text-base">No village data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
            Recent Payments - {getMonthName(selectedMonth)}
          </h3>
          <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment, index) => (
                <div key={`${payment.customerId}-${index}`} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate text-sm md:text-base">{payment.customerName}</p>
                    <p className={`text-xs md:text-sm ${payment.status === 'Fully Paid' ? 'text-green-600' :
                        payment.status === 'Partial Payment' ? 'text-yellow-600' : 'text-red-600'
                      }`}>

                      {payment.status}
                    </p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="font-semibold text-green-600 text-sm md:text-base">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-600">
                      {getMonthName(payment.date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 md:py-8 text-gray-500">
                <DollarSign className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 text-gray-300" />
                <p className="text-sm md:text-base">No payment records for {getMonthName(selectedMonth)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm opacity-90">Total Due Amount</p>
              <p className="text-xl md:text-2xl font-semibold mt-1">{formatCurrency(stats.totalDue)}</p>
            </div>
            <DollarSign className="w-6 h-6 md:w-8 md:h-8 opacity-90" />
          </div>
        </div>


        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm opacity-90">Collected Amount</p>
              <p className="text-xl md:text-2xl font-semibold mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 opacity-90" />
          </div>
        </div>


        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm opacity-90">Pending Amount</p>
              <p className="text-xl md:text-2xl font-semibold mt-1">{formatCurrency(stats.totalDue - stats.totalRevenue)}</p>
            </div>
            <XCircle className="w-6 h-6 md:w-8 md:h-8 opacity-90" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
