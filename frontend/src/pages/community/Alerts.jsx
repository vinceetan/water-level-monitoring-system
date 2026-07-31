import { useState, useEffect } from 'react';
import { publicApi } from '../../api/api';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helpers                                                           */
/* ═══════════════════════════════════════════════════════════════════ */

/** Severity badge with priority-specific colours & icons */
function PriorityBadge({ severity }) {
  const map = {
    INFO: {
      label: 'Information',
      icon: 'bx-info-circle',
      cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
    WARNING: {
      label: 'Warning',
      icon: 'bx-error',
      cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    CRITICAL: {
      label: 'Emergency',
      icon: 'bx-error-alt',
      cls: 'bg-red-500/15 text-red-400 border-red-500/30',
    },
  };
  const cfg = map[severity] || map.INFO;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <i className={`bx ${cfg.icon} text-sm`}></i>
      {cfg.label}
    </span>
  );
}

/** Accent colour helpers keyed by severity */
const accentMap = {
  INFO: {
    glow: 'bg-blue-500',
    stripe: 'from-blue-500 to-blue-400',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
  },
  WARNING: {
    glow: 'bg-amber-500',
    stripe: 'from-amber-500 to-amber-400',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
  },
  CRITICAL: {
    glow: 'bg-red-500',
    stripe: 'from-red-500 to-red-400',
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-400',
  },
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Component                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

export default function CommunityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [viewAlert, setViewAlert] = useState(null);

  /* ── Fetch active alerts ────────────────────────────────────────── */
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const data = await publicApi.getAlerts();
        // Sort newest first
        const sorted = (data.alerts || []).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setAlerts(sorted);
      } catch (err) {
        console.error('Failed to load announcements:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  /* ── Filter logic ───────────────────────────────────────────────── */
  const filtered = alerts.filter((a) => {
    if (priorityFilter !== 'ALL' && a.severity !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* ═══════════════════════════════════════════════════════════════ */
  /*  RENDER                                                        */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 py-4 md:px-8 md:py-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">
          Official Announcements
        </h1>
        <p className="hidden md:block text-slate-400 mt-1.5 text-sm">
          Stay informed with the latest advisories and emergency announcements from the Barangay.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* ── Summary Card ──────────────────────────────────── */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
              <i className="bx bx-broadcast text-xl text-cyan-400"></i>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                Active Announcements
              </p>
              <p className="text-white font-bold text-lg mt-0.5">
                {alerts.length > 0
                  ? `${alerts.length} Active Announcement${alerts.length !== 1 ? 's' : ''}`
                  : 'No active announcements.'}
              </p>
            </div>
          </div>

          {/* ── Filter & Search ───────────────────────────────── */}
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 md:p-5">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Priority filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-900/60 border border-slate-700/50 text-white text-sm rounded-xl px-4 py-2 focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="INFO">Information</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Emergency</option>
              </select>

              {/* Search */}
              <div className="relative flex-1">
                <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input
                  type="text"
                  placeholder="Search announcements by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl pl-10 pr-4 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ── Announcement Cards ────────────────────────────── */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {filtered.map((a) => {
                const accent = accentMap[a.severity] || accentMap.INFO;
                const issuedDate = new Date(a.created_at);

                return (
                  <div
                    key={a.id}
                    className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden relative hover:border-slate-600 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col"
                    onClick={() => setViewAlert(a)}
                  >
                    {/* Accent stripe at top */}
                    <div className={`h-1 bg-gradient-to-r ${accent.stripe}`} />

                    {/* Background glow */}
                    <div
                      className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] opacity-10 pointer-events-none group-hover:opacity-25 transition-opacity ${accent.glow}`}
                    />

                    {/* Card content */}
                    <div className="p-5 flex flex-col gap-3 flex-1 relative z-10">
                      {/* Priority badge */}
                      <div className="flex items-center gap-2">
                        <PriorityBadge severity={a.severity} />
                      </div>

                      {/* Title */}
                      <h3 className="text-white font-bold text-base md:text-lg leading-snug line-clamp-2 group-hover:text-slate-100 transition-colors">
                        {a.title}
                      </h3>

                      {/* Message preview */}
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 flex-1">
                        {a.message}
                      </p>

                      {/* Footer */}
                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-700/40">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">
                            Issued
                          </span>
                          <span className="text-slate-300 text-xs font-medium">
                            {issuedDate.toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {issuedDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Read More */}
                        <button
                          className="inline-flex items-center gap-1.5 text-cyan-400 text-xs font-semibold hover:text-cyan-300 transition-colors group/btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewAlert(a);
                          }}
                        >
                          Read More
                          <i className="bx bx-right-arrow-alt text-sm group-hover/btn:translate-x-0.5 transition-transform"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Empty State ──────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-5">
                <i className="bx bx-broadcast text-3xl text-slate-500"></i>
              </div>
              <h3 className="text-white text-lg font-bold">
                {alerts.length === 0
                  ? 'There are currently no official announcements.'
                  : 'No announcements match your filters.'}
              </h3>
              <p className="text-slate-500 text-sm mt-2 max-w-sm">
                {alerts.length === 0
                  ? 'Please check back later for updates.'
                  : 'Try adjusting your search or priority filter.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  VIEW DETAIL MODAL                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {viewAlert && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewAlert(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent stripe */}
            <div
              className={`h-1.5 rounded-t-2xl bg-gradient-to-r ${
                (accentMap[viewAlert.severity] || accentMap.INFO).stripe
              }`}
            />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <PriorityBadge severity={viewAlert.severity} />
                  <h2 className="text-white text-xl font-bold leading-snug">
                    {viewAlert.title}
                  </h2>
                </div>
                <button
                  onClick={() => setViewAlert(null)}
                  className="text-slate-400 hover:text-white transition p-1 shrink-0"
                >
                  <i className="bx bx-x text-2xl"></i>
                </button>
              </div>

              {/* Full Message */}
              <div>
                <label className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                  Message
                </label>
                <p className="text-slate-300 text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">
                  {viewAlert.message}
                </p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">
                    Issued Date
                  </label>
                  <p className="text-slate-300 text-sm">
                    {new Date(viewAlert.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">
                    Expiration
                  </label>
                  <p className="text-slate-300 text-sm">
                    {viewAlert.expires_at
                      ? new Date(viewAlert.expires_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'No expiration'}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setViewAlert(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors border border-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
