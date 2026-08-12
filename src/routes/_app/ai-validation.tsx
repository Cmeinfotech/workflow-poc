import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from "recharts";
import { Card, CardHeader, PageHeader, ConfidenceBadge, StatusBadge, Btn } from "@/components/ui-kit";
import { workflowQueue } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/ai-validation")({
  component: AIValidation,
  head: () => ({ meta: [{ title: "AI Validation — Nexus AI" }] }),
});

const validators = [
  { name: "Vendor Master Lookup", passed: 1842, failed: 38 },
  { name: "GSTIN Format Check", passed: 1798, failed: 82 },
  { name: "Duplicate Detection", passed: 1860, failed: 20 },
  { name: "PO Match", passed: 1690, failed: 190 },
  { name: "Amount Range", passed: 1844, failed: 36 },
  { name: "Date Validity", passed: 1872, failed: 8 },
];

const radialData = [
  { name: "Auto-approved", value: 78, fill: "var(--color-chart-2)" },
  { name: "Sent for review", value: 18, fill: "var(--color-chart-3)" },
  { name: "Rejected", value: 4, fill: "var(--color-destructive)" },
];

const tooltipStyle = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-popover-foreground)" };

function AIValidation() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Validation"
        description="Real-time AI-powered validation rules running across the document pipeline."
        actions={<Btn variant="primary" size="sm"><Sparkles className="size-3.5" />Configure Models</Btn>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { l: "Validations / day", v: "11,284", i: Sparkles, c: "primary" },
          { l: "Pass Rate", v: "94.7%", i: CheckCircle2, c: "success" },
          { l: "Anomalies Flagged", v: "318", i: AlertTriangle, c: "warning" },
          { l: "Time Saved", v: "682 hrs", i: TrendingUp, c: "info" },
        ].map((s) => (
          <Card key={s.l}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-muted-foreground tracking-wider">{s.l}</div>
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
          <CardHeader title="Validator Performance" subtitle="Pass / fail per validator (last 24h)" />
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={validators} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={11} width={140} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="passed" stackId="a" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="failed" stackId="a" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Routing Outcomes" subtitle="What AI did with documents" />
          <div className="h-72">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="30%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" cornerRadius={8} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Tooltip contentStyle={tooltipStyle} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent AI Decisions" subtitle="Live feed of AI validation outcomes" />
        <div className="space-y-2">
          {workflowQueue.slice(0, 8).map((w) => (
            <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40">
              <div className="size-8 rounded-lg bg-primary/15 text-primary grid place-items-center">
                <Sparkles className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{w.document}</div>
                <div className="text-xs text-muted-foreground">
                  {w.confidence >= 90 ? "All checks passed" :
                   w.confidence >= 75 ? "Low confidence on GSTIN" :
                   "Multiple anomalies detected"}
                </div>
              </div>
              <ConfidenceBadge value={w.confidence} />
              <StatusBadge status={w.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
