import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  XCircle,
  RotateCw,
  MessageSquare,
  AlertTriangle,
  Send,
  ChevronLeft,
  FileText,
  Sparkles,
  Clock,
  Eye,
  Download,
  Maximize2,
} from "lucide-react";
import { Card, PageHeader, StatusBadge, Btn } from "@/components/ui-kit";
import { ocrFields, documentTimeline } from "@/lib/mock-data";
import { applyReviewFieldPolicy, useReviewFieldPolicies } from "@/lib/review-field-policy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ocr/review")({
  component: OCRReview,
  head: () => ({ meta: [{ title: "OCR Review — Nexus AI" }] }),
});

function getConfidenceBand(value: number) {
  const normalized = normalizeOcrConfidence(value);
  if (normalized >= 95) return "green";
  if (normalized >= 90) return "amber";
  return "red";
}

function normalizeOcrConfidence(value: number) {
  return Math.max(85, Math.min(100, Math.round(value)));
}

function ConfidenceIndicator({ value }: { value: number }) {
  const normalized = normalizeOcrConfidence(value);
  const band = getConfidenceBand(value);
  const classes = {
    green: "text-success",
    amber: "text-warning",
    red: "text-destructive",
  }[band];

  return (
    <span className={cn("shrink-0 text-[10px] font-semibold tabular-nums", classes)}>
      {normalized}%
    </span>
  );
}

function getFieldValueBorderClasses(confidence: number) {
  const band = getConfidenceBand(confidence);
  if (band === "red") return "border-destructive/45";
  if (band === "amber") return "border-warning/45";
  return "border-border";
}

