import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { Printer, MapPin, Plus, Loader, Edit3, Trash2 } from 'lucide-react';
import VillageRecordForm from '../components/VillageRecordForm';

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const sameDay = (a, b) => {
  const da = new Date(a); da.setHours(0,0,0,0);
  const db = new Date(b); db.setHours(0,0,0,0);
  return da.getTime() === db.getTime();
};

export default function VillageDetails() {
  const [villages, setVillages] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serverNow, setServerNow] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newVillage, setNewVillage] = useState({ name: '' });

  useEffect(() => {
    const init = async () => {
      const health = await apiService.getHealth().catch(() => null);
      const ts = health?.timestamp || health?.data?.timestamp;
      if (ts) setServerNow(new Date(ts));
      const collections = await apiService.getVillageCollections().catch(() => []);
      const items = Array.isArray(collections) ? collections : (collections?.data || []);
      const distinct = [];
      const seen = new Set();
      for (const r of items) {
        const id = r.villageId?._id || r.villageId || null;
        if (!id) continue;
        const name = r.villageId?.name || r.villageName || 'Unknown';
        const key = id;
        if (!seen.has(key)) {
          seen.add(key);
          distinct.push({ _id: id, name });
        }
      }
      setVillages(distinct);
      if (distinct.length && !selectedId) setSelectedId(distinct[0]?._id || '');
    };
    init();
  }, []);

  const selectedVillage = useMemo(() => villages.find(v => v._id === selectedId) || null, [villages, selectedId]);

  useEffect(() => {
    const load = async () => {
      if (!selectedVillage) { setRecords([]); return; }
      try {
        setLoading(true);
        const isId = /^[a-fA-F0-9]{24}$/.test(selectedVillage?._id || '');
        const params = isId ? { villageId: selectedVillage._id } : { villageName: selectedVillage.name };
        const data = await apiService.getVillageCollections(params);
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setRecords(arr);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedVillage?._id, selectedVillage?.name]);

  const name = selectedVillage?.name || 'Select Village';
  const today = serverNow || new Date();
  const todaysRecords = records.filter(r => r.date && sameDay(r.date, today));
  const todayStats = todaysRecords.reduce((acc, r) => ({
    customers: acc.customers + (r.householdsCollected || 0),
    amount: acc.amount + (r.amountCollected || 0)
  }), { customers: 0, amount: 0 });

  const allTimeTotals = records.reduce((acc, r) => ({
    customers: acc.customers + (r.householdsCollected || 0),
    amount: acc.amount + (r.amountCollected || 0),
    totalRecords: acc.totalRecords + 1
  }), { customers: 0, amount: 0, totalRecords: 0 });

  const handlePrintAll = () => {
    const w = window.open('', '_blank');
    const d = (serverNow || new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const totals = records.reduce((acc, r) => ({
      customers: acc.customers + (r.householdsCollected || 0),
      amount: acc.amount + (r.amountCollected || 0)
    }), { customers: 0, amount: 0 });
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Village Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 700; color: #1f2937; }
            .subtitle { color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #2563eb; color: #fff; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            .right { text-align: right; }
            .total-row { background: #dbeafe; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${name}</div>
            <div class="subtitle">Generated on ${d}</div>
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
                  <td class="right"><strong>${formatCurrency(r.amountCollected || 0)}</strong></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>GRAND TOTAL</strong></td>
                <td><strong>${totals.customers}</strong></td>
                <td class="right"><strong>${formatCurrency(totals.amount)}</strong></td>
              </tr>
              </tbody>
          </table>
          <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 800); }</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <>
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <MapPin className="w-6 h-6 text-gray-500 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrintAll} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center">
            <Printer className="w-4 h-4 mr-2" />
            Print All
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Select Village</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center"
            >
              <Plus className="w-3 h-3 mr-1" /> Add
            </button>
            <button
              disabled={!selectedVillage}
              onClick={async () => {
                if (!selectedVillage?._id) return;
                const nextName = window.prompt('Rename village', selectedVillage.name);
                if (!nextName) return;
                try {
                  const updated = await apiService.updateVillage(selectedVillage._id, { name: nextName.trim() });
                  const v = updated?.data || updated;
                  setVillages(prev => prev.map(x => x._id === selectedVillage._id ? { _id: v._id, name: v.name } : x));
                } catch (err) {
                  alert(err?.message || 'Failed to rename village');
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs border"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              disabled={!selectedVillage}
              onClick={async () => {
                if (!selectedVillage?._id) return;
                if (!window.confirm('Delete this village?')) return;
                try {
                  await apiService.deleteVillage(selectedVillage._id);
                  setVillages(prev => prev.filter(x => x._id !== selectedVillage._id));
                  setSelectedId('');
                  setRecords([]);
                } catch (err) {
                  alert(err?.message || 'Failed to delete village');
                }
              }}
              className="px-3 py-1.5 rounded-lg text-xs border text-red-600"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">Choose...</option>
          {villages.map(v => (
            <option key={v._id || v.name} value={v._id || ''}>{v.name}</option>
          ))}
        </select>
      </div>

      {selectedVillage && (
        <VillageRecordForm
          villageId={selectedVillage._id}
          villageName={selectedVillage.name}
          serverNow={serverNow}
          api={apiService}
          onCreated={(doc) => {
            const mapped = {
              ...doc,
              villageId: doc.villageId || selectedVillage,
              villageName: doc.villageName || selectedVillage.name,
            };
            setRecords(prev => [mapped, ...prev]);
            if (!selectedVillage._id && mapped.villageId?._id) {
              setVillages(prev => prev.map(v => (v.name === selectedVillage.name ? { _id: mapped.villageId._id, name: v.name } : v)));
              setSelectedId(mapped.villageId._id);
            }
          }}
        />
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map(r => (
                  <tr key={r._id || `${r.villageName}-${r.date}` } className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">{formatDate(r.date)}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{r.householdsCollected || 0}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-green-600">{formatCurrency(r.amountCollected || 0)}</td>
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={() => {
                          const w = window.open('', '_blank');
                          const d = (serverNow || new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                          w.document.write(`
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <title>Village Record</title>
                                <style>
                                  body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                                  .header { text-align: center; margin-bottom: 20px; }
                                  .title { font-size: 22px; font-weight: 700; color: #1f2937; }
                                  .subtitle { color: #6b7280; }
                                  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                  th { background: #2563eb; color: #fff; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
                                  td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
                                  .right { text-align: right; }
                                </style>
                              </head>
                              <body>
                                <div class="header">
                                  <div class="title">${name}</div>
                                  <div class="subtitle">Generated on ${d}</div>
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
                                    <tr>
                                      <td>${formatDate(r.date)}</td>
                                      <td>${r.householdsCollected || 0}</td>
                                      <td class="right"><strong>${formatCurrency(r.amountCollected || 0)}</strong></td>
                                    </tr>
                                  </tbody>
                                </table>
                                <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 800); }</script>
                              </body>
                            </html>
                          `);
                          w.document.close();
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Print
                      </button>
                      <button
                        onClick={async () => {
                          const customersStr = window.prompt('Customers', String(r.householdsCollected || 0));
                          if (customersStr === null) return;
                          const amountStr = window.prompt('Amount', String(r.amountCollected || 0));
                          if (amountStr === null) return;
                          const dateStr = window.prompt('Date (YYYY-MM-DD)', new Date(r.date).toISOString().slice(0,10));
                          if (dateStr === null) return;
                          const customers = Number(customersStr);
                          const amount = Number(amountStr);
                          if (Number.isNaN(customers) || Number.isNaN(amount)) { alert('Invalid numbers'); return; }
                          const dateIso = new Date(dateStr).toISOString();
                          const dup = records.some(x => (x._id !== r._id) && x.date && sameDay(x.date, dateIso));
                          if (dup) { alert('A record for this date already exists'); return; }
                          try {
                            const updated = await apiService.updateVillageCollection(r._id, { villageName: name, date: dateIso, customers, amountCollected: amount });
                            const u = Array.isArray(updated) ? updated[0] : (updated?.data || updated);
                            setRecords(prev => prev.map(x => (x._id === r._id ? u : x)));
                          } catch (err) {
                            alert(err?.message || 'Failed to update record');
                          }
                        }}
                        className="ml-2 px-2 py-1 text-xs border rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Delete this record?')) return;
                          try {
                            await apiService.deleteVillageCollection(r._id);
                            setRecords(prev => prev.filter(x => x._id !== r._id));
                          } catch (err) {
                            alert(err?.message || 'Failed to delete record');
                          }
                        }}
                        className="ml-2 px-2 py-1 text-xs border rounded text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{allTimeTotals.customers}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-700">{formatCurrency(allTimeTotals.amount)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
    {showAddModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <h2 className="text-lg font-semibold mb-4">Add Village</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setAddLoading(true);
              try {
                const payload = { name: newVillage.name.trim() };
                const created = await apiService.createVillage(payload);
                const v = created?.data || created;
                setVillages(prev => [{ _id: v._id, name: v.name }, ...prev.filter(x => x._id !== v._id)]);
                setSelectedId(v._id);
                setShowAddModal(false);
                setNewVillage({ name: '' });
              } catch (error) {
                alert(error?.message || 'Failed to add village');
              } finally {
                setAddLoading(false);
              }
            }}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Name</label>
                <input
                  type="text"
                  value={newVillage.name}
                  onChange={(e) => setNewVillage(v => ({ ...v, name: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="px-4 py-2 text-sm" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" disabled={addLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center">
                {addLoading && <Loader className="w-4 h-4 animate-spin mr-2" />} Add
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
