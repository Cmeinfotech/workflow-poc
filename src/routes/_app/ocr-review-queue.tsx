import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Columns2,
  Columns3,
  Copy,
  FileText,
  GitBranch,
  Rows2,
  Rows3,
  ScanText,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, PageHeader, Btn } from "@/components/ui-kit";
import { ResponsiveCardColumns } from "@/components/responsive-card-columns";
import { ZoomableDocumentImage } from "@/components/zoomable-document-image";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { inventoryRecords } from "@/lib/ocr-inventory-data";
import {
  makeExceptionRecord,
  mergeQueue,
  moveRecord,
  normalizeDocumentType,
  type WorkflowRecord,
} from "@/lib/workflow-state";
import { isBillOfLadingRecord } from "@/lib/bill-of-lading-samples";
import {
  addStructuredAddressFields,
  buildLineItemTable,
  groupReviewFields,
  type ExtractedTable,
} from "@/lib/review-fields";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ocr-review-queue")({
  component: OCRReview,
  head: () => ({ meta: [{ title: "OCR Review - Chiaro OCR" }] }),
});

const documentTypes = ["BOL", "HBL"] as const;
const billOfLadingFieldLabel = "Bill of Lading No.";
const billOfLadingHighlight = {
  label: billOfLadingFieldLabel,
  x: 76.5,
  y: 95.4,
  width: 23,
  height: 4.4,
};
const reviewDataViews = ["information", "table", "exception", "audit-track"] as const;
type ReviewDataView = (typeof reviewDataViews)[number];

const fileNameByType: Record<(typeof documentTypes)[number], string> = {
  BOL: "ocean-bill-of-lading-0528.png",
  HBL: "house-bill-of-lading-0528.png",
};

const ocrQueueRecords = Array.from({ length: 42 }, (_, index) => {
  const base = inventoryRecords[index % inventoryRecords.length];
  const count = 20042 - index;
  const documentType = documentTypes[index % documentTypes.length];

  return {
    ...base,
    id: `DS-INV-${count}`,
    fileName: fileNameByType[documentType].replace("0528", String(index + 1).padStart(4, "0")),
    status: "OCR Review" as const,
    owner: "OCR Operator",
    documentType,
    quantity: Number(base.quantity) + index * 7,
    confidence: Math.max(85, Number(base.confidence) - (index % 9)),
  };
});

const slaDeadlineStorageKey = "dataspan-document-sla-deadlines";
const slaDemoVersionStorageKey = "dataspan-document-sla-demo-version";
const slaDemoVersion = "trainity-10-minute-v1";
const demoSlaSeconds: Record<string, number> = {
  "DS-TRAINITY-832611300031": 10 * 60,
  "DS-TRAINITY-832525100049": 7 * 60 + 30,
  "DS-INV-150113": 5 * 60 + 15,
};

function getExtractedFields(record: WorkflowRecord) {
  const baseConfidence = normalizeOcrConfidence(record.confidence);

  if (record.ocrFields?.length) {
    return balanceOcrFieldConfidence(addStructuredAddressFields(record.ocrFields));
  }

  return addStructuredAddressFields([
    {
      label: "Bill of Lading No.",
      value: `${normalizeDocumentType(record.documentType) === "HBL" ? "HBL" : "BOL"}-${record.id.slice(-5)}`,
      confidence: Math.min(99, baseConfidence + 5),
    },
    {
      label: "Carrier / Forwarder",
      value: "Chiaro Freight Services",
      confidence: Math.min(99, baseConfidence + 2),
    },
    { label: "Line Item", value: record.productName, confidence: Math.min(99, baseConfidence + 1) },
    { label: "SKU", value: record.sku, confidence: normalizeOcrConfidence(baseConfidence - 3) },
    {
      label: "Quantity",
      value: String(record.quantity),
      confidence: normalizeOcrConfidence(baseConfidence - 4),
    },
    {
      label: "Amount Due",
      value: record.inventoryValue,
      confidence: normalizeOcrConfidence(baseConfidence - 2),
    },
  ]);
}

function normalizeOcrConfidence(value: number) {
  return Math.max(85, Math.min(100, Math.round(value)));
}

