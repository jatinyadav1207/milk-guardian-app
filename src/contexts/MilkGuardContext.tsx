import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  SensorReadings,
  Baseline,
  TestRecord,
  AnalysisResult,
  DEFAULT_BASELINE,
  analyzeMilk,
  generateSampleId,
} from "@/utils/milkAnalysis";

interface MilkGuardState {
  isDeviceConnected: boolean;
  currentReadings: SensorReadings | null;
  tests: TestRecord[];
  baselines: Baseline[];
  activeBaseline: Baseline;
  simulateReadings: () => void;
  runTest: (notes?: string) => TestRecord | null;
  clearReadings: () => void;
  addBaseline: (b: Omit<Baseline, "id" | "createdAt">) => void;
  deleteBaseline: (id: string) => void;
  setActiveBaseline: (id: string) => void;
  deleteTest: (id: string) => void;
  setDeviceConnected: (v: boolean) => void;
}

const MilkGuardContext = createContext<MilkGuardState | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function MilkGuardProvider({ children }: { children: React.ReactNode }) {
  const [isDeviceConnected, setDeviceConnected] = useState(false);
  const [currentReadings, setCurrentReadings] = useState<SensorReadings | null>(null);
  const [tests, setTests] = useState<TestRecord[]>(() => loadFromStorage("mg_tests", []));
  const [baselines, setBaselines] = useState<Baseline[]>(() =>
    loadFromStorage("mg_baselines", [DEFAULT_BASELINE])
  );
  const [activeBaselineId, setActiveBaselineId] = useState<string>(() =>
    loadFromStorage("mg_active_baseline", "default")
  );

  const activeBaseline = baselines.find((b) => b.id === activeBaselineId) || baselines[0] || DEFAULT_BASELINE;

  useEffect(() => { localStorage.setItem("mg_tests", JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem("mg_baselines", JSON.stringify(baselines)); }, [baselines]);
  useEffect(() => { localStorage.setItem("mg_active_baseline", JSON.stringify(activeBaselineId)); }, [activeBaselineId]);

  const simulateReadings = useCallback(() => {
    const scenarios = [
      { ph: 6.6, tds: 950, gas: 20 },   // pure
      { ph: 6.65, tds: 880, gas: 15 },   // pure
      { ph: 7.2, tds: 850, gas: 25 },    // soda
      { ph: 6.3, tds: 900, gas: 30 },    // acid
      { ph: 6.7, tds: 450, gas: 18 },    // water dilution
      { ph: 6.6, tds: 1400, gas: 22 },   // urea/salt
      { ph: 6.7, tds: 900, gas: 80 },    // ammonia
      { ph: 7.1, tds: 500, gas: 90 },    // multiple
    ];
    const r = scenarios[Math.floor(Math.random() * scenarios.length)];
    // Add slight randomness
    setCurrentReadings({
      ph: +(r.ph + (Math.random() - 0.5) * 0.1).toFixed(2),
      tds: Math.round(r.tds + (Math.random() - 0.5) * 50),
      gas: Math.round(r.gas + (Math.random() - 0.5) * 10),
    });
    setDeviceConnected(true);
  }, []);

  const runTest = useCallback((notes?: string): TestRecord | null => {
    if (!currentReadings) return null;
    const result: AnalysisResult = analyzeMilk(currentReadings, activeBaseline);
    const record: TestRecord = {
      id: crypto.randomUUID(),
      sampleId: generateSampleId(),
      readings: currentReadings,
      result,
      timestamp: new Date().toISOString(),
      notes,
    };
    setTests((prev) => [record, ...prev]);
    return record;
  }, [currentReadings, activeBaseline]);

  const clearReadings = useCallback(() => {
    setCurrentReadings(null);
  }, []);

  const addBaseline = useCallback((b: Omit<Baseline, "id" | "createdAt">) => {
    const newB: Baseline = { ...b, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setBaselines((prev) => [...prev, newB]);
  }, []);

  const deleteBaseline = useCallback((id: string) => {
    if (id === "default") return;
    setBaselines((prev) => prev.filter((b) => b.id !== id));
    if (activeBaselineId === id) setActiveBaselineId("default");
  }, [activeBaselineId]);

  const setActiveBaseline = useCallback((id: string) => {
    setActiveBaselineId(id);
  }, []);

  const deleteTest = useCallback((id: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <MilkGuardContext.Provider
      value={{
        isDeviceConnected,
        currentReadings,
        tests,
        baselines,
        activeBaseline,
        simulateReadings,
        runTest,
        clearReadings,
        addBaseline,
        deleteBaseline,
        setActiveBaseline,
        deleteTest,
        setDeviceConnected,
      }}
    >
      {children}
    </MilkGuardContext.Provider>
  );
}

export function useMilkGuard() {
  const ctx = useContext(MilkGuardContext);
  if (!ctx) throw new Error("useMilkGuard must be inside MilkGuardProvider");
  return ctx;
}
