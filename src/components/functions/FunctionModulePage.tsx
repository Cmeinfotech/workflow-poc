import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Cloud,
  Filter,
  Inbox,
  MonitorUp,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Smartphone,
  X,
} from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge, Btn } from "@/components/ui-kit";
import type { FunctionModule } from "@/lib/functions-data";

const tabs = ["Queue", "Rules", "Controls", "Runbook"];

const intakeSources = [
  { name: "Email", detail: "4 inboxes live", status: "Operational", icon: Inbox, volume: "642", sync: "34 sec ago", retries: "0", owner: "Email connector" },
  { name: "API", detail: "3 endpoints", status: "Operational", icon: MonitorUp, volume: "318", sync: "1 min ago", retries: "1", owner: "Gateway" },
  { name: "Portal", detail: "Vendor uploads", status: "Processing", icon: Cloud, volume: "184", sync: "2 min ago", retries: "3", owner: "Vendor portal" },
  { name: "S3", detail: "2 watched folders", status: "Operational", icon: Cloud, volume: "96", sync: "5 min ago", retries: "0", owner: "AWS S3" },
  { name: "Mobile", detail: "Field capture", status: "Pending", icon: Smartphone, volume: "44", sync: "12 min ago", retries: "2", owner: "Field app" },
];

const intakeExceptions = [
  { reason: "Duplicate invoice + vendor pair", count: "21", status: "High", action: "Review duplicate group" },
  { reason: "Unsupported file format", count: "8", status: "Medium", action: "Route to manual intake" },
  { reason: "File above 50MB", count: "5", status: "Medium", action: "Request split upload" },
  { reason: "Virus scan quarantine", count: "3", status: "Critical", action: "Security review" },
];

const intakeHandoffs = [
  { label: "Classification Queue", value: "1,142", status: "Operational" },
  { label: "OCR Queue", value: "96", status: "Processing" },
  { label: "Exception Queue", value: "46", status: "Pending Review" },
];

const intakeStageCounts = [
  { stage: "Received", count: "1,284", status: "Operational" },
  { stage: "Scanned", count: "1,247", status: "Operational" },
  { stage: "Deduped", count: "1,210", status: "Processing" },
  { stage: "Normalized", count: "1,164", status: "Processing" },
  { stage: "Queued", count: "1,142", status: "Operational" },
];

const recentIntakeFiles = [
  { name: "INV-2026-0528-884.pdf", source: "Email", size: "1.8 MB", status: "Queued", destination: "Classification" },
  { name: "vendor-upload-4412.zip", source: "Portal", size: "18.4 MB", status: "Processing", destination: "Virus Scan" },
  { name: "OBL-MSC-90421.pdf", source: "API", size: "940 KB", status: "Queued", destination: "OCR" },
  { name: "s3-invoices-may-28.csv", source: "S3", size: "6.4 MB", status: "Queued", destination: "Classification" },
  { name: "HBL-MAA-1129.jpg", source: "Mobile", size: "3.1 MB", status: "Pending", destination: "Exception" },
];

const intakeMetricDetails: Record<string, { icon: typeof Inbox; accent: string; note: string }> = {
  "Sources Live": {
    icon: Inbox,
    accent: "bg-info/10 text-info",
    note: "Email, API, portal and storage channels online",
  },
  "Files Today": {
    icon: Activity,
    accent: "bg-primary/10 text-primary",
    note: "Accepted intake volume since midnight",
  },
  "Duplicates Blocked": {
    icon: ShieldAlert,
    accent: "bg-warning/10 text-warning",
    note: "Duplicate hash and invoice/vendor checks",
  },
};