function balanceOcrFieldConfidence<T extends { confidence: number }>(fields: T[]): T[] {
  return fields.map((field, index) => {
    const confidence = index === 0 ? 88 : index % 3 === 0 ? 92 : index % 3 === 1 ? 96 : 98;

    return {
      ...field,
      confidence,
    };
  });
}

function getConfidenceBand(value: number) {
  const normalized = normalizeOcrConfidence(value);
  if (normalized >= 95) return "green";
  if (normalized >= 90) return "amber";
  return "red";
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

function getFieldContainerClasses() {
  return "min-w-0";
}

function getFieldLabelClasses(confidence: number) {
  return cn(
    "text-[9px] font-medium",
    getConfidenceBand(confidence) === "red" ? "text-destructive" : "text-muted-foreground",
  );
}

function getFieldValueBorderClasses(confidence: number) {
  const band = getConfidenceBand(confidence);
  if (band === "red") return "border-destructive/45";
  if (band === "amber") return "border-warning/45";
  return "border-border";
}

function getAuditTrack(record: WorkflowRecord) {
  const receivedLabel = record.uploadedBy === "FTP" || record.uploadedBy === "SFTP"
    ? `${record.uploadedBy} Intake`
    : "Source Intake";
  const inventoryTime = record.uploadDate.replace(/(\d{2}:\d{2})$/, (_match, time) => {
    const [hour, minute] = String(time).split(":").map(Number);
    return `${String(hour).padStart(2, "0")}:${String(Math.min(59, minute + 3)).padStart(2, "0")}`;
  });
  const ocrTime = record.exceptionReturnedAt || record.uploadDate.replace(/(\d{2}:\d{2})$/, (_match, time) => {
    const [hour, minute] = String(time).split(":").map(Number);
    return `${String(hour).padStart(2, "0")}:${String(Math.min(59, minute + 9)).padStart(2, "0")}`;
  });
  const exceptionReturned = record.returnedFrom === "Exception" || Boolean(record.exceptionReturnReason);

  const stages = [
    {
      label: receivedLabel,
      state: "complete" as const,
      detail: record.fileName,
      owner: record.uploadedBy || "Intake",
    },
    {
      label: "Inventory",
      state: "complete" as const,
      detail: "Document registered and indexed",
      owner: "Inventory",
    },
    ...(exceptionReturned
      ? [
        {
          label: "Exception",
          state: "complete" as const,
          detail: "Issue resolved and returned",
          owner: record.exceptionReturnAssignedUser || record.assignedUser || "Exception",
        },
      ]
      : []),
    {
      label: "OCR Review",
      state: "current" as const,
      detail: "Extracted data under review",
      owner: record.owner,
    },
    {
      label: "QC Processing",
      state: "next" as const,
      detail: "Next after OCR approval",
      owner: "Priya Iyer",
    },
  ];

  const events = [
    {
      from: receivedLabel,
      to: "Inventory",
      actor: record.uploadedBy || "Intake",
      time: record.uploadDate,
      note: `Received ${record.documentType} document and created ${record.id}.`,
    },
    {
      from: "Inventory",
      to: "OCR Review",
      actor: "OCR Engine",
      time: inventoryTime,
      note: `OCR extracted ${record.ocrFields?.length || "the"} fields at ${normalizeOcrConfidence(record.confidence)}% confidence.`,
    },
    ...(exceptionReturned
      ? [
        {
          from: record.exceptionReturnSourceStage || "Exception Queue",
          to: record.exceptionReturnTargetStage || "OCR Review",
          actor: record.exceptionReturnAssignedUser || record.assignedUser || "Exception reviewer",
          time: record.exceptionReturnedAt || ocrTime,
          note: record.exceptionReturnReason || record.exceptionReason || "Returned for OCR correction.",
        },
      ]
      : []),
    {
      from: "OCR Review",
      to: "QC Processing",
      actor: record.owner,
      time: "Pending",
      note: "Current stage. Approval sends the document to QC processing.",
    },
  ];

  return { stages, events, currentStage: "OCR Review", nextStage: "QC Processing" };
}

function ReadOnlyFieldValue({ value, confidence }: { value: string; confidence: number }) {
  return (
    <div
      className={cn(
        "flex w-full items-start justify-between gap-1.5 rounded border bg-background px-1.5 py-1 text-[10px] leading-3.5 text-foreground",
        value.length > 58 ? "min-h-8 whitespace-pre-wrap" : "min-h-6",
        getFieldValueBorderClasses(confidence),
      )}
      aria-readonly="true"
    >
      <span className="min-w-0">{value}</span>
      <ConfidenceIndicator value={confidence} />
    </div>
  );
}

function AuditTrackView({ record }: { record: WorkflowRecord }) {
  const auditTrack = getAuditTrack(record);

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-2">
        {[
          ["Current Stage", auditTrack.currentStage],
          ["Next Stage", auditTrack.nextStage],
          ["Owner", record.owner],
          ["Document", record.documentType],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border bg-card px-2.5 py-2">
            <div className="text-[9px] font-medium uppercase text-muted-foreground">{label}</div>
            <div className="mt-0.5 truncate text-xs font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-md border border-border bg-card p-3 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <GitBranch className="size-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold">Document Flow</div>
            <div className="text-[10px] text-muted-foreground">
              Stage path for {record.id} from intake to the next queue.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,118px),1fr))] gap-2">
          {auditTrack.stages.map((stage, index) => (
            <div key={`${stage.label}-${index}`} className="flex min-w-0 items-stretch gap-2">
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col justify-between rounded-md border px-2 py-2",
                  stage.state === "current"
                    ? "border-primary/35 bg-primary/10"
                    : stage.state === "complete"
                      ? "border-success/25 bg-success/10"
                      : "border-border bg-background",
                )}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate text-[10px] font-semibold">{stage.label}</span>
                  {stage.state === "complete" ? (
                    <CheckCircle2 className="size-3 shrink-0 text-success" />
                  ) : (
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        stage.state === "current" ? "bg-primary" : "bg-muted-foreground/50",
                      )}
                    />
                  )}
                </div>
                <div className="mt-1 text-[9px] leading-3 text-muted-foreground">
                  <div className="truncate">{stage.detail}</div>
                  <div className="truncate">{stage.owner}</div>
                </div>
              </div>
              {index < auditTrack.stages.length - 1 && (
                <div className="hidden items-center text-muted-foreground xl:flex">
                  <ArrowRight className="size-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold">Audit Events</div>
            <div className="text-[10px] text-muted-foreground">Recorded movement by stage.</div>
          </div>
          <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
            {auditTrack.events.length} events
          </span>
        </div>
        <div className="space-y-2">
          {auditTrack.events.map((event, index) => (
            <div
              key={`${event.from}-${event.to}-${index}`}
              className="grid gap-2 rounded-md border border-border bg-background p-2 text-[10px] md:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase text-muted-foreground">From</div>
                <div className="mt-0.5 truncate font-semibold">{event.from}</div>
              </div>
              <div className="flex items-center text-muted-foreground md:justify-center">
                <ArrowRight className="size-3" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase text-muted-foreground">To</div>
                <div className="mt-0.5 truncate font-semibold">{event.to}</div>
              </div>
              <div className="min-w-0 md:col-span-3">
                <div className="mt-1 grid gap-1.5 rounded border border-border bg-muted/35 p-2 md:grid-cols-[130px_110px_minmax(0,1fr)]">
                  <div>
                    <div className="text-[9px] font-medium uppercase text-muted-foreground">Actor</div>
                    <div className="truncate font-medium">{event.actor}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-medium uppercase text-muted-foreground">Time</div>
                    <div className="truncate font-medium">{event.time}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-medium uppercase text-muted-foreground">Note</div>
                    <div className="font-medium leading-3.5">{event.note}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function ExtractedTableView({ table }: { table: ExtractedTable }) {
  const tableSignature = JSON.stringify({
    accuracy: table.accuracy,
    columns: table.columns,
    rows: table.rows,
    title: table.title,
  });
  const [columns, setColumns] = useState(table.columns);
  const [rows, setRows] = useState(table.rows);

  useEffect(() => {
    setColumns(table.columns);
    setRows(table.rows);
  }, [tableSignature]);

  function addColumn() {
    setColumns((items) => [...items, `Column ${items.length + 1}`]);
    setRows((items) => items.map((row) => [...row, ""]));
  }

  function deleteColumn(columnIndex: number) {
    if (columns.length <= 1) return;
    setColumns((items) => items.filter((_, index) => index !== columnIndex));
    setRows((items) => items.map((row) => row.filter((_, index) => index !== columnIndex)));
  }

  function updateColumn(columnIndex: number, value: string) {
    setColumns((items) => items.map((column, index) => (index === columnIndex ? value : column)));
  }

  function addRow() {
    setRows((items) => [...items, Array.from({ length: columns.length }, () => "")]);
  }

  function deleteRow(rowIndex: number) {
    if (rows.length <= 1) return;
    setRows((items) => items.filter((_, index) => index !== rowIndex));
  }

  function duplicateRow(rowIndex: number) {
    setRows((items) => {
      const sourceRow = items[rowIndex];
      if (!sourceRow) return items;

      const nextRows = [...items];
      nextRows.splice(rowIndex + 1, 0, [...sourceRow]);
      return nextRows;
    });
  }

  function updateCell(rowIndex: number, cellIndex: number, value: string) {
    setRows((items) =>
      items.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentCellIndex) => (currentCellIndex === cellIndex ? value : cell))
          : row,
      ),
    );
  }

  return (
    <section className="rounded-md border border-border bg-white p-2 text-zinc-900 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
          {table.title}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={addRow}
            aria-label="Add row"
            title="Add row"
            className="grid size-6 place-items-center rounded border border-zinc-300 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
          >
            <Rows3 className="size-3" />
          </button>
          <button
            type="button"
            onClick={addColumn}
            aria-label="Add column"
            title="Add column"
            className="grid size-6 place-items-center rounded border border-zinc-300 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
          >
            <Columns3 className="size-3" />
          </button>
          <span className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0 text-[9px] font-medium text-zinc-600">
            Source format
          </span>
          <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0 text-[9px] font-semibold text-primary">
            OCR Accuracy {table.accuracy}%
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse border border-zinc-400 text-[10px]">
          <thead className="bg-zinc-100">
            <tr>
              {columns.map((column, columnIndex) => (
                <th
                  key={`${column}-${columnIndex}`}
                  className="border border-zinc-400 p-1 text-left align-top"
                >
                  <div className="flex items-center gap-1">
                    <input
                      value={column}
                      onChange={(event) => updateColumn(columnIndex, event.target.value)}
                      className="h-6 min-w-28 flex-1 rounded border border-transparent bg-transparent px-1 text-[10px] font-bold uppercase tracking-wide outline-none focus:border-primary/50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => deleteColumn(columnIndex)}
                      disabled={columns.length <= 1}
                      aria-label={`Delete column ${columnIndex + 1}`}
                      title="Delete column"
                      className="grid size-5 shrink-0 place-items-center rounded text-zinc-500 hover:bg-zinc-200 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-14 border border-zinc-400 p-1" aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((_, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="border border-zinc-400 p-1 align-top"
                  >
                    <textarea
                      value={row[cellIndex] ?? ""}
                      onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
                      rows={2}
                      className="min-h-10 w-full resize-y rounded border border-transparent bg-transparent px-1 py-0.5 text-[10px] leading-4 outline-none focus:border-primary/50 focus:bg-white"
                    />
                  </td>
                ))}
                <td className="w-14 border border-zinc-400 p-1 align-top">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => duplicateRow(rowIndex)}
                      aria-label={`Duplicate row ${rowIndex + 1}`}
                      title="Duplicate row"
                      className="grid size-5 place-items-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-primary"
                    >
                      <Copy className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRow(rowIndex)}
                      disabled={rows.length <= 1}
                      aria-label={`Delete row ${rowIndex + 1}`}
                      title="Delete row"
                      className="grid size-5 place-items-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getGroupedFieldLabel(groupTitle: string, label: string) {
  if (groupTitle === "ORIGIN / SHIPPER") return label.replace("Origin / Shipper ", "");
  if (groupTitle === "DESTINATION / CONSIGNEE") return label.replace("Destination / Consignee ", "");
  if (groupTitle === "FREIGHT CHARGES TO / Bill To") {
    if (label === "Freight Charges Terms") return "Terms:";
    return label.replace("Bill To ", "");
  }
  if (groupTitle === "Items / Table" && label === "NMFC #") return "NMFC#";
  if (groupTitle === "Other info" && label === "Total Weight") return "Total Weight:";
  if (groupTitle === "Carrier" && label === "Carrier Phone #") return "Carrier Phone#";
  return label;
}

function DocumentPreview({
  record,
  fields,
  highlightedField,
}: {
  record: WorkflowRecord;
  fields: ReturnType<typeof getExtractedFields>;
  highlightedField: string | null;
}) {
  const field = (label: string) => fields.find((item) => item.label === label)?.value ?? "";
  const highlight = highlightedField === billOfLadingFieldLabel ? billOfLadingHighlight : undefined;

  if (record.documentUrl && isBillOfLadingRecord(record)) {
    return (
      <div className="flex h-full w-full items-start justify-center">
        <div className="h-full w-full overflow-hidden rounded-md border border-border bg-white shadow-sm">
          {record.documentIsPdf ? (
            <object
              data={record.documentUrl}
              type="application/pdf"
              className="h-full w-full bg-white"
            >
              <iframe
                title={record.id}
                src={record.documentUrl}
                className="h-full w-full bg-white"
              />
            </object>
          ) : (
            <ZoomableDocumentImage
              src={record.documentUrl}
              alt={record.id}
              className="w-full select-none bg-white shadow-sm"
              highlight={highlight}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-md bg-white p-8 text-zinc-900 shadow-elegant">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold tracking-tight">INVOICE</div>
          <div className="mt-1 text-xs text-zinc-500">Vendor billing document</div>
        </div>
        <div className="text-right text-xs">
          <div className="font-mono">{record.id}</div>
          <div>28 May 2026</div>
        </div>
      </div>
      <div className="mt-8 rounded border border-zinc-300">
        <div className="grid grid-cols-[1fr_120px_140px] bg-zinc-100 px-4 py-2 text-xs font-bold uppercase text-zinc-500">
          <span>Description</span>
          <span>Qty</span>
          <span>Total</span>
        </div>
        <div className="grid grid-cols-[1fr_120px_140px] px-4 py-4 text-sm">
          <span>
            {field("Line Item")}
            <br />
            <span className="text-xs text-zinc-500">SKU {field("SKU")}</span>
          </span>
          <span>{field("Quantity")}</span>
          <span>{field("Amount Due")}</span>
        </div>
      </div>
      <div className="mt-6 text-right text-xl font-bold">Amount Due: {field("Amount Due")}</div>
    </div>
  );
}

function getInitialSlaSeconds(record: WorkflowRecord) {
  const tail = Number(record.id.slice(-2));
  const hours = 1 + (tail % 5);
  const minutes = 8 + (tail % 46);
  const baseSeconds = demoSlaSeconds[record.id] ?? hours * 60 * 60 + minutes * 60;

  if (typeof window === "undefined") return baseSeconds;

  try {
    const deadlines = JSON.parse(localStorage.getItem(slaDeadlineStorageKey) || "{}") as Record<string, number>;
    const shouldResetDemoDeadline =
      record.id in demoSlaSeconds && localStorage.getItem(slaDemoVersionStorageKey) !== slaDemoVersion;
    if (shouldResetDemoDeadline) {
      const deadline = Date.now() + baseSeconds * 1000;
      localStorage.setItem(
        slaDeadlineStorageKey,
        JSON.stringify({
          ...deadlines,
          [record.id]: deadline,
        }),
      );
      localStorage.setItem(slaDemoVersionStorageKey, slaDemoVersion);
      return baseSeconds;
    }

    if (typeof deadlines[record.id] === "number" && deadlines[record.id] > Date.now()) {
      return Math.max(0, Math.ceil((deadlines[record.id] - Date.now()) / 1000));
    }

    const deadline = Date.now() + baseSeconds * 1000;
    localStorage.setItem(
      slaDeadlineStorageKey,
      JSON.stringify({
        ...deadlines,
        [record.id]: deadline,
      }),
    );
    return baseSeconds;
  } catch {
    return baseSeconds;
  }
}

function formatSlaTime(totalSeconds: number) {
  const clampedSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function OCRReview() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WorkflowRecord[]>(() => {
    const loaded = mergeQueue("ocr", ocrQueueRecords as WorkflowRecord[]);
    return loaded.map((r) => ({
      ...r,
      documentType: normalizeDocumentType(r.documentType),
      confidence: normalizeOcrConfidence(r.confidence),
      ocrFields: r.ocrFields?.map((field) => ({
        ...field,
        confidence: normalizeOcrConfidence(field.confidence),
      })),
    }));
  });
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") return records[0]?.id ?? "";
    return new URLSearchParams(window.location.search).get("document") || records[0]?.id || "";
  });

  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("Low confidence OCR extraction");
  const [exceptionComments, setExceptionComments] = useState(
    "Review source document and correct extracted fields.",
  );
  const [assignedUser, setAssignedUser] = useState("Client");
  const [toast, setToast] = useState("");
  const [extractedDataView, setExtractedDataView] = useState<ReviewDataView>("information");
  const [reviewLayout, setReviewLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [slaSecondsRemaining, setSlaSecondsRemaining] = useState(0);

  const record = useMemo(
    () => records.find((item) => item.id === selectedId) ?? records[0],
    [records, selectedId],
  );
  const extractedFields = record ? getExtractedFields(record) : [];
  const groupedFields = useMemo(() => groupReviewFields(extractedFields), [extractedFields]);
  const lineItemTable = useMemo(() => buildLineItemTable(extractedFields), [extractedFields]);

  useEffect(() => {
    if (!record) return;

    setSlaSecondsRemaining(getInitialSlaSeconds(record));
  }, [record?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlaSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!record || slaSecondsRemaining > 0) return;

    setSlaSecondsRemaining(getInitialSlaSeconds(record));
  }, [record, slaSecondsRemaining]);

  useEffect(() => {
    const targetDocument = new URLSearchParams(window.location.search).get("document");
    if (targetDocument && records.some((item) => item.id === targetDocument)) {
      setSelectedId(targetDocument);
    }
  }, [records]);

  function removeSelected(message: string) {
    setRecords((items) => {
      const next = items.filter((item) => item.id !== record.id);
      setSelectedId(next[0]?.id ?? "");
      return next;
    });
    setToast(message);
  }

  function approveOcr() {
    const nextRecord = { ...record, status: "QC Processing" as const, owner: "Priya Iyer" };
    moveRecord("ocr", "processing", nextRecord);
    removeSelected(`${record.id} moved to Processing Queue`);
    navigate({ to: "/processing-queue", search: { document: record.id } });
  }

  function submitException() {
    moveRecord(
      "ocr",
      "exception",
      makeExceptionRecord(record, "OCR Review", exceptionReason, exceptionComments, assignedUser),
    );
    setExceptionOpen(false);
    removeSelected(`${record.id} moved to Exception Queue`);
    navigate({ to: "/exceptions" });
  }

  function selectExtractedDataView(view: ReviewDataView) {
    setExtractedDataView(view);
  }

  useEffect(() => {
    const openException = () => setExceptionOpen(true);
    const sendToProcessing = () => approveOcr();

    window.addEventListener("dataspan-ocr-exception", openException);
    window.addEventListener("dataspan-ocr-processing", sendToProcessing);
    return () => {
      window.removeEventListener("dataspan-ocr-exception", openException);
      window.removeEventListener("dataspan-ocr-processing", sendToProcessing);
    };
  }, [record]);

  function getQueuePriority(item: WorkflowRecord) {
    if (item.confidence < 70) return "Critical";
    if (item.confidence < 82) return "High";
    if (item.confidence < 92) return "Medium";
    return "Low";
  }

  function getSla(item: WorkflowRecord) {
    if (item.confidence < 70) return "Breached";
    const tail = Number(item.id.slice(-2));
    return `${1 + (tail % 4)}h ${String(12 + (tail % 44)).padStart(2, "0")}m`;
  }

  function getPriorityClasses(priority: string) {
    const map: Record<string, string> = {
      Critical: "border-destructive/30 bg-destructive/10 text-destructive",
      High: "border-warning/30 bg-warning/10 text-warning",
      Medium: "border-info/30 bg-info/10 text-info",
      Low: "border-border bg-muted text-muted-foreground",
    };
    return map[priority] ?? "border-border bg-muted text-muted-foreground";
  }

  if (!record) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="OCR Review"
          description="No OCR documents are currently waiting for review."
        />
        <Card>
          <div className="text-sm text-muted-foreground">
            All OCR records have been moved to QC, Export, or Exception.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-0">
      {toast && (
        <div className="border-b border-success/20 bg-success/10 px-4 py-2.5 text-sm font-medium text-success shrink-0 flex items-center justify-between">
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            className="text-xs text-success/80 hover:text-success hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <ResizablePanelGroup
        key={reviewLayout}
        direction={reviewLayout}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <ResizablePanel
          defaultSize="62%"
          minSize="0%"
          maxSize="100%"
          collapsible
          collapsedSize="0%"
        >
          <section className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/35">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="truncate font-mono text-sm font-medium">{record.id}</span>
                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {record.documentType}
                </span>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <span className="text-[11px] text-muted-foreground">OCR Review</span>
                <div
                  className="inline-flex rounded border border-border bg-muted/60 p-0.5"
                  role="group"
                  aria-label="Review panel layout"
                >
                  <button
                    type="button"
                    aria-label="Show preview and extracted data side by side"
                    title="Side by side"
                    aria-pressed={reviewLayout === "horizontal"}
                    onClick={() => setReviewLayout("horizontal")}
                    className={cn(
                      "grid size-6 place-items-center rounded transition-colors",
                      reviewLayout === "horizontal"
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Columns2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Show preview above extracted data"
                    title="Stacked"
                    aria-pressed={reviewLayout === "vertical"}
                    onClick={() => setReviewLayout("vertical")}
                    className={cn(
                      "grid size-6 place-items-center rounded transition-colors",
                      reviewLayout === "vertical"
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Rows2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-4 grid-bg">
              <DocumentPreview
                record={record}
                fields={extractedFields}
                highlightedField={highlightedField}
              />
            </div>
          </section>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className={cn(
            "bg-border/80 transition hover:bg-primary/35",
            reviewLayout === "horizontal"
              ? "w-3 cursor-col-resize"
              : "h-3 w-full cursor-row-resize",
          )}
        />
        <ResizablePanel
          defaultSize="38%"
          minSize="0%"
          maxSize="100%"
          collapsible
          collapsedSize="0%"
        >
          <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
            <div className="block border-b border-border px-3 py-2 after:clear-both after:table after:content-['']">
              <div className="float-right mb-1 ml-4">
                <div
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold shadow-sm",
                    slaSecondsRemaining < 10 * 60
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-warning/30 bg-warning/10 text-warning",
                  )}
                >
                  <Clock className="size-3.5" />
                  <span>SLA</span>
                  <span className="font-mono tabular-nums">{formatSlaTime(slaSecondsRemaining)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-md bg-success/12 text-success">
                    <ScanText className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">Extracted OCR Data</div>
                    <div className="text-[10px] text-muted-foreground">{extractedFields.length} fields detected</div>
                  </div>
                </div>
                <div
                  className="inline-flex rounded border border-border bg-muted/60 p-0.5"
                  role="tablist"
                  aria-label="Extracted OCR data view"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={extractedDataView === "information"}
                    onClick={() => selectExtractedDataView("information")}
                    className={cn(
                      "h-6 rounded px-2.5 text-[10px] font-medium transition-colors",
                      extractedDataView === "information"
                        ? "tab-selected-glow bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Information
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={extractedDataView === "table"}
                    aria-disabled={!lineItemTable}
                    disabled={!lineItemTable}
                    onClick={() => selectExtractedDataView("table")}
                    className={cn(
                      "h-6 rounded px-2.5 text-[10px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
                      extractedDataView === "table"
                        ? "tab-selected-glow bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={extractedDataView === "exception"}
                    onClick={() => selectExtractedDataView("exception")}
                    className={cn(
                      "h-6 rounded px-2.5 text-[10px] font-medium transition-colors",
                      extractedDataView === "exception"
                        ? "tab-selected-glow bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Exception
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={extractedDataView === "audit-track"}
                    onClick={() => selectExtractedDataView("audit-track")}
                    className={cn(
                      "h-6 rounded px-2.5 text-[10px] font-medium transition-colors",
                      extractedDataView === "audit-track"
                        ? "tab-selected-glow bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Audit Trail
                  </button>
                </div>
              </div>
              <div className="mt-1 flex justify-end">
                <ConfidenceIndicator value={record.confidence} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2">
              <div className="space-y-3">
                <div className={cn(extractedDataView !== "information" && "hidden")}>
                  <ResponsiveCardColumns
                    cards={groupedFields.map((group) => ({
                      id: group.title,
                      weight: group.items.reduce(
                        (total, field) => total + 1 + Math.floor(field.value.length / 48),
                        1,
                      ),
                      content: (
                        <section className="rounded-md border border-border bg-card p-2 shadow-sm">
                          <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-border pb-1">
                            <h3 className="text-[9px] font-semibold uppercase text-foreground">
                              {group.title}
                            </h3>
                            <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                              {group.items.length} {group.items.length === 1 ? "field" : "fields"}
                            </span>
                          </div>
                          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-x-2 gap-y-1">
                            {group.items.map((field) => {
                              const canHighlight = field.label === billOfLadingFieldLabel;
                              const isHighlighted = highlightedField === field.label;
                              const displayLabel = getGroupedFieldLabel(group.title, field.label);

                              return (
                                <button
                                  key={`${record.id}-${field.label}`}
                                  type="button"
                                  onClick={() => {
                                    if (canHighlight) setHighlightedField(field.label);
                                  }}
                                  className={cn(
                                    getFieldContainerClasses(),
                                    "rounded text-left",
                                    canHighlight && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/35",
                                    isHighlighted && "ring-2 ring-red-500/70",
                                  )}
                                  aria-pressed={isHighlighted}
                                >
                                  <div className="mb-0.5 flex items-center gap-2">
                                    <span className={getFieldLabelClasses(field.confidence)}>
                                      {displayLabel}
                                    </span>
                                  </div>
                                  <ReadOnlyFieldValue
                                    value={field.value}
                                    confidence={field.confidence}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ),
                    }))}
                  />
                </div>
                {lineItemTable && (
                  <div className={cn(extractedDataView !== "table" && "hidden")}>
                    <ExtractedTableView table={lineItemTable} />
                  </div>
                )}
                <div className={cn("space-y-3", extractedDataView !== "exception" && "hidden")}>
                  <section className="rounded-md border border-warning/25 bg-warning/8 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning" />
                      <div>
                        <div className="text-xs font-semibold">Exception Details</div>
                        <div className="text-[10px] text-muted-foreground">
                          Returned exception context for this OCR Review document.
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2 text-[10px]">
                      {[
                        ["Status", record.returnedFrom === "Exception" ? "Returned from Exception" : "No active exception"],
                        ["Source", record.exceptionReturnSourceStage || "Exception Queue"],
                        ["Target", record.exceptionReturnTargetStage || "OCR Review"],
                        ["Returned at", record.exceptionReturnedAt || "Not returned"],
                        ["Reason", record.exceptionReturnReason || record.exceptionReason || "No exception reason captured."],
                        ["Last assigned", record.exceptionReturnAssignedUser || "Unassigned"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded border border-border bg-card px-2 py-1.5">
                          <div className="text-[9px] font-medium uppercase text-muted-foreground">
                            {label}
                          </div>
                          <div className="mt-0.5 font-medium text-foreground">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 rounded border border-border bg-card px-2 py-1.5 text-[10px]">
                      <div className="text-[9px] font-medium uppercase text-muted-foreground">
                        Resolution note
                      </div>
                      <div className="mt-0.5 font-medium text-foreground">
                        {record.exceptionReturnComments || "No resolution comments captured."}
                      </div>
                    </div>
                  </section>
                </div>
                <div className={cn(extractedDataView !== "audit-track" && "hidden")}>
                  <AuditTrackView record={record} />
                </div>
              </div>
            </div>
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>

      {exceptionOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8 md:pt-16">
          <Card className="w-full max-w-lg bg-background shadow-elegant">
            <CardHeader
              title="Send to Exception"
              subtitle={`Capture exception details for ${record.id}`}
            />
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">Reason</span>
                <input
                  value={exceptionReason}
                  onChange={(event) => setExceptionReason(event.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Comments</span>
                <textarea
                  value={exceptionComments}
                  onChange={(event) => setExceptionComments(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Assigned User</span>
                <select
                  value={assignedUser}
                  onChange={(event) => setAssignedUser(event.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                >
                  <option>Client</option>
                  <option>OCR Operator</option>
                  <option>QC User</option>
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <Btn variant="outline" onClick={() => setExceptionOpen(false)}>
                  Cancel
                </Btn>
                <Btn variant="destructive" onClick={submitException}>
                  Move to Exception
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
