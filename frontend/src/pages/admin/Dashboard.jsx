import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { publicApi } from "../../api/api";
import DashboardHistoryPanel from "../../components/DashboardHistoryPanel";
import ManualAlertToast from "../../components/ManualAlertToast";

export default function AdminDashboard() {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setIsMobileOpen } = useOutletContext() || {};

  useEffect(() => {
    async function fetchData() {
      try {
        const [devData, alertData] = await Promise.all([
          publicApi.getLatestReadings(),
          publicApi.getAlerts(),
        ]);
        setDevices(devData.data || []);
        setAlerts(alertData.alerts || []);
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

  const highestDevice =
    devices.length > 0
      ? devices.reduce((prev, current) =>
          parseFloat(prev.water_level_percent) >
          parseFloat(current.water_level_percent)
            ? prev
            : current,
        )
      : { water_level_percent: 0, status: "SAFE" };

  const waterLevel = Math.min(
    Math.max(parseFloat(highestDevice.water_level_percent) || 0, 0),
    100,
  );
  const systemAlerts = alerts.filter((a) => a.alert_type === "SYSTEM");
  const criticalAlerts = systemAlerts.filter((a) => a.severity === "CRITICAL");
  const topAlert =
    criticalAlerts.length > 0
      ? criticalAlerts[0]
      : systemAlerts.length > 0
        ? systemAlerts[0]
        : null;

  // Current Date formatting
  const today = new Date();
  const dateOptions = {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const dateString = today.toLocaleDateString("en-US", dateOptions);

  return (
    <div className="flex flex-col lg:flex-row w-full h-auto lg:h-[calc(100vh-4rem)] gap-4 font-sans pb-24 lg:pb-0">
      {/* Manual Alert Toasts from Admin */}
      <ManualAlertToast alerts={alerts} />
      {/* LEFT SECTION - Water Gauge (Blue) */}
      <div className="w-auto self-stretch mx-3 lg:mx-0 lg:w-1/2 relative flex flex-col justify-between text-white px-4 py-4 md:px-8 md:py-6 overflow-hidden z-10 min-h-[500px] rounded-3xl shadow-2xl">
        {/* Top bar */}
        <div className="flex justify-between items-start opacity-90 z-40 relative w-full">
          {/* Left: Mobile Menu + Device Name */}
          <div className="flex items-start gap-3">
            {setIsMobileOpen && (
              <button
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden text-white/90 hover:text-white mt-0.5 shrink-0"
              >
                <i className="bx bx-menu text-2xl"></i>
              </button>
            )}
            <div className="flex flex-col text-left">
               <div className="text-lg font-bold tracking-wide text-white drop-shadow-md">
                  {highestDevice?.device_name || "Waiting for Device..."}
               </div>
               {highestDevice?.location && (
                 <div className="text-[13px] font-medium text-white/80 mt-0.5">
                   <i className="bx bx-map mr-1"></i>
                   {highestDevice.location}
                 </div>
               )}
            </div>
          </div>

          {/* Right: Date */}
          <div className="text-[13px] tracking-wide font-medium text-white/90 text-right mt-1 shrink-0">
            {dateString}
          </div>
        </div>

        {/* Center Circular Gauge */}
        <div className="flex-1 flex flex-col  mt-20 md:mt-0  md:-mt-15 items-center justify-center relative z-20">
          <div className="relative w-80 h-80 flex items-center justify-center p-3 group">
            {/* Background Circle */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2.5"
              />
            </svg>

            {/* Dynamic Stroke Circle (Foreground) */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-lg"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeDasharray="301.59"
                strokeDashoffset={301.59 - (301.59 * waterLevel) / 100}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>

            {/* Inner circle with water fill effect */}
            <div className="w-72 h-72 rounded-full relative overflow-hidden bg-[#3b6db4] shadow-inner border-[6px] border-transparent m-auto transition-transform duration-500 group-hover:scale-[1.02]">
              {/* Water layer 1 (Background wave) */}
              <div
                className="absolute bottom-0 left-0 w-full bg-[#4fc3f7]/80 transition-all duration-1000 ease-in-out"
                style={{ height: `${waterLevel}%` }}
              >
                <svg
                  className="absolute -top-10 w-[200%] h-20 text-[#4fc3f7]/80 animate-wave"
                  viewBox="0 0 240 50"
                  fill="currentColor"
                  preserveAspectRatio="none"
                  style={{
                    animationDirection: "reverse",
                    animationDuration: "4s",
                  }}
                >
                  <path d="M 0 25 Q 30 45 60 25 T 120 25 T 180 25 T 240 25 V 50 H 0 Z" />
                </svg>
              </div>

              {/* Water layer 2 (Foreground wave) */}
              <div
                className="absolute bottom-0 left-0 w-full bg-[#29b6f6] transition-all duration-1000 ease-in-out"
                style={{ height: `${waterLevel}%` }}
              >
                <svg
                  className="absolute -top-8 w-[200%] h-16 text-[#29b6f6] animate-wave"
                  viewBox="0 0 240 50"
                  fill="currentColor"
                  preserveAspectRatio="none"
                  style={{
                    animationDuration: "2.5s",
                  }}
                >
                  <path d="M 0 25 Q 30 10 60 25 T 120 25 T 180 25 T 240 25 V 50 H 0 Z" />
                </svg>
              </div>

              {/* Gauge Text (Absolute positioned over water) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center pointer-events-none">
                <span className="text-[13px] font-medium tracking-wide text-white/90 drop-shadow-md mb-1">
                  Water Level (%)
                </span>
                <span className="text-[5rem] font-bold tracking-tight leading-none drop-shadow-lg">
                  {waterLevel.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Overlay */}
        {topAlert && (
          <div className="absolute bottom-32 md:bottom-40 left-1/2 -translate-x-1/2 z-30 w-[85%] max-w-md">
            <div
              className={`backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-4 shadow-xl flex items-start gap-3 transition-all duration-300 ${topAlert.severity === "CRITICAL" ? "shadow-red-500/20 border-red-400/50 bg-red-500/20" : ""}`}
            >
              <span className="text-2xl mt-0.5">
                {topAlert.severity === "CRITICAL" ? "🚨" : "⚠️"}
              </span>
              <div>
                <h4 className="font-bold text-sm tracking-wide text-white">
                  {topAlert.severity === "CRITICAL"
                    ? "CRITICAL ALERT"
                    : "WARNING"}
                </h4>
                <p className="text-white/90 text-[13px] mt-1 leading-snug font-medium drop-shadow-sm">
                  {topAlert.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom stats */}
        <div className="flex justify-center md:mt-0 mt-15 items-center opacity-100 mb-6 z-20">
          <div className="px-10 flex flex-col items-center border-r border-white/30">
            <div className="flex items-center gap-2 text-[22px] font-bold ">
              <svg
                className="w-5 h-5 opacity-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              100%
            </div>
            <span className="text-[11px] font-medium tracking-wider text-white/80 uppercase mt-1">
              Threshold
            </span>
          </div>
          <div className="px-10 flex flex-col items-center">
            <div className="flex items-center gap-2 text-[22px] font-bold drop-shadow-sm">
              <i className="bx bx-water text-xl opacity-90"></i>
              {((highestDevice?.water_level_cm || 0) / 100).toFixed(2)}m
            </div>
            <span className="text-[11px] font-medium tracking-wider text-white/80 uppercase mt-1">
              Water Level
            </span>
          </div>
        </div>
      </div>

      <DashboardHistoryPanel backLink="/" />
    </div>
  );
}
