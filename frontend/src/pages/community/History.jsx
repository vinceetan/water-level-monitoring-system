import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatusBadge from '../../components/StatusBadge';
import { publicApi } from '../../api/api';

/* ── Helper: format a Date to YYYY-MM-DD ─────────────────────────── */
function fmt(d) {
  return d.toISOString().split('T')[0];
}

/* ── Helper: generate preset date range ──────────────────────────── */
function getPresetRange(preset) {
  const today = new Date();
  const to = fmt(today);

  switch (preset) {
    case 'today':
      return { from: to, to };
    case 'last7': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { from: fmt(d), to };
    }
    case 'last30': {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { from: fmt(d), to };
    }
    default:
      return { from: to, to };
  }
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Simplified Community History Page                                  */
/* ═══════════════════════════════════════════════════════════════════ */
export default function CommunityHistory() {
  // ── Filters ──
  const [datePreset, setDatePreset] = useState('today');

  // ── Data ──
  const [latestData, setLatestData] = useState(null);
  const [readings, setReadings] = useState([]);
  const [chartData, setChartData] = useState([]);

  // ── Loading ──
  const [loading, setLoading] = useState(true);

  /* ── Compute active date range ─────────────────────────────────── */
  const getDateRange = useCallback(() => {
    return getPresetRange(datePreset);
  }, [datePreset]);

  /* ── Fetch data ────────────────────────────────────────────────── */
  useEffect(() => {
    let isMounted = true;
    const { from, to } = getDateRange();
    setLoading(true);

    async function fetchData() {
      try {
        // Fetch the summary to get the overall latest reading status for the card
        // We use date_from / date_to to constrain it, or just let it fetch overall
        const summaryRes = await publicApi.getReadingSummary({ date_from: from, date_to: to });
        
        // Fetch paginated (just a small set of the most recent) for table and chart
        const historyRes = await publicApi.getReadingsPaginated({
          date_from: from,
          date_to: to,
          per_page: 500, // Fetch up to 500 for the chart
          sort_by: 'created_at',
          sort_dir: 'desc'
        });

        if (!isMounted) return;

        setLatestData(summaryRes.summary);
        
        const rawReadings = historyRes.readings || [];
        // The table only needs 15 readings
        setReadings(rawReadings.slice(0, 15));

        // The chart needs data sorted ascending (chronologically)
        const mappedChart = [...rawReadings].reverse().map(r => ({
          time: new Date(r.created_at).toLocaleString('en-PH', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }),
          water_level: parseFloat(r.water_level_cm) / 100,
          status: r.status,
        }));
        setChartData(mappedChart);

      } catch (err) {
        console.error("Failed to load history data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => { isMounted = false; };
  }, [getDateRange]);

  /* ── Trend component for the bottom summary ────────────────────── */
  function getTrendSummary() {
    if (readings.length === 0) return null;
    const trend = readings[0].trend; // Trend of the most recent reading

    if (trend === 'RISING') {
      return (
        <div className="flex items-center justify-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mt-6 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <i className="bx bx-up-arrow-alt text-2xl"></i>
          </div>
          <div>
            <h4 className="text-white font-medium text-lg">Water level is currently rising</h4>
            <p className="text-slate-400 text-sm">Based on recent sensor data.</p>
          </div>
        </div>
      );
    } else if (trend === 'FALLING') {
      return (
        <div className="flex items-center justify-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mt-6 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <i className="bx bx-down-arrow-alt text-2xl"></i>
          </div>
          <div>
            <h4 className="text-white font-medium text-lg">Water level is currently decreasing</h4>
            <p className="text-slate-400 text-sm">Based on recent sensor data.</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mt-6 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-slate-600/30 flex items-center justify-center text-slate-400">
            <i className="bx bx-right-arrow-alt text-2xl"></i>
          </div>
          <div>
            <h4 className="text-white font-medium text-lg">Water level is stable</h4>
            <p className="text-slate-400 text-sm">No significant changes detected.</p>
          </div>
        </div>
      );
    }
  }

  /* ── Chart tooltip ─────────────────────────────────────────────── */
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.[0]) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl">
          <p className="text-white font-semibold text-sm">{d.water_level.toFixed(2)} m</p>
          <p className="text-slate-400 text-xs mt-0.5">{d.time}</p>
          <div className="mt-1"><StatusBadge status={d.status} /></div>
        </div>
      );
    }
    return null;
  };

  /* ═══════════════════════════════════════════════════════════════ */
  /*  RENDER                                                        */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-4 md:px-8 md:py-8 font-sans">
      
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Water Level History</h1>
        <p className="text-slate-400 mt-2 text-xs md:text-base">View recent water level changes and monitor river conditions.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* ── Current Status Card (Hero Element) ─────────────── */}
          {readings.length > 0 ? (
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
              {/* Subtle background glow based on status */}
              <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none ${
                readings[0].status === 'CRITICAL' ? 'bg-red-500' :
                readings[0].status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              
              <div>
                <p className="text-slate-400 text-xs md:text-sm font-medium uppercase tracking-widest mb-1">Current Water Level</p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-4xl md:text-6xl font-black text-white">{(parseFloat(readings[0].water_level_cm) / 100).toFixed(2)} m</h2>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <StatusBadge status={readings[0].status} />
                <div className="text-slate-400 text-sm mt-2 md:mt-0 text-left md:text-right">
                  <p className="font-medium text-slate-300">Last Updated</p>
                  <p>{new Date(readings[0].created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-10 text-center shadow-lg">
              <i className="bx bx-water text-5xl text-slate-500 mb-3"></i>
              <h3 className="text-xl font-bold text-white">No water level history is available yet.</h3>
              <p className="text-slate-400 mt-2">Sensor data has not been recorded for this period.</p>
            </div>
          )}

          {/* ── Graph ────────────────────────────────────────────── */}
          {chartData.length > 0 && (
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 md:p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="text-white font-semibold text-lg">Water Level Trend</h3>
                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-700/50 w-full md:w-auto overflow-x-auto">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'last7', label: 'Last 7 Days' }
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => setDatePreset(p.key)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        datePreset === p.key
                          ? 'bg-cyan-500/20 text-cyan-400 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[280px] md:h-[320px] w-full mt-4 relative overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit=" m"
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="water_level"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fill="url(#trendGradient)"
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Recent Readings Table ────────────────────────────── */}
          {readings.length > 0 && (
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-5 border-b border-slate-700/50">
                <h3 className="text-white font-semibold">Recent Readings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/40">
                      <th className="text-left text-slate-400 font-medium px-5 py-3 border-b border-slate-700/50">Time</th>
                      <th className="text-left text-slate-400 font-medium px-5 py-3 border-b border-slate-700/50">Water Level</th>
                      <th className="text-left text-slate-400 font-medium px-5 py-3 border-b border-slate-700/50">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((r, i) => (
                      <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-300">
                          {new Date(r.created_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3.5 text-white font-semibold">
                          {(parseFloat(r.water_level_cm) / 100).toFixed(2)} m
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Trend Summary ────────────────────────────────────── */}
          {getTrendSummary()}
        </>
      )}
    </div>
  );
}
