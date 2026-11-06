import useWaterLevelUnit from "../hooks/useWaterLevelUnit";
import {
  DISPLAY_UNITS,
  formatLevelFromCm,
  formatNumberFromCm,
  gaugeTheme,
  isMeasurementAvailable,
  measurementGaugeState,
  normalizeFloatSwitchStatus,
  overallAlertState,
  unitSuffix,
} from "../utils/waterLevel";

function pickPrimaryDevice(devices) {
  const withReading = (devices || []).filter(
    (d) => d.water_level_cm !== null && d.water_level_cm !== undefined && d.water_level_cm !== "",
  );
  const pool = withReading.length > 0 ? withReading : devices || [];
  if (pool.length === 0) return null;
  return pool.reduce((prev, current) =>
    parseFloat(prev.water_level_percent) > parseFloat(current.water_level_percent)
      ? prev
      : current,
  );
}

function floatLabel(status) {
  if (status === "activated") return "Activated";
  if (status === "inactive") return "Inactive";
  return "Unknown";
}

export default function DashboardGaugePanel({
  device,
  devices,
  alerts = [],
  settings,
  setIsMobileOpen,
  panelClassName = "mx-3",
}) {
  const [unit, setUnit] = useWaterLevelUnit();
  const selected = device || pickPrimaryDevice(devices);
  const measurementAvailable = isMeasurementAvailable(selected);
  const waterLevelCm = measurementAvailable ? parseFloat(selected.water_level_cm) : null;
  const warningCm = parseFloat(settings?.warning_level_cm);
  const criticalCm = parseFloat(settings?.critical_level_cm);
  const gaugeState = measurementAvailable
    ? Number.isFinite(warningCm) && Number.isFinite(criticalCm)
      ? measurementGaugeState(waterLevelCm, warningCm, criticalCm)
      : selected?.status || "UNAVAILABLE"
    : "UNAVAILABLE";
  const floatStatus = normalizeFloatSwitchStatus(selected?.float_switch_status);
  const overall = overallAlertState({
    measurementState: gaugeState,
    floatSwitchStatus: floatStatus,
    measurementAvailable,
  });
  const theme = gaugeTheme(gaugeState);
  const percent = measurementAvailable
    ? Math.min(Math.max(parseFloat(selected.water_level_percent) || 0, 0), 100)
    : null;

  const systemAlerts = alerts.filter((a) => a.alert_type === "SYSTEM");
  const floatAlert = systemAlerts.find(
    (a) => a.title === "CRITICAL: Float Switch Activated" && a.severity === "CRITICAL",
  );
  const waterCritical = systemAlerts.find(
    (a) => a.severity === "CRITICAL" && a.title !== "CRITICAL: Float Switch Activated",
  );
  const waterWarning = systemAlerts.find((a) => a.severity === "WARNING");
  const topAlert =
    floatStatus === "activated" || floatAlert
      ? floatAlert || {
          severity: "CRITICAL",
          message:
            "Critical alert triggered by the float switch. The continuous water-level measurement was not changed.",
        }
      : waterCritical || waterWarning || null;

  const today = new Date();
  const dateString = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const overallStyles = {
    CRITICAL: "bg-red-600/90 border-red-300/60",
    WARNING: "bg-amber-500/90 border-amber-200/50",
    SAFE: "bg-sky-600/80 border-white/30",
    UNAVAILABLE: "bg-slate-600/90 border-white/20",
  };

  return (
    <div
      className={`w-auto self-stretch ${panelClassName} lg:mx-0 lg:w-1/2 relative flex flex-col justify-between text-white px-4 py-4 md:px-8 md:py-6 overflow-hidden z-10 min-h-[500px] rounded-3xl shadow-2xl ${theme.panel}`}
    >
      <div className="flex justify-between items-start opacity-90 z-40 relative w-full">
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
              {selected?.device_name || "Waiting for Device..."}
            </div>
            {selected?.location && (
              <div className="text-[13px] font-medium text-white/80 mt-0.5">
                <i className="bx bx-map mr-1"></i>
                {selected.location}
              </div>
            )}
          </div>
        </div>
        <div className="text-[13px] tracking-wide font-medium text-white/90 text-right mt-1 shrink-0">
          {dateString}
        </div>
      </div>

      <div className="flex-1 flex flex-col mt-16 md:mt-0 items-center justify-center relative z-20 gap-3">
        <div className="relative w-80 h-80 flex items-center justify-center p-3 group">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
          </svg>
          <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-lg" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeDasharray="301.59"
              strokeDashoffset={301.59 - (301.59 * (percent ?? 0)) / 100}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div
            className={`w-72 h-72 rounded-full relative overflow-hidden ${theme.inner} shadow-inner border-[6px] border-transparent m-auto transition-transform duration-500 group-hover:scale-[1.02]`}
          >
            {measurementAvailable && (
              <>
                <div
                  className={`absolute bottom-0 left-0 w-full ${theme.waveBack} transition-all duration-1000 ease-in-out`}
                  style={{ height: `${percent}%` }}
                >
                  <svg
                    className={`absolute -top-10 w-[200%] h-20 ${theme.waveBackText} animate-wave`}
                    viewBox="0 0 240 50"
                    fill="currentColor"
                    preserveAspectRatio="none"
                    style={{ animationDirection: "reverse", animationDuration: "4s" }}
                  >
                    <path d="M 0 25 Q 30 45 60 25 T 120 25 T 180 25 T 240 25 V 50 H 0 Z" />
                  </svg>
                </div>
                <div
                  className={`absolute bottom-0 left-0 w-full ${theme.waveFront} transition-all duration-1000 ease-in-out`}
                  style={{ height: `${percent}%` }}
                >
                  <svg
                    className={`absolute -top-8 w-[200%] h-16 ${theme.waveFrontText} animate-wave`}
                    viewBox="0 0 240 50"
                    fill="currentColor"
                    preserveAspectRatio="none"
                    style={{ animationDuration: "2.5s" }}
                  >
                    <path d="M 0 25 Q 30 10 60 25 T 120 25 T 180 25 T 240 25 V 50 H 0 Z" />
                  </svg>
                </div>
              </>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center pointer-events-none px-4">
              <span className="text-[13px] font-medium tracking-wide text-white/90 drop-shadow-md mb-1">
                {measurementAvailable ? `Water Level (${unitSuffix(unit)})` : "Water Level"}
              </span>
              <span className="text-[3.4rem] font-bold tracking-tight leading-none drop-shadow-lg">
                {measurementAvailable ? formatNumberFromCm(waterLevelCm, unit) : "—"}
              </span>
              {measurementAvailable ? (
                <span className="text-sm font-medium text-white/85 mt-1">
                  {percent.toFixed(0)}% · {theme.label}
                </span>
              ) : (
                <span className="text-sm font-medium text-white/85 mt-2">
                  Continuous sensor unavailable
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {topAlert && (
        <div className="absolute bottom-36 md:bottom-44 left-1/2 -translate-x-1/2 z-30 w-[85%] max-w-md">
          <div
            className={`backdrop-blur-xl border rounded-2xl p-4 shadow-xl flex items-start gap-3 ${
              topAlert.severity === "CRITICAL"
                ? "shadow-red-500/20 border-red-400/50 bg-red-500/20"
                : "bg-white/20 border-white/30"
            }`}
          >
            <span className="text-2xl mt-0.5">{topAlert.severity === "CRITICAL" ? "🚨" : "⚠️"}</span>
            <div>
              <h4 className="font-bold text-sm tracking-wide text-white">
                {floatStatus === "activated" && topAlert.severity === "CRITICAL"
                  ? "CRITICAL ALERT — FLOAT SWITCH"
                  : topAlert.severity === "CRITICAL"
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

      <div className="flex flex-col gap-4 mb-4 z-20">
        <div className="flex justify-center items-center">
          <div className="px-6 flex flex-col items-center border-r border-white/30">
            <div
              className={`px-3 py-1 rounded-full text-sm font-bold border ${overallStyles[overall] || overallStyles.UNAVAILABLE}`}
            >
              {overall}
            </div>
            <span className="text-[11px] font-medium tracking-wider text-white/80 uppercase mt-1">
              Overall Alert
            </span>
          </div>
          <div className="px-6 flex flex-col items-center border-r border-white/30">
            <div className="flex items-center gap-2 text-[18px] font-bold drop-shadow-sm">
              <i className="bx bx-water text-xl opacity-90"></i>
              {measurementAvailable ? formatLevelFromCm(waterLevelCm, unit) : "—"}
            </div>
            <span className="text-[11px] font-medium tracking-wider text-white/80 uppercase mt-1">
              Water Level
            </span>
          </div>
          <div className="px-6 flex flex-col items-center">
            <div
              className={`text-[15px] font-bold ${
                floatStatus === "activated"
                  ? "text-red-100"
                  : floatStatus === "unknown"
                    ? "text-white/70"
                    : "text-white"
              }`}
            >
              {floatLabel(floatStatus)}
            </div>
            <span className="text-[11px] font-medium tracking-wider text-white/80 uppercase mt-1">
              Float Switch
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/80">
            Units
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="bg-white/15 border border-white/30 rounded-lg px-2 py-1 text-white text-xs font-semibold uppercase tracking-wide outline-none"
            >
              {DISPLAY_UNITS.map((option) => (
                <option key={option} value={option} className="text-slate-900">
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
