import StatusBadge from './StatusBadge';

export default function AlertCard({ alert }) {
  const severityIcons = {
    CRITICAL: '🚨',
    WARNING: '⚠️',
    INFO: 'ℹ️',
  };

  const bgStyles = {
    CRITICAL: 'border-red-500/30 bg-red-500/5',
    WARNING: 'border-amber-500/30 bg-amber-500/5',
    INFO: 'border-sky-500/30 bg-sky-500/5',
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className={`border rounded-xl p-4 transition-all duration-300 hover:scale-[1.01] ${bgStyles[alert.severity] || bgStyles.INFO}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl mt-0.5 shrink-0">{severityIcons[alert.severity] || '📢'}</span>
          <div className="min-w-0">
            <h4 className="text-white font-semibold text-sm truncate">{alert.title}</h4>
            <p className="text-slate-400 text-sm mt-1 line-clamp-2">{alert.message}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={alert.severity} />
              <StatusBadge status={alert.alert_type} />
              {alert.device && (
                <span className="text-xs text-slate-500">📍 {alert.device.device_name}</span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">{timeAgo(alert.created_at)}</span>
      </div>
    </div>
  );
}
