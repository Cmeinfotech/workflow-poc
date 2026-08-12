import { createFileRoute, Link } from "@tanstack/react-router";
import { UploadCloud, FileText, Sparkles, ScanLine, ChevronRight } from "lucide-react";
import { Card, CardHeader, PageHeader, StatusBadge, ConfidenceBadge, Btn } from "@/components/ui-kit";
import { workflowQueue } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/ocr/")({
  component: OCRPage,
  head: () => ({ meta: [{ title: "OCR Processing — Nexus AI" }] }),
});

function OCRPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="OCR Processing"
        description="Upload, extract and review documents using our AI-powered OCR engine v4.2."
        actions={<Btn variant="primary" size="sm">Bulk Upload</Btn>}
      />

      {/* Upload zone */}
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition group cursor-pointer">
        <div className="py-10 flex flex-col items-center text-center">
          <div className="size-14 rounded-2xl gradient-primary grid place-items-center shadow-glow group-hover:scale-105 transition">
            <UploadCloud className="size-7 text-primary-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-lg">Drop documents to start OCR</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Supports PDF, PNG, JPG, TIFF · Max 50MB · Ocean B/L, House B/L, and Invoices
          </p>
          <div className="mt-4 flex gap-2">
            <Btn variant="primary">Browse Files</Btn>
            <Btn variant="outline">Connect Email Inbox</Btn>
            <Btn variant="outline">Import from S3</Btn>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: ScanLine, label: "Documents Today", val: "1,284", sub: "+18% vs yesterday" },
          { icon: Sparkles, label: "Avg. Confidence", val: "96.4%", sub: "OCR Engine v4.2" },
          { icon: FileText, label: "In Queue", val: "184", sub: "Est. 6 min to clear" },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <s.icon className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-bold">{s.val}</div>
                <div className="text-[11px] text-muted-foreground">{s.sub}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Recent OCR Jobs" subtitle="Documents recently processed by the OCR engine" />
        <div className="space-y-1.5">
          {workflowQueue.slice(0, 8).map((w) => (
            <Link
              to="/ocr/review"
              key={w.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40 hover:bg-accent/40 hover:border-primary/30 transition group"
            >
              <div className="size-10 rounded-lg bg-muted grid place-items-center shrink-0">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{w.document}</div>
                <div className="text-xs text-muted-foreground truncate">{w.vendor} · {w.id}</div>
              </div>
              <ConfidenceBadge value={w.confidence} />
              <StatusBadge status={w.status} />
              <span className="text-xs text-muted-foreground tabular-nums w-24 text-right">{w.amount}</span>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
