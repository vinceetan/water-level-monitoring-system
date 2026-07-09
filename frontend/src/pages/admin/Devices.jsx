import { useState, useEffect } from 'react';
import StatusBadge from '../../components/StatusBadge';
import LocationPickerMap from '../../components/LocationPickerMap';
import { publicApi, adminApi } from '../../api/api';

export default function AdminDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [form, setForm] = useState({ device_name: '', device_code: '', location: '', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);

  const fetchDevices = async () => {
    try {
      const data = await publicApi.getDevices();
      setDevices(data.devices || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editDevice) {
        await adminApi.updateDevice(editDevice.id, form);
      } else {
        await adminApi.createDevice(form);
      }
      setShowForm(false);
      setEditDevice(null);
      setForm({ device_name: '', device_code: '', location: '', latitude: '', longitude: '' });
      fetchDevices();
    } catch (err) {
      alert(err.data?.message || 'Failed to save device');
    } finally { setSaving(false); }
  };

  const handleEdit = (device) => {
    setEditDevice(device);
    setForm({ 
      device_name: device.device_name, 
      device_code: device.device_code, 
      location: device.location,
      latitude: device.latitude || '',
      longitude: device.longitude || ''
    });
    setShowForm(true);
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this device?')) return;
    try {
      await adminApi.deleteDevice(id);
      fetchDevices();
    } catch (err) { alert(err.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Devices</h1>
          <p className="text-slate-400 mt-1">Manage ESP32 monitoring stations</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditDevice(null); setForm({ device_name: '', device_code: '', location: '' }); }}
          className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20"
        >
          + Add Device
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white text-lg font-semibold">{editDevice ? 'Edit Device' : 'Add Device'}</h2>
            {['device_name', 'device_code', 'location'].map(field => (
              <div key={field}>
                <label className="text-slate-400 text-sm block mb-1 capitalize">{field.replace('_', ' ')}</label>
                <input
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                  required={!editDevice}
                />
              </div>
            ))}
            <div>
              <label className="text-slate-400 text-sm block mb-1">Pin Location on Map</label>
              <LocationPickerMap 
                latitude={form.latitude} 
                longitude={form.longitude} 
                onLocationSelect={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })} 
              />
              <p className="text-xs text-slate-500 mt-1">
                {form.latitude && form.longitude ? `Coordinates: ${Number(form.latitude).toFixed(5)}, ${Number(form.longitude).toFixed(5)}` : 'Click the map to drop a pin'}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-500 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Device Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-slate-400 font-medium px-5 py-4">Device</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Code</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Location</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Status</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Last Seen</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-5 py-4 text-white font-medium">{d.device_name}</td>
                  <td className="px-5 py-4 text-slate-400 font-mono text-xs">{d.device_code}</td>
                  <td className="px-5 py-4 text-slate-300">{d.location}</td>
                  <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-4 text-slate-400 text-xs">{d.last_seen ? new Date(d.last_seen).toLocaleString('en-PH') : 'Never'}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(d)} className="text-violet-400 hover:text-violet-300 text-xs font-medium">Edit</button>
                      {d.is_active && (
                        <button onClick={() => handleDeactivate(d.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Deactivate</button>
                      )}
                    </div>
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
