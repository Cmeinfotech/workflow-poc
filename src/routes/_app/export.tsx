import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Download, Eye, FileDown, FileText, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ColumnVisibilityMenu, useColumnVisibility, type ColumnVisibilityOption } from "@/components/column-visibility-menu";
import { useDraggableColumnOrder } from "@/hooks/use-draggable-column-order";
import {
  Card,
  CardHeader,
  PageHeader,
  StatusBadge,
  Btn,
  TablePagination,
} from "@/components/ui-kit";
import { ZoomableDocumentImage } from "@/components/zoomable-document-image";
import { inventoryRecords } from "@/lib/ocr-inventory-data";
import { mergeQueue, normalizeDocumentType, writeQueue, type WorkflowRecord } from "@/lib/workflow-state";

export const Route = createFileRoute("/_app/export")({
  component: ExportModule,
  head: () => ({ meta: [{ title: "Export - Chiaro OCR" }] }),
});

const seedExportRecords = inventoryRecords
  .filter((record) => ["Export Ready", "Export Completed"].includes(record.status))
  .map((record, index) => ({
    ...record,
    id: `DS-BOL-${40002 - index}`,
    documentType: index % 2 === 0 ? "BOL" : "HBL",
  })) as WorkflowRecord[];

const statusTabs = ["All", "Export Ready", "Export Completed"] as const;
const exportFormats = ["JSON", "XML", "CSV"] as const;
const trainityDocumentIds = ["DS-TRAINITY-832611300031", "DS-TRAINITY-832525100049"];
const documentTypeFilters = ["All Types", "BOL", "HBL"];
const ocrFilters = ["All OCR", "High OCR", "Mid OCR", "Low OCR"];
type ExportFormat = (typeof exportFormats)[number];
type ExportColumn = "document" | "lastAssigned" | "type" | "product" | "sku" | "quantity" | "value" | "ocr" | "status";
const pageSize = 20;
const exportColumnOrder: ExportColumn[] = ["document", "lastAssigned", "type", "product", "sku", "quantity", "value", "ocr", "status"];
const exportColumns: ColumnVisibilityOption<ExportColumn>[] = [
  { id: "document", label: "Document", locked: true },
  { id: "lastAssigned", label: "Last Assigned Person" },
  { id: "type", label: "Type" },
  { id: "product", label: "Product" },
  { id: "sku", label: "SKU" },
  { id: "quantity", label: "Qty" },
  { id: "value", label: "Value" },
  { id: "ocr", label: "OCR" },
  { id: "status", label: "Status" },
];

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function ExportModule() {
  const [exportRecords, setExportRecords] = useState<WorkflowRecord[]>(() => {
    const loaded = mergeQueue("export", seedExportRecords);
    return loaded.map((r) => ({
      ...r,
      documentType: normalizeDocumentType(r.documentType),
    }));
  });
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return trainityDocumentIds;
    const documentId = new URLSearchParams(window.location.search).get("document");
    return documentId ? [documentId] : trainityDocumentIds;
  });
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof statusTabs)[number]>("All");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [ocrFilter, setOcrFilter] = useState("All OCR");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("JSON");
  const [currentPage, setCurrentPage] = useState(1);
  const { isColumnVisible, setColumnVisible, resetColumns, visibleColumns } = useColumnVisibility(
    "dataspan-export-visible-columns",
    exportColumns,
  );
  const { columnOrder, getDragClassName, getDragProps } = useDraggableColumnOrder(exportColumnOrder);
  const selectedRecords = useMemo(
    () => exportRecords.filter((record) => selectedIds.includes(record.id)),
    [exportRecords, selectedIds],
  );
  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();

    return exportRecords.filter((record) => {
      const matchesStatus = activeTab === "All" || record.status === activeTab;
      const matchesType = typeFilter === "All Types" || record.documentType === typeFilter;
      const matchesOcr =
        ocrFilter === "All OCR" ||
        (ocrFilter === "High OCR" && record.confidence >= 95) ||
        (ocrFilter === "Mid OCR" && record.confidence >= 90 && record.confidence < 95) ||
        (ocrFilter === "Low OCR" && record.confidence < 90);
      const matchesSearch =
        !search ||
        [
          record.id,
          record.fileName,
          record.productName,
          record.documentType,
          record.sku,
          record.inventoryValue,
          record.status,
        ].some((value) => String(value).toLowerCase().includes(search));

      return matchesStatus && matchesType && matchesOcr && matchesSearch;
    });
  }, [activeTab, exportRecords, ocrFilter, query, typeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const displayedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const selectedReadyRecords = selectedRecords.filter((record) => record.status === "Export Ready");
  const previewRecord =
    selectedRecords.find((record) => record.id === previewId) ?? selectedRecords[0];
  const allVisibleSelected =
    displayedRecords.length > 0 &&
    displayedRecords.every((record) => selectedIds.includes(record.id));
  const readyCount = exportRecords.filter((record) => record.status === "Export Ready").length;
  const completedCount = exportRecords.filter(
    (record) => record.status === "Export Completed",
  ).length;
  const averageConfidence = Math.round(
    exportRecords.reduce((sum, record) => sum + record.confidence, 0) /
      Math.max(exportRecords.length, 1),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, ocrFilter, query, typeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function toggleSelected(recordId: string) {
    setSelectedIds((ids) =>
      ids.includes(recordId) ? ids.filter((id) => id !== recordId) : [...ids, recordId],
    );
  }

  function clearFilters() {
    setActiveTab("All");
    setTypeFilter("All Types");
    setOcrFilter("All OCR");
    setQuery("");
  }

  function completeSelectedExports() {
    if (selectedReadyRecords.length === 0) return;
    const readyIds = new Set(selectedReadyRecords.map((record) => record.id));

    setExportRecords((items) => {
      const next = items.map((item) =>
        readyIds.has(item.id) ? { ...item, status: "Export Completed" as const } : item,
      );
      writeQueue("export", next);
      return next;
    });
  }

  function getExportPayload(record: WorkflowRecord) {
    return {
      documentId: record.id,
      fileName: record.fileName,
      documentType: record.documentType,
      status: record.status,
      productName: record.productName,
      sku: record.sku,
      quantity: record.quantity,
      inventoryValue: record.inventoryValue,
      confidence: record.confidence,
      extractedFields: record.ocrFields ?? [],
    };
  }

  function getLastFromPerson(record: WorkflowRecord) {
    return record.exceptionReturnAssignedUser || record.assignedUser || record.owner || "QC User";
  }

  function getLastFromStage(record: WorkflowRecord) {
    if (record.returnedFrom === "Exception" || record.exceptionReturnReason) return "Exception";
    return record.returnedFrom || "QC";
  }

  function serializeExport(records: WorkflowRecord[], format: ExportFormat) {
    const payloads = records.map(getExportPayload);

    if (format === "XML") {
      const documents = payloads
        .map(
          (payload) => `  <document>
    <documentId>${escapeXml(payload.documentId)}</documentId>
    <fileName>${escapeXml(payload.fileName)}</fileName>
    <documentType>${escapeXml(payload.documentType)}</documentType>
    <status>${escapeXml(payload.status)}</status>
    <productName>${escapeXml(payload.productName)}</productName>
    <sku>${escapeXml(payload.sku)}</sku>
    <quantity>${escapeXml(payload.quantity)}</quantity>
    <inventoryValue>${escapeXml(payload.inventoryValue)}</inventoryValue>
    <confidence>${escapeXml(payload.confidence)}</confidence>
    <extractedFields>
${payload.extractedFields
  .map(
    (field) => `      <field>
        <label>${escapeXml(field.label)}</label>
        <value>${escapeXml(field.value)}</value>
        <confidence>${escapeXml(field.confidence)}</confidence>
      </field>`,
  )
  .join("\n")}
    </extractedFields>
  </document>`,
        )
        .join("\n");

      return `<?xml version="1.0" encoding="UTF-8"?>
<documents>
${documents}
</documents>`;
    }

    if (format === "CSV") {
      const fieldLabels = [
        ...new Set(
          payloads.flatMap((payload) => payload.extractedFields.map((field) => field.label)),
        ),
      ];
      const headers = [
        "documentId",
        "fileName",
        "documentType",
        "status",
        "productName",
        "sku",
        "quantity",
        "inventoryValue",
        "confidence",
        ...fieldLabels,
      ];
      const rows = payloads.map((payload) => {
        const fieldValues = new Map(
          payload.extractedFields.map((field) => [field.label, field.value]),
        );
        return [
          payload.documentId,
          payload.fileName,
          payload.documentType,
          payload.status,
          payload.productName,
          payload.sku,
          payload.quantity,
          payload.inventoryValue,
          payload.confidence,
          ...fieldLabels.map((label) => fieldValues.get(label) ?? ""),
        ]
          .map(escapeCsv)
          .join(",");
      });

      return [headers.map(escapeCsv).join(","), ...rows].join("\n");
    }

    return JSON.stringify(payloads.length === 1 ? payloads[0] : payloads, null, 2);
  }

  function downloadSelectedExports() {
    if (selectedRecords.length === 0) return;

    const extension = exportFormat.toLowerCase();
    const mimeType = {
      JSON: "application/json",
      XML: "application/xml",
      CSV: "text/csv",
    }[exportFormat];
    const url = URL.createObjectURL(
      new Blob([serializeExport(selectedRecords, exportFormat)], { type: mimeType }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download =
      selectedRecords.length === 1
        ? `${selectedRecords[0].id}-export.${extension}`
        : `dataspan-${selectedRecords.length}-documents-export.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function getHeaderLabel(columnId: ExportColumn) {
    const labels: Record<ExportColumn, string> = {
      document: "Document",
      lastAssigned: "Last Assigned Person",
      type: "Type",
      product: "Product",
      sku: "SKU",
      quantity: "Qty",
      value: "Value",
      ocr: "OCR",
      status: "Status",
    };
    return <span className="font-medium">{labels[columnId]}</span>;
  }

  function renderCell(record: WorkflowRecord, columnId: ExportColumn) {
    switch (columnId) {
      case "document":
        return <td key="document" className="max-w-[260px] px-2.5 py-2"><div className="truncate font-mono text-xs font-medium">{record.id}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{record.status}</div></td>;
      case "lastAssigned":
        return <td key="lastAssigned" className="whitespace-nowrap px-2.5 py-2"><div className="text-[11px]">{getLastFromPerson(record)}</div><div className="text-[9px] font-medium text-muted-foreground">From {getLastFromStage(record)}</div></td>;
      case "type":
        return <td key="type" className="whitespace-nowrap px-2.5 py-2"><span className="inline-flex rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium">{record.documentType}</span></td>;
      case "product":
        return <td key="product" className="max-w-[220px] px-2.5 py-2"><div className="truncate text-[11px]">{record.productName}</div></td>;
      case "sku":
        return <td key="sku" className="whitespace-nowrap px-2.5 py-2 font-mono text-[11px] text-muted-foreground">{record.sku}</td>;
      case "quantity":
        return <td key="quantity" className="whitespace-nowrap px-2.5 py-2 text-[11px] tabular-nums">{record.quantity}</td>;
      case "value":
        return <td key="value" className="whitespace-nowrap px-2.5 py-2 text-[11px] font-medium">{record.inventoryValue}</td>;
      case "ocr":
        return <td key="ocr" className="whitespace-nowrap px-2.5 py-2 text-[11px] tabular-nums">{record.confidence}%</td>;
      case "status":
        return <td key="status" className="whitespace-nowrap px-3 py-2"><StatusBadge status={record.status} /></td>;
      default:
        return null;
    }
  }
  return (
    <div className="space-y-3">
      <PageHeader
        title="Export"
        description="Review, select, and export completed BOL and HBL document data."
        actions={
          <>
            <Btn
              variant="outline"
              size="sm"
              disabled={selectedRecords.length === 0}
              onClick={() => {
                setPreviewId(selectedRecords[0]?.id ?? "");
                setPreviewOpen(true);
              }}
            >
              <Eye className="size-3.5" />
              Preview Selected
            </Btn>
            <Btn
              variant="outline"
              size="sm"
              disabled={selectedRecords.length === 0}
              onClick={downloadSelectedExports}
            >
              <Download className="size-3.5" />
              Download Selected
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              disabled={selectedReadyRecords.length === 0}
              onClick={completeSelectedExports}
            >
              <FileDown className="size-3.5" />
              Export Selected
            </Btn>
            <Btn
              variant="success"
              size="sm"
              disabled={selectedReadyRecords.length === 0}
              onClick={completeSelectedExports}
            >
              <CheckCircle2 className="size-3.5" />
              Mark Export Complete
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "Total Documents",
            value: exportRecords.length,
            detail: "Loaded export records",
            tone: "text-primary",
          },
          {
            label: "Export Ready",
            value: readyCount,
            detail: "Waiting for export",
            tone: "text-info",
          },
          {
            label: "Completed",
            value: completedCount,
            detail: "Successfully exported",
            tone: "text-success",
          },
          {
            label: "Average OCR",
            value: `${averageConfidence}%`,
            detail: "Across export records",
            tone: "text-warning",
          },
        ].map((metric) => (
          <div key={metric.label} className="rounded-md border border-border bg-card px-3 py-2">
            <div className="text-[9px] font-medium uppercase text-muted-foreground">
              {metric.label}
            </div>
            <div className={`mt-0.5 text-lg font-bold tabular-nums ${metric.tone}`}>
              {metric.value}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{metric.detail}</div>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-2 border-b border-border px-3 py-2 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Final Processed Data</h3>
            <p className="text-[11px] text-muted-foreground">
              {filteredRecords.length} documents in the current view
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <div className="flex shrink-0 gap-1 rounded-md border border-border bg-muted/30 p-0.5">
              {statusTabs.map((tab) => {
                const count =
                  tab === "All"
                    ? exportRecords.length
                    : exportRecords.filter((record) => record.status === tab).length;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-7 whitespace-nowrap rounded px-2 text-[11px] font-medium transition ${
                      activeTab === tab
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "Export Completed" ? "Completed" : tab}{" "}
                    <span className="ml-1 text-[10px] text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:border-primary/60 focus:outline-none"
            >
              {documentTypeFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            <select
              value={ocrFilter}
              onChange={(event) => setOcrFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:border-primary/60 focus:outline-none"
            >
              {ocrFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-8 text-[11px] focus:border-primary/60 focus:outline-none"
                placeholder="Search ID, file, type, SKU..."
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear export search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            {(activeTab !== "All" || typeFilter !== "All Types" || ocrFilter !== "All OCR" || query) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <X className="size-3" />
                Clear
              </button>
            )}
            <ColumnVisibilityMenu
              columns={exportColumns}
              isColumnVisible={isColumnVisible}
              setColumnVisible={setColumnVisible}
              resetColumns={resetColumns}
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-col gap-2 border-b border-border bg-primary/5 px-3 py-1.5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong>{selectedIds.length}</strong> document{selectedIds.length === 1 ? "" : "s"}{" "}
              selected
              {selectedReadyRecords.length > 0 &&
                ` · ${selectedReadyRecords.length} ready to export`}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="self-start font-medium text-primary hover:underline sm:self-auto"
            >
              Clear selection
            </button>
          </div>
        )}

        <div className="max-h-[calc(100vh-300px)] min-h-[420px] overflow-auto">
          <table className="w-full min-w-[1080px] text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-card shadow-[0_1px_0_var(--color-border)]">
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {columnOrder.map((columnId, index) => {
                  if (!isColumnVisible(columnId)) return null;
                  return (
                    <th key={columnId} {...getDragProps(index)} className={`px-2.5 py-2.5 cursor-grab select-none transition-all duration-150 active:cursor-grabbing hover:bg-muted ${getDragClassName(index)}`}>
                      <div className="flex items-center gap-1"><span className="text-[9px] text-muted-foreground opacity-40">::</span>{getHeaderLabel(columnId)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayedRecords.map((record) => (
                <tr
                  key={record.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select export document ${record.id}`}
                  className={`cursor-pointer border-b border-border/50 transition hover:bg-accent/35 focus-within:bg-accent/35 ${
                    selectedIds.includes(record.id) ? "bg-primary/5" : ""
                  }`}
                  onClick={() => toggleSelected(record.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleSelected(record.id);
                    }
                  }}
                >
                  {columnOrder.map((columnId) => isColumnVisible(columnId) ? renderCell(record, columnId) : null)}
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-muted-foreground" colSpan={visibleColumns.length}>
                    No export documents match the current search and status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRecords.length}
          label="documents"
          onPageChange={setCurrentPage}
        />
      </Card>

      {previewOpen && selectedRecords.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 md:p-6">
          <Card className="flex max-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col overflow-hidden bg-background p-0 shadow-elegant">
            <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">Source Document and Export Output</h2>
                <p className="text-xs text-muted-foreground">
                  Compare the original document with the final structured payload before export.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2 text-[11px]">
                  <span className="text-muted-foreground">Format</span>
                  <select
                    value={exportFormat}
                    onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                    className="bg-transparent font-semibold outline-none"
                    aria-label="Export output format"
                  >
                    {exportFormats.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </label>
                <Btn variant="outline" size="sm" onClick={downloadSelectedExports}>
                  <Download className="size-3.5" />
                  Download
                </Btn>
                <Btn variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
                  Close
                </Btn>
              </div>
            </div>

            {selectedRecords.length > 1 && (
              <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-muted/30 px-3 py-2">
                {selectedRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setPreviewId(record.id)}
                    className={`shrink-0 rounded-md border px-2.5 py-1.5 text-left text-[11px] transition ${
                      previewRecord?.id === record.id
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="block max-w-44 truncate font-mono font-medium">{record.id}</span>
                    <span className="text-[9px]">{record.documentType}</span>
                  </button>
                ))}
              </div>
            )}

            {previewRecord && (
              <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] lg:overflow-hidden">
                <section className="flex min-h-[520px] flex-col border-b border-border bg-muted/35 lg:min-h-0 lg:border-b-0 lg:border-r">
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-primary" />
                      <span className="truncate font-mono text-sm font-medium">{previewRecord.id}</span>
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {previewRecord.documentType}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {previewRecord.status}
                    </span>
                  </div>
                  <div className="grid-bg flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
                    {previewRecord.documentUrl ? (
                      previewRecord.documentIsPdf ? (
                        <object
                          data={previewRecord.documentUrl}
                          type="application/pdf"
                          className="h-[720px] w-full max-w-4xl bg-white shadow-sm"
                        >
                          <iframe
                            title={previewRecord.id}
                            src={previewRecord.documentUrl}
                            className="h-[720px] w-full bg-white"
                          />
                        </object>
                      ) : (
                        <ZoomableDocumentImage
                          src={previewRecord.documentUrl}
                          alt={previewRecord.id}
                          className="max-h-[calc(100vh-15rem)] max-w-full select-none object-contain bg-white shadow-sm"
                        />
                      )
                    ) : (
                      <div className="m-auto max-w-sm rounded-lg border border-dashed border-border bg-background p-8 text-center">
                        <FileText className="mx-auto size-8 text-muted-foreground" />
                        <div className="mt-3 text-sm font-medium">Source preview unavailable</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          This record contains export data but no retained image or PDF.
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="min-h-0 overflow-y-auto bg-background">
                  <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Export Output</div>
                        <div className="text-[11px] text-muted-foreground">
                          Final {exportFormat} payload
                        </div>
                      </div>
                      <StatusBadge status={previewRecord.status} />
                    </div>
                  </div>

                  <div className="p-4">
                    <pre className="min-h-[520px] overflow-auto rounded-lg border border-border bg-muted/50 p-4 text-xs leading-5">
                      {serializeExport([previewRecord], exportFormat)}
                    </pre>
                  </div>
                </aside>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

