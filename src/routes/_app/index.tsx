import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2, ClipboardCheck, Clock3, Download, FileInput, ScanText, Settings2, UserCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Btn, Card, CardHeader, PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard - Chiaro OCR Inventory" },
      { name: "description", content: "Operational dashboard for OCR inventory processing." },
    ],
  }),
});

const workflowDistribution = [
  { name: "Received", value: 4820, color: "var(--color-chart-1)" },
  { name: "OCR Review", value: 3840, color: "var(--color-chart-2)" },
  { name: "Processing", value: 3260, color: "var(--color-chart-3)" },
  { name: "QC", value: 2710, color: "var(--color-chart-4)" },
  { name: "Audit", value: 1680, color: "var(--color-chart-5)" },
  { name: "Export", value: 3240, color: "var(--color-success)" },
  { name: "Exception", value: 420, color: "var(--color-destructive)" },
];

const processingTimeSummary = [
  {
    label: "Average document processing time",
    value: "1m 58s",
    detail: "Target is less than 2 minutes",
    icon: Clock3,
    tone: "bg-success/15 text-success",
  },
];

const hourlyVolume = [
  { time: "12 AM", received: 92, completed: 74 },
  { time: "1 AM", received: 78, completed: 69 },
  { time: "2 AM", received: 64, completed: 58 },
  { time: "3 AM", received: 56, completed: 51 },
  { time: "4 AM", received: 71, completed: 63 },
  { time: "5 AM", received: 108, completed: 88 },
  { time: "6 AM", received: 180, completed: 120 },
  { time: "7 AM", received: 260, completed: 190 },
  { time: "8 AM", received: 420, completed: 310 },
  { time: "9 AM", received: 560, completed: 450 },
  { time: "10 AM", received: 680, completed: 590 },
  { time: "11 AM", received: 710, completed: 640 },
  { time: "12 PM", received: 740, completed: 680 },
  { time: "1 PM", received: 690, completed: 650 },
  { time: "2 PM", received: 630, completed: 610 },
  { time: "3 PM", received: 610, completed: 580 },
  { time: "4 PM", received: 590, completed: 540 },
  { time: "5 PM", received: 520, completed: 500 },
  { time: "6 PM", received: 480, completed: 460 },
  { time: "7 PM", received: 420, completed: 390 },
  { time: "8 PM", received: 360, completed: 340 },
  { time: "9 PM", received: 330, completed: 300 },
  { time: "10 PM", received: 290, completed: 270 },
  { time: "11 PM", received: 210, completed: 196 },
];

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-popover-foreground)",
  fontSize: 12,
};

