import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Printer, ArrowLeft, Calendar, Home, DollarSign, Edit3, Trash2 } from 'lucide-react';
import VillageRecordForm from '../components/VillageRecordForm';

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const sameDay = (a, b) => {
  const da = new Date(a); da.setHours(0,0,0,0);
  const db = new Date(b); db.setHours(0,0,0,0);
  return da.getTime() === db.getTime();
};

export default function VillageDetail() {
  const { idOrName } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serverNow, setServerNow] = useState(null);

  const query = useMemo(() => {
    const isObjectId = /^[a-fA-F0-9]{24}$/.test(idOrName || '');
    return isObjectId ? { villageId: idOrName } : { villageName: idOrName };
  }, [idOrName]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Get server time for real-time date calculations
        try {
          const health = await apiService.getHealth();
          const ts = health?.timestamp || health?.data?.timestamp;
          if (ts) setServerNow(new Date(ts));
        } catch { /* ignore */ }
        const data = await apiService.getVillageCollections(query);
        const arr = Array.isArray(data) ? data : (data?.data || []);
        setRecords(arr);
      } catch (e) {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query]);

  const name = records[0]?.villageId?.name || records[0]?.villageName || idOrName;
  const today = serverNow || new Date();
  const todaysRecords = records.filter(r => r.date && sameDay(r.date, today));
  const todayStats = todaysRecords.reduce((acc, r) => ({
    customers: acc.customers + (r.householdsCollected || 0),
    amount: acc.amount + (r.amountCollected || 0)
  }), { customers: 0, amount: 0 });

  const handlePrint = () => {
    const w = window.open('', '_blank');
    const baseDate = serverNow || new Date();
    const d = baseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
            .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #2563eb; color: #fff; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            tr:nth-child(even) { background: #f8fafc; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${name}</div>
            <div class="subtitle">Generated on ${d}</div>
          </div>
          <div class="cards">
            <div class="card"><div><strong>Today Customers</strong></div><div>${todayStats.customers}</div></div>
            <div class="card"><div><strong>Today Amount</strong></div><div>${formatCurrency(todayStats.amount)}</div></div>
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
            </tbody>
          </table>
          <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 800); }</script>
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
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-gray-600 text-sm">Daily collections for this village</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border text-sm">Back</button>
          <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      <VillageRecordForm
        villageId={/^[a-fA-F0-9]{24}$/.test(idOrName || '') ? idOrName : undefined}
        villageName={!/^[a-fA-F0-9]{24}$/.test(idOrName || '') ? idOrName : undefined}
        serverNow={serverNow}
        api={apiService}
        onCreated={(doc) => {
          const mapped = {
            ...doc,
            villageId: doc.villageId || records[0]?.villageId || undefined,
            villageName: doc.villageName || records[0]?.villageName || name,
          };
          setRecords(prev => [mapped, ...prev]);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Home className="w-6 h-6 text-blue-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Today Customers</p>
              <p className="text-lg font-semibold">{todayStats.customers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-green-500 mr-3" />
            <div>
              <p className="text-xs text-gray-600">Today Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(todayStats.amount)}</p>
            </div>
          </div>
        </div>
      </div>

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
                      <button onClick={() => handlePrintRecord(r)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Print</button>
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
