import { createFileRoute } from "@tanstack/react-router";
import { Activity, Cpu, Server, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui-kit";
import { systemHealth } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/monitoring")({
  component: Monitoring,
  head: () => ({ meta: [{ title: "System Monitoring — Nexus AI" }] }),
});

const tooltipStyle = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 };
const series = (base: number) => Array.from({ length: 24 }, (_, i) => ({ t: i, v: base + Math.sin(i / 2) * 8 + Math.random() * 6 }));

function Monitoring() {
  return (
    <div className="space-y-6">
      <PageHeader title="System Monitoring" description="Real-time health and performance of platform services." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "API Uptime", v: "99.99%", i: Server, c: "success" },
          { l: "OCR Engine", v: "Operational", i: Cpu, c: "success" },
          { l: "Queue Depth", v: "184", i: Activity, c: "info" },
          { l: "Active Jobs", v: "62", i: Zap, c: "primary" },
        ].map((s) => (
          <Card key={s.l}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
                <div className="text-2xl font-bold mt-1">{s.v}</div>
              </div>
              <div className={`size-10 rounded-lg grid place-items-center bg-${s.c}/15 text-${s.c}`}><s.i className="size-5" /></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { name: "API Latency (ms)", data: series(85), color: "var(--color-chart-1)" },
          { name: "OCR Throughput (docs/min)", data: series(42), color: "var(--color-chart-2)" },
          { name: "Queue Processing Rate", data: series(120), color: "var(--color-chart-3)" },
          { name: "Error Rate (%)", data: series(2), color: "var(--color-destructive)" },
        ].map((g) => (
          <Card key={g.name}>
            <CardHeader title={g.name} subtitle="Last 24 hours" />
            <div className="h-44">
              <ResponsiveContainer>
                <LineChart data={g.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="t" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="v" stroke={g.color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Service Health" subtitle="All platform services" />
        <div className="space-y-2">
          {systemHealth.map((s) => (
            <div key={s.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/40">
              <div className="flex items-center gap-3">
                <span className={`size-2.5 rounded-full ${s.status === "Operational" ? "bg-success animate-pulse-glow" : "bg-warning"}`} />
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">Latency: {s.latency} · Uptime: {s.uptime}</div>
                </div>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
