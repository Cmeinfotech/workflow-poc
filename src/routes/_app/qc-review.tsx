import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ClipboardCheck,
  Columns2,
  Columns3,
  Copy,
  FileText,
  Rows2,
  Rows3,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  PageHeader,
  ConfidenceBadge,
  ConfidencePercent,
  Btn,
} from "@/components/ui-kit";
import { ZoomableDocumentImage } from "@/components/zoomable-document-image";
import { ResponsiveCardColumns } from "@/components/responsive-card-columns";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { inventoryRecords } from "@/lib/ocr-inventory-data";
import {
  makeExceptionRecord,
  mergeQueue,
  moveRecord,
  normalizeDocumentType,
  writeQueue,
  type WorkflowRecord,
} from "@/lib/workflow-state";
import { isBillOfLadingRecord } from "@/lib/bill-of-lading-samples";
import {
  buildLineItemTable,
  getReviewFields,
  groupReviewFields,
  type ExtractedTable,
} from "@/lib/review-fields";
import {
  applyReviewFieldPolicy,
  isReviewFieldEditable,
  useReviewFieldPolicies,
} from "@/lib/review-field-policy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/qc-review")({
  component: QCReview,
  head: () => ({ meta: [{ title: "QC Review - Chiaro OCR" }] }),
});

const documentTypes = ["BOL", "HBL"] as const;
const billOfLadingFieldLabel = "Bill of Lading No.";
const billOfLadingHighlight = {
  label: billOfLadingFieldLabel,
  x: 74.8,
  y: 7.3,
  width: 21.5,
  height: 5.2,
};

const fileNameByType: Record<(typeof documentTypes)[number], string> = {
  BOL: "ocean-bill-of-lading-0528.png",
  HBL: "house-bill-of-lading-0528.png",
};

const trainityReviewDocumentPages = [
  {
    label: "Page 1",
    fileName: "BOL_832611300031.pdf",
    documentUrl: "/bills-2/BOL_832611300031.pdf",
    documentIsPdf: true,
  },
  {
    label: "Page 2",
    fileName: "BOL_832525100049.pdf",
    documentUrl: "/bills-2/BOL_832525100049.pdf",
    documentIsPdf: true,
  },
];

function withReviewDocumentPages(record: WorkflowRecord): WorkflowRecord {
  if (!record.id.startsWith("DS-TRAINITY-")) return record;

  return {
    ...record,
    fileName: "Trainity BOL Review Packet.pdf",
    documentPages: trainityReviewDocumentPages,
  };
}

function getFieldValueBorderClasses(confidence: number) {
  if (confidence < 65) return "border-destructive/45";
  if (confidence < 95) return "border-warning/45";
  return "border-border";
}

const qcQueueRecords = Array.from({ length: 31 }, (_, index) => {
  const base = inventoryRecords[(index + 2) % inventoryRecords.length];
  const count = 30031 - index;
  const documentType = documentTypes[index % documentTypes.length];

  return {
    ...base,
    id: `DS-INV-${count}`,
    fileName:
      index === 0
        ? fileNameByType[documentType]
        : fileNameByType[documentType].replace("0528", String(index + 1).padStart(4, "0")),
    status: "QC Review" as const,
    owner: "QC User",
    documentType,
    quantity: Number(base.quantity) + index * 5,
    confidence: Math.max(70, Number(base.confidence) - (index % 7)),
  };
});

