import { useMilkGuard } from "@/contexts/MilkGuardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BluetoothConnect } from "@/components/BluetoothConnect";
import {
  Bell,
  Code,
  Shield,
  Zap,
  Cpu,
  AlertTriangle,
  Bluetooth,
} from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { isDeviceConnected, connectionType, simulateReadings, triggerBuzzer } = useMilkGuard();

  const handleBuzzer = async () => {
    try {
      await triggerBuzzer();
      toast.success("Buzzer triggered");
    } catch (e: any) {
      toast.error(e?.message || "Failed to trigger buzzer");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Device pairing, Bluetooth controls and ESP32 integration guide
        </p>
      </div>

      {/* Bluetooth pairing */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Bluetooth className="h-4 w-4 text-primary" />
          Bluetooth Connection
        </h2>
        <BluetoothConnect />
      </div>

      {/* Demo */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Demo Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            No hardware yet? Generate sample readings to explore the app.
          </p>
          <Button variant="outline" size="sm" onClick={simulateReadings}>
            <Zap className="h-4 w-4" />
            Simulate Data
          </Button>
        </CardContent>
      </Card>

      {/* Device Control */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Device Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Trigger the buzzer alert on the ESP32 (requires MOSFET + buzzer wired to the configured pin).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBuzzer}
            disabled={connectionType !== "bluetooth" || !isDeviceConnected}
          >
            <Bell className="h-4 w-4" />
            Trigger Buzzer Alert
          </Button>
          {connectionType !== "bluetooth" && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Connect via Bluetooth first to use controls
            </p>
          )}
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            ESP32 BLE Firmware
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Flash this Arduino sketch on your ESP32. It advertises a BLE service that MilkGuard pairs with —
            no Wi-Fi, no servers, no app store. Just open MilkGuard and tap{" "}
            <span className="font-medium text-foreground">Connect via Bluetooth</span>.
          </p>

          <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-xs font-mono">
            <p><span className="text-muted-foreground">Device name:</span> <span className="font-semibold">MilkGuard-ESP32</span></p>
            <p><span className="text-muted-foreground">Service UUID:</span> 0000a100-0000-1000-8000-00805f9b34fb</p>
            <p><span className="text-muted-foreground">pH char:</span>      0000a101-... (float32, notify+read)</p>
            <p><span className="text-muted-foreground">TDS char:</span>     0000a102-... (int16,   notify+read)</p>
            <p><span className="text-muted-foreground">Gas char:</span>     0000a103-... (int16,   notify+read)</p>
            <p><span className="text-muted-foreground">Buzzer char:</span>  0000a104-... (uint8,   write)</p>
          </div>

          <div className="rounded-lg bg-sidebar p-4 overflow-x-auto">
            <pre className="text-xs text-sidebar-foreground font-mono">
{`#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID    "0000a100-0000-1000-8000-00805f9b34fb"
#define CHAR_PH_UUID    "0000a101-0000-1000-8000-00805f9b34fb"
#define CHAR_TDS_UUID   "0000a102-0000-1000-8000-00805f9b34fb"
#define CHAR_GAS_UUID   "0000a103-0000-1000-8000-00805f9b34fb"
#define CHAR_BUZ_UUID   "0000a104-0000-1000-8000-00805f9b34fb"

#define PH_PIN     34   // pH analog
#define TDS_PIN    35   // TDS analog
#define GAS_PIN    32   // MQ-135 analog
#define BUZZER_PIN 25   // MOSFET gate -> buzzer

BLECharacteristic *phCh, *tdsCh, *gasCh;

class BuzCB : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) {
    auto v = c->getValue();
    int ms = v.length() ? (uint8_t)v[0] * 100 : 1000;
    digitalWrite(BUZZER_PIN, HIGH);
    delay(ms);
    digitalWrite(BUZZER_PIN, LOW);
  }
};

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  BLEDevice::init("MilkGuard-ESP32");
  auto *server  = BLEDevice::createServer();
  auto *service = server->createService(SERVICE_UUID);

  phCh  = service->createCharacteristic(CHAR_PH_UUID,
            BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  tdsCh = service->createCharacteristic(CHAR_TDS_UUID,
            BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  gasCh = service->createCharacteristic(CHAR_GAS_UUID,
            BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  auto *buzCh = service->createCharacteristic(CHAR_BUZ_UUID,
            BLECharacteristic::PROPERTY_WRITE);

  phCh->addDescriptor(new BLE2902());
  tdsCh->addDescriptor(new BLE2902());
  gasCh->addDescriptor(new BLE2902());
  buzCh->setCallbacks(new BuzCB());

  service->start();
  auto *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->start();
}

void loop() {
  // TODO: replace with real sensor calibration
  float ph  = readPh(analogRead(PH_PIN));
  int16_t tds = readTds(analogRead(TDS_PIN));
  int16_t gas = analogRead(GAS_PIN) / 16;  // 0-255 ish

  phCh->setValue((uint8_t*)&ph, 4);     phCh->notify();
  tdsCh->setValue((uint8_t*)&tds, 2);   tdsCh->notify();
  gasCh->setValue((uint8_t*)&gas, 2);   gasCh->notify();
  delay(1000);
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Detection Logic */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Detection Logic Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { rule: "Water Dilution", condition: "TDS < 700 ppm, pH normal", severity: "danger" },
              { rule: "Soda / Detergent", condition: "pH > 6.8", severity: "danger" },
              { rule: "Acid / Sour Milk", condition: "pH < 6.5", severity: "warning" },
              { rule: "Urea / Salt / Sugar", condition: "TDS > 1200 ppm, pH normal", severity: "danger" },
              { rule: "Ammonia / Alcohol", condition: "Gas > 50 units", severity: "warning" },
              { rule: "Multiple Adulterants", condition: "2+ rules triggered", severity: "danger" },
            ].map((item) => (
              <div
                key={item.rule}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">{item.rule}</p>
                  <p className="text-xs text-muted-foreground">{item.condition}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    item.severity === "danger"
                      ? "border-milkguard-danger/40 text-milkguard-danger"
                      : "border-milkguard-warning/40 text-milkguard-warning"
                  }
                >
                  {item.severity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
