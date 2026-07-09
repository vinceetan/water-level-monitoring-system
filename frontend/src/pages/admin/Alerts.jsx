import { useState, useEffect } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { publicApi, adminApi } from '../../api/api';

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', severity: 'WARNING', device_id: '' });
  const [saving, setSaving] = useState(false);

  const fetchAlerts = async () => {
    try {
      const data = await publicApi.getAlertHistory({ limit: 100 });
      setAlerts(data.alerts || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAlerts();
    publicApi.getDevices().then(d => setDevices(d.devices || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.device_id) delete payload.device_id;
      await adminApi.createAlert(payload);
      setShowForm(false);
      setForm({ title: '', message: '', severity: 'WARNING', device_id: '' });
      fetchAlerts();
    } catch (err) { alert(err.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this alert?')) return;
    try {
      await adminApi.deleteAlert(id);
      fetchAlerts();
    } catch (err) { alert(err.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400 mt-1">Manage community safety alerts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20"
        >
          + Send Alert
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white text-lg font-semibold">Send Manual Alert</h2>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none" required />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Message</label>
              <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none h-24 resize-none" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Severity</label>
                <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none">
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Device (optional)</label>
                <select value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none">
                  <option value="">All / General</option>
                  {devices.map(d => <option key={d.id} value={d.id}>{d.device_name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-500 disabled:opacity-50">{saving ? 'Sending...' : 'Send Alert'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Alert Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-slate-400 font-medium px-5 py-4">Alert</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Severity</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Type</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Device</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Date</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Active</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 ${!a.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-white font-medium text-sm">{a.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[250px]">{a.message}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={a.severity} /></td>
                  <td className="px-5 py-4"><StatusBadge status={a.alert_type} /></td>
                  <td className="px-5 py-4 text-slate-400 text-xs">{a.device?.device_name || '—'}</td>
                  <td className="px-5 py-4 text-slate-400 text-xs">{new Date(a.created_at).toLocaleString('en-PH')}</td>
                  <td className="px-5 py-4"><span className={`w-2 h-2 rounded-full inline-block ${a.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} /></td>
                  <td className="px-5 py-4">
                    {a.is_active && (
                      <button onClick={() => handleDeactivate(a.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
