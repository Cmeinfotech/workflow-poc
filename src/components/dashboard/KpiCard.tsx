import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "info" | "destructive";
}) {
  const positive = trend === "up";
  const accentMap: Record<string, string> = {
    primary: "from-primary/30 to-primary/0 text-primary",
    success: "from-success/30 to-success/0 text-success",
    warning: "from-warning/30 to-warning/0 text-warning",
    info: "from-info/30 to-info/0 text-info",
    destructive: "from-destructive/30 to-destructive/0 text-destructive",
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border glass p-5 hover:shadow-elegant transition">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition", accentMap[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
          <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", positive ? "text-success" : "text-destructive")}>
            {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {delta}
            <span className="text-muted-foreground font-normal ml-1">vs last week</span>
          </div>
        </div>
        <div className={cn("size-10 rounded-lg grid place-items-center bg-card border border-border", accentMap[accent].split(" ").pop())}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
