import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  Columns2,
  Copy,
  FileText,
  Rows2,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ColumnVisibilityMenu, useColumnVisibility, type ColumnVisibilityOption } from "@/components/column-visibility-menu";
import { ZoomableDocumentImage } from "@/components/zoomable-document-image";
import { ResponsiveCardColumns } from "@/components/responsive-card-columns";
import { useDraggableColumnOrder } from "@/hooks/use-draggable-column-order";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  Btn,
  Card,
  ConfidenceBadge,
  ConfidencePercent,
  PageHeader,
  StatusBadge,
  TablePagination,
} from "@/components/ui-kit";
import {
  buildLineItemTable,
  getReviewFields,
  groupReviewFields,
  type ExtractedTable,
} from "@/lib/review-fields";
import { applyReviewFieldPolicy, useReviewFieldPolicies } from "@/lib/review-field-policy";
import { getDemoQueueSeed, mergeQueue, readQueue, type WorkflowRecord } from "@/lib/workflow-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/manual-review")({
  component: ManualReview,
  head: () => ({ meta: [{ title: "Audit - Chiaro OCR" }] }),
});

const documentTabs = ["All", "BOL", "HBL"] as const;
const pageSize = 20;
const trainityDocumentIds = ["DS-TRAINITY-832611300031", "DS-TRAINITY-832525100049"];
const priorityFilters = ["All Priorities", "Critical", "High", "Medium", "Low"];
const slaFilters = ["All SLA", "Breached", "Due < 3h", "Due 3-5h", "Due > 5h"];
type DocumentTab = (typeof documentTabs)[number];
type AuditColumn = "document" | "source" | "type" | "owner" | "lastAssigned" | "priority" | "ocr" | "sla" | "action";
const auditColumnOrder: AuditColumn[] = ["document", "source", "type", "owner", "lastAssigned", "priority", "ocr", "sla", "action"];
const auditColumns: ColumnVisibilityOption<AuditColumn>[] = [
  { id: "document", label: "Document", locked: true },
  { id: "source", label: "Source" },
  { id: "type", label: "Type" },
  { id: "owner", label: "Owner" },
  { id: "lastAssigned", label: "Last Assigned Person" },
  { id: "priority", label: "Priority" },
  { id: "ocr", label: "OCR" },
  { id: "sla", label: "SLA" },
  { id: "action", label: "Action", locked: true },
];

function getFieldValueBorderClasses(confidence: number) {
  if (confidence < 65) return "border-destructive/45";
  if (confidence < 95) return "border-warning/45";
  return "border-border";
}

function getFitToPagePdfUrl(url: string) {
  const [baseUrl, hash = ""] = url.split("#");
  const params = new URLSearchParams(hash);
  params.set("toolbar", "0");
  params.set("navpanes", "0");
  params.set("scrollbar", "0");
  params.set("view", "Fit");
  params.set("zoom", "page-fit");

  return `${baseUrl}#${params.toString()}`;
}

