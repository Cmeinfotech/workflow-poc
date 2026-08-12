import { createFileRoute } from "@tanstack/react-router";
import { Search, Download, Filter } from "lucide-react";
import { Card, PageHeader, Btn } from "@/components/ui-kit";
import { auditLogs } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/audit-logs")({
  component: AuditLogs,
  head: () => ({ meta: [{ title: "Audit Logs — Nexus AI" }] }),
});

function AuditLogs() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Logs"
        description="Immutable activity log of every action across the platform — for compliance and forensics."
        actions={
          <>
            <Btn variant="outline" size="sm"><Filter className="size-3.5" />Filters</Btn>
            <Btn variant="outline" size="sm"><Download className="size-3.5" />Export</Btn>
          </>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input placeholder="Search by actor, action, target…" className="w-full h-9 pl-8 pr-3 text-sm rounded-lg bg-card border border-border focus:outline-none focus:border-primary/60" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Timestamp</th>
              <th className="px-3 py-3 font-medium">Actor</th>
              <th className="px-3 py-3 font-medium">Action</th>
              <th className="px-3 py-3 font-medium">Target</th>
              <th className="px-5 py-3 font-medium">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {[...auditLogs, ...auditLogs, ...auditLogs].map((l, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition">
                <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">{l.time}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-gradient-to-br from-chart-1 to-chart-4 grid place-items-center text-[9px] font-semibold text-primary-foreground">
                      {l.actor.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="text-sm">{l.actor}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5"><span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary">{l.action}</span></td>
                <td className="px-3 py-2.5 font-mono text-xs">{l.target}</td>
                <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
