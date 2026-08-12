import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle, AlertTriangle, IndianRupee } from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge, Btn } from "@/components/ui-kit";
import { workflowQueue } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/approvals")({
  component: Approvals,
  head: () => ({ meta: [{ title: "Approval Management — Nexus AI" }] }),
});

const hierarchy = [
  { level: "L1 · Reviewer", limit: "Up to ₹50,000", users: "Reviewer team (24)" },
  { level: "L2 · Team Lead", limit: "₹50,000 – ₹5,00,000", users: "8 team leads" },
  { level: "L3 · Manager", limit: "₹5,00,000 – ₹50,00,000", users: "12 managers" },
  { level: "L4 · CFO", limit: "Above ₹50,00,000", users: "1 user" },
];

function Approvals() {
  const pending = workflowQueue.filter((w) => w.status === "Pending Review" && w.stage === "Manager Approval");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Management"
        description="Multi-level approval routing based on amount thresholds and document type."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { l: "Awaiting My Approval", v: "8", i: AlertTriangle, c: "warning" },
          { l: "Approved Today", v: "47", i: CheckCircle2, c: "success" },
          { l: "Rejected Today", v: "3", i: XCircle, c: "destructive" },
          { l: "Total Value Pending", v: "₹2.4 Cr", i: IndianRupee, c: "primary" },
        ].map((s) => (
          <Card key={s.l}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
                <div className="text-2xl font-bold mt-1">{s.v}</div>
              </div>
              <div className={`size-10 rounded-lg grid place-items-center bg-${s.c}/15 text-${s.c}`}>
                <s.i className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Pending Approvals" subtitle="Awaiting your decision" />
          <div className="space-y-2">
            {pending.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">All caught up — no pending approvals.</div>
            )}
            {pending.map((w) => (
              <div key={w.id} className="p-4 rounded-lg border border-border bg-card/40 hover:border-primary/40 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{w.document}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{w.vendor} · {w.id}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={w.priority} />
                      <span className="text-xs text-muted-foreground">SLA: {w.sla}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums">{w.amount}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{w.type}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Btn variant="success" size="sm" className="flex-1"><CheckCircle2 className="size-3.5" />Approve</Btn>
                  <Btn variant="destructive" size="sm" className="flex-1"><XCircle className="size-3.5" />Reject</Btn>
                  <Btn variant="outline" size="sm">Delegate</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Approval Hierarchy" subtitle="Routing matrix" />
          <div className="space-y-3">
            {hierarchy.map((h, i) => (
              <div key={h.level} className="relative">
                {i < hierarchy.length - 1 && <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />}
                <div className="flex gap-3">
                  <div className="size-8 rounded-lg gradient-primary text-primary-foreground grid place-items-center text-xs font-bold shrink-0 z-10">
                    L{i + 1}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="font-medium text-sm">{h.level}</div>
                    <div className="text-xs text-muted-foreground">{h.limit}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{h.users}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
