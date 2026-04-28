import { useMilkGuard } from "@/contexts/MilkGuardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WifiConnect } from "@/components/WifiConnect";
import {
  Bell,
  Code,
  Shield,
  Zap,
  Cpu,
  AlertTriangle,
  Wifi,
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
          Connect your ESP32 over local Wi-Fi and manage integration
        </p>
      </div>

      {/* Wi-Fi connection */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-primary" />
          ESP32 Connection (Local IP)
        </h2>
        <WifiConnect />
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
            Trigger the buzzer alert on the ESP32 (MOSFET + buzzer wired to the configured pin).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBuzzer}
            disabled={connectionType !== "wifi" || !isDeviceConnected}
          >
            <Bell className="h-4 w-4" />
            Trigger Buzzer Alert
          </Button>
          {connectionType !== "wifi" && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Connect to the ESP32 over Wi-Fi first
            </p>
          )}
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            ESP32 Wi-Fi Firmware
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Flash this Arduino sketch on your ESP32. It joins your Wi-Fi and runs a small HTTP
            server. On boot it prints its IP in the Serial Monitor — paste that IP into MilkGuard
            (<span className="font-medium text-foreground">Settings → ESP32 Connection</span>) and
            tap <span className="font-medium text-foreground">Connect</span>.
          </p>

          <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-xs font-mono">
            <p><span className="text-muted-foreground">Endpoint:</span> <span className="font-semibold">GET http://&lt;esp32-ip&gt;/readings</span></p>
            <p><span className="text-muted-foreground">Response:</span> <span className="font-semibold">{`{ "ph": 6.65, "tds": 910, "gas": 22 }`}</span></p>
            <p><span className="text-muted-foreground">Buzzer:</span>  <span className="font-semibold">POST http://&lt;esp32-ip&gt;/buzzer?ms=1000</span></p>
            <p><span className="text-muted-foreground">Requirement:</span> phone and ESP32 on the same Wi-Fi network</p>
          </div>

          <div className="rounded-lg bg-sidebar p-4 overflow-x-auto">
            <pre className="text-xs text-sidebar-foreground font-mono">
{`#include <WiFi.h>
#include <WebServer.h>

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

#define PH_PIN     34   // pH analog
#define TDS_PIN    35   // TDS analog
#define GAS_PIN    32   // MQ-135 analog
#define BUZZER_PIN 25   // MOSFET gate -> buzzer

WebServer server(80);

void sendCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleReadings() {
  // TODO: replace with calibrated readings
  float ph   = readPh(analogRead(PH_PIN));
  int   tds  = readTds(analogRead(TDS_PIN));
  int   gas  = analogRead(GAS_PIN) / 16;  // 0..255 ish

  char buf[96];
  snprintf(buf, sizeof(buf),
    "{\\"ph\\":%.2f,\\"tds\\":%d,\\"gas\\":%d}", ph, tds, gas);
  sendCors();
  server.send(200, "application/json", buf);
}

void handleBuzzer() {
  int ms = server.hasArg("ms") ? server.arg("ms").toInt() : 1000;
  if (ms < 50) ms = 50;
  if (ms > 5000) ms = 5000;
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
  sendCors();
  server.send(200, "application/json", "{\\"ok\\":true}");
}

void handleOptions() { sendCors(); server.send(204); }

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println();
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());  // <-- paste this IP in the app

  server.on("/readings", HTTP_GET, handleReadings);
  server.on("/buzzer",   HTTP_POST, handleBuzzer);
  server.on("/readings", HTTP_OPTIONS, handleOptions);
  server.on("/buzzer",   HTTP_OPTIONS, handleOptions);
  server.begin();
}

void loop() {
  server.handleClient();
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
