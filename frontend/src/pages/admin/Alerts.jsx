import { useState, useEffect, useCallback } from "react";
import StatusBadge from "../../components/StatusBadge";
import { publicApi, adminApi } from "../../api/api";

/* ═══════════════════════════════════════════════════════════════════ */
/*  Helpers                                                           */
/* ═══════════════════════════════════════════════════════════════════ */

/** Derive display status from backend fields */
function deriveStatus(alert) {
  if (!alert.is_active) return "RESOLVED";
  if (alert.expires_at && new Date(alert.expires_at) < new Date())
    return "EXPIRED";
  return "ACTIVE";
}

/** Status badge colour mapping */
function AnnouncementStatusBadge({ status }) {
  const styles = {
    ACTIVE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    RESOLVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    EXPIRED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.EXPIRED}`}
    >
      {status}
    </span>
  );
}

/** Severity badge with correct priority labels */
function SeverityBadge({ severity }) {
  const map = {
    INFO: {
      label: "Information",
      cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    },
    WARNING: {
      label: "Warning",
      cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
    CRITICAL: {
      label: "Emergency",
      cls: "bg-red-500/15 text-red-400 border-red-500/30",
    },
  };
  const cfg = map[severity] || map.INFO;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  AdminAlerts                                                       */
/* ═══════════════════════════════════════════════════════════════════ */
export default function AdminAlerts() {
  /* ── State ──────────────────────────────────────────────────────── */
  const [allAlerts, setAllAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [viewAlert, setViewAlert] = useState(null);
  const [confirmResolve, setConfirmResolve] = useState(null);

  // Create form
  const [form, setForm] = useState({
    title: "",
    message: "",
    severity: "WARNING",
    expirationMode: "none", // 'none' | 'custom'
    expires_at: "",
  });
  const [saving, setSaving] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  /* ── Fetch ──────────────────────────────────────────────────────── */
  const fetchAlerts = useCallback(async () => {
    try {
      const data = await publicApi.getAlertHistory({ limit: 200 });
      setAllAlerts(
        (data.alerts || []).map((a) => ({ ...a, _status: deriveStatus(a) })),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /* ── Filtered & paginated data ──────────────────────────────────── */
  const filtered = allAlerts.filter((a) => {
    if (statusFilter !== "ALL" && a._status !== statusFilter) return false;
    if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;

    // Date filter
    if (dateFilter !== "ALL") {
      const createdAt = new Date(a.created_at);
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      if (dateFilter === "today" && createdAt < startOfToday) return false;
      if (dateFilter === "last7") {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 6);
        if (createdAt < d) return false;
      }
      if (dateFilter === "last30") {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 29);
        if (createdAt < d) return false;
      }
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      if (
        !a.title.toLowerCase().includes(q) &&
        !a.message.toLowerCase().includes(q)
      )
        return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, severityFilter, dateFilter, search]);

  /* ── Summary card counts ────────────────────────────────────────── */
  const counts = {
    total: allAlerts.length,
    active: allAlerts.filter((a) => a._status === "ACTIVE").length,
    resolved: allAlerts.filter((a) => a._status === "RESOLVED").length,
    expired: allAlerts.filter((a) => a._status === "EXPIRED").length,
  };

  /* ── Handlers ───────────────────────────────────────────────────── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        message: form.message,
        severity: form.severity,
      };
      if (form.expirationMode === "custom" && form.expires_at) {
        payload.expires_at = new Date(form.expires_at).toISOString();
      }
      await adminApi.createAlert(payload);
      setShowCreate(false);
      setForm({
        title: "",
        message: "",
        severity: "WARNING",
        expirationMode: "none",
        expires_at: "",
      });
      fetchAlerts();
    } catch (err) {
      alert(err.data?.message || "Failed to create announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await adminApi.deleteAlert(id);
      setConfirmResolve(null);
      fetchAlerts();
    } catch (err) {
      alert(err.data?.message || "Failed");
    }
  };

  /* ═══════════════════════════════════════════════════════════════ */
  /*  RENDER                                                        */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-4 md:px-8 md:py-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Announcements
          </h1>
          <p className="hidden md:block text-slate-400 mt-1">
            Create and manage official announcements for the community.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r cursor-pointer from-violet-600 to-purple-600 text-white px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl text-xs md:text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20 flex items-center gap-1.5 md:gap-2 shrink-0"
        >
          <i className="bx bx-plus text-base md:text-lg"></i>
          <span>
            Create<span className="hidden md:inline"> Announcement</span>
          </span>
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="">
        <div className="flex flex-wrap gap-3">
          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-700 text-white text-xs md:text-sm rounded-xl pl-3 pr-8 md:pl-4 md:pr-10 py-1.5 md:py-2 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 focus:outline-none transition-all cursor-pointer hover:border-slate-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RESOLVED">Resolved</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <i className="bx bx-chevron-down absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm md:text-base"></i>
          </div>

          {/* Severity */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-700 text-white text-xs md:text-sm rounded-xl pl-3 pr-8 md:pl-4 md:pr-10 py-1.5 md:py-2 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 focus:outline-none transition-all cursor-pointer hover:border-slate-600"
            >
              <option value="ALL">All Priorities</option>
              <option value="INFO">Information</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Emergency</option>
            </select>
            <i className="bx bx-chevron-down absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm md:text-base"></i>
          </div>

          {/* Date */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'All Time' },
              { key: 'last7', label: 'Last 7 Days' },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setDateFilter(p.key)}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium transition-all ${
                  dateFilter === p.key
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-500/10'
                    : 'text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-[300px] md:flex-none">
            <i className="bx bx-search absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm md:text-base"></i>
            <input
              type="text"
              placeholder="Search by title or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl pl-9 pr-3 py-1.5 md:pl-10 md:pr-4 md:py-2 text-xs md:text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="xl:bg-slate-800/60 xl:backdrop-blur-sm xl:border xl:border-slate-700/50 xl:rounded-2xl overflow-hidden">
          {paginated.length > 0 ? (
            <>
              {/* ── Card Layout (< 1280px) ── */}
              <div className="block xl:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {paginated.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setViewAlert(a)}
                      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:border-slate-600 transition-all duration-300 relative overflow-hidden group/card"
                    >
                      {/* Subtle background glow */}
                      <div
                        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none transition-opacity group-hover/card:opacity-40 ${
                          a._status === "ACTIVE"
                            ? "bg-emerald-500"
                            : a._status === "EXPIRED"
                              ? "bg-rose-500"
                              : "bg-slate-500"
                        }`}
                      />

                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AnnouncementStatusBadge status={a._status} />
                            <SeverityBadge severity={a.severity} />
                          </div>
                          <p className="text-white font-bold text-[15px] leading-tight line-clamp-2">
                            {a.title}
                          </p>
                          <p className="text-slate-400 text-[13px] mt-1.5 leading-snug line-clamp-2">
                            {a.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between mt-2 pt-3 border-t border-slate-700/50 relative z-10">
                        <div className="flex flex-col gap-1">
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mr-1.5">
                              Created:
                            </span>
                            <span className="text-slate-300 text-[11px] font-medium">
                              {new Date(a.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mr-1.5">
                              Expires:
                            </span>
                            <span className="text-slate-300 text-[11px] font-medium">
                              {a.expires_at
                                ? new Date(a.expires_at).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )
                                : "No expiration"}
                            </span>
                          </div>
                        </div>

                        {a._status === "ACTIVE" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmResolve(a);
                            }}
                            className="shrink-0 group relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40"
                          >
                            <div className="flex h-full w-full items-center justify-center gap-1.5 rounded-[7px] bg-slate-900/80 px-3 py-1.5 backdrop-blur-sm transition-all group-hover:bg-slate-900/40">
                              <i className="bx bx-check-circle text-emerald-400 text-sm group-hover:scale-110 transition-transform"></i>
                              <span className="text-emerald-100 text-xs font-semibold tracking-wide">
                                Resolve
                              </span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Desktop Table Layout (>= 1280px) ── */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-900/40">
                      <th className="text-left text-slate-400 font-semibold uppercase tracking-wider text-[10px] md:text-xs px-3 md:px-5 py-3 md:py-4">
                        Title
                      </th>
                      <th className="text-left text-slate-400 font-semibold uppercase tracking-wider text-[10px] md:text-xs px-3 md:px-5 py-3 md:py-4">
                        Status
                      </th>
                      <th className="text-left text-slate-400 font-semibold uppercase tracking-wider text-[10px] md:text-xs px-3 md:px-5 py-3 md:py-4 hidden md:table-cell">
                        Priority
                      </th>
                      <th className="text-left text-slate-400 font-semibold uppercase tracking-wider text-[10px] md:text-xs px-3 md:px-5 py-3 md:py-4 hidden lg:table-cell">
                        Created
                      </th>
                      <th className="text-left text-slate-400 font-semibold uppercase tracking-wider text-[10px] md:text-xs px-3 md:px-5 py-3 md:py-4 hidden lg:table-cell">
                        Expiration
                      </th>
                      <th className="text-left text-slate-400 font-semibold uppercase tracking-wider text-[10px] md:text-xs px-3 md:px-5 py-3 md:py-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {paginated.map((a) => (
                      <tr
                        key={a.id}
                        onClick={() => setViewAlert(a)}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-3 md:px-5 py-3 md:py-4 max-w-[200px] md:max-w-[250px]">
                          <p className="text-white font-medium text-[11px] md:text-sm truncate">
                            {a.title}
                          </p>
                          <p className="text-slate-500 text-[10px] md:text-xs mt-0.5 truncate">
                            {a.message}
                          </p>
                        </td>
                        <td className="px-3 md:px-5 py-3 md:py-4">
                          <AnnouncementStatusBadge status={a._status} />
                        </td>
                        <td className="px-3 md:px-5 py-3 md:py-4 hidden md:table-cell">
                          <SeverityBadge severity={a.severity} />
                        </td>
                        <td className="px-3 md:px-5 py-3 md:py-4 text-slate-400 text-[10px] md:text-xs whitespace-nowrap hidden lg:table-cell">
                          {new Date(a.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 md:px-5 py-3 md:py-4 text-slate-400 text-[10px] md:text-xs whitespace-nowrap hidden lg:table-cell">
                          {a.expires_at ? (
                            new Date(a.expires_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          ) : (
                            <span className="text-slate-600">
                              No expiration
                            </span>
                          )}
                        </td>
                        <td className="px-3 md:px-5 py-3 md:py-4">
                          {a._status === "ACTIVE" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmResolve(a);
                              }}
                              className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40"
                            >
                              <div className="flex items-center justify-center gap-1.5 rounded-[7px] bg-slate-900/80 px-3 py-1.5 backdrop-blur-sm transition-all group-hover:bg-slate-900/40">
                                <i className="bx bx-check text-emerald-300 text-sm"></i>
                                <span className="text-emerald-100 text-xs font-semibold tracking-wide">Resolve</span>
                              </div>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700/50">
                  <p className="text-slate-500 text-sm">
                    Page{" "}
                    <span className="text-slate-300 font-medium">{page}</span>{" "}
                    of{" "}
                    <span className="text-slate-300 font-medium">
                      {totalPages}
                    </span>
                    <span className="text-slate-600 ml-2">
                      ({filtered.length} results)
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 bg-slate-800 border border-slate-700 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <i className="bx bx-chevron-left mr-1"></i>Previous
                    </button>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 bg-slate-800 border border-slate-700 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Next<i className="bx bx-chevron-right ml-1"></i>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <i className="bx bx-message-alt-x text-5xl text-slate-600"></i>
              <p className="text-sm font-medium">No announcements found</p>
              <p className="text-xs text-slate-600">
                Try adjusting your filters or create a new announcement.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ CREATE MODAL ═══════ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreate}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              <i className="bx bx-message-alt-add text-violet-400"></i>
              Create Announcement
            </h2>

            {/* Title */}
            <div>
              <label className="text-slate-400 text-sm block mb-1.5">
                Title
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Enter announcement title..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none placeholder-slate-600"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-slate-400 text-sm block mb-1.5">
                Message
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Enter your announcement message..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none h-32 resize-none placeholder-slate-600"
                required
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm block mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    key: "INFO",
                    label: "Information",
                    active: "bg-blue-500/20 text-blue-400 border-blue-500/40",
                  },
                  {
                    key: "WARNING",
                    label: "Warning",
                    active:
                      "bg-amber-500/20 text-amber-400 border-amber-500/40",
                  },
                  {
                    key: "CRITICAL",
                    label: "Emergency",
                    active: "bg-red-500/20 text-red-400 border-red-500/40",
                  },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setForm({ ...form, severity: s.key })}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      form.severity === s.key
                        ? s.active
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="text-slate-400 text-sm block mb-1.5">
                Expiration
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, expirationMode: "none", expires_at: "" })
                  }
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    form.expirationMode === "none"
                      ? "bg-violet-500/20 text-violet-400 border-violet-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  No Expiration
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, expirationMode: "custom" })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    form.expirationMode === "custom"
                      ? "bg-violet-500/20 text-violet-400 border-violet-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  Custom Date & Time
                </button>
              </div>
              {form.expirationMode === "custom" && (
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm({ ...form, expires_at: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                  required
                />
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
              >
                {saving ? "Publishing..." : "Publish Announcement"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════ VIEW MODAL ═══════ */}
      {viewAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-xl font-bold">
                Announcement Details
              </h2>
              <button
                onClick={() => setViewAlert(null)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <i className="bx bx-x text-2xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                  Title
                </label>
                <p className="text-white text-lg font-semibold mt-1">
                  {viewAlert.title}
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                  Message
                </label>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed whitespace-pre-wrap">
                  {viewAlert.message}
                </p>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1.5">
                    Status
                  </label>
                  <AnnouncementStatusBadge status={viewAlert._status} />
                </div>
                <div>
                  <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1.5">
                    Priority
                  </label>
                  <SeverityBadge severity={viewAlert.severity} />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">
                    Created
                  </label>
                  <p className="text-slate-300 text-sm">
                    {new Date(viewAlert.created_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">
                    Expiration
                  </label>
                  <p className="text-slate-300 text-sm">
                    {viewAlert.expires_at
                      ? new Date(viewAlert.expires_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )
                      : "No expiration"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewAlert(null)}
              className="w-full bg-slate-800 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ═══════ RESOLVE CONFIRMATION ═══════ */}
      {confirmResolve && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <i className="bx bx-check-circle text-3xl text-emerald-400"></i>
            </div>
            <div>
              <h3 className="text-white text-lg font-bold">
                Resolve Announcement?
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Are you sure you want to resolve this announcement? It will be
                removed from the community page but remain in admin history.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleResolve(confirmResolve.id)}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-500 transition"
              >
                Resolve
              </button>
              <button
                onClick={() => setConfirmResolve(null)}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