function DocumentPreview({
  record,
  fields,
  highlightedField,
  selectedPageIndex,
}: {
  record: WorkflowRecord;
  fields: ReturnType<typeof getReviewFields>;
  highlightedField: string | null;
  selectedPageIndex: number;
}) {
  const field = (label: string) => fields.find((item) => item.label === label)?.value ?? "";
  const highlight = highlightedField === billOfLadingFieldLabel ? billOfLadingHighlight : undefined;
  const pages = getDocumentPreviewPages(record);
  const selectedPage = pages[selectedPageIndex] ?? pages[0];

  if (selectedPage?.documentUrl && isBillOfLadingRecord(record)) {
    return (
      <div className="flex h-full w-full items-start justify-center">
        <div className="h-full w-full overflow-hidden rounded-md border border-border bg-white shadow-sm">
          {selectedPage.documentIsPdf ? (
            <object
              data={selectedPage.documentUrl}
              type="application/pdf"
              className="h-full w-full bg-white"
            >
              <iframe
                title={`${record.id} ${selectedPage.label}`}
                src={selectedPage.documentUrl}
                className="h-full w-full bg-white"
              />
            </object>
          ) : (
            <ZoomableDocumentImage
              src={selectedPage.documentUrl}
              alt={`${record.id} ${selectedPage.label}`}
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
          <div className="mt-1 text-xs text-zinc-500">QC vendor billing validation</div>
        </div>
        <div className="text-right text-xs">
          <div className="font-mono">{field("Bill of Lading No.")}</div>
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

function getDocumentPreviewPages(record: WorkflowRecord) {
  if (record.documentPages?.length) return record.documentPages;
  if (!record.documentUrl) return [];

  return [
    {
      label: "Page 1",
      fileName: record.fileName,
      documentUrl: record.documentUrl,
      documentIsPdf: record.documentIsPdf,
    },
  ];
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
          <span className="max-w-28 truncate rounded border border-primary/30 bg-primary/10 px-1.5 py-0 text-[9px] font-semibold text-primary">
            OCR Accuracy {table.accuracy}%
          </span>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
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

function QCReview() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WorkflowRecord[]>(() => {
    const loaded = mergeQueue("qc", qcQueueRecords as WorkflowRecord[]);
    return loaded.map((r) =>
      withReviewDocumentPages({
        ...r,
        documentType: normalizeDocumentType(r.documentType),
      }),
    );
  });
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") return records[0]?.id ?? "";
    return new URLSearchParams(window.location.search).get("document") || records[0]?.id || "";
  });

  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("QC validation failed");
  const [exceptionComments, setExceptionComments] = useState(
    "Business field mismatch requires exception handling.",
  );
  const [assignedUser, setAssignedUser] = useState("Client");
  const [toast, setToast] = useState("");
  const [reviewLayout, setReviewLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [validationDataView, setValidationDataView] = useState<"information" | "table" | "exception">(
    "information",
  );
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const { policies } = useReviewFieldPolicies();

  const record = useMemo(
    () => records.find((item) => item.id === selectedId) ?? records[0],
    [records, selectedId],
  );
  const qcFields = record ? applyReviewFieldPolicy(getReviewFields(record), "qc", policies) : [];
  const groupedQcFields = groupReviewFields(qcFields);
  const lineItemTable = useMemo(() => buildLineItemTable(qcFields), [qcFields]);
  const previewPages = record ? getDocumentPreviewPages(record) : [];

  useEffect(() => {
    const targetDocument = new URLSearchParams(window.location.search).get("document");
    if (targetDocument && records.some((item) => item.id === targetDocument)) {
      setSelectedId(targetDocument);
    }
  }, [records]);

  useEffect(() => {
    setSelectedPageIndex(0);
  }, [record?.id]);

  function removeSelected(message: string) {
    setRecords((items) => {
      const next = items.filter((item) => item.id !== record.id);
      setSelectedId(next[0]?.id ?? "");
      return next;
    });
    setToast(message);
  }

  function updateQcField(label: string, value: string) {
    if (label === "QC Decision Field") return;
    if (!isReviewFieldEditable(label, "qc", policies)) return;

    setRecords((items) => {
      const next = items.map((item) => {
        if (item.id !== record.id) return item;

        const fields = getReviewFields(item)
          .filter((field) => field.label !== "QC Decision Field")
          .map((field) => (field.label === label ? { ...field, value } : field));
        return { ...item, ocrFields: fields };
      });
      writeQueue("qc", next);
      return next;
    });
  }

  function approveQc() {
    moveRecord("qc", "export", { ...record, status: "Export Ready", owner: "Export User" });
    removeSelected(`${record.id} moved to Export`);
    navigate({ to: "/export", search: { document: record.id } });
  }

  function sendBackToOcr() {
    moveRecord("qc", "ocr", { ...record, status: "OCR Review", owner: "OCR Operator" });
    removeSelected(`${record.id} returned to OCR Review`);
    navigate({ to: "/ocr-review-queue", search: { document: record.id } });
  }

  function sendToManualReview() {
    moveRecord("qc", "manual", {
      ...record,
      status: "Manual Review",
      owner: "Audit Reviewer",
      assignedUser: "Audit Reviewer",
      returnedFrom: "QC Review",
      comments: record.comments || "Audit requested by QC.",
    });
    removeSelected(`${record.id} moved to Audit`);
    navigate({ to: "/manual-review" });
  }

  function submitException() {
    moveRecord(
      "qc",
      "exception",
      makeExceptionRecord(record, "QC Review", exceptionReason, exceptionComments, assignedUser),
    );
    setExceptionOpen(false);
    removeSelected(`${record.id} moved to Exception Queue`);
    navigate({ to: "/exceptions" });
  }

  function selectValidationDataView(view: "information" | "table" | "exception") {
    setValidationDataView(view);
  }

  useEffect(() => {
    const sendToReview = () => sendBackToOcr();
    const sendToManual = () => sendToManualReview();
    const openException = () => setExceptionOpen(true);
    const sendToExport = () => approveQc();

    window.addEventListener("dataspan-qc-review", sendToReview);
    window.addEventListener("dataspan-qc-manual", sendToManual);
    window.addEventListener("dataspan-qc-exception", openException);
    window.addEventListener("dataspan-qc-export", sendToExport);
    return () => {
      window.removeEventListener("dataspan-qc-review", sendToReview);
      window.removeEventListener("dataspan-qc-manual", sendToManual);
      window.removeEventListener("dataspan-qc-exception", openException);
      window.removeEventListener("dataspan-qc-export", sendToExport);
    };
  }, [record]);

  if (!record) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="QC Review"
          description="No Audit documents are currently waiting for review."
        />
        <Card>
          <div className="text-sm text-muted-foreground">
            All QC records have been approved, returned, or moved to Exception.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-0">
      <PageHeader
        title="Quality Check"
        description={`${records.length} documents awaiting manual quality review and approval.`}
      />
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
                {previewPages.length > 1 && (
                  <div
                    className="inline-flex rounded border border-border bg-muted/60 p-0.5"
                    role="tablist"
                    aria-label="Document pages"
                  >
                    {previewPages.map((page, index) => (
                      <button
                        key={`${page.fileName}-${index}`}
                        type="button"
                        role="tab"
                        aria-selected={selectedPageIndex === index}
                        title={page.fileName}
                        onClick={() => setSelectedPageIndex(index)}
                        className={cn(
                          "h-6 rounded px-2.5 text-[10px] font-medium transition-colors",
                          selectedPageIndex === index
                            ? "bg-background text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {page.label}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-[11px] text-muted-foreground">QC Review</span>
                <div
                  className="inline-flex rounded border border-border bg-muted/60 p-0.5"
                  role="group"
                  aria-label="Review panel layout"
                >
                  <button
                    type="button"
                    aria-label="Show preview and validation data side by side"
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
                    aria-label="Show preview above validation data"
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
                fields={qcFields}
                highlightedField={highlightedField}
                selectedPageIndex={selectedPageIndex}
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
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-md bg-warning/12 text-warning">
                    <ClipboardCheck className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Business Data Validation</div>
                    <div className="text-[11px] text-muted-foreground">
                      {qcFields.length} fields ready for QC
                    </div>
                  </div>
                </div>
                <ConfidenceBadge value={record.confidence} />
              </div>
              <div
                className="mt-2 inline-flex rounded border border-border bg-muted/60 p-0.5"
                role="tablist"
                aria-label="QC validation data view"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={validationDataView === "information"}
                  onClick={() => selectValidationDataView("information")}
                  className={cn(
                    "h-6 rounded px-2.5 text-[10px] font-medium transition-colors",
                    validationDataView === "information"
                      ? "tab-selected-glow bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Information
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={validationDataView === "table"}
                  aria-disabled={!lineItemTable}
                  disabled={!lineItemTable}
                  onClick={() => selectValidationDataView("table")}
                  className={cn(
                    "h-6 rounded px-2.5 text-[10px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
                    validationDataView === "table"
                      ? "tab-selected-glow bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Table
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={validationDataView === "exception"}
                  onClick={() => selectValidationDataView("exception")}
                  className={cn(
                    "h-6 rounded px-2.5 text-[10px] font-medium transition-colors",
                    validationDataView === "exception"
                      ? "tab-selected-glow bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Exception
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2">
              <div className="space-y-3">
                <div className={cn("space-y-3", validationDataView !== "information" && "hidden")}>
                  <ResponsiveCardColumns
                    cards={groupedQcFields.map((group) => ({
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
                              const editable = isReviewFieldEditable(field.label, "qc", policies);

                              return (
                                <label
                                  key={`${record.id}-${field.label}`}
                                  className={cn(
                                    "min-w-0 rounded",
                                    canHighlight && "cursor-pointer focus-within:ring-2 focus-within:ring-red-500/35",
                                    isHighlighted && "ring-2 ring-red-500/70",
                                  )}
                                  onClick={() => {
                                    if (canHighlight) setHighlightedField(field.label);
                                  }}
                                >
                                  <div className="mb-0.5 flex items-center gap-2">
                                    <span
                                      className={
                                        field.confidence < 65
                                          ? "text-[9px] font-medium text-destructive"
                                          : "text-[9px] font-medium text-muted-foreground"
                                      }
                                    >
                                      {field.label}
                                    </span>
                                  </div>
                                  {field.value.length > 58 ? (
                                    <div className="relative">
                                      <textarea
                                        value={field.value}
                                        disabled={!editable || field.label === "QC Decision Field"}
                                        onFocus={() => {
                                          if (canHighlight) setHighlightedField(field.label);
                                        }}
                                        onChange={(event) =>
                                          updateQcField(field.label, event.target.value)
                                        }
                                        rows={2}
                                        className={`min-h-8 w-full resize-y rounded border bg-background px-1.5 py-1 pr-9 text-[10px] leading-3.5 outline-none focus:border-primary/60 disabled:bg-muted disabled:text-muted-foreground ${getFieldValueBorderClasses(field.confidence)}`}
                                      />
                                      <ConfidencePercent
                                        value={field.confidence}
                                        className="pointer-events-none absolute right-1.5 top-1"
                                      />
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <input
                                        value={field.value}
                                        disabled={!editable || field.label === "QC Decision Field"}
                                        onFocus={() => {
                                          if (canHighlight) setHighlightedField(field.label);
                                        }}
                                        onChange={(event) =>
                                          updateQcField(field.label, event.target.value)
                                        }
                                        className={`h-6 w-full rounded border bg-background px-1.5 pr-9 text-[10px] outline-none focus:border-primary/60 disabled:bg-muted disabled:text-muted-foreground ${getFieldValueBorderClasses(field.confidence)}`}
                                      />
                                      <ConfidencePercent
                                        value={field.confidence}
                                        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
                                      />
                                    </div>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      ),
                    }))}
                  />
                </div>
                {lineItemTable && (
                  <div className={cn(validationDataView !== "table" && "hidden")}>
                    <ExtractedTableView table={lineItemTable} />
                  </div>
                )}
                <div className={cn("space-y-3", validationDataView !== "exception" && "hidden")}>
                  <section className="rounded-md border border-warning/25 bg-warning/8 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning" />
                      <div>
                        <div className="text-xs font-semibold">Exception Details</div>
                        <div className="text-[10px] text-muted-foreground">
                          Returned exception context for this QC Review document.
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2 text-[10px]">
                      {[
                        ["Status", record.returnedFrom === "Exception" ? "Returned from Exception" : "No active exception"],
                        ["Source", record.exceptionReturnSourceStage || "Exception Queue"],
                        ["Target", record.exceptionReturnTargetStage || "QC Review"],
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
              </div>
            </div>
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>

      {exceptionOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8 md:pt-16">
          <Card className="w-full max-w-lg bg-background shadow-elegant">
            <CardHeader
              title="Mark as Exception"
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
