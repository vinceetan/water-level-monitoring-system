import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatusBadge from '../../components/StatusBadge';
import { publicApi } from '../../api/api';

/* ── Helper: format a Date to YYYY-MM-DD ─────────────────────────── */
function fmt(d) {
  return d.toISOString().split('T')[0];
}

/* ── Helper: readable date ───────────────────────────────────────── */
function readableDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

/* ── Preset date ranges ──────────────────────────────────────────── */
function getPresetRange(preset) {
  const today = new Date();
  const to = fmt(today);

  switch (preset) {
    case 'today':
      return { from: to, to };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
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
/*  AdminHistory — Analytics Dashboard                               */
/* ═══════════════════════════════════════════════════════════════════ */
export default function AdminHistory() {
  // ── Filters ──
  const [datePreset, setDatePreset] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // ── Data ──
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [readings, setReadings] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });

  // ── Table ──
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  // ── Loading ──
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);

  /* ── Compute active date range ─────────────────────────────────── */
  const getDateRange = useCallback(() => {
    if (datePreset === 'custom') {
      return {
        from: customFrom || fmt(new Date()),
        to: customTo || fmt(new Date()),
      };
    }
    return getPresetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  /* ── Fetch summary cards ───────────────────────────────────────── */
  useEffect(() => {
    const { from, to } = getDateRange();
    setLoadingSummary(true);
    const params = { date_from: from, date_to: to };
    publicApi.getReadingSummary(params)
      .then(data => setSummary(data.summary))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [datePreset, customFrom, customTo, getDateRange]);

  /* ── Fetch chart data ──────────────────────────────────────────── */
  useEffect(() => {
    const { from, to } = getDateRange();
    setLoadingChart(true);
    const params = { date_from: from, date_to: to, limit: 500 };

    publicApi.getReadingsPaginated({ ...params, per_page: 500, sort_by: 'created_at', sort_dir: 'asc' })
      .then(data => {
        const mapped = (data.readings || []).map(r => ({
          time: new Date(r.created_at).toLocaleString('en-PH', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }),
          water_level: parseFloat(r.water_level_cm) / 100,
          status: r.status,
        }));
        setChartData(mapped);
      })
      .catch(() => setChartData([]))
      .finally(() => setLoadingChart(false));
  }, [datePreset, customFrom, customTo, getDateRange]);

  /* ── Fetch table data ──────────────────────────────────────────── */
  useEffect(() => {
    const { from, to } = getDateRange();
    setLoadingTable(true);
    const params = {
      date_from: from,
      date_to: to,
      sort_by: sortBy,
      sort_dir: sortDir,
      per_page: 20,
      page,
    };

    publicApi.getReadingsPaginated(params)
      .then(data => {
        setReadings(data.readings || []);
        setPagination(data.pagination || { current_page: 1, last_page: 1, per_page: 20, total: 0 });
      })
      .catch(() => { setReadings([]); })
      .finally(() => setLoadingTable(false));
  }, [datePreset, customFrom, customTo, sortBy, sortDir, page, getDateRange]);

  /* Reset page when filters change */
  useEffect(() => { setPage(1); }, [datePreset, customFrom, customTo]);

  /* ── Sort handler ──────────────────────────────────────────────── */
  function handleSort(col) {
    if (sortBy === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  /* ── Trend component ───────────────────────────────────────────── */
  function TrendBadge({ trend }) {
    const config = {
      RISING:  { icon: 'bx-up-arrow-alt',   text: 'Rising',  color: 'text-emerald-400' },
      FALLING: { icon: 'bx-down-arrow-alt',  text: 'Falling', color: 'text-red-400' },
      STABLE:  { icon: 'bx-right-arrow-alt', text: 'Stable',  color: 'text-slate-400' },
    };
    const c = config[trend] || config.STABLE;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.color}`}>
        <i className={`bx ${c.icon} text-sm`}></i>
        {c.text}
      </span>
    );
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

  /* ── Active date range for display ─────────────────────────────── */
  const { from: activeFrom, to: activeTo } = getDateRange();

  /* ── Presets ────────────────────────────────────────────────────── */
  const presets = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'custom', label: 'Custom Range' },
  ];

  /* ── Sort icon ─────────────────────────────────────────────────── */
  function SortIcon({ col }) {
    if (sortBy !== col) return <i className="bx bx-sort text-slate-600 ml-1"></i>;
    return sortDir === 'asc'
      ? <i className="bx bx-sort-up text-cyan-400 ml-1"></i>
      : <i className="bx bx-sort-down text-cyan-400 ml-1"></i>;
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  RENDER                                                        */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-4 md:px-8 md:py-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Water Level Analytics</h1>
        <p className="text-slate-400 mt-1 text-xs md:text-sm">Comprehensive historical data and trend analysis</p>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-col gap-4">
          {/* Date presets */}
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key)}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium transition-all ${
                  datePreset === p.key
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {datePreset === 'custom' && (
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-xs md:text-sm">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-xs md:text-sm">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-2 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          {
            label: 'Highest Level',
            value: loadingSummary ? '—' : `${summary?.highest ?? 0}m`,
            icon: 'bx-up-arrow-alt',
            iconBg: 'bg-red-500/15',
            iconColor: 'text-red-400',
          },
          {
            label: 'Lowest Level',
            value: loadingSummary ? '—' : `${summary?.lowest ?? 0}m`,
            icon: 'bx-down-arrow-alt',
            iconBg: 'bg-emerald-500/15',
            iconColor: 'text-emerald-400',
          },
          {
            label: 'Average Level',
            value: loadingSummary ? '—' : `${summary?.average ?? 0}m`,
            icon: 'bx-bar-chart-alt-2',
            iconBg: 'bg-cyan-500/15',
            iconColor: 'text-cyan-400',
          },
          {
            label: 'Total Readings',
            value: loadingSummary ? '—' : (summary?.total_readings ?? 0).toLocaleString(),
            icon: 'bx-data',
            iconBg: 'bg-violet-500/15',
            iconColor: 'text-violet-400',
          },
          {
            label: 'Latest Status',
            value: null,
            badge: true,
            status: summary?.latest_status ?? 'N/A',
            icon: 'bx-shield-quarter',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-400',
          },
        ].map((card, i) => (
          <div key={i} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 md:p-5 flex flex-col gap-2 md:gap-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] md:text-xs font-medium uppercase tracking-wider">{card.label}</span>
              <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <i className={`bx ${card.icon} text-sm md:text-lg ${card.iconColor}`}></i>
              </div>
            </div>
            {card.badge ? (
              <div className="mt-1">
                {loadingSummary ? (
                  <span className="text-slate-500 text-lg md:text-xl font-bold">—</span>
                ) : (
                  <StatusBadge status={card.status} />
                )}
              </div>
            ) : (
              <p className="text-lg md:text-2xl font-bold text-white">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Chart ──────────────────────────────────────────────── */}
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Water Level Trend</h3>
        <p className="text-slate-500 text-xs mb-5">Water level percentage over time</p>

        {loadingChart ? (
          <div className="flex items-center justify-center h-72">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="#475569"
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
                  strokeWidth={2.5}
                  fill="url(#analyticsGradient)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#0891b2', fill: '#06b6d4' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-72 text-slate-500 gap-3">
            <i className="bx bx-line-chart text-5xl text-slate-600"></i>
            <p className="text-sm">No historical data available</p>
          </div>
        )}

        <p className="text-slate-500 text-xs text-center mt-4">
          Showing data from: <span className="text-slate-300 font-medium">{readableDate(activeFrom)}</span>
          {activeFrom !== activeTo && (
            <> — <span className="text-slate-300 font-medium">{readableDate(activeTo)}</span></>
          )}
        </p>
      </div>

      {/* ── Readings Table ─────────────────────────────────────── */}
      <div className="md:bg-slate-800/60 md:backdrop-blur-sm md:border md:border-slate-700/50 md:rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="py-4 md:p-5 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Sensor Readings</h3>
            <p className="text-slate-500 text-xs mt-0.5">{pagination.total.toLocaleString()} total readings</p>
          </div>
        </div>

        {loadingTable ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : readings.length > 0 ? (
          <>
            {/* ── Mobile Card Layout (< 768px) ── */}
            <div className="block md:hidden">
              <div className="flex flex-col gap-3 pt-4">
                {readings.map((r, i) => {
                  const dt = new Date(r.created_at);
                  return (
                    <div key={r.id || i} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {(parseFloat(r.water_level_cm) / 100).toFixed(2)} m
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-400 text-xs">{dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-slate-600 text-xs">•</span>
                            <span className="text-slate-400 text-xs">{dt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge status={r.status} />
                          <TrendBadge trend={r.trend} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Desktop Table Layout (>= 768px) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th
                      className="text-left text-slate-400 font-medium px-3 md:px-5 py-2.5 md:py-3.5 cursor-pointer hover:text-white transition select-none"
                      onClick={() => handleSort('created_at')}
                    >
                      <span className="inline-flex items-center">Date <SortIcon col="created_at" /></span>
                    </th>
                    <th className="text-left text-slate-400 font-medium px-3 md:px-5 py-2.5 md:py-3.5">Time</th>
                    <th
                      className="text-left text-slate-400 font-medium px-3 md:px-5 py-2.5 md:py-3.5 cursor-pointer hover:text-white transition select-none"
                      onClick={() => handleSort('water_level_percent')}
                    >
                      <span className="inline-flex items-center whitespace-nowrap">Water Level <SortIcon col="water_level_percent" /></span>
                    </th>
                    <th
                      className="text-left text-slate-400 font-medium px-3 md:px-5 py-2.5 md:py-3.5 cursor-pointer hover:text-white transition select-none"
                      onClick={() => handleSort('status')}
                    >
                      <span className="inline-flex items-center">Status <SortIcon col="status" /></span>
                    </th>
                    <th className="text-left text-slate-400 font-medium px-3 md:px-5 py-2.5 md:py-3.5">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r, i) => {
                    const dt = new Date(r.created_at);
                    return (
                      <tr key={r.id || i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 md:px-5 py-2.5 md:py-3.5 text-slate-300 whitespace-nowrap">
                          {dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-3 md:px-5 py-2.5 md:py-3.5 text-slate-300 whitespace-nowrap">
                          {dt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 md:px-5 py-2.5 md:py-3.5 text-white font-semibold whitespace-nowrap">
                          {(parseFloat(r.water_level_cm) / 100).toFixed(2)} m
                        </td>
                        <td className="px-3 md:px-5 py-2.5 md:py-3.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-3 md:px-5 py-2.5 md:py-3.5">
                          <TrendBadge trend={r.trend} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
              <p className="text-slate-500 text-sm">
                Page <span className="text-slate-300 font-medium">{pagination.current_page}</span> of{' '}
                <span className="text-slate-300 font-medium">{pagination.last_page}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.current_page <= 1}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 bg-slate-800 border border-slate-700 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <i className="bx bx-chevron-left mr-1"></i>Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                  disabled={pagination.current_page >= pagination.last_page}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 bg-slate-800 border border-slate-700 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                >
                  Next<i className="bx bx-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <i className="bx bx-data text-5xl text-slate-600"></i>
            <p className="text-sm font-medium">No historical data available</p>
            <p className="text-xs text-slate-600">Try adjusting your filters or selecting a different date range.</p>
          </div>
        )}
      </div>
    </div>
  );
}
