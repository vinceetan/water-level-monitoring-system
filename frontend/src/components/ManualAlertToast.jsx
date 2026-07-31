import { useState, useEffect } from "react";

/**
 * Displays the latest active MANUAL announcement from admin as a sleek toast
 * positioned bottom-right on desktop and full-width bottom on mobile.
 */
export default function ManualAlertToast({ alerts = [] }) {
  const [dismissed, setDismissed] = useState([]);
  const [visible, setVisible] = useState(false);

  const manualAlerts = alerts.filter(
    (a) => a.alert_type === "MANUAL" && a.is_active && !dismissed.includes(a.id)
  );

  // Only show the latest one
  const latestAlert = manualAlerts.length > 0 ? manualAlerts[0] : null;

  useEffect(() => {
    if (latestAlert) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [latestAlert?.id]);

  const handleDismiss = () => {
    if (!latestAlert) return;
    setVisible(false);
    setTimeout(() => {
      setDismissed((prev) => [...prev, latestAlert.id]);
    }, 300);
  };

  if (!latestAlert) return null;

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return {
          gradient: "from-red-950/95 via-red-900/90 to-slate-900/95",
          iconBg: "bg-red-500/20",
          iconColor: "text-red-400",
          icon: "bx-error",
          accentBorder: "border-l-red-500",
        };
      case "WARNING":
        return {
          gradient: "from-amber-950/95 via-amber-900/90 to-slate-900/95",
          iconBg: "bg-amber-500/20",
          iconColor: "text-amber-400",
          icon: "bx-error-circle",
          accentBorder: "border-l-amber-500",
        };
      default:
        return {
          gradient: "from-sky-950/95 via-sky-900/90 to-slate-900/95",
          iconBg: "bg-sky-500/20",
          iconColor: "text-sky-400",
          icon: "bx-info-circle",
          accentBorder: "border-l-sky-500",
        };
    }
  };

  const s = getSeverityConfig(latestAlert.severity);

  return (
    <div className="fixed bottom-4 right-0 md:right-4 z-[100] w-full md:w-[400px] px-3 md:px-0 pointer-events-none">
      <div
        className={`pointer-events-auto bg-gradient-to-r ${s.gradient} border border-slate-700/40 ${s.accentBorder} border-l-[3px] rounded-xl px-4 py-3.5 shadow-2xl shadow-black/50 backdrop-blur-xl flex items-center gap-3 transition-all duration-300 ease-out ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        }`}
      >
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}
        >
          <i className={`bx ${s.icon} text-xl ${s.iconColor}`}></i>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[13px] text-white leading-tight truncate">
            {latestAlert.title}
          </h4>
          <p className="text-slate-400 text-[12px] mt-0.5 leading-snug line-clamp-1">
            {latestAlert.message}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 p-0.5"
          aria-label="Dismiss announcement"
        >
          <i className="bx bx-x text-xl"></i>
        </button>
      </div>
    </div>
  );
}
