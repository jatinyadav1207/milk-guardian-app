import { useState } from "react";
import { useMilkGuard } from "@/contexts/MilkGuardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bluetooth, BluetoothConnected, BluetoothOff, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  variant?: "card" | "compact";
}

export function BluetoothConnect({ variant = "card" }: Props) {
  const {
    bluetoothSupported,
    isDeviceConnected,
    connectionType,
    deviceName,
    liveStream,
    setLiveStream,
    connectBluetooth,
    disconnectBluetooth,
    refreshReadings,
  } = useMilkGuard();
  const [busy, setBusy] = useState(false);

  const isBT = connectionType === "bluetooth" && isDeviceConnected;

  const handleConnect = async () => {
    setBusy(true);
    try {
      await connectBluetooth();
      toast.success("ESP32 connected via Bluetooth");
    } catch (e: any) {
      const msg = e?.message || "Connection failed";
      if (!/cancel/i.test(msg)) toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectBluetooth();
      toast.info("Bluetooth disconnected");
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    try {
      await refreshReadings();
      toast.success("Readings refreshed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to read");
    } finally {
      setBusy(false);
    }
  };

  if (!bluetoothSupported) {
    if (variant === "compact") return null;
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-milkguard-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Bluetooth not supported</p>
            <p className="text-xs text-muted-foreground">
              Open MilkGuard in Chrome on Android, or Chrome/Edge on desktop, to pair via Bluetooth.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return isBT ? (
      <Button size="sm" variant="outline" onClick={handleRefresh} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Refresh
      </Button>
    ) : (
      <Button size="sm" onClick={handleConnect} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
        Connect Bluetooth
      </Button>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isBT ? "bg-milkguard-success/15" : "bg-muted"
            }`}>
              {isBT ? (
                <BluetoothConnected className="h-5 w-5 text-milkguard-success" />
              ) : (
                <Bluetooth className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {isBT ? deviceName || "MilkGuard ESP32" : "Bluetooth"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isBT ? "Streaming sensor data over BLE" : "Pair with your MilkGuard ESP32"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={isBT ? "border-milkguard-success/40 text-milkguard-success" : "border-border"}
          >
            {isBT ? "Connected" : "Not paired"}
          </Badge>
        </div>

        {isBT && (
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Live stream</p>
              <p className="text-xs text-muted-foreground">
                {liveStream ? "Auto-updating from ESP32" : "Manual refresh only"}
              </p>
            </div>
            <Switch checked={liveStream} onCheckedChange={setLiveStream} />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {isBT ? (
            <>
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={handleDisconnect} disabled={busy}>
                <BluetoothOff className="h-4 w-4" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
              Connect via Bluetooth
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
