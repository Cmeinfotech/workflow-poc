import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, AlertTriangle, ChevronDown, LogIn, LogOut, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { ChiaroLogo } from "@/components/brand/ChiaroLogo";
import { usePageHeaderPortal } from "@/components/layout/PageHeaderPortal";
import { getAuthSession, logout, type AuthSession } from "@/lib/auth";

export function TopBar() {
  const navigate = useNavigate();
  const pageHeaderPortal = usePageHeaderPortal();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());

  useEffect(() => {
    const syncSession = () => setSession(getAuthSession());

    window.addEventListener("storage", syncSession);
    window.addEventListener("dataspan-auth-change", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("dataspan-auth-change", syncSession);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-12 shrink-0 border-b border-border glass-strong lg:h-16">
      <div className="flex h-full items-center gap-2 px-3 lg:gap-3 lg:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <ChiaroLogo className="justify-start gap-1.5" iconClassName="size-8" textClassName="text-lg" />
          <div className="leading-tight">
            <div className="hidden text-[10px] text-muted-foreground sm:block">OCR Inventory OS</div>
          </div>
        </div>

        <div ref={pageHeaderPortal?.setTarget} className="hidden min-w-0 flex-1 lg:flex" />

        <div className="flex-1 sm:hidden" />

        {/* Alerts */}
        <button className="relative grid size-8 place-items-center rounded-lg border border-border bg-card transition hover:bg-accent lg:size-9">
          <AlertTriangle className="size-4 text-warning" />
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-warning text-warning-foreground text-[10px] font-bold grid place-items-center">3</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotif((s) => !s)}
            className="relative grid size-8 place-items-center rounded-lg border border-border bg-card transition hover:bg-accent lg:size-9"
          >
            <Bell className="size-4" />
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">9</span>
          </button>
          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border glass-strong shadow-elegant p-2 fade-in-up">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Notifications</span>
                <button className="text-[11px] text-primary hover:underline">Mark all read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {[
                  { t: "3 files waiting in OCR review", b: "Critical", c: "warning" },
                  { t: "Export batch EXP-7740 is ready", b: "Info", c: "info" },
                  { t: "Low confidence SKU moved to exceptions", b: "Error", c: "destructive" },
                ].map((n, i) => (
                  <div key={i} className="px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer">
                    <div className="text-sm font-medium">{n.t}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Just now</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile((s) => !s)}
            className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card pl-1 pr-1 transition hover:bg-accent md:pr-2.5 lg:h-9"
          >
            <div className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-chart-1 to-chart-4 text-[10px] font-semibold text-primary-foreground lg:size-7 lg:text-[11px]">
              {session?.name ? session.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "GU"}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <div className="text-xs font-medium">{session?.name ?? "Guest User"}</div>
              <div className="text-[10px] text-muted-foreground">{session?.role ?? "Not signed in"}</div>
            </div>
            <ChevronDown className="hidden md:block size-3.5 text-muted-foreground" />
          </button>
          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover p-2 shadow-elegant">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold">{session?.name ?? "Guest User"}</div>
                <div className="text-xs text-muted-foreground">{session?.role ?? "Sign in to continue"}</div>
              </div>
              <div className="my-1 h-px bg-border" />
              {!session && (
                <Link
                  to="/login"
                  onClick={() => {
                    setShowProfile(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                >
                  <LogIn className="size-4" />
                  Login
                </Link>
              )}
              {session && (
                <Link
                  to="/settings"
                  onClick={() => {
                    setShowProfile(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                >
                  <Settings className="size-4" />
                  Settings
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setShowProfile(false);
                  navigate({ to: "/login" });
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

