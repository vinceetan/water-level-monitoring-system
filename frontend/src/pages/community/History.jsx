import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatusBadge from '../../components/StatusBadge';
import { publicApi } from '../../api/api';

export default function CommunityHistory() {
  const [readings, setReadings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.getDevices().then(d => setDevices(d.devices || [])).catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const params = { hours, limit: 200 };
        if (selectedDevice) params.device_id = selectedDevice;
        const data = await publicApi.getReadingHistory(params);
        setReadings((data.readings || []).reverse());
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [selectedDevice, hours]);

  const chartData = readings.map(r => ({
    time: new Date(r.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
    water_level: parseFloat(r.water_level_percent),
    distance: parseFloat(r.distance_cm),
    status: r.status,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.[0]) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{d.water_level}%</p>
          <p className="text-slate-400 text-xs">Distance: {d.distance}cm</p>
          <p className="text-slate-400 text-xs">{d.time}</p>
          <StatusBadge status={d.status} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Water Level History</h1>
        <p className="text-slate-400 mt-1">Historical sensor readings and trends</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={selectedDevice}
          onChange={e => setSelectedDevice(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-2 focus:border-cyan-500 focus:outline-none"
        >
          <option value="">All Devices</option>
          {devices.map(d => (
            <option key={d.id} value={d.id}>{d.device_name}</option>
          ))}
        </select>
        {[6, 12, 24, 48].map(h => (
          <button
            key={h}
            onClick={() => setHours(h)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              hours === h
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white bg-slate-800 border border-slate-700'
            }`}
          >
            {h}h
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Water Level Trend</h3>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="water_level"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#waterGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500">
            <p>No readings found for this time range</p>
          </div>
        )}
      </div>

      {/* Reading Table */}
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-white font-semibold">Recent Readings ({readings.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Time</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Device</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Water Level</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Distance</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {readings.slice(-20).reverse().map(r => (
                <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-300">{new Date(r.created_at).toLocaleString('en-PH')}</td>
                  <td className="px-4 py-3 text-slate-300">{r.device?.device_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-white font-semibold">{parseFloat(r.water_level_percent).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-slate-300">{parseFloat(r.distance_cm).toFixed(1)} cm</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