function ManualReview() {
  const [records, setRecords] = useState<WorkflowRecord[]>(() =>
    mergeQueue("manual", getDemoQueueSeed("manual")),
  );
  const [activeTab, setActiveTab] = useState<DocumentTab>("All");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [slaFilter, setSlaFilter] = useState("All SLA");
  const [reviewId, setReviewId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("document") ?? "";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewLayout, setReviewLayout] = useState<"split" | "stacked">("split");
  const { isColumnVisible, setColumnVisible, resetColumns, visibleColumns } = useColumnVisibility(
    "dataspan-audit-visible-columns",
    auditColumns,
  );
  const { columnOrder, getDragClassName, getDragProps } = useDraggableColumnOrder(auditColumnOrder);
  const { policies } = useReviewFieldPolicies();

  useEffect(() => {
    const refresh = () => setRecords(readQueue("manual"));
    window.addEventListener("storage", refresh);
    window.addEventListener("dataspan-workflow-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dataspan-workflow-change", refresh);
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesType = activeTab === "All" || record.documentType === activeTab;
      const priority = getPriority(record);
      const slaValue = getSlaValue(record);
      const sla = getSla(record);
      const matchesPriority = priorityFilter === "All Priorities" || priority === priorityFilter;
      const matchesSla =
        slaFilter === "All SLA" ||
        (slaFilter === "Breached" && sla === "Breached") ||
        (slaFilter === "Due < 3h" && sla !== "Breached" && slaValue < 180) ||
        (slaFilter === "Due 3-5h" && sla !== "Breached" && slaValue >= 180 && slaValue <= 300) ||
        (slaFilter === "Due > 5h" && sla !== "Breached" && slaValue > 300);
      const matchesSearch =
        !search ||
        [
          record.id,
          record.fileName,
          record.uploadedBy,
          record.owner,
          record.productName,
          record.sku,
          record.comments,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );

      return matchesType && matchesPriority && matchesSla && matchesSearch;
    });
  }, [activeTab, priorityFilter, query, records, slaFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const displayedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const reviewRecord = records.find((record) => record.id === reviewId);
  const reviewFields = reviewRecord
    ? applyReviewFieldPolicy(getReviewFields(reviewRecord), "audit", policies)
    : [];
  const groupedReviewFields = reviewRecord ? groupReviewFields(reviewFields) : [];
  const lineItemTable = useMemo(() => buildLineItemTable(reviewFields), [reviewFields]);
  const reviewPdfUrl =
    reviewRecord?.documentUrl && reviewRecord.documentIsPdf
      ? getFitToPagePdfUrl(reviewRecord.documentUrl)
      : "";
  const highPriorityCount = records.filter((record) => record.confidence < 94).length;
  const breachedCount = records.filter((record) => getSla(record) === "Breached").length;
  const averageConfidence = Math.round(
    records.reduce((total, record) => total + record.confidence, 0) / Math.max(records.length, 1),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, priorityFilter, query, slaFilter]);

  function clearFilters() {
    setActiveTab("All");
    setPriorityFilter("All Priorities");
    setSlaFilter("All SLA");
    setQuery("");
  }

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function getLastFromPerson(record: WorkflowRecord) {
    return record.exceptionReturnAssignedUser || record.assignedUser || record.owner || "QC User";
  }

  function getLastFromStage(record: WorkflowRecord) {
    if (record.returnedFrom === "Exception" || record.exceptionReturnReason) return "Exception";
    return record.returnedFrom || "QC Review";
  }


    function getHeaderLabel(columnId: AuditColumn) {
    const labels: Record<AuditColumn, string> = {
      document: "Document",
      source: "Source",
      type: "Type",
      owner: "Owner",
      lastAssigned: "Last Assigned Person",
      priority: "Priority",
      ocr: "OCR",
      sla: "SLA",
      action: "Action",
    };
    return <span className="font-medium">{labels[columnId]}</span>;
  }

  function renderCell(record: WorkflowRecord, columnId: AuditColumn) {
    const priority = getPriority(record);
    const sla = getSla(record);

    switch (columnId) {
      case "document":
        return <td key="document" className="px-2.5 py-2"><div className="max-w-72 truncate font-mono font-medium">{record.id}</div><div className="text-[10px] text-muted-foreground">{record.returnedFrom || "QC Review"}</div></td>;
      case "source":
        return <td key="source" className="px-2.5 py-2 text-[11px]">{record.uploadedBy}</td>;
      case "type":
        return <td key="type" className="px-2.5 py-2"><span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">{record.documentType}</span></td>;
      case "owner":
        return <td key="owner" className="px-2.5 py-2 text-[11px]">{record.assignedUser || record.owner}</td>;
      case "lastAssigned":
        return <td key="lastAssigned" className="whitespace-nowrap px-2.5 py-2"><div className="text-[11px]">{getLastFromPerson(record)}</div><div className="text-[9px] font-medium text-muted-foreground">From {getLastFromStage(record)}</div></td>;
      case "priority":
        return <td key="priority" className="px-2.5 py-2"><StatusBadge status={priority} /></td>;
      case "ocr":
        return <td key="ocr" className="px-2.5 py-2"><ConfidenceBadge value={record.confidence} /></td>;
      case "sla":
        return <td key="sla" className={`px-2.5 py-2 text-[11px] ${sla === "Breached" ? "font-medium text-destructive" : "text-muted-foreground"}`}>{sla}</td>;
      case "action":
        return <td key="action" className="px-3 py-2"><Btn variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setReviewId(record.id)}>View<ChevronRight className="size-3" /></Btn></td>;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Audit"
        description="View-only audit trail for BOL and HBL documents that require tracking."
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "Audit Records",
            value: records.length,
            detail: "Tracked workflow records",
            icon: UserCheck,
            tone: "text-primary bg-primary/12",
          },
          {
            label: "High Priority",
            value: highPriorityCount,
            detail: "Confidence below 94%",
            icon: AlertTriangle,
            tone: "text-warning bg-warning/12",
          },
          {
            label: "SLA Breached",
            value: breachedCount,
            detail: "Needs attention",
            icon: Clock3,
            tone: "text-destructive bg-destructive/12",
          },
          {
            label: "Average OCR",
            value: `${averageConfidence}%`,
            detail: "Across manual queue",
            icon: FileText,
            tone: "text-success bg-success/12",
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
            >
              <div className={`grid size-7 shrink-0 place-items-center rounded-md ${metric.tone}`}>
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase text-muted-foreground">
                  {metric.label}
                </div>
                <div className="text-lg font-bold tabular-nums">{metric.value}</div>
                <div className="truncate text-[10px] text-muted-foreground">{metric.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-2 border-b border-border px-3 py-2 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Audit Queue</h3>
            <p className="text-[11px] text-muted-foreground">
              Same document IDs and source files retained across the complete workflow.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <div className="flex shrink-0 gap-1 rounded-md border border-border bg-muted/30 p-0.5">
              {documentTabs.map((tab) => {
                const count =
                  tab === "All"
                    ? records.length
                    : records.filter((record) => record.documentType === tab).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-7 rounded px-2 text-[11px] font-medium transition ${
                      activeTab === tab
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                    <span className="ml-1 text-[10px] text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:border-primary/60 focus:outline-none"
            >
              {priorityFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            <select
              value={slaFilter}
              onChange={(event) => setSlaFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:border-primary/60 focus:outline-none"
            >
              {slaFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-8 text-[11px] focus:border-primary/60 focus:outline-none"
                placeholder="Search ID, file, owner, SKU..."
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear audit search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            {(activeTab !== "All" || priorityFilter !== "All Priorities" || slaFilter !== "All SLA" || query) && (
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
              columns={auditColumns}
              isColumnVisible={isColumnVisible}
              setColumnVisible={setColumnVisible}
              resetColumns={resetColumns}
            />
          </div>
        </div>

        <div className="max-h-[calc(100vh-300px)] min-h-[420px] overflow-auto">
          <table className="w-full min-w-[960px] text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-card">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
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
              {displayedRecords.map((record) => {
                const priority = getPriority(record);
                const sla = getSla(record);
                return (
                  <tr
                    key={record.id}
                    className="border-b border-border/50 transition hover:bg-accent/35"
                  >
                    {columnOrder.map((columnId) => isColumnVisible(columnId) ? renderCell(record, columnId) : null)}
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No Audit documents match the current filters.
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

      {reviewRecord && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-black/45 p-2">
          <div className="flex h-[calc(100vh-1rem)] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-mono font-semibold">{reviewRecord.id}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {reviewRecord.documentType} · Audit
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
                  <button
                    type="button"
                    onClick={() => setReviewLayout("split")}
                    className={`grid size-7 place-items-center rounded transition ${
                      reviewLayout === "split"
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="Show image and fields side by side"
                    aria-pressed={reviewLayout === "split"}
                    title="Side by side"
                  >
                    <Columns2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewLayout("stacked")}
                    className={`grid size-7 place-items-center rounded transition ${
                      reviewLayout === "stacked"
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="Show image above fields"
                    aria-pressed={reviewLayout === "stacked"}
                    title="Image above fields"
                  >
                    <Rows2 className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewId("")}
                  className="grid size-8 place-items-center rounded-lg hover:bg-accent"
                  aria-label="Close audit view"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <ResizablePanelGroup
              key={reviewLayout}
              direction={reviewLayout === "split" ? "horizontal" : "vertical"}
              className="min-h-0 flex-1 overflow-hidden"
            >
              <ResizablePanel
                defaultSize="48%"
                minSize="0%"
                maxSize="100%"
                collapsible
                collapsedSize="0%"
                className="min-w-0"
              >
                <div className="h-full min-h-0 min-w-0 overflow-hidden bg-muted/30 p-3">
                  {reviewRecord.documentUrl ? (
                    <div className="h-full w-full overflow-hidden rounded-md border border-border bg-white shadow-sm">
                      {reviewRecord.documentIsPdf ? (
                        <iframe
                          title={reviewRecord.id}
                          src={reviewPdfUrl}
                          className="block h-full w-full max-w-full border-0 bg-white"
                        />
                      ) : (
                        <ZoomableDocumentImage
                          src={reviewRecord.documentUrl}
                          alt={reviewRecord.id}
                          className="mx-auto max-h-[calc(100vh-7rem)] max-w-full select-none shadow-lg"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground">
                      Source preview unavailable
                    </div>
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle
                withHandle
                className={
                  reviewLayout === "split"
                    ? "w-3 cursor-col-resize bg-border/80 transition hover:bg-primary/35"
                    : "h-3 w-full cursor-row-resize bg-border/80 transition hover:bg-primary/35"
                }
              />
              <ResizablePanel
                defaultSize="52%"
                minSize="0%"
                maxSize="100%"
                collapsible
                collapsedSize="0%"
                className="min-w-0"
              >
                <div className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-2.5">
                  <ReviewDetails
                    reviewRecord={reviewRecord}
                    lineItemTable={lineItemTable}
                    groupedReviewFields={groupedReviewFields}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Audit is view-only. Routing actions remain controlled from QC and workflow queues.
              </span>
              <Btn variant="outline" size="sm" onClick={() => setReviewId("")}>
                Close
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewDetails({
  reviewRecord,
  lineItemTable,
  groupedReviewFields,
}: {
  reviewRecord: WorkflowRecord;
  lineItemTable: ExtractedTable | null;
  groupedReviewFields: ReturnType<typeof groupReviewFields>;
}) {
  const [validationDataView, setValidationDataView] = useState<"information" | "table">(
    "information",
  );

  function selectValidationDataView(view: "information" | "table") {
    setValidationDataView(view);
  }

  return (
    <>
      <div className="mb-2 grid grid-cols-2 gap-1.5 xl:grid-cols-4">
        <Metric label="Status" value="Audit" />
        <Metric label="OCR Confidence" value={`${reviewRecord.confidence}%`} />
        <Metric label="Owner" value={reviewRecord.assignedUser || reviewRecord.owner} />
        <Metric label="Previous Stage" value={reviewRecord.returnedFrom || "QC Review"} />
      </div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">Document Validation Fields</h3>
        <div
          className="inline-flex rounded border border-border bg-muted/60 p-0.5"
          role="tablist"
          aria-label="Audit validation data view"
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
        </div>
      </div>
      <div className="space-y-2">
        <div className={cn(validationDataView !== "information" && "hidden")}>
          <ResponsiveCardColumns
            cards={groupedReviewFields.map((group) => ({
              id: group.title,
              weight: group.items.reduce(
                (total, field) => total + 1 + Math.floor(field.value.length / 48),
                1,
              ),
              content: (
                <section className="rounded-md border border-border bg-card p-2 shadow-sm">
                  <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-border pb-1">
                    <div className="text-[9px] font-semibold uppercase text-foreground">
                      {group.title}
                    </div>
                    <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? "field" : "fields"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-x-2 gap-y-1">
                    {group.items.map((field) => (
                      <div key={field.label} className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
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
                        <div
                          className={`mt-0.5 flex min-h-6 items-start justify-between gap-1.5 rounded border bg-background px-1.5 py-1 text-[10px] leading-3.5 ${getFieldValueBorderClasses(field.confidence)}`}
                        >
                          <span className="min-w-0">{field.value}</span>
                          <ConfidencePercent value={field.confidence} />
                        </div>
                      </div>
                    ))}
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
      </div>
    </>
  );
}

function getPriority(record: WorkflowRecord) {
  if (record.confidence < 88) return "Critical";
  if (record.confidence < 94) return "High";
  if (record.confidence < 97) return "Medium";
  return "Low";
}

function getSla(record: WorkflowRecord) {
  if (record.confidence < 90) return "Breached";
  const tail = Number(record.id.slice(-2));
  return `${1 + (tail % 4)}h ${String(10 + (tail % 46)).padStart(2, "0")}m`;
}

function getSlaValue(record: WorkflowRecord) {
  const sla = getSla(record);
  if (sla === "Breached") return Number.MAX_SAFE_INTEGER;
  const match = sla.match(/(\d+)h\s+(\d+)m/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2">
      <div className="text-[9px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold">{value}</div>
    </div>
  );
}

function ExtractedTableView({ table }: { table: ExtractedTable }) {
  const tableSignature = JSON.stringify({
    accuracy: table.accuracy,
    columns: table.columns,
    rows: table.rows,
    title: table.title,
  });
  const [rows, setRows] = useState(table.rows);

  useEffect(() => {
    setRows(table.rows);
  }, [tableSignature]);

  function duplicateRow(rowIndex: number) {
    setRows((items) => {
      const sourceRow = items[rowIndex];
      if (!sourceRow) return items;

      const nextRows = [...items];
      nextRows.splice(rowIndex + 1, 0, [...sourceRow]);
      return nextRows;
    });
  }

  return (
    <section className="min-w-0 rounded-md border border-border bg-white p-2 text-zinc-900 shadow-sm">
      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
        <h3 className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
          {table.title}
        </h3>
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <span className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0 text-[9px] font-medium text-zinc-600">
            Source format
          </span>
          <span className="max-w-28 truncate rounded border border-primary/30 bg-primary/10 px-1.5 py-0 text-[9px] font-semibold text-primary">
            OCR Accuracy {table.accuracy}%
          </span>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto border border-zinc-400">
        <table className="w-full min-w-[620px] border-collapse text-[10px]">
          <thead className="bg-zinc-100">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-r border-zinc-400 px-1.5 py-1.5 text-left font-bold uppercase tracking-wide last:border-r-0"
                >
                  {column}
                </th>
              ))}
              <th
                className="w-8 border-b border-l border-zinc-400 px-1 py-1.5"
                aria-label="Row actions"
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="whitespace-pre-wrap border-r border-zinc-400 px-1.5 py-1.5 align-top leading-4 last:border-r-0"
                  >
                    {cell}
                  </td>
                ))}
                <td className="w-8 border-l border-zinc-400 px-1 py-1.5 align-top">
                  <button
                    type="button"
                    onClick={() => duplicateRow(rowIndex)}
                    aria-label={`Duplicate row ${rowIndex + 1}`}
                    title="Duplicate row"
                    className="grid size-5 place-items-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-primary"
                  >
                    <Copy className="size-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}




