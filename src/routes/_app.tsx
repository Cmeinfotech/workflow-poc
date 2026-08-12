import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  LayoutDashboard,
  ListChecks,
  ScanText,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageHeaderPortalContext } from "@/components/layout/PageHeaderPortal";
import { TopBar } from "@/components/layout/TopBar";
import { type AccessTabKey, getAllowedKeysForUser } from "@/lib/access-management";
import { getAuthSession, isAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;

    if (!isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    const session = getAuthSession();
    const accessKey = getRouteAccessKey(location.pathname);
    if (session && accessKey && !getAllowedKeysForUser(session.role, session.email).has(accessKey)) {
      throw redirect({ to: "/" });
    }
  },
  component: AppLayout,
});

function getRouteAccessKey(pathname: string): AccessTabKey | null {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/ocr-review-queue")) return "ocrReview";
  if (pathname.startsWith("/processing-queue")) return "processingQueue";
  if (pathname.startsWith("/qc-review")) return "qc";
  if (pathname.startsWith("/manual-review")) return "audit";
  if (pathname.startsWith("/export")) return "export";
  if (pathname.startsWith("/exceptions")) return "exception";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/roles")) return "roles";
  return null;
}

function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [allowed, setAllowed] = useState(false);
  const [session, setSession] = useState(() => getAuthSession());
  const [pageHeaderTarget, setPageHeaderTarget] = useState<HTMLDivElement | null>(null);
  const showTaskbar = pathname === "/ocr-review-queue" || pathname === "/qc-review";

  useEffect(() => {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    try { localStorage.setItem("nexus-theme", "light"); } catch {}
  }, []);

  useEffect(() => {
    const checkAccess = () => {
      const session = getAuthSession();
      const hasSession = Boolean(session);
      setAllowed(hasSession);
      if (session) setSession(session);
      if (!hasSession) navigate({ to: "/login", search: { redirect: window.location.pathname } });
    };

    checkAccess();
    window.addEventListener("storage", checkAccess);
    window.addEventListener("dataspan-auth-change", checkAccess);
    window.addEventListener("dataspan-users-change", checkAccess);
    return () => {
      window.removeEventListener("storage", checkAccess);
      window.removeEventListener("dataspan-auth-change", checkAccess);
      window.removeEventListener("dataspan-users-change", checkAccess);
    };
  }, [navigate]);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center">
        <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-elegant">
          Checking secure session...
        </div>
      </div>
    );
  }

  return (
    <PageHeaderPortalContext.Provider value={{ target: pageHeaderTarget, setTarget: setPageHeaderTarget }}>
      <div className="h-screen flex w-full bg-background text-foreground overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <TopBar />
          <OverviewNav session={session} />
          <main className={cn("flex-1 p-4 lg:p-6 fade-in-up min-h-0", showTaskbar ? "overflow-hidden p-0 pb-12" : "overflow-y-auto")}>
            <Outlet />
          </main>
        </div>
        {showTaskbar && <WorkflowTaskbar />}
      </div>
    </PageHeaderPortalContext.Provider>
  );
}

const overviewItems: Array<{
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  accessKey: AccessTabKey;
}> = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, accessKey: "dashboard" },
  { label: "Inventory", to: "/inventory", icon: ListChecks, accessKey: "inventory" },
  { label: "OCR Review", to: "/ocr-review-queue", icon: ScanText, accessKey: "ocrReview" },
  { label: "Processing Queue", to: "/processing-queue", icon: Settings2, accessKey: "processingQueue" },
  { label: "QC", to: "/qc-review", icon: ClipboardCheck, accessKey: "qc" },
  { label: "Audit", to: "/manual-review", icon: UserCheck, accessKey: "audit" },
  { label: "Export", to: "/export", icon: Download, accessKey: "export" },
  { label: "Exception", to: "/exceptions", icon: AlertTriangle, accessKey: "exception" },
  { label: "Users", to: "/users", icon: Users, accessKey: "users" },
  { label: "Roles", to: "/roles", icon: ShieldCheck, accessKey: "roles" },
];

function OverviewNav({ session }: { session: ReturnType<typeof getAuthSession> }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const allowedKeys = getAllowedKeysForUser(session?.role ?? "Admin", session?.email);
  const visibleItems = overviewItems.filter((item) => allowedKeys.has(item.accessKey));

  return (
    <div className="border-b border-border bg-background/95 px-3 py-2 lg:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {visibleItems.map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function WorkflowTaskbar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isOcrReview = pathname === "/ocr-review-queue";
  const triggerAction = (action: string) => window.dispatchEvent(new Event(action));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:left-[var(--app-sidebar-width,16rem)]">
      <div className="flex h-12 items-center justify-end px-2 lg:px-4">
        <div className="flex shrink-0 items-center gap-1.5">
          {isOcrReview ? (
            <>
              <button
                type="button"
                onClick={() => triggerAction("dataspan-ocr-processing")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-success/30 bg-success/15 px-2.5 text-[11px] font-medium text-success transition hover:bg-success/25"
              >
                <CheckCircle2 className="size-3.5" />
                <span className="hidden sm:inline">Send to Processing</span>
              </button>
              <button
                type="button"
                onClick={() => triggerAction("dataspan-ocr-exception")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive transition hover:bg-destructive/20"
              >
                <AlertTriangle className="size-3.5" />
                <span className="hidden sm:inline">Send to Exception</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => triggerAction("dataspan-qc-export")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-success/30 bg-success/15 px-2.5 text-[11px] font-medium text-success transition hover:bg-success/25"
              >
                <CheckCircle2 className="size-3.5" />
                <span className="hidden sm:inline">Send to Export</span>
              </button>
              <button
                type="button"
                onClick={() => triggerAction("dataspan-qc-exception")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive transition hover:bg-destructive/20"
              >
                <AlertTriangle className="size-3.5" />
                <span className="hidden sm:inline">Send to Exception</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


