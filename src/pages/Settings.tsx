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
            ESP32 Integration Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your ESP32 should send sensor readings as a JSON POST request to the app.
            In a real deployment, configure a WebSocket or HTTP endpoint.
          </p>
          <div className="rounded-lg bg-sidebar p-4 overflow-x-auto">
            <pre className="text-xs text-sidebar-foreground font-mono">
{`// ESP32 Arduino — Send readings via HTTP POST
#include <WiFi.h>
#include <HTTPClient.h>

void sendReadings(float ph, int tds, int gas) {
  HTTPClient http;
  http.begin("http://<APP_URL>/api/readings");
  http.addHeader("Content-Type", "application/json");

  String json = "{\\"ph\\":" + String(ph, 2)
    + ",\\"tds\\":" + String(tds)
    + ",\\"gas\\":" + String(gas) + "}";

  http.POST(json);
  http.end();
}`}
            </pre>
          </div>

          <div className="rounded-lg bg-sidebar p-4 overflow-x-auto">
            <pre className="text-xs text-sidebar-foreground font-mono">
{`// JSON payload format
{
  "ph": 6.65,    // pH sensor reading
  "tds": 950,    // TDS sensor in ppm
  "gas": 25      // MQ-135 analog value
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
