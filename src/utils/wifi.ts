import { SensorReadings } from "./milkAnalysis";

export type ReadingsListener = (r: SensorReadings) => void;
export type StatusListener = (connected: boolean) => void;

function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!url) throw new Error("Please enter the ESP32 IP address or URL.");
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, "");
}

export class MilkGuardWifi {
  private baseUrl: string | null = null;
  private pollTimer: number | null = null;
  private pollIntervalMs = 1000;
  private readingsListener: ReadingsListener | null = null;
  private statusListener: StatusListener | null = null;
  private connected = false;

  onReadings(cb: ReadingsListener) { this.readingsListener = cb; }
  onStatus(cb: StatusListener) { this.statusListener = cb; }

  isConnected() { return this.connected; }
  getBaseUrl() { return this.baseUrl; }

  async connect(input: string, timeoutMs = 5000): Promise<SensorReadings> {
    const url = normalizeBaseUrl(input);
    const r = await this.fetchReadings(url, timeoutMs);
    this.baseUrl = url;
    this.connected = true;
    this.statusListener?.(true);
    this.readingsListener?.(r);
    return r;
  }

  async readOnce(): Promise<SensorReadings | null> {
    if (!this.baseUrl) return null;
    try {
      const r = await this.fetchReadings(this.baseUrl, 4000);
      if (!this.connected) {
        this.connected = true;
        this.statusListener?.(true);
      }
      this.readingsListener?.(r);
      return r;
    } catch (e) {
      if (this.connected) {
        this.connected = false;
        this.statusListener?.(false);
      }
      throw e;
    }
  }

  startPolling(intervalMs = 1000) {
    this.pollIntervalMs = Math.max(500, intervalMs);
    this.stopPolling();
    this.pollTimer = window.setInterval(() => {
      this.readOnce().catch(() => {});
    }, this.pollIntervalMs) as unknown as number;
  }

  stopPolling() {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async triggerBuzzer(durationMs = 1000): Promise<void> {
    if (!this.baseUrl) throw new Error("Not connected to ESP32.");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${this.baseUrl}/buzzer?ms=${encodeURIComponent(String(durationMs))}`, {
        method: "POST",
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Buzzer request failed (HTTP ${res.status})`);
    } finally {
      clearTimeout(t);
    }
  }

  disconnect() {
    this.stopPolling();
    this.baseUrl = null;
    if (this.connected) {
      this.connected = false;
      this.statusListener?.(false);
    }
  }

  private async fetchReadings(baseUrl: string, timeoutMs: number): Promise<SensorReadings> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}/readings`, {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`ESP32 responded with HTTP ${res.status}`);
      const data = await res.json();
      const ph = Number(data.ph);
      const tds = Number(data.tds);
      const gas = Number(data.gas);
      if (!Number.isFinite(ph) || !Number.isFinite(tds) || !Number.isFinite(gas)) {
        throw new Error("Invalid JSON from ESP32. Expected { ph, tds, gas }.");
      }
      return { ph: +ph.toFixed(2), tds: Math.round(tds), gas: Math.round(gas) };
    } catch (e: any) {
      if (e?.name === "AbortError") throw new Error("ESP32 did not respond in time. Check the IP and that you're on the same Wi-Fi.");
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
}

export const wifiClient = new MilkGuardWifi();
