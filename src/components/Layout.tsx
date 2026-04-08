import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useMilkGuard } from "@/contexts/MilkGuardContext";
import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isDeviceConnected } = useMilkGuard();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground" />
            <Badge
              variant="outline"
              className={`gap-1.5 text-xs ${
                isDeviceConnected
                  ? "border-milkguard-success/30 text-milkguard-success"
                  : "border-border text-muted-foreground"
              }`}
            >
              {isDeviceConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isDeviceConnected ? "Device Online" : "Device Offline"}
            </Badge>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
