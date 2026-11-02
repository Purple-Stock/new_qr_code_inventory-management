"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  MapPin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Move,
  FileText,
  BarChart3,
  Tag,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ScanLine,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { fetchApiResult } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";
import { AppHeader } from "@/components/brand/AppHeader";
import Link from "next/link";

interface TeamLayoutProps {
  team: { id: number; name: string };
  activeMenuItem?: string;
  children: React.ReactNode;
}

export function TeamLayout({ team, activeMenuItem, children }: TeamLayoutProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const teamId = team.id.toString();

  const handleSignOut = async () => {
    await fetchApiResult("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    router.push("/");
  };

  const menuItems = [
    { icon: Home, label: t.menu.itemList, href: `/teams/${teamId}/items`, key: "items" },
    { icon: MapPin, label: t.menu.locations, href: `/teams/${teamId}/locations`, key: "locations" },
    { icon: ArrowUp, label: t.menu.stockIn, href: `/teams/${teamId}/stock-in`, key: "stock-in" },
    { icon: ArrowDown, label: t.menu.stockOut, href: `/teams/${teamId}/stock-out`, key: "stock-out" },
    { icon: RotateCcw, label: t.menu.adjust, href: `/teams/${teamId}/adjust`, key: "adjust" },
    { icon: Move, label: t.menu.move, href: `/teams/${teamId}/move`, key: "move" },
    { icon: FileText, label: t.menu.transactions, href: `/teams/${teamId}/transactions`, key: "transactions" },
    { icon: ScanLine, label: t.menu.scan, href: `/teams/${teamId}/scan`, key: "scan" },
    { icon: BarChart3, label: t.menu.stockByLocation, href: `/teams/${teamId}/stock-by-location`, key: "stock-by-location" },
    { icon: Tag, label: t.menu.labels, href: `/teams/${teamId}/labels`, key: "labels" },
    { icon: FileBarChart, label: t.menu.reports, href: `/teams/${teamId}/reports`, key: "reports" },
    { icon: Settings, label: t.menu.settings, href: `/teams/${teamId}/settings`, key: "settings" },
  ];

  const renderNav = (onNavigate?: () => void, collapsed = false) => (
    <nav className="flex flex-col gap-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeMenuItem === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              ui.navRow,
              collapsed && "justify-center px-0",
              isActive ? ui.navRowActive : ui.navRowIdle
            )}
          >
            {isActive ? (
              <span className="absolute left-1 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand" />
            ) : null}
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className={ui.page}>
      <AppHeader
        onSignOut={handleSignOut}
        leading={
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 text-ink-2 hover:bg-raised hover:text-ink rounded-lg lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        }
      />

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white lg:hidden",
          "transition-transform duration-300 ease-craft",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between border-b border-hairline pb-4">
            <h3 className="truncate text-base font-medium text-ink">{team.name}</h3>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="rounded-lg p-2 text-ink-3 hover:bg-raised hover:text-ink"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
          <Link
            href="/team_selection"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="mb-4 text-sm font-medium text-brand hover:text-brand-hover"
          >
            {t.common.changeTeam}
          </Link>
          {renderNav(() => setIsMobileSidebarOpen(false))}
        </div>
      </aside>

      <div className="flex flex-col lg:flex-row">
        <aside
          data-tour="tour-sidebar"
          className={cn(
            "relative hidden min-h-[calc(100vh-56px)] border-r border-hairline bg-white lg:block",
            isSidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          <div className={cn("p-4", isSidebarCollapsed && "px-2")}>
            <div className="mb-4 border-b border-hairline pb-4">
              {isSidebarCollapsed ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-raised font-mono text-sm text-ink">
                  {team.name?.charAt(0).toUpperCase() || "T"}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium text-ink">{team.name}</h3>
                  <Link
                    href="/team_selection"
                    className="shrink-0 text-xs font-medium text-brand hover:text-brand-hover"
                  >
                    {t.common.changeTeam}
                  </Link>
                </div>
              )}
            </div>
            {renderNav(undefined, isSidebarCollapsed)}
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute right-0 top-1/2 z-10 flex h-7 w-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-white text-ink-3 hover:text-ink"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </aside>

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