export function FunctionModulePage({ module }: { module: FunctionModule }) {
  const [activeTab, setActiveTab] = useState("Queue");
  const [queue, setQueue] = useState(module.queue);
  const [selected, setSelected] = useState(module.queue[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedSource, setSelectedSource] = useState(intakeSources[0].name);
  const [showSourceConfig, setShowSourceConfig] = useState(false);
  const [sourceEnabled, setSourceEnabled] = useState(true);
  const [sourceAutoRetry, setSourceAutoRetry] = useState(true);
  const [sourceQuarantine, setSourceQuarantine] = useState(true);
  const [enabledRules, setEnabledRules] = useState(() => Object.fromEntries(module.rules.map((rule) => [rule, true])));
  const [enabledControls, setEnabledControls] = useState(() => Object.fromEntries(module.controls.map((control) => [control, true])));
  const [activity, setActivity] = useState([
    "Policy evaluated",
    "Owner notified",
    "Audit event written",
  ]);
  const isDocumentIntake = module.slug === "document-intake";
  const activeSource = intakeSources.find((source) => source.name === selectedSource) ?? intakeSources[0];
  const visibleRecentIntakeFiles = recentIntakeFiles.filter((file) => file.source === selectedSource);
  const purposeTitle = isDocumentIntake
    ? "Control room for safely bringing documents into the workflow"
    : `Control room for ${module.shortTitle.toLowerCase()} operations`;
  const purposeDescription = isDocumentIntake
    ? "Use this screen to confirm sources are working, inspect incoming files, resolve intake issues and hand clean documents to the next workflow stage."
    : `Use this screen to monitor ${module.shortTitle.toLowerCase()}, review operational items, tune controls and move work safely to the next stage.`;
  const purposePoints = isDocumentIntake
    ? [
        "Check if Email, API, Portal, S3 and Mobile sources are healthy.",
        "Review blocked files, duplicate checks, quarantine and retry needs.",
        "Release clean documents into Classification, OCR or Exception queues.",
      ]
    : [
        "Monitor module health, queue load and current operating signals.",
        "Review rules, controls and work items that need attention.",
        "Run actions, retries or escalations before handoff to the next stage.",
      ];
  const detailRows = isDocumentIntake
    ? [
        ["Owner", activeSource.owner],
        ["Last sync", activeSource.sync],
        ["Retry count", activeSource.retries],
        ["Volume today", `${activeSource.volume} files`],
      ]
    : [
        ["Owner", module.queue[0]?.owner ?? "Module owner"],
        ["Last run", module.queue[0]?.updated ?? "Just now"],
        ["Open items", String(module.queue.length)],
        ["Primary metric", `${module.metrics[0]?.value ?? "0"} ${module.metrics[0]?.label ?? "tracked"}`],
      ];
  const timelineItems = isDocumentIntake
    ? intakeStageCounts
    : module.workflow.map((stage, index) => {
        const metric = module.metrics[index % module.metrics.length];
        return {
          stage,
          count: metric?.value ?? String(index + 1),
          status: metric?.status ?? "Operational",
        };
      });
  const attentionActions = isDocumentIntake
    ? intakeExceptions
    : module.rules.slice(0, 4).map((rule, index) => ({
        reason: rule,
        count: String(module.queue.length + index + 1),
        status: index === 0 ? "High" : index === 1 ? "Medium" : "Pending",
        action: module.operations[index] ?? "Review rule output",
      }));

  const selectedItem = queue.find((item) => item.id === selected) ?? queue[0];
  const visibleQueue = queue.filter((item) => {
    const matchesSearch = `${item.id} ${item.name} ${item.owner} ${item.status} ${item.priority}`.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = !priorityFilter || item.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const pushActivity = (message: string) => {
    setActivity((items) => [message, ...items].slice(0, 6));
  };

  const updateSelectedStatus = (status: string) => {
    if (!selectedItem) return;
    setQueue((items) => items.map((item) => item.id === selectedItem.id ? { ...item, status, updated: "Just now" } : item));
    pushActivity(`${selectedItem.id} marked ${status}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="size-3.5" /> Functions
        </Link>
        <span>/</span>
        <span className="text-foreground">{module.title}</span>
      </div>

      <PageHeader
        title={module.title}
        description={module.description}
        actions={
          <>
            <Btn
              variant="outline"
              size="sm"
              onClick={() => {
                setShowConfig((open) => !open);
                pushActivity(showConfig ? "Configuration panel closed" : "Configuration panel opened");
              }}
            >
              <Settings2 className="size-3.5" />Configure
            </Btn>
            <Btn variant="outline" size="sm" onClick={() => pushActivity("Test run completed successfully")}>
              <Play className="size-3.5" />Test Run
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              onClick={() => {
                setActiveTab("Rules");
                pushActivity("New rule draft created");
              }}
            >
              <Plus className="size-3.5" />New Rule
            </Btn>
          </>
        }
      />

      {showConfig && (
        <Card>
          <CardHeader
            title="Module Configuration"
            subtitle="Live controls for how this function operates"
            actions={<Btn variant="ghost" size="sm" onClick={() => setShowConfig(false)}><X className="size-3.5" />Close</Btn>}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {module.controls.slice(0, 3).map((control) => (
              <label key={control} className="rounded-lg border border-border bg-card/50 p-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{control}</span>
                <input
                  type="checkbox"
                  checked={enabledControls[control]}
                  onChange={(event) => {
                    setEnabledControls((controls) => ({ ...controls, [control]: event.target.checked }));
                    pushActivity(`${control} ${event.target.checked ? "enabled" : "disabled"}`);
                  }}
                  className="size-4 rounded border-border"
                />
              </label>
            ))}
          </div>
        </Card>
      )}

      <Card className="border-primary/25 bg-primary/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Screen Purpose</div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">{purposeTitle}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{purposeDescription}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm lg:w-[520px]">
            {purposePoints.map((point, index) => (
              <div key={point} className="flex items-start gap-2 rounded-lg border border-primary/20 bg-background/45 px-3 py-2">
                <span className="mt-0.5 size-5 shrink-0 rounded-md bg-primary/15 text-primary grid place-items-center text-[11px] font-semibold">
                  {index + 1}
                </span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className={`lg:col-span-1 rounded-xl border p-5 bg-gradient-to-br ${module.accent} text-white border-transparent`}>
          <div className="flex items-start justify-between">
            <div className="size-12 rounded-xl bg-white/18 grid place-items-center">
              <module.icon className="size-6" />
            </div>
            <StatusBadge status="Operational" className="bg-white/18 text-white border-white/30" />
          </div>
          <h2 className="text-xl font-semibold mt-6">{module.shortTitle}</h2>
          <p className="text-sm text-white/78 mt-2">{module.description}</p>
          <div className="mt-5 grid grid-cols-5 gap-1.5">
            {module.workflow.map((step, index) => (
              <div key={step} className="h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${Math.min(100, 42 + index * 14)}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {module.metrics.map((metric) => (
            <Card key={metric.label} className="min-h-[136px]">
              {isDocumentIntake && intakeMetricDetails[metric.label] ? (
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`size-10 rounded-lg ${intakeMetricDetails[metric.label].accent} grid place-items-center shrink-0`}>
                      {(() => {
                        const Icon = intakeMetricDetails[metric.label].icon;
                        return <Icon className="size-4" />;
                      })()}
                    </div>
                    <StatusBadge status={metric.status} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                    <div className="mt-1 text-3xl font-bold tabular-nums">{metric.value}</div>
                    <div className="mt-1 text-[11px] font-medium text-muted-foreground">{metric.delta}</div>
                    <div className="mt-2 text-[11px] leading-4 text-muted-foreground">
                      {intakeMetricDetails[metric.label].note}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                    <div className="text-2xl font-bold mt-1 tabular-nums">{metric.value}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{metric.delta}</div>
                  </div>
                  <StatusBadge status={metric.status} />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {isDocumentIntake && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Source Health"
              subtitle="Live intake channels and document volume entering the workflow"
              actions={<StatusBadge status="Operational" />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {intakeSources.map((source) => (
                <button
                  key={source.name}
                  onClick={() => {
                    setSelectedSource(source.name);
                    setShowSourceConfig(false);
                    pushActivity(`${source.name} source inspected`);
                  }}
                  className={`min-h-[150px] rounded-lg border p-4 text-left transition ${
                    selectedSource === source.name
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card/50 hover:bg-accent/35 hover:border-primary/35"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                      <source.icon className="size-4" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold tabular-nums leading-none">{source.volume}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">files today</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm font-semibold">{source.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{source.detail}</div>
                  <div className="mt-4">
                    <StatusBadge status={source.status} />
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Next Handoff" subtitle="Where accepted documents move next" />
            <div className="space-y-2">
              {intakeHandoffs.map((handoff) => (
                <button
                  key={handoff.label}
                  onClick={() => pushActivity(`${handoff.label} handoff opened`)}
                  className="w-full rounded-lg border border-border bg-card/50 p-3 text-left hover:bg-accent/35 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{handoff.label}</div>
                      <div className="text-2xl font-bold tabular-nums mt-1">{handoff.value}</div>
                    </div>
                    <StatusBadge status={handoff.status} />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <Card>
            <CardHeader
              title={isDocumentIntake ? "Source Detail" : "Module Detail"}
              subtitle={isDocumentIntake ? activeSource.name : module.shortTitle}
              actions={
                <div className="flex items-center gap-2">
                  <StatusBadge status={sourceEnabled ? (isDocumentIntake ? activeSource.status : module.metrics[0]?.status ?? "Operational") : "Disconnected"} />
                  <Btn
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSourceConfig((open) => !open);
                      pushActivity(`${isDocumentIntake ? activeSource.name : module.shortTitle} configuration ${showSourceConfig ? "closed" : "opened"}`);
                    }}
                  >
                    <Settings2 className="size-3.5" />{isDocumentIntake ? "Configure Source" : "Configure Module"}
                  </Btn>
                </div>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {detailRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-border bg-card/45 px-3 py-2">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
            {showSourceConfig && (
              <div className="mt-4 rounded-lg border border-border bg-card/40 p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Owner</span>
                    <input
                      defaultValue={isDocumentIntake ? activeSource.owner : module.queue[0]?.owner ?? "Module owner"}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary/60"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{isDocumentIntake ? "Sync SLA" : "Processing SLA"}</span>
                    <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary/60">
                      <option>Every 5 minutes</option>
                      <option>Every 15 minutes</option>
                      <option>Every 30 minutes</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Retry policy</span>
                    <select className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary/60">
                      <option>3 retries, exponential backoff</option>
                      <option>5 retries, notify owner</option>
                      <option>Manual retry only</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    [isDocumentIntake ? "Source enabled" : "Module enabled", sourceEnabled, setSourceEnabled],
                    [isDocumentIntake ? "Auto retry failed imports" : "Auto retry failed jobs", sourceAutoRetry, setSourceAutoRetry],
                    [isDocumentIntake ? "Quarantine failed checks" : "Escalate failed checks", sourceQuarantine, setSourceQuarantine],
                  ].map(([label, checked, setter]) => (
                    <label key={label as string} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2">
                      <span className="text-sm font-medium">{label as string}</span>
                      <input
                        type="checkbox"
                        checked={checked as boolean}
                        onChange={(event) => {
                          (setter as React.Dispatch<React.SetStateAction<boolean>>)(event.target.checked);
                          pushActivity(`${label} ${event.target.checked ? "enabled" : "disabled"} for ${isDocumentIntake ? activeSource.name : module.shortTitle}`);
                        }}
                        className="size-4 rounded border-border"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Btn variant="outline" size="sm" onClick={() => setShowSourceConfig(false)}>Cancel</Btn>
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowSourceConfig(false);
                      pushActivity(`${isDocumentIntake ? activeSource.name : module.shortTitle} configuration saved`);
                    }}
                  >
                    {isDocumentIntake ? "Save Source" : "Save Module"}
                  </Btn>
                </div>
              </div>
            )}
          </Card>
        </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader title="Workflow Handling" subtitle="Operational path for this function from input to handoff" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {module.workflow.map((step, index) => (
                <div key={step} className="relative rounded-lg border border-border bg-card/60 p-3">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{step}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {index === module.workflow.length - 1 ? "Handoff ready" : `Next: ${module.workflow[index + 1]}`}
                      </div>
                    </div>
                  </div>
                  {index < module.workflow.length - 1 && (
                    <div className="absolute right-3 top-3 text-muted-foreground">
                      <ArrowRight className="size-3.5" />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>

        <Card>
            <CardHeader title="Handoff Timeline" subtitle={isDocumentIntake ? "Live count by intake stage" : "Live signal by workflow stage"} />
            <div className="space-y-2">
              {timelineItems.map((item, index) => (
                <div key={item.stage} className="flex items-center gap-3 rounded-lg border border-border bg-card/45 p-3">
                  <div className="size-7 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.stage}</div>
                    <div className="text-xs text-muted-foreground">{item.count} documents</div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </Card>
      </div>

      {isDocumentIntake && (
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader
              title="Recent Intake Files"
              subtitle={`Latest ${selectedSource} files and next destination`}
              actions={<StatusBadge status={activeSource.status} />}
            />
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">File</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium">Size</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Next</th>
                    <th className="px-5 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecentIntakeFiles.map((file) => (
                    <tr key={file.name} className="border-b border-border/50 hover:bg-accent/30 transition">
                      <td className="px-5 py-3 font-medium">{file.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{file.source}</td>
                      <td className="px-3 py-3 text-muted-foreground">{file.size}</td>
                      <td className="px-3 py-3"><StatusBadge status={file.status} /></td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{file.destination}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <Btn variant="outline" size="sm" onClick={() => pushActivity(`${file.name} opened`)}>Open</Btn>
                          <Btn variant="outline" size="sm" onClick={() => pushActivity(`${file.name} payload viewed`)}>Payload</Btn>
                          <Btn variant="outline" size="sm" onClick={() => pushActivity(`${file.name} retry queued`)}>Retry</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleRecentIntakeFiles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                        No recent files for {selectedSource}. Select another source to review recent intake.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 p-0 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-4 border-b border-border">
            <div className="flex gap-1 p-1 rounded-lg border border-border bg-card">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    activeTab === tab ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-8 w-56 rounded-lg border border-border bg-card pl-8 pr-3 text-xs focus:outline-none focus:border-primary/60"
                  placeholder="Search operational items..."
                />
              </div>
              <Btn
                variant={priorityFilter ? "primary" : "outline"}
                size="sm"
                onClick={() => {
                  const next = priorityFilter === "High" ? "Critical" : priorityFilter === "Critical" ? null : "High";
                  setPriorityFilter(next);
                  pushActivity(next ? `Priority filter set to ${next}` : "Priority filter cleared");
                }}
              >
                <Filter className="size-3.5" />{priorityFilter ?? "Filter"}
              </Btn>
            </div>
          </div>

          {activeTab === "Queue" && (
            <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-5 border-b border-border bg-card/25">
                  {attentionActions.map((exception) => (
                    <button
                      key={exception.reason}
                      onClick={() => pushActivity(`${exception.reason} action opened`)}
                      className="rounded-lg border border-border bg-background/60 p-3 text-left hover:bg-accent/35 hover:border-primary/35 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <ShieldAlert className="size-4 text-warning" />
                        <StatusBadge status={exception.status} />
                      </div>
                      <div className="mt-3 text-lg font-bold tabular-nums">{exception.count}</div>
                      <div className="text-xs text-muted-foreground">{exception.reason}</div>
                      <div className="mt-2 text-[11px] font-medium text-primary">{exception.action}</div>
                    </button>
                  ))}
                </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-card/60 border-b border-border">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">ID</th>
                    <th className="px-3 py-3 font-medium">Item</th>
                    <th className="px-3 py-3 font-medium">Owner</th>
                    <th className="px-3 py-3 font-medium">Priority</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleQueue.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelected(item.id);
                        pushActivity(`${item.id} selected`);
                      }}
                      className={`border-b border-border/50 hover:bg-accent/30 transition cursor-pointer ${
                        selected === item.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                      <td className="px-3 py-3 font-medium">{item.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.owner}</td>
                      <td className="px-3 py-3"><StatusBadge status={item.priority} /></td>
                      <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{item.updated}</td>
                    </tr>
                  ))}
                  {visibleQueue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                        No queue items match the current search/filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {activeTab === "Rules" && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {module.rules.map((rule, index) => (
                <div key={rule} className="rounded-lg border border-border bg-card/50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rule #{index + 1}</div>
                  <div className="mt-2 text-sm font-medium">{rule}</div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={enabledRules[rule]}
                      onChange={(event) => {
                        setEnabledRules((rules) => ({ ...rules, [rule]: event.target.checked }));
                        pushActivity(`Rule ${index + 1} ${event.target.checked ? "enabled" : "disabled"}`);
                      }}
                      className="size-4 rounded border-border"
                    />
                    {enabledRules[rule] ? "Enabled in production" : "Paused"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Controls" && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {module.controls.map((control) => (
                <label key={control} className="rounded-lg border border-border bg-card/50 p-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{control}</span>
                  <input
                    type="checkbox"
                    checked={enabledControls[control]}
                    onChange={(event) => {
                      setEnabledControls((controls) => ({ ...controls, [control]: event.target.checked }));
                      pushActivity(`${control} ${event.target.checked ? "enabled" : "disabled"}`);
                    }}
                    className="size-4 rounded border-border"
                  />
                </label>
              ))}
            </div>
          )}

          {activeTab === "Runbook" && (
            <div className="p-5 space-y-2">
              {module.operations.map((operation, index) => (
                <div key={operation} className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3">
                  <div className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{operation}</div>
                    <div className="text-xs text-muted-foreground">Operator action available for this module.</div>
                  </div>
                  <Btn variant="outline" size="sm" onClick={() => pushActivity(`${operation} completed`)}>Run</Btn>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Selected Work Item" subtitle="Operational action panel" />
            {selectedItem && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">Item</div>
                  <div className="font-semibold">{selectedItem.name}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-0.5">{selectedItem.id}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedItem.status} />
                  <StatusBadge status={selectedItem.priority} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {isDocumentIntake ? (
                    <>
                      <Btn variant="success" size="sm" onClick={() => updateSelectedStatus("Queued")}>Release to Queue</Btn>
                      <Btn variant="outline" size="sm" onClick={() => updateSelectedStatus("Processing")}>Retry Import</Btn>
                      <Btn variant="outline" size="sm" onClick={() => pushActivity(`${selectedItem.id} source payload opened`)}>View Payload</Btn>
                      <Btn variant="destructive" size="sm" onClick={() => updateSelectedStatus("Quarantined")}>Quarantine</Btn>
                    </>
                  ) : (
                    <>
                      <Btn variant="success" size="sm" onClick={() => updateSelectedStatus("Approved")}>Approve</Btn>
                      <Btn variant="outline" size="sm" onClick={() => updateSelectedStatus("Assigned")}>Assign</Btn>
                      <Btn variant="outline" size="sm" onClick={() => updateSelectedStatus("Processing")}>Retry</Btn>
                      <Btn variant="destructive" size="sm" onClick={() => updateSelectedStatus("Pending")}>Hold</Btn>
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Activity Stream" subtitle="Recent operational events" />
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {activity.map((event, index) => (
                <div key={event} className="flex gap-3">
                  <div className={`size-7 rounded-full grid place-items-center shrink-0 ${
                    index === 0 ? "bg-primary/15 text-primary" : index === 1 ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                  }`}>
                    {index === 0 ? <Activity className="size-3.5" /> : index === 1 ? <Clock className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{event}</div>
                    <div className="text-xs text-muted-foreground">{index * 7 + 2} min ago</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
