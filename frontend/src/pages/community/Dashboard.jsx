import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { publicApi } from "../../api/api";
import DashboardHistoryPanel from "../../components/DashboardHistoryPanel";
import DashboardGaugePanel from "../../components/DashboardGaugePanel";
import ManualAlertToast from "../../components/ManualAlertToast";

export default function CommunityDashboard() {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setIsMobileOpen } = useOutletContext() || {};

  useEffect(() => {
    async function fetchData() {
      try {
        const [devData, alertData, settingsData] = await Promise.all([
          publicApi.getLatestReadings(),
          publicApi.getAlerts(),
          publicApi.getSettings(),
        ]);
        setDevices(devData.data || []);
        setAlerts(alertData.alerts || []);
        setSettings(settingsData.settings || null);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full h-auto lg:h-[calc(100vh-4rem)] gap-4 font-sans pb-24 lg:pb-0">
      <ManualAlertToast alerts={alerts} />
      {!loading && (
        <DashboardGaugePanel
          devices={devices}
          alerts={alerts}
          settings={settings}
          setIsMobileOpen={setIsMobileOpen}
          panelClassName="mx-1"
        />
      )}
      {loading && (
        <div className="w-auto self-stretch mx-1 lg:mx-0 lg:w-1/2 min-h-[500px] rounded-3xl bg-slate-800 animate-pulse" />
      )}
      <DashboardHistoryPanel backLink="/" />
    </div>
  );
}
