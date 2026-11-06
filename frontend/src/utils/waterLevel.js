export const UNIT_STORAGE_KEY = "riverWaterLevelUnit";
export const DISPLAY_UNITS = ["mm", "cm", "m", "in", "ft"];
export const DEFAULT_DISPLAY_UNIT = "m";

const UNIT_LABELS = {
  mm: "mm",
  cm: "cm",
  m: "m",
  in: "in",
  ft: "ft",
};

export function isValidDisplayUnit(unit) {
  return DISPLAY_UNITS.includes(unit);
}

export function loadStoredDisplayUnit() {
  try {
    const stored = window.localStorage.getItem(UNIT_STORAGE_KEY);
    if (isValidDisplayUnit(stored)) return stored;
  } catch {
    // localStorage may be unavailable
  }
  return DEFAULT_DISPLAY_UNIT;
}

export function saveStoredDisplayUnit(unit) {
  if (!isValidDisplayUnit(unit)) return;
  try {
    window.localStorage.setItem(UNIT_STORAGE_KEY, unit);
  } catch {
    // ignore quota / privacy-mode failures
  }
}

/** Convert an internal centimeter value to the selected display unit. */
export function cmToDisplay(cm, unit) {
  const value = Number(cm);
  if (!Number.isFinite(value)) return null;
  switch (unit) {
    case "mm":
      return value * 10;
    case "cm":
      return value;
    case "m":
      return value / 100;
    case "in":
      return value / 2.54;
    case "ft":
      return value / 30.48;
    default:
      return value / 100;
  }
}

export function formatLevelFromCm(cm, unit) {
  const converted = cmToDisplay(cm, unit);
  if (converted === null) return "—";
  const label = UNIT_LABELS[unit] || "m";
  switch (unit) {
    case "mm":
      return `${Math.round(converted)} ${label}`;
    case "cm":
    case "in":
      return `${converted.toFixed(1)} ${label}`;
    case "m":
    case "ft":
    default:
      return `${converted.toFixed(2)} ${label}`;
  }
}

export function formatNumberFromCm(cm, unit) {
  const converted = cmToDisplay(cm, unit);
  if (converted === null) return null;
  switch (unit) {
    case "mm":
      return Math.round(converted);
    case "cm":
    case "in":
      return Number(converted.toFixed(1));
    case "m":
    case "ft":
    default:
      return Number(converted.toFixed(2));
  }
}

export function unitSuffix(unit) {
  return UNIT_LABELS[unit] || "m";
}

/**
 * Measurement-based gauge state from the continuous sensor only.
 * Thresholds must be in centimeters (internal unit).
 */
export function measurementGaugeState(waterLevelCm, warningLevelCm, criticalLevelCm) {
  if (!Number.isFinite(Number(waterLevelCm))) return "UNAVAILABLE";
  const warning = Number(warningLevelCm);
  const critical = Number(criticalLevelCm);
  const level = Number(waterLevelCm);
  if (Number.isFinite(critical) && level >= critical) return "CRITICAL";
  if (Number.isFinite(warning) && level >= warning) return "WARNING";
  return "SAFE";
}

export function normalizeFloatSwitchStatus(status) {
  if (status === "activated" || status === "inactive" || status === "unknown") {
    return status;
  }
  return "unknown";
}

/**
 * Overall system alert. Float switch can force CRITICAL but never
 * changes the continuous measurement or its gauge percentage.
 */
export function overallAlertState({ measurementState, floatSwitchStatus, measurementAvailable }) {
  const floatStatus = normalizeFloatSwitchStatus(floatSwitchStatus);
  if (floatStatus === "activated") return "CRITICAL";
  if (!measurementAvailable || measurementState === "UNAVAILABLE") return "UNAVAILABLE";
  if (measurementState === "CRITICAL") return "CRITICAL";
  if (measurementState === "WARNING") return "WARNING";
  return "SAFE";
}

const STALE_MS = 2 * 60 * 1000;

export function isMeasurementAvailable(device) {
  if (!device) return false;
  if (device.device_status && device.device_status !== "online") return false;
  if (device.water_level_cm === null || device.water_level_cm === undefined || device.water_level_cm === "") {
    return false;
  }
  if (!device.reading_at) return false;
  const readingTime = new Date(device.reading_at).getTime();
  if (!Number.isFinite(readingTime)) return false;
  return Date.now() - readingTime <= STALE_MS;
}

export function gaugeTheme(measurementState) {
  switch (measurementState) {
    case "WARNING":
      return {
        panel: "bg-amber-500",
        inner: "bg-amber-800",
        waveBack: "bg-amber-300/80",
        waveBackText: "text-amber-300/80",
        waveFront: "bg-yellow-400",
        waveFrontText: "text-yellow-400",
        label: "Warning",
      };
    case "CRITICAL":
      return {
        panel: "bg-red-600",
        inner: "bg-red-900",
        waveBack: "bg-red-400/80",
        waveBackText: "text-red-400/80",
        waveFront: "bg-red-500",
        waveFrontText: "text-red-500",
        label: "Critical",
      };
    case "UNAVAILABLE":
      return {
        panel: "bg-slate-600",
        inner: "bg-slate-800",
        waveBack: "bg-slate-400/50",
        waveBackText: "text-slate-400/50",
        waveFront: "bg-slate-500",
        waveFrontText: "text-slate-500",
        label: "Unavailable",
      };
    default:
      return {
        panel: "bg-[#2f6db8]",
        inner: "bg-[#3b6db4]",
        waveBack: "bg-[#4fc3f7]/80",
        waveBackText: "text-[#4fc3f7]/80",
        waveFront: "bg-[#29b6f6]",
        waveFrontText: "text-[#29b6f6]",
        label: "Safe",
      };
  }
}
