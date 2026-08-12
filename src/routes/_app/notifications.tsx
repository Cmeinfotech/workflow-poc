import { createFileRoute } from "@tanstack/react-router";
import { Bell, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Card, CardHeader, PageHeader, Btn } from "@/components/ui-kit";
import { notifications } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/notifications")({
  component: Notifications,
  head: () => ({ meta: [{ title: "Notifications — Nexus AI" }] }),
});

const iconFor = (t: string) =>
  t === "error" ? XCircle : t === "warning" ? AlertTriangle : t === "success" ? CheckCircle2 : Info;

function Notifications() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications Center"
        description="System alerts, approval requests, SLA breaches and operational events."
        actions={
          <>
            <Btn variant="outline" size="sm">Mark all read</Btn>
            <Btn variant="outline" size="sm">Preferences</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader title="Channels" />
          <div className="space-y-2">
            {[
              { name: "All", count: 9 },
              { name: "SLA Alerts", count: 3 },
              { name: "Approvals", count: 4 },
              { name: "System", count: 2 },
              { name: "Integrations", count: 1 },
              { name: "Mentions", count: 0 },
            ].map((c) => (
              <button key={c.name} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-accent/40 transition">
                <span>{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.count}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Recent" subtitle="Latest 50 notifications" />
          <div className="space-y-2">
            {[...notifications, ...notifications].map((n, i) => {
              const Icon = iconFor(n.type);
              return (
                <div key={i} className="flex gap-3 p-3 rounded-lg border border-border bg-card/40 hover:border-primary/30 transition">
                  <div className={`size-9 rounded-lg grid place-items-center shrink-0 ${
                    n.type === "error" ? "bg-destructive/15 text-destructive" :
                    n.type === "warning" ? "bg-warning/15 text-warning" :
                    n.type === "success" ? "bg-success/15 text-success" :
                    "bg-info/15 text-info"
                  }`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.body}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">{n.time}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
