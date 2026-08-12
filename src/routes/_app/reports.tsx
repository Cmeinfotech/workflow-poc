import { createFileRoute } from "@tanstack/react-router";
import { Download, Calendar } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardHeader, PageHeader, Btn } from "@/components/ui-kit";
import { workflowTrend, accuracyTrend, reviewerProductivity } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/reports")({
  component: Reports,
  head: () => ({ meta: [{ title: "Reports & Analytics — Nexus AI" }] }),
});

const tooltipStyle = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-popover-foreground)" };

const turnaround = [
  { week: "W1", hours: 4.2 }, { week: "W2", hours: 3.8 }, { week: "W3", hours: 3.2 },
  { week: "W4", hours: 2.9 }, { week: "W5", hours: 2.6 }, { week: "W6", hours: 2.4 },
  { week: "W7", hours: 2.2 }, { week: "W8", hours: 2.0 },
];

const heatmap = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => ({
    intensity: Math.round(Math.sin(h / 3) * Math.cos(d / 2) * 50 + 50 + Math.random() * 30),
  })),
);
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Operational insights, trend analysis and downloadable enterprise reports."
        actions={
          <>
            <Btn variant="outline" size="sm"><Calendar className="size-3.5" />Last 30 days</Btn>
            <Btn variant="outline" size="sm">Filters</Btn>
            <Btn variant="primary" size="sm"><Download className="size-3.5" />Export Report</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Document Processing Volume" subtitle="Throughput trend" />
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={workflowTrend}>
                <defs>
                  <linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="processed" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#rg1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Workflow Turnaround" subtitle="Avg. hours, weekly" />
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={turnaround}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="hours" stroke="var(--color-chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="OCR Accuracy Trend" subtitle="Monthly average %" />
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={accuracyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis domain={[90, 100]} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="accuracy" stroke="var(--color-chart-2)" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Reviewer Productivity" subtitle="Top performers this week" />
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={reviewerProductivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="reviewed" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Workflow Heatmap" subtitle="Volume by day of week × hour of day" />
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="flex items-center gap-1 mb-1 pl-10">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">{h}</div>
              ))}
            </div>
            {heatmap.map((row, d) => (
              <div key={d} className="flex items-center gap-1 mb-1">
                <div className="w-9 text-xs text-muted-foreground">{days[d]}</div>
                {row.map((c, h) => (
                  <div
                    key={h}
                    className="flex-1 aspect-square rounded-sm"
                    style={{
                      background: `oklch(0.68 0.17 235 / ${Math.min(c.intensity / 100, 1)})`,
                    }}
                    title={`${days[d]} ${h}:00 — ${c.intensity}`}
                  />
                ))}
              </div>
            ))}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Less</span>
              {[0.15, 0.3, 0.5, 0.75, 1].map((v) => (
                <div key={v} className="size-3 rounded-sm" style={{ background: `oklch(0.68 0.17 235 / ${v})` }} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
