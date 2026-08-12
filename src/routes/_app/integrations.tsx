import { createFileRoute } from "@tanstack/react-router";
import { Database, Calculator, ShoppingBag, Package, Mail, MessageCircle, Hash, Cloud, Webhook, CreditCard, RefreshCw, Settings2 } from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge, Btn } from "@/components/ui-kit";
import { integrations } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/integrations")({
  component: Integrations,
  head: () => ({ meta: [{ title: "Integrations — Nexus AI" }] }),
});

const iconMap = { Database, Calculator, ShoppingBag, Package, Mail, MessageCircle, Hash, Cloud, Webhook, CreditCard } as const;

function Integrations() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connected ERP, commerce, communication and storage systems with real-time health monitoring."
        actions={<Btn variant="primary" size="sm">+ Add Integration</Btn>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((i) => {
          const Icon = iconMap[i.icon as keyof typeof iconMap] ?? Database;
          return (
            <Card key={i.name} className="hover:border-primary/40 transition group">
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-xl bg-card border border-border grid place-items-center shrink-0">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{i.category}</div>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Health</div>
                      <div className="font-semibold tabular-nums">{i.health}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Sync</div>
                      <div className="font-medium">{i.lastSync}</div>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden mt-2">
                    <div className={`h-full ${i.health > 95 ? "bg-success" : i.health > 80 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${i.health}%` }} />
                  </div>
                  <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition">
                    <Btn variant="outline" size="sm"><RefreshCw className="size-3" />Sync</Btn>
                    <Btn variant="outline" size="sm"><Settings2 className="size-3" />Configure</Btn>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Webhook Activity" subtitle="Last 10 events" />
          <div className="space-y-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded text-xs font-mono">
                <span className="text-success">200</span>
                <span className="text-muted-foreground">POST /api/v1/webhook/sap</span>
                <span className="text-muted-foreground">{i * 2 + 1}m ago</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Failed Retry Queue" subtitle="3 jobs awaiting retry" />
          <div className="space-y-2">
            {[
              { svc: "SAP S/4HANA", err: "Timeout 30s", attempt: "3/5" },
              { svc: "Amazon Seller", err: "Rate limit 429", attempt: "1/5" },
              { svc: "Tally Prime", err: "Auth expired", attempt: "2/5" },
            ].map((f, i) => (
              <div key={i} className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{f.svc}</div>
                  <span className="text-xs text-muted-foreground">Attempt {f.attempt}</span>
                </div>
                <div className="text-xs text-destructive mt-1">{f.err}</div>
                <div className="flex gap-1 mt-2">
                  <Btn variant="outline" size="sm">Retry now</Btn>
                  <Btn variant="ghost" size="sm">Cancel</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
