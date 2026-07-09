export default function WaterLevelGauge({ percent = 0, status = 'SAFE', deviceName = 'Unknown', location = '', distance = null }) {
  const getStatusColor = () => {
    if (status === 'CRITICAL') return { bar: 'bg-red-500', glow: 'shadow-red-500/40', text: 'text-red-400' };
    if (status === 'WARNING') return { bar: 'bg-amber-500', glow: 'shadow-amber-500/40', text: 'text-amber-400' };
    return { bar: 'bg-emerald-500', glow: 'shadow-emerald-500/40', text: 'text-emerald-400' };
  };

  const color = getStatusColor();
  const level = Math.min(Math.max(percent || 0, 0), 100);

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{deviceName || 'Unknown Device'}</h3>
          <p className="text-slate-400 text-sm flex items-center gap-1 mb-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {location || 'No location'}
          </p>
          {distance !== null && (
            <p className="text-violet-400 text-xs font-semibold flex items-center gap-1 bg-violet-500/10 px-2 py-0.5 rounded-full w-fit">
              🛣️ {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
            </p>
          )}
        </div>
        <div className={`text-3xl font-bold ${color.text}`}>
          {level.toFixed(1)}%
        </div>
      </div>

      {/* Water level bar */}
      <div className="relative h-8 bg-slate-900/60 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className={`absolute inset-y-0 left-0 ${color.bar} rounded-full transition-all duration-1000 ease-out shadow-lg ${color.glow}`}
          style={{ width: `${level}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
        {/* Threshold markers */}
        <div className="absolute inset-y-0 left-[60%] w-px bg-amber-500/40" title="Warning" />
        <div className="absolute inset-y-0 left-[80%] w-px bg-red-500/40" title="Critical" />
      </div>

      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>0%</span>
        <span className="text-amber-500/60">Warning</span>
        <span className="text-red-500/60">Critical</span>
        <span>100%</span>
      </div>
    </div>
  );
}
