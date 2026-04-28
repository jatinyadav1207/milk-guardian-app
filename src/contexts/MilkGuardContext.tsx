import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  SensorReadings,
  Baseline,
  TestRecord,
  AnalysisResult,
  DEFAULT_BASELINE,
  analyzeMilk,
  generateSampleId,
} from "@/utils/milkAnalysis";
import { wifiClient } from "@/utils/wifi";

interface MilkGuardState {
  isDeviceConnected: boolean;
  connectionType: "none" | "wifi" | "simulated";
  deviceName: string | null;
  liveStream: boolean;
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
  connectWifi: (address: string) => Promise<void>;
  disconnectWifi: () => void;
  refreshReadings: () => Promise<void>;
  setLiveStream: (v: boolean) => void;
  triggerBuzzer: () => Promise<void>;
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
  const [connectionType, setConnectionType] = useState<"none" | "wifi" | "simulated">("none");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [liveStream, setLiveStreamState] = useState(true);
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
      { ph: 6.6, tds: 950, gas: 20 },
      { ph: 6.65, tds: 880, gas: 15 },
      { ph: 7.2, tds: 850, gas: 25 },
      { ph: 6.3, tds: 900, gas: 30 },
      { ph: 6.7, tds: 450, gas: 18 },
      { ph: 6.6, tds: 1400, gas: 22 },
      { ph: 6.7, tds: 900, gas: 80 },
      { ph: 7.1, tds: 500, gas: 90 },
    ];
    const r = scenarios[Math.floor(Math.random() * scenarios.length)];
    setCurrentReadings({
      ph: +(r.ph + (Math.random() - 0.5) * 0.1).toFixed(2),
      tds: Math.round(r.tds + (Math.random() - 0.5) * 50),
      gas: Math.round(r.gas + (Math.random() - 0.5) * 10),
    });
    setDeviceConnected(true);
    setConnectionType("simulated");
    setDeviceName("Simulator");
  }, []);

  // Wi-Fi wiring
  const liveStreamRef = useRef(liveStream);
  useEffect(() => { liveStreamRef.current = liveStream; }, [liveStream]);

  useEffect(() => {
    wifiClient.onReadings((r) => {
      if (liveStreamRef.current) setCurrentReadings(r);
    });
    wifiClient.onStatus((connected) => {
      setDeviceConnected(connected);
      if (!connected) {
        setConnectionType("none");
        setDeviceName(null);
      }
    });
  }, []);

  const connectWifi = useCallback(async (address: string) => {
    const r = await wifiClient.connect(address);
    setCurrentReadings(r);
    setConnectionType("wifi");
    setDeviceName(wifiClient.getBaseUrl());
    setDeviceConnected(true);
    if (liveStreamRef.current) {
      wifiClient.startPolling(1000);
    }
  }, []);

  const disconnectWifi = useCallback(() => {
    wifiClient.disconnect();
    setConnectionType("none");
    setDeviceName(null);
    setDeviceConnected(false);
  }, []);

  const refreshReadings = useCallback(async () => {
    if (connectionType === "wifi") {
      const r = await wifiClient.readOnce();
      if (r) setCurrentReadings(r);
    }
  }, [connectionType]);

  const setLiveStream = useCallback((v: boolean) => {
    setLiveStreamState(v);
    if (connectionType === "wifi") {
      if (v) wifiClient.startPolling(1000);
      else wifiClient.stopPolling();
    }
  }, [connectionType]);

  const triggerBuzzer = useCallback(async () => {
    if (connectionType === "wifi") {
      await wifiClient.triggerBuzzer(1000);
    } else {
      throw new Error("Connect to ESP32 over Wi-Fi first.");
    }
  }, [connectionType]);

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
        connectionType,
        deviceName,
        liveStream,
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
        connectWifi,
        disconnectWifi,
        refreshReadings,
        setLiveStream,
        triggerBuzzer,
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
