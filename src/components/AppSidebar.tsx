import {
  LayoutDashboard,
  History,
  SlidersHorizontal,
  Settings,
  Droplets,
  Bluetooth,
  BluetoothConnected,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useMilkGuard } from "@/contexts/MilkGuardContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Test History", url: "/test-history", icon: History },
  { title: "Baselines", url: "/baselines", icon: SlidersHorizontal },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isDeviceConnected } = useMilkGuard();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-base font-bold tracking-tight text-sidebar-foreground">
                MilkGuard
              </h1>
              <p className="text-[11px] text-sidebar-foreground/60">
                Adulteration Detection
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(item.url)
                    }
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/80"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          {isDeviceConnected ? (
            <Wifi className="h-4 w-4 text-milkguard-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          {!collapsed && (
            <span className={`text-xs ${isDeviceConnected ? "text-milkguard-success" : "text-muted-foreground"}`}>
              ESP32 {isDeviceConnected ? "Online" : "Offline"}
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
