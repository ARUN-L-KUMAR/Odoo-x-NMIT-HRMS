"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  BarChart3,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getInitials } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  // Employees: visible to all — employees see directory, admins see management table
  { label: "Employees", href: "/employees", icon: Users },
  { label: "Attendance", href: "/attendance", icon: Clock },
  { label: "Time Off", href: "/time-off", icon: CalendarDays },
  // Admin-only modules
  { label: "Payroll", href: "/payroll", icon: DollarSign, adminOnly: true },
  { label: "Reports", href: "/reports", icon: BarChart3, adminOnly: true },
  { label: "Organization", href: "/organization", icon: Building2, adminOnly: true },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN";
  const userName = session?.user?.name || session?.user?.employeeId || "User";
  const userImage = session?.user?.image;
  const companyName = session?.user?.companyName || "Dayflow";
  const companyLogo = session?.user?.companyLogo;
  const companyInitials = session?.user?.companyInitials || companyName.slice(0, 2).toUpperCase() || "DF";

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Organization Branding & Top Collapse/Expand Toggle */}
      <div className="flex items-center h-14 border-b border-sidebar-border flex-shrink-0 px-2.5 justify-between">
        <Link
          href={isAdmin ? "/organization" : "/dashboard"}
          className="flex items-center gap-2.5 overflow-hidden hover:opacity-85 transition-opacity group"
          title={collapsed ? `${companyName} (Organization)` : undefined}
        >
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className={cn("rounded-lg object-cover flex-shrink-0 border", collapsed ? "w-7 h-7" : "w-8 h-8")}
            />
          ) : (
            <div
              className={cn(
                "rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold flex-shrink-0 shadow-xs group-hover:ring-2 ring-primary/30 transition-all",
                collapsed ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs"
              )}
            >
              {companyInitials}
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-sidebar-foreground tracking-tight truncate leading-tight">
                {companyName}
              </span>
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
                Organization
              </span>
            </div>
          )}
        </Link>

        {/* Top Toggle Button (Expand when collapsed, Collapse when expanded) */}
        {onToggle && (
          <Tooltip>
            <TooltipTrigger render={<span />}>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const navItem = (
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/50"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger render={<span />}>{navItem}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            <div key={item.href}>{navItem}</div>
          );
        })}
      </nav>

      {/* Footer: Logout */}
      <div className="flex-shrink-0 border-t border-sidebar-border p-2">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

