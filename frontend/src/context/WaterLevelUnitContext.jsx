import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  isValidDisplayUnit,
  loadStoredDisplayUnit,
  saveStoredDisplayUnit,
} from "../utils/waterLevel";

const WaterLevelUnitContext = createContext(null);

export function WaterLevelUnitProvider({ children }) {
  const [unit, setUnitState] = useState(() => loadStoredDisplayUnit());

  const setUnit = useCallback((next) => {
    if (!isValidDisplayUnit(next)) return;
    setUnitState(next);
    saveStoredDisplayUnit(next);
  }, []);

  const value = useMemo(() => ({ unit, setUnit }), [unit, setUnit]);

  return (
    <WaterLevelUnitContext.Provider value={value}>
      {children}
    </WaterLevelUnitContext.Provider>
  );
}

export function useWaterLevelUnitContext() {
  return useContext(WaterLevelUnitContext);
}
