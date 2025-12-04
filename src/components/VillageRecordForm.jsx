import React, { useMemo, useState } from 'react';
import { Loader } from 'lucide-react';

export default function VillageRecordForm({ villageId, villageName, serverNow, onCreated, api }) {
  const [customers, setCustomers] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    const base = serverNow || new Date();
    return new Date(base).toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);

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
      const existing = await api.getVillageCollections({ villageId, villageName, date });
      const arr = Array.isArray(existing) ? existing : (existing?.data || []);
      if (arr.length > 0) {
        alert('A record for this village and date already exists');
        return;
      }
      const created = await api.createVillageCollection(payload);
      const doc = created?.data || created;
      if (onCreated) onCreated(doc);
      setCustomers('');
      setAmount('');
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create village record';
      alert(msg);
    } finally {
      setLoading(false);
    }
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
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? (
            <span className="flex items-center"><Loader className="w-4 h-4 animate-spin mr-2" />Saving...</span>
          ) : (
            'Save Record'
          )}
        </button>
      </div>
    </form>
  );
}
