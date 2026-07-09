import { useState, useEffect } from 'react';
import AlertCard from '../../components/AlertCard';
import { publicApi } from '../../api/api';

export default function CommunityAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const [activeData, historyData] = await Promise.all([
          publicApi.getAlerts(),
          publicApi.getAlertHistory({ limit: 50 }),
        ]);
        setAlerts(activeData.alerts || []);
        setHistory(historyData.alerts || []);
      } catch (err) {
        console.error('Failed to load alerts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const displayAlerts = tab === 'active' ? alerts : history;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Alerts</h1>
        <p className="text-slate-400 mt-1">Community safety notifications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['active', 'history'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {t === 'active' ? `Active (${alerts.length})` : `History (${history.length})`}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {displayAlerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
        {displayAlerts.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-lg font-medium">No {tab} alerts</p>
            <p className="text-sm mt-1">Everything looks good!</p>
          </div>
        )}
      </div>
    </div>
  );
}
