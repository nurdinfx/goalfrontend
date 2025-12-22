import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Filter, BarChart3, Users, DollarSign, TrendingUp, Printer,

  Search, Calendar, MapPin, Building, FileText, PieChart, Eye, EyeOff,
  Shield, Truck, Wrench, CreditCard, Home, UserCheck, AlertCircle,
  CheckCircle, XCircle, Clock, ArrowUpRight, ArrowDownRight, Target
} from 'lucide-react';
import { apiService } from '../services/api';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

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
  expenses: propExpenses = [],
  cars: propCars = [],
  withdrawals: propWithdrawals = []
}) => {
  const [filters, setFilters] = useState({
    month: getCurrentMonth(),
    village: 'all',
    reportType: 'dashboard',
    worker: 'all',
    zone: 'all',
    dateRange: 'monthly'
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [customers, setCustomers] = useState(propCustomers);
  const [villages, setVillages] = useState(propVillages);
  const [workers, setWorkers] = useState(propWorkers);
  const [zones, setZones] = useState(propZones);
  const [expenses, setExpenses] = useState(propExpenses);
  const [cars, setCars] = useState(propCars);
  const [withdrawals, setWithdrawals] = useState(propWithdrawals);
  const [availableMonths, setAvailableMonths] = useState([getCurrentMonth()]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

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
      const [
        customersData,
        villagesData,
        workersData,
        zonesData,

        expensesData,
        carsData,
        withdrawalsData
      ] = await Promise.all([
        apiService.getCustomers(),
        apiService.getVillages(),
        apiService.getWorkers(),
        apiService.getZones(),
        apiService.getCompanyExpenses(),
        apiService.getCars(),
        apiService.getWithdraws()
      ]);

      setCustomers(customersData || []);
      setVillages(villagesData || []);
      setWorkers(workersData || []);
      setZones(zonesData || []);
      setExpenses(expensesData || []);
      setCars(carsData || []);
      setWithdrawals(withdrawalsData || []);
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

  // Get payment status for selected month
  const getSelectedMonthPayment = (customer) => {
    if (!customer.payments) {
      return { paid: 0, remaining: customer.monthlyFee || 0, fullyPaid: false };
    }

    const payment = customer.payments.get?.(filters.month) ||
      customer.payments[filters.month] ||
      { paid: 0, remaining: customer.monthlyFee || 0, fullyPaid: false };


    return payment;
  };

  // Calculate comparison data with previous month
  const calculateComparison = (currentData, previousData) => {
    if (!previousData) return null;


    return {
      totalCollected: {
        current: currentData.summary.totalCollected,
        previous: previousData.summary.totalCollected,
        change: ((currentData.summary.totalCollected - previousData.summary.totalCollected) / previousData.summary.totalCollected) * 100
      },
      collectionRate: {
        current: currentData.summary.collectionRate,
        previous: previousData.summary.collectionRate,
        change: currentData.summary.collectionRate - previousData.summary.collectionRate
      },
      totalCustomers: {
        current: currentData.summary.totalCustomers,
        previous: previousData.summary.totalCustomers,
        change: currentData.summary.totalCustomers - previousData.summary.totalCustomers
      }
    };
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

      // Apply zone filter
      if (filters.zone !== 'all') {
        filteredCustomers = filteredCustomers.filter(c =>
          c.zoneId?._id === filters.zone || c.zoneId === filters.zone
        );
        filteredVillages = filteredVillages.filter(v =>

          v.zoneId === filters.zone || v.zoneId?._id === filters.zone
        );
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

      // Calculate previous month for comparison
      const previousMonth = new Date(filters.month + '-01');
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const previousMonthStr = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

      // Village breakdown grouped by Zone
      let villageBreakdownByZone;
      try {
        const backendReport = await apiService.getVillageBreakdownReport(filters.month);
        villageBreakdownByZone = backendReport;
      } catch (e) {
        // Fallback calculation
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

      // Worker performance
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
          phoneNumber: worker.phoneNumber,
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
        const zone = zones.find(z =>
          z._id === customer.zoneId?._id || z._id === customer.zoneId
        );


        return {
          customerId: customer._id,
          customerName: customer.fullName,
          phoneNumber: showSensitiveData ? customer.phoneNumber : '***' + customer.phoneNumber?.slice(-4),
          address: showSensitiveData ? customer.address : 'Confidential',
          villageName: village?.name || 'Unknown',
          zoneName: zone?.name || 'Unknown',
          monthlyFee: customer.monthlyFee || 0,
          paidAmount: payment.paid || 0,
          remainingAmount: payment.remaining || customer.monthlyFee || 0,
          status: payment.fullyPaid ? 'Fully Paid' :
            payment.paid > 0 ? 'Partial Payment' : 'Not Paid',

          lastPayment: payment.paidDate || 'No payment',
          joinDate: customer.createdAt || 'Unknown'
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

      // Cars and maintenance report
      const carsReport = cars.map(car => {
        const totalExpenses = car.expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
        const maintenanceExpenses = car.expenses?.filter(e => e.type === 'maintenance').reduce((sum, e) => sum + e.amount, 0) || 0;
        const fuelExpenses = car.expenses?.filter(e => e.type === 'fuel').reduce((sum, e) => sum + e.amount, 0) || 0;


        return {
          carId: car._id,
          plateNumber: car.plateNumber,
          carType: car.carType,
          status: car.status,
          totalExpenses,
          maintenanceExpenses,
          fuelExpenses,
          expenseCount: car.expenses?.length || 0,
          lastMaintenance: car.expenses?.filter(e => e.type === 'maintenance').sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate))[0]?.expenseDate || 'Never'
        };
      });

      // Withdrawals report
      const monthlyWithdrawals = withdrawals.filter(withdrawal => {
        const withdrawDate = new Date(withdrawal.withdrawDate);
        const filterDate = new Date(filters.month + '-01');
        return withdrawDate.getMonth() === filterDate.getMonth() &&
          withdrawDate.getFullYear() === filterDate.getFullYear();

      });

      const withdrawalsByCategory = monthlyWithdrawals.reduce((acc, withdrawal) => {
        acc[withdrawal.category] = (acc[withdrawal.category] || 0) + withdrawal.amount;
        return acc;
      }, {});

      // Risk assessment
      const riskAssessment = {
        highRiskVillages: villageBreakdownByZone.zones.flatMap(zone =>

          zone.villages.filter(v => v.collectionRate < 50)
        ),
        lowPerformanceWorkers: workerPerformance.filter(w => w.collectionRate < 60),
        overdueMaintenance: carsReport.filter(c => {
          const lastMaintenance = c.lastMaintenance;
          if (lastMaintenance === 'Never') return true;
          const lastMaintenanceDate = new Date(lastMaintenance);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return lastMaintenanceDate < sixMonthsAgo;
        })
      };

      const reportData = {
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
          totalWithdrawals: monthlyWithdrawals.reduce((sum, w) => sum + w.amount, 0),
          netProfit: totalCollected - monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0),
          carExpenses: carsReport.reduce((sum, car) => sum + car.totalExpenses, 0)
        },
        villageBreakdownByZone,
        workerPerformance,
        customerDetails,
        zonePerformance,
        cars: carsReport,
        withdrawals: {
          monthly: monthlyWithdrawals,
          byCategory: withdrawalsByCategory,
          total: monthlyWithdrawals.reduce((sum, w) => sum + w.amount, 0)
        },
        expenses: {
          monthly: monthlyExpenses,
          byType: expensesByType,
          total: monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)
        },
        riskAssessment,
        period: filters.month,
        generatedAt: new Date().toLocaleString()
      };

      setReportData(reportData);


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

  const handleExport = (format = 'csv') => {
    if (!reportData) return;

    if (format === 'csv') {
      let csvContent = "data:text/csv;charset=utf-8,";


      if (filters.reportType === 'dashboard') {
        csvContent += "Metric,Value,Previous Month,Change\n";
        csvContent += `Total Collected,${reportData.summary.totalCollected},,\n`;
        csvContent += `Collection Rate,${reportData.summary.collectionRate.toFixed(1)}%,,\n`;
        csvContent += `Total Customers,${reportData.summary.totalCustomers},,\n`;
        csvContent += `Net Profit,${reportData.summary.netProfit},,\n`;
      } else if (filters.reportType === 'payments') {
        csvContent += "Zone,Village,Code,Customers,Paid,Unpaid,Partial,Collected,Due,Unpaid Amount,Collection Rate\n";
        (reportData.villageBreakdownByZone?.zones || []).forEach(zone => {
          zone.villages.forEach(row => {
            csvContent += `"${zone.name}","${row.villageName}","${row.villageCode}",${row.totalCustomers},${row.paidCustomers},${row.unpaidCustomers},${row.partialCustomers},${row.collected},${row.due},${row.unpaid},${row.collectionRate.toFixed(1)}%\n`;
          });
        });
      } else if (filters.reportType === 'workers') {
        csvContent += "Worker,Phone,Assigned Villages,Total Customers,Paid Customers,Unpaid Customers,Collection Rate,Total Revenue,Total Due,Efficiency\n";
        reportData.workerPerformance.forEach(row => {
          csvContent += `"${row.workerName}","${row.phoneNumber}",${row.assignedVillages},${row.totalCustomers},${row.paidCustomers},${row.unpaidCustomers},${row.collectionRate.toFixed(1)}%,${row.totalRevenue},${row.totalDue},${row.efficiency.toFixed(1)}%\n`;
        });
      } else if (filters.reportType === 'customers') {
        csvContent += "Customer Name,Phone,Address,Village,Zone,Monthly Fee,Paid Amount,Remaining Amount,Status,Last Payment,Join Date\n";
        reportData.customerDetails.forEach(customer => {
          csvContent += `"${customer.customerName}","${customer.phoneNumber}","${customer.address}","${customer.villageName}","${customer.zoneName}",${customer.monthlyFee},${customer.paidAmount},${customer.remainingAmount},${customer.status},"${customer.lastPayment}","${customer.joinDate}"\n`;
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
      } else if (filters.reportType === 'cars') {
        csvContent += "Plate Number,Type,Status,Total Expenses,Maintenance,Fuel,Expense Count,Last Maintenance\n";
        reportData.cars.forEach(car => {
          csvContent += `"${car.plateNumber}","${car.carType}","${car.status}",${car.totalExpenses},${car.maintenanceExpenses},${car.fuelExpenses},${car.expenseCount},"${car.lastMaintenance}"\n`;
        });
      } else if (filters.reportType === 'withdrawals') {
        csvContent += "Reference,Description,Category,Amount,Bank Name,Account Holder,Date,Notes\n";
        reportData.withdrawals.monthly.forEach(withdrawal => {
          csvContent += `"${withdrawal.referenceNumber}","${withdrawal.description}","${withdrawal.category}",${withdrawal.amount},"${withdrawal.bankDetails?.bankName}","${withdrawal.bankDetails?.accountHolder}","${withdrawal.withdrawDate}","${withdrawal.notes}"\n`;
        });
      } else if (filters.reportType === 'risk') {
        csvContent += "Risk Type,Item,Issue,Severity\n";
        reportData.riskAssessment.highRiskVillages.forEach(village => {
          csvContent += `"High Risk Village","${village.villageName}","Collection rate ${village.collectionRate.toFixed(1)}%","High"\n`;
        });
        reportData.riskAssessment.lowPerformanceWorkers.forEach(worker => {
          csvContent += `"Low Performance Worker","${worker.workerName}","Collection rate ${worker.collectionRate.toFixed(1)}%","Medium"\n`;
        });
        reportData.riskAssessment.overdueMaintenance.forEach(car => {
          csvContent += `"Overdue Maintenance","${car.plateNumber}","Last maintenance: ${car.lastMaintenance}","High"\n`;
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
    }
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

  const getSelectedZoneName = () => {
    if (filters.zone === 'all') return 'All Zones';
    const zone = zones.find(z => z._id === filters.zone);
    return zone ? zone.name : 'All Zones';
  };

  const handleMonthChange = (e) => {
    setFilters(prev => ({ ...prev, month: e.target.value }));
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-600',
      green: 'bg-green-50 border-green-200 text-green-600',
      red: 'bg-red-50 border-red-200 text-red-600',
      purple: 'bg-purple-50 border-purple-200 text-purple-600',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600'
    };

    return (
      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 ${colorClasses[color]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center mt-2 text-sm ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                {trend > 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> :
                  trend < 0 ? <ArrowDownRight className="w-4 h-4 mr-1" /> : null}

                {trend !== 0 && `${Math.abs(trend).toFixed(1)}%`}
                {trend === 0 && 'No change'}
              </div>
            )}
          </div>
          <div className="p-3 rounded-full bg-white bg-opacity-50">
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-3xl font-bold text-gray-900">Business Intelligence Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analytics and reporting system - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-700 transition duration-200"
          >
            {showSensitiveData ? <EyeOff className="w-5 h-5 mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
            {showSensitiveData ? 'Hide Sensitive Data' : 'Show Sensitive Data'}
          </button>
          <button
            onClick={() => handleExport('csv')}
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
            Print Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 no-print">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Report Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Report Type</label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}

              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              <option value="dashboard">Dashboard Overview</option>
              <option value="payments">Payments Report</option>
              <option value="customers">Customers Report</option>
              <option value="workers">Workers Performance</option>
              <option value="zones">Zones Performance</option>
              <option value="expenses">Expenses Report</option>
              <option value="cars">Cars & Maintenance</option>
              <option value="withdrawals">Withdrawals Report</option>
              <option value="risk">Risk Assessment</option>
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
            <label className="block text-sm font-medium text-gray-700">Zone</label>
            <select
              value={filters.zone}
              onChange={(e) => setFilters({ ...filters, zone: e.target.value })}

              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              <option value="all">All Zones</option>
              {zones.map(zone => (
                <option key={zone._id} value={zone._id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Village</label>
            <select
              value={filters.village}
              onChange={(e) => setFilters({ ...filters, village: e.target.value })}

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
              onChange={(e) => setFilters({ ...filters, worker: e.target.value })}

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
            <div>
              <span className="font-medium">Scope:</span> {getSelectedZoneName()} • {getSelectedVillageName()} • {getSelectedWorkerName()}
            </div>
          </div>
        </div>
      </div>

      {reportData && (
        <>
          {/* Summary Cards */}
          {filters.reportType === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
              <StatCard
                title="Total Collected"
                value={`$${reportData.summary.totalCollected.toLocaleString()}`}
                subtitle={`From ${reportData.summary.totalCustomers} customers`}
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Collection Rate"
                value={`${reportData.summary.collectionRate.toFixed(1)}%`}
                subtitle={`${reportData.summary.paidCustomers} paid, ${reportData.summary.unpaidCustomers} unpaid`}
                icon={TrendingUp}
                color={reportData.summary.collectionRate >= 80 ? 'green' : reportData.summary.collectionRate >= 60 ? 'yellow' : 'red'}
              />
              <StatCard
                title="Net Profit"
                value={`$${reportData.summary.netProfit.toLocaleString()}`}
                subtitle={`After expenses and withdrawals`}
                icon={CreditCard}
                color={reportData.summary.netProfit >= 0 ? 'purple' : 'red'}
              />
              <StatCard
                title="Active Operations"
                value={reportData.summary.totalVillages}
                subtitle={`${reportData.summary.totalZones} zones, ${reportData.summary.totalWorkers} workers`}
                icon={Building}
                color="blue"
              />
            </div>
          )}

          {/* Report Content */}
          {filters.reportType === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
              {/* Financial Overview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Financial Overview</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">${reportData.summary.totalCollected.toLocaleString()}</div>
                      <div className="text-sm text-green-800">Revenue Collected</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <DollarSign className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-red-600">${reportData.summary.totalUnpaid.toLocaleString()}</div>
                      <div className="text-sm text-red-800">Outstanding</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Expenses:</span>
                      <span className="font-semibold">${reportData.expenses.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Car Maintenance:</span>
                      <span className="font-semibold">${reportData.summary.carExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Withdrawals:</span>
                      <span className="font-semibold">${reportData.withdrawals.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Performance Metrics</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Collection Rate</span>
                      <span>{reportData.summary.collectionRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${reportData.summary.collectionRate >= 80 ? 'bg-green-600' :
                            reportData.summary.collectionRate >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}

                        style={{ width: `${Math.min(reportData.summary.collectionRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{reportData.summary.paidCustomers}</div>
                      <div className="text-sm text-gray-600">Paid</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{reportData.summary.partialPayments}</div>
                      <div className="text-sm text-gray-600">Partial</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{reportData.summary.unpaidCustomers}</div>
                      <div className="text-sm text-gray-600">Unpaid</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other report types would follow similar structure... */}
          {/* Payments Report */}
          {filters.reportType === 'payments' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 no-print">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Village Payments Breakdown by Zone - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {(reportData.villageBreakdownByZone?.zones || []).map(zone => (
                  <div key={zone._id}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-md font-semibold text-gray-800 flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />{zone.name}
                      </h3>
                      <div className="text-sm text-gray-600">
                        Collection Rate: {zone.stats.collectionRate.toFixed(1)}% •

                        Customers: {zone.stats.totalCustomers}
                      </div>
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
                                  <span className={`font-semibold ${village.collectionRate >= 80 ? 'text-green-600' : village.collectionRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {village.collectionRate.toFixed(1)}%
                                  </span>
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

          {/* Risk Assessment Report */}
          {filters.reportType === 'risk' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 no-print">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Risk Assessment Report - {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* High Risk Villages */}
                <div>
                  <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    High Risk Villages (Collection Rate &lt; 50%)
                  </h3>
                  {reportData.riskAssessment.highRiskVillages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reportData.riskAssessment.highRiskVillages.map(village => (
                        <div key={village.villageId} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="font-semibold text-red-800">{village.villageName}</div>
                          <div className="text-sm text-red-600">Collection Rate: {village.collectionRate.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">Unpaid: ${village.unpaid.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      No high risk villages detected
                    </div>
                  )}
                </div>

                {/* Low Performance Workers */}
                <div>
                  <h3 className="text-lg font-semibold text-yellow-600 mb-4 flex items-center">
                    <UserCheck className="w-5 h-5 mr-2" />
                    Low Performance Workers (Collection Rate &lt; 60%)
                  </h3>
                  {reportData.riskAssessment.lowPerformanceWorkers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {reportData.riskAssessment.lowPerformanceWorkers.map(worker => (
                        <div key={worker.workerId} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="font-semibold text-yellow-800">{worker.workerName}</div>
                          <div className="text-sm text-yellow-600">Collection Rate: {worker.collectionRate.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">Customers: {worker.totalCustomers}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      All workers meeting performance targets
                    </div>
                  )}
                </div>

                {/* Overdue Maintenance */}
                <div>
                  <h3 className="text-lg font-semibold text-orange-600 mb-4 flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Overdue Vehicle Maintenance (&gt; 6 months)
                  </h3>
                  {reportData.riskAssessment.overdueMaintenance.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {reportData.riskAssessment.overdueMaintenance.map(car => (
                        <div key={car.carId} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="font-semibold text-orange-800">{car.plateNumber}</div>
                          <div className="text-sm text-orange-600">Last Maintenance: {car.lastMaintenance}</div>
                          <div className="text-sm text-gray-600">Type: {car.carType}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      All vehicles up to date with maintenance
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add similar sections for other report types... */}
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
                {filters.reportType === 'dashboard' ? 'BUSINESS INTELLIGENCE DASHBOARD' :
                  filters.reportType === 'payments' ? 'PAYMENTS REPORT' :
                    filters.reportType === 'workers' ? 'WORKERS PERFORMANCE REPORT' :
                      filters.reportType === 'customers' ? 'CUSTOMERS REPORT' :
                        filters.reportType === 'zones' ? 'ZONES PERFORMANCE REPORT' :
                          filters.reportType === 'risk' ? 'RISK ASSESSMENT REPORT' : 'EXPENSES REPORT'}
              </div>
              <div className="report-subtitle">
                Period: {new Date(filters.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} |
                Generated on: {printData.printedDate} at {printData.printedTime}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>

                Scope: {getSelectedZoneName()} • {getSelectedVillageName()} • {getSelectedWorkerName()}
              </div>
            </div>

            {/* Print content would go here... */}
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