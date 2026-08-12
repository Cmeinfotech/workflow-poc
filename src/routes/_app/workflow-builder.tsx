import { createFileRoute } from "@tanstack/react-router";
import { Upload, ScanText, Sparkles, Eye, ShieldCheck, Database, CheckCircle2, Plus, Settings2, Zap, Mail, Webhook, GitBranch, Clock } from "lucide-react";
import { Card, CardHeader, PageHeader, Btn, StatusBadge } from "@/components/ui-kit";

export const Route = createFileRoute("/_app/workflow-builder")({
  component: Builder,
  head: () => ({ meta: [{ title: "Workflow Builder — Nexus AI" }] }),
});

const nodes = [
  { name: "Upload", icon: Upload, color: "info", desc: "Email · API · Manual" },
  { name: "OCR Extraction", icon: ScanText, color: "primary", desc: "OCR Engine v4.2" },
  { name: "AI Validation", icon: Sparkles, color: "primary", desc: "Schema match · Vendor lookup" },
  { name: "Manual Review", icon: Eye, color: "warning", desc: "If confidence < 80%" },
  { name: "Manager Approval", icon: ShieldCheck, color: "warning", desc: "If amount > ₹50,000" },
  { name: "ERP Sync", icon: Database, color: "info", desc: "SAP S/4HANA" },
  { name: "Completed", icon: CheckCircle2, color: "success", desc: "Notify stakeholders" },
];

const triggers = [
  { icon: Mail, name: "Email Inbox", desc: "ap@acmecorp.com" },
  { icon: Webhook, name: "Webhook", desc: "POST /api/v1/intake" },
  { icon: Clock, name: "Schedule", desc: "Every 15 minutes" },
];

const rules = [
  { when: "OCR Confidence < 80%", then: "Route to Manual Review", priority: "High" },
  { when: "Invoice Amount > ₹50,000", then: "Require Manager Approval", priority: "High" },
  { when: "Vendor not in master", then: "Escalate to Finance", priority: "Critical" },
  { when: "Duplicate Invoice Number", then: "Block & notify submitter", priority: "Critical" },
  { when: "GSTIN format invalid", then: "Send back for review", priority: "Medium" },
  { when: "PO Number missing", then: "Auto-fetch from ERP", priority: "Low" },
];

function Builder() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Builder"
        description="Design and configure end-to-end automation pipelines with drag-and-drop stages and rule logic."
        actions={
          <>
            <Btn variant="outline" size="sm">Test Run</Btn>
            <Btn variant="outline" size="sm">Save Draft</Btn>
            <Btn variant="primary" size="sm">Publish</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Node palette */}
        <Card>
          <CardHeader title="Components" subtitle="Drag onto canvas" />
          <div className="space-y-2">
            {[
              { icon: Upload, label: "Trigger" },
              { icon: ScanText, label: "OCR Node" },
              { icon: Sparkles, label: "AI Validation" },
              { icon: Eye, label: "Review Step" },
              { icon: ShieldCheck, label: "Approval" },
              { icon: GitBranch, label: "Condition" },
              { icon: Database, label: "ERP Sync" },
              { icon: Mail, label: "Notify" },
              { icon: Zap, label: "Webhook" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card/50 hover:bg-accent/40 hover:border-primary/40 cursor-grab transition">
                <div className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <c.icon className="size-4" />
                </div>
                <span className="text-sm font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Canvas */}
        <Card className="lg:col-span-3 grid-bg min-h-[520px]">
          <CardHeader
            title="Invoice Approval Pipeline"
            subtitle="Active · 2,841 runs this week · 96% success"
            actions={<Btn variant="outline" size="sm"><Settings2 className="size-3.5" />Settings</Btn>}
          />
          <div className="overflow-x-auto pb-4">
            <div className="flex items-center gap-3 min-w-max py-6">
              {nodes.map((n, i) => {
                const Icon = n.icon;
                const isLast = i === nodes.length - 1;
                return (
                  <div key={n.name} className="flex items-center gap-3">
                    <div className="rounded-xl border border-border bg-card glass shadow-elegant min-w-[180px] hover:border-primary/50 hover:shadow-glow transition cursor-pointer group">
                      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border">
                        <div className={`size-8 rounded-md grid place-items-center ${
                          n.color === "primary" ? "bg-primary/15 text-primary" :
                          n.color === "success" ? "bg-success/15 text-success" :
                          n.color === "warning" ? "bg-warning/15 text-warning" :
                          "bg-info/15 text-info"
                        }`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="font-medium text-sm">{n.name}</div>
                      </div>
                      <div className="px-3.5 py-2 text-[11px] text-muted-foreground">{n.desc}</div>
                    </div>
                    {!isLast && (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="h-px w-8 bg-gradient-to-r from-border via-primary/60 to-border" />
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="size-12 rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 grid place-items-center transition">
                <Plus className="size-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Triggers" subtitle="How workflows enter this pipeline" actions={<Btn variant="outline" size="sm">+ Add Trigger</Btn>} />
          <div className="space-y-2">
            {triggers.map((t) => (
              <div key={t.name} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
                <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <t.icon className="size-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{t.desc}</div>
                </div>
                <span className="size-2 rounded-full bg-success animate-pulse-glow" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Rule Logic" subtitle="Automation conditions evaluated at runtime" actions={<Btn variant="outline" size="sm">+ New Rule</Btn>} />
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-card/40">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rule #{i + 1}</div>
                  <StatusBadge status={r.priority} />
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">When </span>
                  <code className="px-1.5 py-0.5 rounded bg-warning/15 text-warning text-xs">{r.when}</code>
                  <span className="text-muted-foreground"> then </span>
                  <code className="px-1.5 py-0.5 rounded bg-success/15 text-success text-xs">{r.then}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}


