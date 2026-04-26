import { SensorReadings } from "./milkAnalysis";

// Minimal Web Bluetooth types (browsers ship the impl; TS lib doesn't include it).
type BluetoothDevice = EventTarget & {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BluetoothRemoteGATTServer;
};
type BluetoothRemoteGATTServer = {
  readonly device: BluetoothDevice;
  readonly connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
};
type BluetoothRemoteGATTService = {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
};
type BluetoothRemoteGATTCharacteristic = EventTarget & {
  readonly value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
};

// MilkGuard standard BLE service — matches the Arduino firmware in Settings.
export const MILKGUARD_SERVICE_UUID = "4d696c6b-4775-4172-6400-000000000001";
export const PH_CHAR_UUID           = "4d696c6b-4775-4172-6400-0000000000ph".replace("ph", "70") + "1";
// Use clean fixed UUIDs (the above is messy) — define explicit ones:
export const SERVICE_UUID = "0000a100-0000-1000-8000-00805f9b34fb";
export const CHAR_PH_UUID = "0000a101-0000-1000-8000-00805f9b34fb";
export const CHAR_TDS_UUID = "0000a102-0000-1000-8000-00805f9b34fb";
export const CHAR_GAS_UUID = "0000a103-0000-1000-8000-00805f9b34fb";
export const CHAR_BUZZER_UUID = "0000a104-0000-1000-8000-00805f9b34fb";

export type ReadingsListener = (r: SensorReadings) => void;
export type StatusListener = (connected: boolean) => void;

export class MilkGuardBluetooth {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private phChar: BluetoothRemoteGATTCharacteristic | null = null;
  private tdsChar: BluetoothRemoteGATTCharacteristic | null = null;
  private gasChar: BluetoothRemoteGATTCharacteristic | null = null;
  private buzzerChar: BluetoothRemoteGATTCharacteristic | null = null;

  private current: SensorReadings = { ph: 0, tds: 0, gas: 0 };
  private hasPh = false;
  private hasTds = false;
  private hasGas = false;

  private readingsListener: ReadingsListener | null = null;
  private statusListener: StatusListener | null = null;

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && !!(navigator as any).bluetooth;
  }

  onReadings(cb: ReadingsListener) { this.readingsListener = cb; }
  onStatus(cb: StatusListener) { this.statusListener = cb; }

  isConnected(): boolean {
    return !!this.server?.connected;
  }

  deviceName(): string | null {
    return this.device?.name ?? null;
  }

  async connect(): Promise<void> {
    if (!MilkGuardBluetooth.isSupported()) {
      throw new Error("Web Bluetooth is not supported on this browser. Use Chrome on Android or desktop.");
    }

    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });

    this.device = device;
    device.addEventListener("gattserverdisconnected", () => {
      this.statusListener?.(false);
    });

    const server = await device.gatt!.connect();
    this.server = server;

    const service = await server.getPrimaryService(SERVICE_UUID);
    this.phChar = await service.getCharacteristic(CHAR_PH_UUID);
    this.tdsChar = await service.getCharacteristic(CHAR_TDS_UUID);
    this.gasChar = await service.getCharacteristic(CHAR_GAS_UUID);
    try {
      this.buzzerChar = await service.getCharacteristic(CHAR_BUZZER_UUID);
    } catch {
      this.buzzerChar = null;
    }

    this.statusListener?.(true);
  }

  async startNotifications(): Promise<void> {
    if (!this.phChar || !this.tdsChar || !this.gasChar) return;

    await this.phChar.startNotifications();
    this.phChar.addEventListener("characteristicvaluechanged", (e) => {
      const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
      if (!v) return;
      this.current.ph = +v.getFloat32(0, true).toFixed(2);
      this.hasPh = true;
      this.maybeEmit();
    });

    await this.tdsChar.startNotifications();
    this.tdsChar.addEventListener("characteristicvaluechanged", (e) => {
      const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
      if (!v) return;
      this.current.tds = v.getInt16(0, true);
      this.hasTds = true;
      this.maybeEmit();
    });

    await this.gasChar.startNotifications();
    this.gasChar.addEventListener("characteristicvaluechanged", (e) => {
      const v = (e.target as BluetoothRemoteGATTCharacteristic).value;
      if (!v) return;
      this.current.gas = v.getInt16(0, true);
      this.hasGas = true;
      this.maybeEmit();
    });
  }

  async stopNotifications(): Promise<void> {
    try { await this.phChar?.stopNotifications(); } catch {}
    try { await this.tdsChar?.stopNotifications(); } catch {}
    try { await this.gasChar?.stopNotifications(); } catch {}
  }

  async readOnce(): Promise<SensorReadings | null> {
    if (!this.phChar || !this.tdsChar || !this.gasChar) return null;
    const [phV, tdsV, gasV] = await Promise.all([
      this.phChar.readValue(),
      this.tdsChar.readValue(),
      this.gasChar.readValue(),
    ]);
    const r: SensorReadings = {
      ph: +phV.getFloat32(0, true).toFixed(2),
      tds: tdsV.getInt16(0, true),
      gas: gasV.getInt16(0, true),
    };
    this.current = r;
    this.hasPh = this.hasTds = this.hasGas = true;
    this.readingsListener?.(r);
    return r;
  }

  async triggerBuzzer(durationMs = 1000): Promise<void> {
    if (!this.buzzerChar) throw new Error("Buzzer characteristic not available on this device.");
    const buf = new Uint8Array([Math.min(255, Math.floor(durationMs / 100))]);
    await this.buzzerChar.writeValue(buf);
  }

  async disconnect(): Promise<void> {
    try { await this.stopNotifications(); } catch {}
    try { this.server?.disconnect(); } catch {}
    this.device = null;
    this.server = null;
    this.phChar = this.tdsChar = this.gasChar = this.buzzerChar = null;
    this.hasPh = this.hasTds = this.hasGas = false;
    this.statusListener?.(false);
  }

  private maybeEmit() {
    if (this.hasPh && this.hasTds && this.hasGas) {
      this.readingsListener?.({ ...this.current });
    }
  }
}

export const bluetoothClient = new MilkGuardBluetooth();
