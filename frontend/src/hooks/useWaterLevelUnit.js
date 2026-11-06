import { useCallback, useState } from "react";
import { useWaterLevelUnitContext } from "../context/WaterLevelUnitContext";
import {
  isValidDisplayUnit,
  loadStoredDisplayUnit,
  saveStoredDisplayUnit,
} from "../utils/waterLevel";

export default function useWaterLevelUnit() {
  const shared = useWaterLevelUnitContext();
  const [localUnit, setLocalUnit] = useState(() => loadStoredDisplayUnit());

  const setLocal = useCallback((next) => {
    if (!isValidDisplayUnit(next)) return;
    setLocalUnit(next);
    saveStoredDisplayUnit(next);
  }, []);

  if (shared) return [shared.unit, shared.setUnit];
  return [localUnit, setLocal];
}
