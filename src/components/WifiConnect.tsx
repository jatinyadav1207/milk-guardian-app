import { useState } from "react";
import { useMilkGuard } from "@/contexts/MilkGuardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Wifi, WifiOff, RefreshCw, Loader2, Plug, Unplug } from "lucide-react";
import { toast } from "sonner";

interface Props {
  variant?: "card" | "compact";
}

export function WifiConnect({ variant = "card" }: Props) {
  const {
    isDeviceConnected,
    connectionType,
    deviceName,
    liveStream,
    setLiveStream,
    connectWifi,
    disconnectWifi,
    refreshReadings,
  } = useMilkGuard();

  const [address, setAddress] = useState(() => {
    try { return localStorage.getItem("mg_esp32_ip") || ""; } catch { return ""; }
  });
  const [busy, setBusy] = useState(false);

  const isWifi = connectionType === "wifi" && isDeviceConnected;

  const handleConnect = async () => {
    if (!address.trim()) {
      toast.error("Enter your ESP32 IP address");
      return;
    }
    setBusy(true);
    try {
      await connectWifi(address.trim());
      try { localStorage.setItem("mg_esp32_ip", address.trim()); } catch {}
      toast.success("ESP32 connected");
    } catch (e: any) {
      toast.error(e?.message || "Connection failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWifi();
    toast.info("Disconnected");
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

  if (variant === "compact") {
    return isWifi ? (
      <Button size="sm" variant="outline" onClick={handleRefresh} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Refresh
      </Button>
    ) : null;
  }

  return (
    <Card className="animate-slide-up">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isWifi ? "bg-milkguard-success/15" : "bg-muted"
            }`}>
              {isWifi ? (
                <Wifi className="h-5 w-5 text-milkguard-success" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {isWifi ? deviceName || "MilkGuard ESP32" : "Local Wi-Fi connection"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {isWifi ? `Streaming from ${deviceName}` : "Enter your ESP32 local IP (same Wi-Fi network)"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={isWifi ? "border-milkguard-success/40 text-milkguard-success" : "border-border"}
          >
            {isWifi ? "Connected" : "Not connected"}
          </Badge>
        </div>

        {!isWifi && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="e.g. 192.168.1.42"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
              disabled={busy}
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <Button onClick={handleConnect} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              Connect
            </Button>
          </div>
        )}

        {isWifi && (
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Live stream</p>
              <p className="text-xs text-muted-foreground">
                {liveStream ? "Auto-polling every second" : "Manual refresh only"}
              </p>
            </div>
            <Switch checked={liveStream} onCheckedChange={setLiveStream} />
          </div>
        )}

        {isWifi && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={handleDisconnect}>
              <Unplug className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