function OCRReview() {
  const { policies } = useReviewFieldPolicies();
  const visibleOcrFields = applyReviewFieldPolicy(ocrFields, "ocr", policies);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/ocr" className="hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="size-3.5" /> OCR Processing
        </Link>
        <span>/</span>
        <span className="text-foreground">WF-10421 · INV-2025-0921.pdf</span>
      </div>

      <PageHeader
        title="Review Extracted Data"
        description="Validate AI-extracted fields against the original document and route the workflow."
        actions={
          <>
            <Btn variant="outline" size="sm">
              <Download className="size-3.5" />
              Download
            </Btn>
            <Btn variant="outline" size="sm">
              <RotateCw className="size-3.5" />
              Reprocess OCR
            </Btn>
            <Btn variant="destructive" size="sm">
              <XCircle className="size-3.5" />
              Reject
            </Btn>
            <Btn variant="outline" size="sm">
              <AlertTriangle className="size-3.5" />
              Escalate
            </Btn>
            <Btn variant="success" size="sm">
              <CheckCircle2 className="size-3.5" />
              Approve
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Document preview */}
        <Card className="xl:col-span-3 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/60">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span className="text-sm font-medium">INV-2025-0921.pdf</span>
              <span className="text-xs text-muted-foreground">· Page 1 of 2</span>
            </div>
            <div className="flex items-center gap-1">
              <Btn variant="ghost" size="sm">
                −
              </Btn>
              <span className="text-xs px-2 tabular-nums">100%</span>
              <Btn variant="ghost" size="sm">
                +
              </Btn>
              <Btn variant="ghost" size="sm">
                <Maximize2 className="size-3.5" />
              </Btn>
            </div>
          </div>
          <div className="bg-muted/30 p-6 grid-bg min-h-[680px]">
            {/* Mock document */}
            <div className="bg-white text-zinc-900 max-w-2xl mx-auto rounded-md shadow-elegant p-8 font-serif">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-2xl font-bold tracking-tight">RELIANCE LOGISTICS</div>
                  <div className="text-xs text-zinc-600">Pvt Ltd · Mumbai, Maharashtra</div>
                  <div className="text-xs text-zinc-600 mt-2">GSTIN: 27AABCR1234M1Z5</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-light text-zinc-700">INVOICE</div>
                  <div className="text-xs text-zinc-600 mt-1">INV-2025-0921</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-xs mb-6">
                <div>
                  <div className="text-zinc-500 uppercase tracking-wider mb-1">Bill To</div>
                  <div className="font-semibold">Acme Corporation</div>
                  <div className="text-zinc-600">42, Tech Park Road</div>
                  <div className="text-zinc-600">Bengaluru, Karnataka 560001</div>
                </div>
                <div>
                  <div className="text-zinc-500 uppercase tracking-wider mb-1">Details</div>
                  <div>
                    Date: <span className="font-medium">12 Nov 2025</span>
                  </div>
                  <div>
                    Due: <span className="font-medium">26 Nov 2025</span>
                  </div>
                  <div>
                    B/L: <span className="font-medium">OBL-77244</span>
                  </div>
                </div>
              </div>
              <table className="w-full text-xs border-t border-zinc-300">
                <thead>
                  <tr className="text-left text-zinc-500 uppercase">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  <tr>
                    <td className="py-2">Container Freight Mumbai → Chennai</td>
                    <td className="text-right">12</td>
                    <td className="text-right">₹18,400</td>
                    <td className="text-right">₹2,20,800</td>
                  </tr>
                  <tr>
                    <td className="py-2">Last-mile Distribution</td>
                    <td className="text-right">8</td>
                    <td className="text-right">₹14,200</td>
                    <td className="text-right">₹1,13,600</td>
                  </tr>
                  <tr>
                    <td className="py-2">Warehouse Storage (30 days)</td>
                    <td className="text-right">1</td>
                    <td className="text-right">₹74,498</td>
                    <td className="text-right">₹74,498</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 flex justify-end">
                <div className="w-64 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Subtotal</span>
                    <span>₹4,08,898</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">GST (18%)</span>
                    <span>₹73,602</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-300 pt-2 font-bold text-base">
                    <span>Total</span>
                    <span>₹4,82,500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Extracted fields + meta */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-lg bg-success/15 text-success grid place-items-center">
                <Sparkles className="size-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">AI Extraction Complete</div>
                <div className="text-xs text-muted-foreground">
                  Overall confidence: 96.4% · OCR Engine v4.2
                </div>
              </div>
              <ConfidenceIndicator value={96} />
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-success" style={{ width: "96.4%" }} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Extracted Fields</h3>
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {visibleOcrFields.length} visible
              </span>
            </div>
            <div className="space-y-3">
              {visibleOcrFields.map((f) => (
                <div key={f.label} className="space-y-1 rounded-md p-1">
                  <div className="flex items-center">
                    <label
                      className={cn(
                        "text-[10px] font-medium",
                        getConfidenceBand(f.confidence) === "red"
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {f.label}
                    </label>
                  </div>
                  <div
                    className={cn(
                      "flex min-h-8 items-start justify-between gap-2 rounded border bg-card px-2 py-1.5 text-[11px] leading-4",
                      getFieldValueBorderClasses(f.confidence),
                    )}
                  >
                    <span className="min-w-0">{f.value}</span>
                    <ConfidenceIndicator value={f.confidence} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" /> Comments
            </h3>
            <div className="space-y-3 mb-3">
              <div className="flex gap-2.5">
                <div className="size-7 rounded-full bg-gradient-to-br from-chart-2 to-chart-1 grid place-items-center text-[10px] font-semibold text-primary-foreground shrink-0">
                  PI
                </div>
                <div className="flex-1">
                  <div className="text-xs">
                    <span className="font-medium">P. Iyer</span>{" "}
                    <span className="text-muted-foreground">· 2h ago</span>
                  </div>
                  <div className="text-sm mt-0.5">
                    Verified GSTIN against vendor master. Looks good.
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                placeholder="Add a comment…"
                className="flex-1 h-9 px-3 text-sm rounded-md bg-card border border-border focus:outline-none focus:border-primary/60"
              />
              <Btn variant="primary" size="sm">
                <Send className="size-3.5" />
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" /> Workflow History
          </h3>
          <StatusBadge status="Pending Review" />
        </div>
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {documentTimeline.map((t, i) => (
              <div key={i} className="flex gap-4 relative">
                <div
                  className={`relative z-10 size-6 rounded-full grid place-items-center shrink-0 ${
                    t.status === "done"
                      ? "bg-success text-success-foreground"
                      : t.status === "active"
                        ? "bg-primary text-primary-foreground animate-pulse-glow"
                        : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {t.status === "done" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : t.status === "active" ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <div className="font-medium text-sm">{t.stage}</div>
                    <div className="text-xs text-muted-foreground">{t.user}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
