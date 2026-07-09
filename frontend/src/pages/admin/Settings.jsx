import { useState, useEffect } from 'react';
import { publicApi, adminApi } from '../../api/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    publicApi.getSettings()
      .then(data => { setSettings(data.settings); setForm(data.settings); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        sensor_height_cm: parseFloat(form.sensor_height_cm),
        warning_level_percent: parseInt(form.warning_level_percent),
        critical_level_percent: parseInt(form.critical_level_percent),
        sampling_interval_seconds: parseInt(form.sampling_interval_seconds),
        buzzer_enabled: form.buzzer_enabled,
      };
      const data = await adminApi.updateSettings(payload);
      setSettings(data.settings);
      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.data?.message || 'Failed to update settings');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>;
  }

  const fields = [
    { key: 'sensor_height_cm', label: 'Sensor Height (cm)', desc: 'Distance from sensor to the riverbed', type: 'number', step: '0.01' },
    { key: 'warning_level_percent', label: 'Warning Level (%)', desc: 'Water level percentage that triggers a WARNING', type: 'number' },
    { key: 'critical_level_percent', label: 'Critical Level (%)', desc: 'Water level percentage that triggers a CRITICAL alert', type: 'number' },
    { key: 'sampling_interval_seconds', label: 'Sampling Interval (seconds)', desc: 'How often the ESP32 takes a reading', type: 'number' },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure monitoring thresholds and device parameters</p>
      </div>

      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl p-3">{success}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 space-y-6">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-white text-sm font-medium block mb-1">{f.label}</label>
            <p className="text-slate-500 text-xs mb-2">{f.desc}</p>
            <input
              type={f.type}
              step={f.step}
              value={form[f.key] ?? ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
        ))}

        {/* Buzzer Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Buzzer Enabled</p>
            <p className="text-slate-500 text-xs">ESP32 local buzzer sounds during CRITICAL</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, buzzer_enabled: !form.buzzer_enabled })}
            className={`w-12 h-6 rounded-full transition-all duration-200 ${form.buzzer_enabled ? 'bg-violet-500' : 'bg-slate-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 transform ${form.buzzer_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
