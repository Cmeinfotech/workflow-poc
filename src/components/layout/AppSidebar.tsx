import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  ScanText,
  ClipboardCheck,
  Download,
  AlertTriangle,
  ChevronDown,
  Settings2,
  UserCheck,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type AccessTabKey, getAllowedKeysForUser } from "@/lib/access-management";
import { ChiaroLogo } from "@/components/brand/ChiaroLogo";
import { getAuthSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getQueueCount, queueExists, readQueue } from "@/lib/workflow-state";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  accessKey: AccessTabKey;
};
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, accessKey: "dashboard" },
      { label: "Inventory", to: "/inventory", icon: ListChecks, badge: "186", accessKey: "inventory" },
      { label: "OCR Review", to: "/ocr-review-queue", icon: ScanText, badge: "42", accessKey: "ocrReview" },
      { label: "Processing Queue", to: "/processing-queue", icon: Settings2, badge: "6120", accessKey: "processingQueue" },
      { label: "QC", to: "/qc-review", icon: ClipboardCheck, badge: "31", accessKey: "qc" },
      { label: "Audit", to: "/manual-review", icon: UserCheck, badge: "4", accessKey: "audit" },
      { label: "Export", to: "/export", icon: Download, badge: "18", accessKey: "export" },
      { label: "Exception", to: "/exceptions", icon: AlertTriangle, badge: "9", accessKey: "exception" },
    ],
  },
  {
    label: "Access Management",
    items: [
      { label: "Users", to: "/users", icon: Users, accessKey: "users" },
      { label: "Roles", to: "/roles", icon: ShieldCheck, accessKey: "roles" },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [queueVersion, setQueueVersion] = useState(0);
  const [collapsed, setCollapsed] = useState(true);
  const [session, setSession] = useState(() => getAuthSession());
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map((s) => [s.label, true])),
  );
  const exportQueue = queueExists("export") ? readQueue("export") : [];
  const exportCount = queueExists("export")
    ? exportQueue.filter((record) => ["Export Ready", "Export Completed"].includes(record.status))
        .length
    : 2;
  const allowedKeys = getAllowedKeysForUser(session?.role ?? "Admin", session?.email);
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowedKeys.has(item.accessKey)),
    }))
    .filter((section) => section.items.length > 0);
  const badgeByLabel: Record<string, string> = {
    Inventory: String(getQueueCount("inventory", Array.from({ length: 6 }))),
    "OCR Review": String(getQueueCount("ocr", Array.from({ length: 42 }))),
    "Processing Queue": "6120",
    QC: String(getQueueCount("qc", Array.from({ length: 31 }))),
    Audit: String(getQueueCount("manual", Array.from({ length: 4 }))),
    Export: String(exportCount),
    Exception: String(getQueueCount("exception", Array.from({ length: 1 }))),
  };
  void queueVersion;

  useEffect(() => {
    const refresh = () => setQueueVersion((value) => value + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("dataspan-workflow-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dataspan-workflow-change", refresh);
    };
  }, []);

  useEffect(() => {
    const syncSession = () => setSession(getAuthSession());
    window.addEventListener("storage", syncSession);
    window.addEventListener("dataspan-auth-change", syncSession);
    window.addEventListener("dataspan-users-change", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("dataspan-auth-change", syncSession);
      window.removeEventListener("dataspan-users-change", syncSession);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-sidebar-width", collapsed ? "5rem" : "16rem");
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 overflow-hidden transition-[width] duration-300",
      )}
      style={{
        width: collapsed ? "5rem" : "16rem",
        minWidth: collapsed ? "5rem" : "16rem",
        maxWidth: collapsed ? "5rem" : "16rem",
      }}
    >
      <div
        className={cn(
          "sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-3",
          collapsed ? "justify-start" : "gap-2",
        )}
      >
        <div className="flex w-14 shrink-0 justify-center">
          <button
            type="button"
            aria-label={collapsed ? "Expand side menu" : "Collapse side menu"}
            title={collapsed ? "Expand side menu" : "Collapse side menu"}
            onClick={() => setCollapsed((value) => !value)}
            className="shrink-0 rounded-xl transition hover:ring-2 hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <img
              src="/chiaro-favicon.png"
              alt="Chiaro"
              className="size-11 rounded-xl object-contain p-1 shadow-sm ring-1 ring-sidebar-border"
            />
          </button>
        </div>
        {!collapsed && (
          <ChiaroLogo className="min-w-0 flex-1 justify-start gap-1.5" iconClassName="hidden" textClassName="text-2xl" />
        )}
      </div>

      <TooltipProvider delayDuration={100}>
        <nav className={cn("flex-1 overflow-y-auto px-2 py-3", !collapsed && "space-y-5")}>
          {visibleSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <button
                  onClick={() => setOpen((o) => ({ ...o, [section.label]: !o[section.label] }))}
                  className="mb-1.5 flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-sidebar-accent-foreground"
                >
                  {section.label}
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform",
                      !open[section.label] && "-rotate-90",
                    )}
                  />
                </button>
              )}
              {(collapsed || open[section.label]) && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
                    const Icon = item.icon;
                    const navLink = (
                      <Link
                        to={item.to}
                        aria-label={collapsed ? item.label : undefined}
                        className={cn(
                          "group relative flex h-10 items-center rounded-lg text-sm transition",
                          collapsed ? "justify-center px-0" : "gap-3 px-2.5",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-elegant"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {item.badge && !collapsed && (
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                              item.label === "Exception"
                                ? "bg-destructive/15 text-destructive"
                                : active
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {badgeByLabel[item.label] ?? item.badge}
                          </span>
                        )}
                      </Link>
                    );

                    return collapsed ? (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                        <TooltipContent
                          side="right"
                          sideOffset={10}
                          className="border border-primary/20 bg-background/65 text-foreground shadow-[0_0_20px_rgba(59,130,246,0.2)] backdrop-blur-xl"
                        >
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={item.to}>{navLink}</div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  );
}



