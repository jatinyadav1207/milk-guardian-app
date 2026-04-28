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

export interface AppSettings {
  pollIntervalMs: number;
  autoBuzzerOnAdulterated: boolean;
  buzzerDurationMs: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  pollIntervalMs: 1000,
  autoBuzzerOnAdulterated: true,
  buzzerDurationMs: 1500,
};

interface MilkGuardState {
  isDeviceConnected: boolean;
  connectionType: "none" | "wifi";
  deviceName: string | null;
  liveStream: boolean;
  currentReadings: SensorReadings | null;
  tests: TestRecord[];
  baselines: Baseline[];
  activeBaseline: Baseline;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  runTest: (notes?: string) => Promise<TestRecord>;
  clearReadings: () => void;
  addBaseline: (b: Omit<Baseline, "id" | "createdAt">) => Baseline;
  updateBaseline: (id: string, patch: Partial<Omit<Baseline, "id" | "createdAt">>) => void;
  deleteBaseline: (id: string) => void;
  setActiveBaseline: (id: string) => void;
  deleteTest: (id: string) => void;
  clearAllTests: () => void;
  importData: (data: { tests?: TestRecord[]; baselines?: Baseline[]; settings?: Partial<AppSettings> }) => void;
  connectWifi: (address: string) => Promise<void>;
  disconnectWifi: () => void;
  refreshReadings: () => Promise<SensorReadings | null>;
  setLiveStream: (v: boolean) => void;
  triggerBuzzer: (ms?: number) => Promise<void>;
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
  const [connectionType, setConnectionType] = useState<"none" | "wifi">("none");
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
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage("mg_settings", DEFAULT_SETTINGS)
  );

  const activeBaseline =
    baselines.find((b) => b.id === activeBaselineId) || baselines[0] || DEFAULT_BASELINE;

  useEffect(() => { localStorage.setItem("mg_tests", JSON.stringify(tests)); }, [tests]);
  useEffect(() => { localStorage.setItem("mg_baselines", JSON.stringify(baselines)); }, [baselines]);
  useEffect(() => { localStorage.setItem("mg_active_baseline", JSON.stringify(activeBaselineId)); }, [activeBaselineId]);
  useEffect(() => { localStorage.setItem("mg_settings", JSON.stringify(settings)); }, [settings]);

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
      wifiClient.startPolling(settings.pollIntervalMs);
    }
  }, [settings.pollIntervalMs]);

  const disconnectWifi = useCallback(() => {
    wifiClient.disconnect();
    setConnectionType("none");
    setDeviceName(null);
    setDeviceConnected(false);
    setCurrentReadings(null);
  }, []);

  const refreshReadings = useCallback(async (): Promise<SensorReadings | null> => {
    if (connectionType !== "wifi") return null;
    const r = await wifiClient.readOnce();
    if (r) setCurrentReadings(r);
    return r;
  }, [connectionType]);

  const setLiveStream = useCallback((v: boolean) => {
    setLiveStreamState(v);
    if (connectionType === "wifi") {
      if (v) wifiClient.startPolling(settings.pollIntervalMs);
      else wifiClient.stopPolling();
    }
  }, [connectionType, settings.pollIntervalMs]);

  // Re-start polling when interval changes
  useEffect(() => {
    if (connectionType === "wifi" && liveStream) {
      wifiClient.startPolling(settings.pollIntervalMs);
    }
  }, [settings.pollIntervalMs, connectionType, liveStream]);

  const triggerBuzzer = useCallback(async (ms?: number) => {
    if (connectionType !== "wifi") throw new Error("Connect to ESP32 over Wi-Fi first.");
    await wifiClient.triggerBuzzer(ms ?? settings.buzzerDurationMs);
  }, [connectionType, settings.buzzerDurationMs]);

  const runTest = useCallback(async (notes?: string): Promise<TestRecord> => {
    if (connectionType !== "wifi") {
      throw new Error("Connect your ESP32 over Wi-Fi before running a test.");
    }
    // Always pull a fresh reading for the test
    const fresh = await wifiClient.readOnce();
    if (!fresh) throw new Error("Could not read sensors from ESP32.");
    setCurrentReadings(fresh);

    const result: AnalysisResult = analyzeMilk(fresh, activeBaseline);
    const record: TestRecord = {
      id: crypto.randomUUID(),
      sampleId: generateSampleId(),
      readings: fresh,
      result,
      timestamp: new Date().toISOString(),
      notes,
    };
    setTests((prev) => [record, ...prev]);

    if (result.verdict === "adulterated" && settings.autoBuzzerOnAdulterated) {
      // Fire and forget — do not block the test result on buzzer delivery
      wifiClient.triggerBuzzer(settings.buzzerDurationMs).catch(() => {});
    }

    return record;
  }, [connectionType, activeBaseline, settings.autoBuzzerOnAdulterated, settings.buzzerDurationMs]);

  const clearReadings = useCallback(() => { setCurrentReadings(null); }, []);

  const addBaseline = useCallback((b: Omit<Baseline, "id" | "createdAt">): Baseline => {
    const newB: Baseline = { ...b, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setBaselines((prev) => [...prev, newB]);
    return newB;
  }, []);

  const updateBaseline = useCallback((id: string, patch: Partial<Omit<Baseline, "id" | "createdAt">>) => {
    setBaselines((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const deleteBaseline = useCallback((id: string) => {
    if (id === "default") return;
    setBaselines((prev) => prev.filter((b) => b.id !== id));
    if (activeBaselineId === id) setActiveBaselineId("default");
  }, [activeBaselineId]);

  const setActiveBaseline = useCallback((id: string) => { setActiveBaselineId(id); }, []);

  const deleteTest = useCallback((id: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllTests = useCallback(() => { setTests([]); }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const importData = useCallback((data: { tests?: TestRecord[]; baselines?: Baseline[]; settings?: Partial<AppSettings> }) => {
    if (Array.isArray(data.tests)) setTests(data.tests);
    if (Array.isArray(data.baselines) && data.baselines.length > 0) setBaselines(data.baselines);
    if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
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
        settings,
        updateSettings,
        runTest,
        clearReadings,
        addBaseline,
        updateBaseline,
        deleteBaseline,
        setActiveBaseline,
        deleteTest,
        clearAllTests,
        importData,
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
