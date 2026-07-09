export default function StatusBadge({ status }) {
  const styles = {
    SAFE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    WARNING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
    online: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    offline: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    INFO: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    MANUAL: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    SYSTEM: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.offline}`}>
      {status === 'online' && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse" />}
      {status}
    </span>
  );
}