function Dashboard() {
  const orderedMetrics = [
    { label: "Received files", status: "Received", to: "/inventory", icon: FileInput, tone: "text-info bg-info/12", bar: "bg-info", inProgress: "0", inQueue: "0", completedToday: "0", progress: 0, aged: "No aged items", footer: "! updated automatically" },
    { label: "OCR processing", status: "OCR Queue", to: "/ocr-review-queue", icon: ScanText, tone: "text-success bg-success/12", bar: "bg-success", inProgress: "0", inQueue: "0", completedToday: "1", progress: 100, aged: "No aged items", footer: "Updated automatically" },
    { label: "Processing Queue", status: "Processing", to: "/processing-queue", icon: Settings2, tone: "text-warning bg-warning/12", bar: "bg-warning", inProgress: "0", inQueue: "5", completedToday: "1", progress: 17, aged: "Oldest: 1d" },
    { label: "QC Queue", status: "QC", to: "/qc-review", icon: ClipboardCheck, tone: "text-primary bg-primary/12", bar: "bg-primary", inProgress: "0", inQueue: "1", completedToday: "0", progress: 0, aged: "No aged items" },
    { label: "Audit Queue", status: "Audit", to: "/manual-review", icon: UserCheck, tone: "text-destructive bg-destructive/12", bar: "bg-destructive", inProgress: "0", inQueue: "0", completedToday: "0", progress: 0, aged: "No aged items" },
    { label: "Exceptions", status: "Exception", to: "/exceptions", icon: AlertTriangle, tone: "text-success bg-success/12", bar: "bg-success", inProgress: "0", inQueue: "0", completedToday: "0", progress: 0, aged: "No aged items" },
    { label: "Ready and completed", status: "Export", to: "/export", icon: Download, tone: "text-destructive bg-destructive/12", bar: "bg-destructive", inProgress: "0", inQueue: "0", completedToday: "0", progress: 0, aged: "No aged items" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Live document workload, throughput, and queue health across the OCR workflow."
        actions={
          <Btn variant="success" size="sm" className="border-success/40 bg-success/20 text-success animate-pulse-glow hover:bg-success/30">
            <Activity className="size-3.5" />
            <span className="size-2 rounded-full bg-success animate-pulse" />
            Live Sync
          </Btn>
        }
      />

      <div className="order-3 grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <Card className="flex h-full w-full flex-col p-4">
          <CardHeader title="Workflow Distribution" subtitle="Current records by processing stage" />
          <div className="grid flex-1 items-center gap-4 lg:grid-cols-[220px_minmax(240px,320px)] lg:justify-start">
            <div className="relative h-44 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workflowDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  >
                    {workflowDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => Number(value).toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <div className="text-xl font-bold tabular-nums">39,950</div>
                <div className="text-[11px] text-muted-foreground">active records</div>
              </div>
            </div>
            <div className="grid w-full gap-2">
              {workflowDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid content-start gap-4">
          {processingTimeSummary.map((metric) => {
            const Icon = metric.icon;

            return (
              <Card key={metric.label} className="flex items-center p-4">
                <div className="flex w-full items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${metric.tone}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="max-w-64 text-sm font-medium leading-snug text-muted-foreground">
                        {metric.label}
                      </div>
                      <div className="mt-2 text-sm leading-snug text-muted-foreground">
                        {metric.detail}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-3xl font-bold leading-none tabular-nums">
                    {metric.value}
                  </div>
                </div>
              </Card>
            );
          })}
          <Card className="p-4">
            <CardHeader title="Hourly Throughput" subtitle="Received vs completed documents today" />
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyVolume} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="time"
                    interval={3}
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="received" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <div className="order-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-success/15 text-success">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">24-hour completion rate</div>
            <div className="text-lg font-bold tabular-nums">91.2%</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <ArrowUpRight className="size-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Documents completed today</div>
            <div className="text-lg font-bold tabular-nums">3,650</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning">
            <Activity className="size-4" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Average Handling Time</div>
            <div className="text-lg font-bold tabular-nums">1m 58s</div>
          </div>
        </div>
      </div>

      <div className="order-2">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Operational Queues</h2>
          <p className="text-xs text-muted-foreground">Open a stage to review and process its current workload.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {orderedMetrics.map((metric, index) => {
            if (!metric) return null;
            const Icon = metric.icon;
            const gridSpan = index < 4
              ? ""
              : index === 6
                ? "xl:col-span-1"
                : "";

            return (
              <Link key={metric.label} to={metric.to} className={`group ${gridSpan}`}>
                <Card className="h-full min-h-36 p-4 transition group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${metric.tone}`}>
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{metric.status}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{metric.label}</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 divide-x divide-border">
                    <div className="pr-3">
                      <div className="text-[10px] font-medium uppercase text-muted-foreground">In progress</div>
                      <div className="mt-1 text-xl font-bold tabular-nums">{metric.inProgress}</div>
                    </div>
                    <div className="pl-3">
                      <div className="text-[10px] font-medium uppercase text-muted-foreground">In queue</div>
                      <div className="mt-1 text-xl font-bold tabular-nums">{metric.inQueue}</div>
                    </div>
                    <div className="pl-3">
                      <div className="text-[10px] font-medium uppercase text-muted-foreground">Completed today</div>
                      <div className="mt-1 text-xl font-bold tabular-nums text-muted-foreground">{metric.completedToday}</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Stage completion</span>
                      <span className="font-semibold tabular-nums text-foreground">{metric.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${metric.bar}`} style={{ width: `${metric.progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] font-medium text-muted-foreground">{metric.aged}</div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] font-medium text-primary">
                    <span>{metric.footer ?? "Open queue"}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
