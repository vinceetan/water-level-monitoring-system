import { useState, useEffect } from 'react';
import { publicApi, adminApi } from '../../api/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [device, setDevice] = useState(null);
  const [form, setForm] = useState({});
  const [deviceForm, setDeviceForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isFirstLoad = true;

    const fetchData = () => {
      Promise.all([publicApi.getSettings(), publicApi.getDevices()])
        .then(([settingsData, devicesData]) => {
          setSettings(settingsData.settings);
          if (devicesData.devices && devicesData.devices.length > 0) {
            setDevice(devicesData.devices[0]);
          }

          if (isFirstLoad) {
            setForm(settingsData.settings);
            if (devicesData.devices && devicesData.devices.length > 0) {
              setDeviceForm({
                device_name: devicesData.devices[0].device_name,
                location: devicesData.devices[0].location
              });
            }
            isFirstLoad = false;
          } else {
            // Only update the buzzer state automatically to prevent wiping out active typing
            setForm(prev => ({ ...prev, buzzer_enabled: settingsData.settings.buzzer_enabled }));
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    };

    fetchData();
    const intervalId = setInterval(fetchData, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    let hasError = false;
    let errorMsg = '';

    try {
      if (device) {
        await adminApi.updateDevice(device.id, deviceForm);
      }
    } catch (err) {
      hasError = true;
      errorMsg += (err.response?.data?.message || 'Failed to update device. ') + ' ';
    }

    try {
      const payload = {
        sensor_height_cm: parseFloat(form.sensor_height_cm),
        warning_level_cm: parseFloat(form.warning_level_cm),
        critical_level_cm: parseFloat(form.critical_level_cm),
        sampling_interval_seconds: parseInt(form.sampling_interval_seconds),
        buzzer_enabled: form.buzzer_enabled,
        sms_target_number: form.sms_target_number || null,
      };
      const data = await adminApi.updateSettings(payload);
      setSettings(data.settings);
    } catch (err) {
      hasError = true;
      errorMsg += (err.response?.data?.message || 'Failed to update settings.');
    }

    setSaving(false);

    if (hasError) {
      setError(errorMsg);
    } else {
      setSuccess('Settings and Device Info updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };



  const handleToggleBuzzer = async () => {
    const newValue = !form.buzzer_enabled;
    setForm(prev => ({ ...prev, buzzer_enabled: newValue }));
    try {
      const data = await adminApi.updateSettings({ buzzer_enabled: newValue });
      setSettings(data.settings);
      setSuccess(newValue ? 'Buzzer enabled instantly.' : 'Buzzer disabled instantly.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.data?.message || 'Failed to toggle buzzer');
      // Revert on failure
      setForm(prev => ({ ...prev, buzzer_enabled: !newValue }));
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>;
  }

  const fields = [
    { key: 'sensor_height_cm', label: 'Sensor Height (cm)', desc: 'Distance from sensor to the riverbed', type: 'number', step: '0.01' },
    { key: 'warning_level_cm', label: 'Warning Level (cm)', desc: 'Water level (in cm) that triggers a WARNING', type: 'number', step: '0.01' },
    { key: 'critical_level_cm', label: 'Critical Level (cm)', desc: 'Water level (in cm) that triggers a CRITICAL alert', type: 'number', step: '0.01' },
    { key: 'sampling_interval_seconds', label: 'Sampling Interval (seconds)', desc: 'How often the device takes a reading', type: 'number' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-4 md:px-8 md:py-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Configure monitoring thresholds and device parameters</p>
      </div>

      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl p-4 flex items-center gap-2"><i className="bx bx-check-circle text-lg"></i>{success}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-4 flex items-center gap-2"><i className="bx bx-error-circle text-lg"></i>{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ── Device Info Section ──────────────────────────────── */}
        {device && (
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 md:p-7">
            <h2 className="text-lg font-bold text-white mb-1">Device Information</h2>
            <p className="text-slate-500 text-xs mb-5">Identify the physical sensor and its location on the dashboard.</p>
            
            <div className="divide-y divide-slate-700/50 border-t border-slate-700/50">
              
              {/* Device Name Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 md:py-5">
                <div>
                  <label className="text-white text-sm font-semibold block mb-0.5">Device Name</label>
                  <p className="text-slate-400 text-xs">Display name for the dashboard</p>
                </div>
                <div className="w-full md:w-72 shrink-0">
                  <input
                    type="text"
                    value={deviceForm.device_name ?? ''}
                    onChange={e => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:bg-slate-900 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Location Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 md:py-5">
                <div>
                  <label className="text-white text-sm font-semibold block mb-0.5">Location</label>
                  <p className="text-slate-400 text-xs">Physical location of the sensor</p>
                </div>
                <div className="w-full md:w-72 shrink-0">
                  <input
                    type="text"
                    value={deviceForm.location ?? ''}
                    onChange={e => setDeviceForm({ ...deviceForm, location: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:bg-slate-900 transition-colors"
                    required
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── System Thresholds Section ────────────────────────── */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 md:p-7">
          <h2 className="text-lg font-bold text-white mb-1">System Thresholds</h2>
          <p className="text-slate-500 text-xs mb-5">Configure water level warnings, alerts, and reading intervals.</p>
          
          <div className="divide-y divide-slate-700/50 border-t border-slate-700/50">
            
            {fields.map(f => (
              <div key={f.key} className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 md:py-5">
                <div>
                  <label className="text-white text-sm font-semibold block mb-0.5">{f.label}</label>
                  <p className="text-slate-400 text-xs">{f.desc}</p>
                </div>
                <div className="w-full md:w-32 shrink-0">
                  <input
                    type={f.type}
                    step={f.step}
                    value={form[f.key] ?? ''}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-4 py-2 text-sm text-center focus:border-violet-500 focus:outline-none focus:bg-slate-900 transition-colors"
                  />
                </div>
              </div>
            ))}

            {/* Buzzer Button Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 md:py-5">
              <div>
                <label className="text-white text-sm font-semibold block mb-0.5">Local Buzzer</label>
                <p className="text-slate-400 text-xs">Local device buzzer sounds during CRITICAL</p>
              </div>
              <div className="w-full md:w-auto shrink-0 flex items-center md:justify-end gap-2">

                <button
                  type="button"
                  onClick={handleToggleBuzzer}
                  className={`w-full md:w-32 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    form.buzzer_enabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {form.buzzer_enabled ? (
                    <><i className="bx bx-check text-base"></i> Enabled</>
                  ) : (
                    <><i className="bx bx-x text-base"></i> Disabled</>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Network & Alerts Section ─────────────────────────── */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 md:p-7">
          <h2 className="text-lg font-bold text-white mb-1">Network & Alerts</h2>
          <p className="text-slate-500 text-xs mb-5">Configure SMS alert number. Changes apply on next device sync.</p>
          
          <div className="divide-y divide-slate-700/50 border-t border-slate-700/50">
            
            {/* SMS Target Number */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-4 md:py-5">
              <div>
                <label className="text-white text-sm font-semibold block mb-0.5">SMS Alert Number</label>
                <p className="text-slate-400 text-xs">Phone number to receive SMS alerts (e.g. +639...)</p>
              </div>
              <div className="w-full md:w-72 shrink-0">
                <input
                  type="tel"
                  value={form.sms_target_number ?? ''}
                  onChange={e => setForm({ ...form, sms_target_number: e.target.value })}
                  placeholder="+639xxxxxxxxx"
                  className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:bg-slate-900 transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>

          </div>
        </div>

        {/* ── Submit Area ──────────────────────────────────────── */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto bg-gradient-to-r from-violet-600 to-purple-600 text-white px-8 py-2.5 rounded-xl text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <i className="bx bx-loader-alt animate-spin text-lg"></i> Saving...
              </span>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
