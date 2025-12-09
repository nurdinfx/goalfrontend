import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, Filter, Download, CheckCircle, XCircle, Printer, Search } from 'lucide-react';
import { apiService } from '../services/api';

const Payments = ({ villages, customers, updateCustomer }) => {
  const [filter, setFilter] = useState({ 
    month: new Date().toISOString().slice(0, 7),
    village: 'all',
    status: 'all'
  });
  
  const [printData, setPrintData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [paymentsData, setPaymentsData] = useState([]);

  // Generate months for filter
  const generateMonths = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const value = monthDate.toISOString().slice(0, 7);
      const label = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      months.push({ value, label });
    }
    return months;
  };

  const months = generateMonths();

  // Load payments data
  useEffect(() => {
    loadPaymentsData();
  }, [customers]);

  const loadPaymentsData = async () => {
    try {
      // If customers are provided via props, use them
      // Otherwise, fetch from API
      if (!customers || customers.length === 0) {
        const customersData = await apiService.getCustomers();
        // Process the customers data as needed
        console.log('Loaded customers for payments:', customersData);
      }
    } catch (error) {
      console.error('Error loading payments data:', error);
    }
  };

  // Get payment status for selected month
  const getSelectedMonthPayment = (customer) => {
    if (!customer.payments || !customer.payments[filter.month]) {
      return { 
        paid: 0, 
        remaining: customer.monthlyFee, 
        fullyPaid: false,
        paidDate: null 
      };
    }
    
    const payment = customer.payments[filter.month];
    const remaining = Math.max(0, customer.monthlyFee - (payment.paid || 0));
    const fullyPaid = remaining <= 0;
    
    return {
      paid: payment.paid || 0,
      remaining,
      fullyPaid,
      paidDate: payment.paidDate || null
    };
  };

  // Get village name
  const getVillageName = (customer) => {
    if (customer.villageId && typeof customer.villageId === 'object') {
      return customer.villageId.name;
    }
    
    // If villageId is just an ID, find the village name
    const village = villages.find(v => v._id === customer.villageId);
    return village ? village.name : 'Unknown';
  };

  // Filter and process payments data
  const getProcessedPayments = () => {
    let filteredCustomers = [...customers];

    // Apply village filter
    if (filter.village !== 'all') {
      filteredCustomers = filteredCustomers.filter(c => 
        c.villageId === filter.village || 
        (c.villageId && c.villageId._id === filter.village)
      );
    }

    // Apply search filter
    if (searchTerm) {
      filteredCustomers = filteredCustomers.filter(c =>
        c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber?.includes(searchTerm) ||
        getVillageName(c).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Transform customers to payments with monthly status
    const payments = filteredCustomers.map(customer => {
      const payment = getSelectedMonthPayment(customer);
      
      return {
        id: customer._id,
        customerName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        village: getVillageName(customer),
        villageId: customer.villageId,
        month: filter.month,
        amount: customer.monthlyFee,
        status: payment.fullyPaid ? 'paid' : 'unpaid',
        paidDate: payment.paidDate,
        paidAmount: payment.paid,
        remainingAmount: payment.remaining,
        customerData: customer
      };
    });

    // Apply status filter
    if (filter.status !== 'all') {
      return payments.filter(p => p.status === filter.status);
    }

    return payments;
  };

  const processedPayments = getProcessedPayments();

  // API method to update customer payment
  const updateCustomerPayment = async (customerId, paymentData) => {
    try {
      const customer = customers.find(c => c._id === customerId);
      if (!customer) throw new Error('Customer not found');

      // Create updated payments object
      const updatedPayments = {
        ...customer.payments,
        [filter.month]: paymentData
      };

      // Update customer via API
      const updatedCustomer = await apiService.updateCustomer(customerId, {
        payments: updatedPayments
      });

      return updatedCustomer;
    } catch (error) {
      console.error('Error updating customer payment:', error);
      throw error;
    }
  };

  // API method to mark payment as paid
  const markPaymentAsPaid = async (customerId) => {
    try {
      const customer = customers.find(c => c._id === customerId);
      if (!customer) throw new Error('Customer not found');

      const paymentData = {
        paid: customer.monthlyFee,
        remaining: 0,
        fullyPaid: true,
        paidDate: new Date().toISOString()
      };

      return await updateCustomerPayment(customerId, paymentData);
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      throw error;
    }
  };

  // API method to mark payment as unpaid
  const markPaymentAsUnpaid = async (customerId) => {
    try {
      const customer = customers.find(c => c._id === customerId);
      if (!customer) throw new Error('Customer not found');

      const paymentData = {
        paid: 0,
        remaining: customer.monthlyFee,
        fullyPaid: false,
        paidDate: null
      };

      return await updateCustomerPayment(customerId, paymentData);
    } catch (error) {
      console.error('Error marking payment as unpaid:', error);
      throw error;
    }
  };

  // API method to add partial payment
  const addPartialPayment = async (customerId, amount) => {
    try {
      const customer = customers.find(c => c._id === customerId);
      if (!customer) throw new Error('Customer not found');

      const currentPayment = getSelectedMonthPayment(customer);
      const newPaidAmount = (currentPayment.paid || 0) + parseFloat(amount);
      const remaining = Math.max(0, customer.monthlyFee - newPaidAmount);
      const fullyPaid = remaining <= 0;

      const paymentData = {
        paid: newPaidAmount,
        remaining: remaining,
        fullyPaid: fullyPaid,
        paidDate: fullyPaid ? new Date().toISOString() : currentPayment.paidDate
      };

      return await updateCustomerPayment(customerId, paymentData);
    } catch (error) {
      console.error('Error adding partial payment:', error);
      throw error;
    }
  };

  const handleMarkPaid = async (customerId) => {
    try {
      const updatedCustomer = await markPaymentAsPaid(customerId);
      
      // Update local state via parent component
      updateCustomer(customerId, {
        payments: updatedCustomer.payments
      });
      
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Error updating payment status: ' + error.message);
    }
  };

  const handleMarkUnpaid = async (customerId) => {
    try {
      const updatedCustomer = await markPaymentAsUnpaid(customerId);
      
      // Update local state via parent component
      updateCustomer(customerId, {
        payments: updatedCustomer.payments
      });
      
    } catch (error) {
      console.error('Error marking payment as unpaid:', error);
      alert('Error updating payment status: ' + error.message);
    }
  };

  // New method to handle partial payments
  const handlePartialPayment = async (customerId, amount) => {
    try {
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount greater than 0');
        return;
      }

      const customer = customers.find(c => c._id === customerId);
      const currentPayment = getSelectedMonthPayment(customer);
      
      if (currentPayment.paid + parseFloat(amount) > customer.monthlyFee) {
        alert('Partial payment cannot exceed the monthly fee');
        return;
      }

      const updatedCustomer = await addPartialPayment(customerId, amount);
      
      // Update local state via parent component
      updateCustomer(customerId, {
        payments: updatedCustomer.payments
      });
      
      alert('Partial payment recorded successfully!');
    } catch (error) {
      console.error('Error recording partial payment:', error);
      alert('Error recording partial payment: ' + error.message);
    }
  };

  // API method to get payment statistics
  const getPaymentStatistics = async (month, villageId = 'all') => {
    try {
      // This would be a backend endpoint that returns payment statistics
      // For now, we'll calculate from local data
      const filtered = processedPayments;
      
      return {
        totalCollected: filtered.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.paidAmount, 0),
        totalUnpaid: filtered.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.remainingAmount, 0),
        paidCount: filtered.filter(p => p.status === 'paid').length,
        unpaidCount: filtered.filter(p => p.status === 'unpaid').length,
        collectionRate: filtered.length > 0 ? 
          (filtered.filter(p => p.status === 'paid').length / filtered.length) * 100 : 0
      };
    } catch (error) {
      console.error('Error fetching payment statistics:', error);
      return {
        totalCollected: 0,
        totalUnpaid: 0,
        paidCount: 0,
        unpaidCount: 0,
        collectionRate: 0
      };
    }
  };

  // API method to export payments data
  const exportPaymentsData = async (filters) => {
    try {
      const data = {
        month: filters.month,
        village: filters.village,
        status: filters.status,
        payments: processedPayments
      };

      // In a real implementation, this would call a backend endpoint
      // For now, we'll use the existing client-side export
      const csvContent = "data:text/csv;charset=utf-8," +
        "Customer Name,Phone,Village,Amount,Status,Paid Date,Paid Amount,Remaining Amount\n" +
        processedPayments.map(payment => 
          `"${payment.customerName}","${payment.phoneNumber}","${payment.village}",${payment.amount},${payment.status},"${payment.paidDate || ''}",${payment.paidAmount},${payment.remainingAmount}`
        ).join("\n");

      return csvContent;
    } catch (error) {
      console.error('Error exporting payments data:', error);
      throw error;
    }
  };

  const handlePrint = () => {
    const selectedVillage = filter.village !== 'all' ? 
      villages.find(v => v._id === filter.village) : null;

    setPrintData({
      payments: processedPayments,
      summary: {
        totalCollected,
        totalUnpaid,
        paidCount,
        unpaidCount,
        collectionRate: processedPayments.length > 0 ? (paidCount / processedPayments.length) * 100 : 0
      },
      filters: {
        month: months.find(m => m.value === filter.month)?.label,
        village: selectedVillage?.name || 'All Villages',
        status: filter.status === 'all' ? 'All' : filter.status === 'paid' ? 'Paid Only' : 'Unpaid Only'
      },
      printedDate: new Date().toLocaleDateString(),
      printedTime: new Date().toLocaleTimeString()
    });

    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExport = async () => {
    try {
      const csvContent = await exportPaymentsData(filter);
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payments_${filter.month}_${filter.village}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting payments:', error);
      alert('Error exporting payments: ' + error.message);
    }
  };

  // Calculate statistics
  const paidPayments = processedPayments.filter(p => p.status === 'paid');
  const unpaidPayments = processedPayments.filter(p => p.status === 'unpaid');

  const totalCollected = paidPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + p.remainingAmount, 0);
  const paidCount = paidPayments.length;
  const unpaidCount = unpaidPayments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments Management</h1>
          <p className="text-gray-600 mt-2">Manage customer payments and generate reports</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={processedPayments.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={processedPayments.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            <Printer className="w-5 h-5 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 no-print">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search customers by name, phone, or village..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
          />
        </div>
      </div>

      {/* Stats and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Collected</p>
              <p className="text-xl font-semibold">${totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Unpaid</p>
              <p className="text-xl font-semibold">${totalUnpaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Month</p>
              <select
                value={filter.month}
                onChange={(e) => setFilter({...filter, month: e.target.value})}
                className="text-sm font-semibold border-none p-0 focus:ring-0 bg-transparent cursor-pointer"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Filter className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <select
                value={filter.status}
                onChange={(e) => setFilter({...filter, status: e.target.value})}
                className="text-sm font-semibold border-none p-0 focus:ring-0 bg-transparent cursor-pointer"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Village Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 no-print">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Village</label>
        <select
          value={filter.village}
          onChange={(e) => setFilter({...filter, village: e.target.value})}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
        >
          <option value="all">All Villages</option>
          {villages.map(village => (
            <option key={village._id} value={village._id}>
              {village.name} ({village.code})
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 font-semibold">Paid Customers</p>
              <p className="text-2xl font-bold text-green-900">{paidCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-800 font-semibold">Unpaid Customers</p>
              <p className="text-2xl font-bold text-red-900">{unpaidCount}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-semibold">Collection Rate</p>
              <p className="text-2xl font-bold text-blue-900">
                {processedPayments.length > 0 ? ((paidCount / processedPayments.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Village
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedPayments.map((payment) => {
                return (
                  <tr key={payment.id} className="hover:bg-gray-50 transition duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.village}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {months.find(m => m.value === payment.month)?.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ${payment.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                      {payment.paidAmount > 0 && payment.status === 'unpaid' && (
                        <div className="text-xs text-gray-500 mt-1">
                          Partial: ${payment.paidAmount} paid
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {payment.status === 'unpaid' && (
                        <button
                          onClick={() => handleMarkPaid(payment.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition duration-200"
                        >
                          Mark Paid
                        </button>
                      )}
                      {payment.status === 'paid' && (
                        <>
                          <span className="text-gray-500 text-xs mr-2">
                            Paid on {new Date(payment.paidDate).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => handleMarkUnpaid(payment.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition duration-200"
                          >
                            Mark Unpaid
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {processedPayments.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-600">No payments match your current filters</p>
          </div>
        )}
      </div>

      {/* Print Section */}
      {printData && (
        <div className="print-section">
          <div className="p-8">
            <div className="print-header">
              <h1 className="text-3xl font-bold text-center mb-2">Payments Report</h1>
              <p className="text-center text-gray-600">
                Printed on: {printData.printedDate} at {printData.printedTime}
              </p>
              <p className="text-center font-semibold">
                Period: {printData.filters.month} | 
                Village: {printData.filters.village} | 
                Status: {printData.filters.status}
              </p>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Total Collected:</strong> ${printData.summary.totalCollected.toLocaleString()}</p>
                  <p><strong>Total Unpaid:</strong> ${printData.summary.totalUnpaid.toLocaleString()}</p>
                </div>
                <div>
                  <p><strong>Paid Customers:</strong> {printData.summary.paidCount}</p>
                  <p><strong>Unpaid Customers:</strong> {printData.summary.unpaidCount}</p>
                  <p><strong>Collection Rate:</strong> {printData.summary.collectionRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>Village</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid Date</th>
                  <th>Paid Amount</th>
                </tr>
              </thead>
              <tbody>
                {printData.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.customerName}</td>
                    <td>{payment.phoneNumber}</td>
                    <td>{payment.village}</td>
                    <td>${payment.amount}</td>
                    <td>{payment.status}</td>
                    <td>{payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : 'N/A'}</td>
                    <td>${payment.paidAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="signature-section mt-8">
              <div className="flex justify-between">
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
    </div>
  );
};

export default Payments;
