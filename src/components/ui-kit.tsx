import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePageHeaderPortal } from "@/components/layout/PageHeaderPortal";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const pageHeaderPortal = usePageHeaderPortal();
  const headerContent = (
    <>
      <div className="min-w-0">
        <h1 className="text-lg font-bold leading-tight tracking-tight">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </>
  );

  return (
    <>
      {pageHeaderPortal?.target &&
        createPortal(
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            {headerContent}
          </div>,
          pageHeaderPortal.target,
        )}
      <div
        className={cn(
          "mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between lg:hidden lg:[&+*]:!mt-0",
          className,
        )}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border glass p-5", className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  label = "records",
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  label?: string;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2 text-[11px] sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of{" "}
        {totalItems} {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    Approved: "bg-success/15 text-success border-success/30",
    Synced: "bg-success/15 text-success border-success/30",
    Operational: "bg-success/15 text-success border-success/30",
    Connected: "bg-success/15 text-success border-success/30",
    Completed: "bg-success/15 text-success border-success/30",
    "Document Received": "bg-info/15 text-info border-info/30",
    Received: "bg-info/15 text-info border-info/30",
    Inventory: "bg-primary/15 text-primary border-primary/30",
    "OCR Review": "bg-info/15 text-info border-info/30",
    "OCR Approved": "bg-success/15 text-success border-success/30",
    Processing: "bg-primary/15 text-primary border-primary/30",
    "QC Processing": "bg-primary/15 text-primary border-primary/30",
    QC: "bg-warning/15 text-warning border-warning/30",
    "QC Review": "bg-warning/15 text-warning border-warning/30",
    "QC Approved": "bg-success/15 text-success border-success/30",
    "Manual Review": "bg-warning/15 text-warning border-warning/30",
    Export: "bg-success/15 text-success border-success/30",
    "Export Ready": "bg-primary/15 text-primary border-primary/30",
    "Export Completed": "bg-success/15 text-success border-success/30",
    Queued: "bg-primary/15 text-primary border-primary/30",
    Pending: "bg-warning/15 text-warning border-warning/30",
    "Pending Review": "bg-warning/15 text-warning border-warning/30",
    Escalated: "bg-warning/15 text-warning border-warning/30",
    Exception: "bg-destructive/15 text-destructive border-destructive/30",
    Degraded: "bg-warning/15 text-warning border-warning/30",
    Failed: "bg-destructive/15 text-destructive border-destructive/30",
    Rejected: "bg-destructive/15 text-destructive border-destructive/30",
    Disconnected: "bg-destructive/15 text-destructive border-destructive/30",
    Critical: "bg-destructive/15 text-destructive border-destructive/30",
    High: "bg-warning/15 text-warning border-warning/30",
    Medium: "bg-info/15 text-info border-info/30",
    Low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border",
        map[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function ConfidenceBadge({ value }: { value: number }) {
  const tone =
    value >= 95 ? "success" : value >= 80 ? "info" : value >= 65 ? "warning" : "destructive";
  const map: Record<string, string> = {
    success: "bg-success/15 text-success border-success/30",
    info: "bg-info/15 text-info border-info/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    destructive: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border tabular-nums",
        map[tone],
      )}
    >
      {value}%
    </span>
  );
}

export function ConfidencePercent({ value, className }: { value: number; className?: string }) {
  const tone =
    value >= 95 ? "success" : value >= 80 ? "info" : value >= 65 ? "warning" : "destructive";
  const map: Record<string, string> = {
    success: "text-success",
    info: "text-info",
    warning: "text-warning",
    destructive: "text-destructive",
  };

  return (
    <span className={cn("shrink-0 text-[10px] font-semibold tabular-nums", map[tone], className)}>
      {value}%
    </span>
  );
}

export function Btn({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "outline" | "destructive" | "success";
  size?: "sm" | "md";
}) {
  const variants: Record<string, string> = {
    default: "bg-card border border-border hover:bg-accent text-foreground",
    primary: "gradient-primary text-primary-foreground shadow-glow hover:opacity-95",
    ghost: "hover:bg-accent text-foreground",
    outline: "border border-border bg-transparent hover:bg-accent",
    destructive:
      "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25",
    success: "bg-success/15 text-success border border-success/30 hover:bg-success/25",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-2.5 text-xs",
    md: "h-9 px-3.5 text-sm",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
