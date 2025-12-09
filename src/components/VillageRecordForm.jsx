import React, { useMemo, useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';

export default function VillageRecordForm({ villageId, villageName, serverNow, onCreated, api }) {
  const [customers, setCustomers] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    const base = serverNow || new Date();
    return new Date(base).toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Load existing totals for this village
  useEffect(() => {
    const loadVillageTotals = async () => {
      if (!villageId && !villageName) return;
      
      try {
        const response = await api.getVillageCollections({ 
          villageId, 
          villageName 
        });
        const arr = Array.isArray(response) ? response : (response?.data || []);
        
        if (arr.length > 0) {
          // Calculate totals from existing records
          const totals = arr.reduce((acc, record) => ({
            totalAmount: acc.totalAmount + (record.amountCollected || 0),
            totalCustomers: acc.totalCustomers + (record.customers || record.householdsCollected || 0),
          }), { totalAmount: 0, totalCustomers: 0 });
          
          setTotalAmount(totals.totalAmount);
          setTotalCustomers(totals.totalCustomers);
        }
      } catch (error) {
        console.error('Error loading village totals:', error);
      }
    };
    
    loadVillageTotals();
  }, [villageId, villageName, api]);

  const payload = useMemo(() => ({
    villageId,
    villageName,
    customers: customers ? parseInt(customers) : undefined,
    amountCollected: amount ? parseFloat(amount) : undefined,
    date,
  }), [villageId, villageName, customers, amount, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!payload.customers || payload.customers < 0) return;
    setLoading(true);
    try {
      const created = await api.createVillageCollection(payload);
      const doc = created?.data || created;
      if (onCreated) onCreated(doc);
      
      // Update totals after successful creation
      const newAmount = parseFloat(amount) || 0;
      const newCustomers = parseInt(customers) || 0;
      setTotalAmount(prev => prev + newAmount);
      setTotalCustomers(prev => prev + newCustomers);
      
      // Reset form
      setCustomers('');
      setAmount('');
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create village record';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount || 0);
  };

  // Calculate projected total with current input
  const currentInputAmount = parseFloat(amount) || 0;

  const handlePrintTotals = () => {
    const w = window.open('', '_blank');
    const d = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Village Totals</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
            .item { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; text-align: center; }
            .label { font-size: 12px; color: #6b7280; }
            .value { font-size: 16px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="value">Totals Summary</div>
            <div class="label">Generated on ${d}</div>
          </div>
          <div class="grid">
            <div class="item"><div class="label">Total Amount</div><div class="value">${formatCurrency(totalAmount)}</div></div>
          </div>
          <div style="margin-top:12px; text-align:center;" class="label">Total Customers: ${totalCustomers}</div>
          <script>window.onload = function(){ window.print(); setTimeout(() => window.close(), 800); }</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customers</label>
          <input
            type="number"
            min="0"
            value={customers}
            onChange={(e) => setCustomers(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>
      </div>

      {/* Total Amount Section */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-700 flex items-center">
            <DollarSign className="w-4 h-4 mr-1 text-green-500" />
            Total Amount
          </h4>
          <button onClick={handlePrintTotals} type="button" className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Print Totals</button>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Amount</p>
          <p className="font-semibold text-green-600">{formatCurrency(totalAmount)}</p>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          <span>Total Customers: </span>
          <span className="font-medium">{totalCustomers}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          Save Record
        </button>
      </div>
    </form>
  );
}
