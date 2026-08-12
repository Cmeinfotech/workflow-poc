import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  RotateCcw,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ColumnVisibilityMenu, useColumnVisibility, type ColumnVisibilityOption } from "@/components/column-visibility-menu";
import { useDraggableColumnOrder } from "@/hooks/use-draggable-column-order";
import {
  Btn,
  Card,
  ConfidenceBadge,
  PageHeader,
  StatusBadge,
  TablePagination,
} from "@/components/ui-kit";
import { ZoomableDocumentImage } from "@/components/zoomable-document-image";
import { inventoryRecords } from "@/lib/ocr-inventory-data";
import { addToQueue, mergeQueue, normalizeDocumentType, writeQueue, type WorkflowRecord } from "@/lib/workflow-state";

export const Route = createFileRoute("/_app/exceptions")({
  component: Exceptions,
  head: () => ({ meta: [{ title: "Exceptions - Chiaro OCR" }] }),
});

const seedExceptionRecords = inventoryRecords
  .filter((record) => record.status === "Exception")
  .map((record, index) => ({
    ...record,
    id: `DS-BOL-${50001 - index}`,
    documentType: index % 2 === 0 ? "BOL" : "HBL",
    comments: "Review BOL/HBL OCR fields manually.",
    assignedUser: index % 2 === 0 ? "Client" : "QC User",
    resolutionStatus: "Open",
  })) as WorkflowRecord[];

const ownerTabs = ["all", "user", "client"] as const;
type OwnerTab = (typeof ownerTabs)[number];
const pageSize = 20;
const documentTypeFilters = ["All Types", "BOL", "HBL"];
const priorityFilters = ["All Priorities", "Critical", "High", "Medium", "Low"];
const sourceFilters = ["All Sources", "OCR Review", "QC Review"];
type ExceptionColumn = "document" | "priority" | "reason" | "lastAssigned" | "assignedUser" | "ocr" | "status" | "action";
const exceptionColumnOrder: ExceptionColumn[] = ["document", "priority", "reason", "lastAssigned", "assignedUser", "ocr", "status", "action"];
const exceptionColumns: ColumnVisibilityOption<ExceptionColumn>[] = [
  { id: "document", label: "Document", locked: true },
  { id: "priority", label: "Priority" },
  { id: "reason", label: "Reason" },
  { id: "lastAssigned", label: "Last Assigned Person" },
  { id: "assignedUser", label: "Assigned User" },
  { id: "ocr", label: "OCR" },
  { id: "status", label: "Status" },
  { id: "action", label: "Action", locked: true },
];

function Exceptions() {
  const navigate = useNavigate();
  const [exceptionRecords, setExceptionRecords] = useState<WorkflowRecord[]>(() => {
    const loaded = mergeQueue("exception", seedExceptionRecords);
    return loaded.map((record) => ({
      ...record,
      documentType: normalizeDocumentType(record.documentType),
    }));
  });
  const [activeTab, setActiveTab] = useState<OwnerTab>("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewId, setReviewId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { isColumnVisible, setColumnVisible, resetColumns, visibleColumns } = useColumnVisibility(
    "dataspan-exception-visible-columns",
    exceptionColumns,
  );
  const { columnOrder, getDragClassName, getDragProps } = useDraggableColumnOrder(exceptionColumnOrder);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();

    return exceptionRecords.filter((record) => {
      const isClient = (record.assignedUser || "Client") === "Client";
      const matchesOwner = activeTab === "all" || (activeTab === "client" ? isClient : !isClient);
      const priority = getPriority(record);
      const matchesType = typeFilter === "All Types" || record.documentType === typeFilter;
      const matchesPriority = priorityFilter === "All Priorities" || priority === priorityFilter;
      const matchesSource = sourceFilter === "All Sources" || (record.returnedFrom || "Document intake") === sourceFilter;
      const matchesSearch =
        !search ||
        [
          record.id,
          record.fileName,
          record.documentType,
          record.exceptionReason,
          record.comments,
          record.assignedUser,
          record.returnedFrom,
          record.sku,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );

      return matchesOwner && matchesType && matchesPriority && matchesSource && matchesSearch;
    });
  }, [activeTab, exceptionRecords, priorityFilter, query, sourceFilter, typeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const displayedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const selectedRecords = useMemo(
    () => exceptionRecords.filter((record) => selectedIds.includes(record.id)),
    [exceptionRecords, selectedIds],
  );
  const reviewRecord = exceptionRecords.find((record) => record.id === reviewId);
  const allVisibleSelected =
    displayedRecords.length > 0 &&
    displayedRecords.every((record) => selectedIds.includes(record.id));
  const clientCount = exceptionRecords.filter(
    (record) => (record.assignedUser || "Client") === "Client",
  ).length;
  const userCount = exceptionRecords.length - clientCount;
  const criticalCount = exceptionRecords.filter((record) => record.confidence < 80).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, priorityFilter, query, sourceFilter, typeFilter]);

  function clearFilters() {
    setActiveTab("all");
    setTypeFilter("All Types");
    setPriorityFilter("All Priorities");
    setSourceFilter("All Sources");
    setQuery("");
  }

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function getPriority(record: WorkflowRecord) {
    if (record.confidence < 70) return "Critical";
    if (record.confidence < 85) return "High";
    if (record.confidence < 93) return "Medium";
    return "Low";
  }

  function getPriorityClasses(priority: string) {
    const classes: Record<string, string> = {
      Critical: "border-destructive/30 bg-destructive/10 text-destructive",
      High: "border-warning/30 bg-warning/10 text-warning",
      Medium: "border-info/30 bg-info/10 text-info",
      Low: "border-border bg-muted text-muted-foreground",
    };
    return classes[priority] ?? classes.Low;
  }

  function getLastFromPerson(record: WorkflowRecord) {
    return record.exceptionReturnAssignedUser || record.owner || record.assignedUser || "Workflow Router";
  }

  function getLastFromStage(record: WorkflowRecord) {
    return record.returnedFrom || "Document intake";
  }

  function toggleSelected(recordId: string) {
    setSelectedIds((items) =>
      items.includes(recordId) ? items.filter((id) => id !== recordId) : [...items, recordId],
    );
  }

  function writeExceptionRecords(records: WorkflowRecord[]) {
    setExceptionRecords(records);
    writeQueue("exception", records);
  }

  function updateRecord(recordId: string, changes: Partial<WorkflowRecord>) {
    writeExceptionRecords(
      exceptionRecords.map((record) =>
        record.id === recordId ? { ...record, ...changes } : record,
      ),
    );
  }

  function clearRecords(recordsToClear: WorkflowRecord[]) {
    const idsToClear = new Set(recordsToClear.map((record) => record.id));
    writeExceptionRecords(exceptionRecords.filter((record) => !idsToClear.has(record.id)));
    setSelectedIds((ids) => ids.filter((id) => !idsToClear.has(id)));
    if (idsToClear.has(reviewId)) setReviewId("");
  }

  function resolveRecords(records: WorkflowRecord[], target: "ocr" | "qc") {
    if (records.length === 0) return;

    const targetStatus = target === "ocr" ? "OCR Review" : "QC Review";
    const targetOwner = target === "ocr" ? "OCR Operator" : "QC User";
    const targetStage = target === "ocr" ? "OCR Review" : "QC Review";

    records.forEach((record) => {
      addToQueue(target, {
        ...record,
        status: targetStatus,
        owner: targetOwner,
        assignedUser: targetOwner,
        resolutionStatus: "Resolved",
        returnedFrom: "Exception",
        exceptionReturnReason: record.exceptionReason || "Exception resolved and returned to workflow.",
        exceptionReturnComments: record.comments || "No resolution comments captured.",
        exceptionReturnAssignedUser: record.assignedUser || record.owner || "Unassigned",
        exceptionReturnSourceStage: record.returnedFrom || "Exception Queue",
        exceptionReturnTargetStage: targetStage,
        exceptionReturnedAt: new Date().toLocaleString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    });
    clearRecords(records);
    navigate({
      to: target === "ocr" ? "/ocr-review-queue" : "/qc-review",
      search: { document: records[0].id },
    });
  }

  const tabCounts: Record<OwnerTab, number> = {
    all: exceptionRecords.length,
    user: userCount,
    client: clientCount,
  };

  function getHeaderLabel(columnId: ExceptionColumn) {
    const labels: Record<ExceptionColumn, string> = {
      document: "Document",
      priority: "Priority",
      reason: "Reason",
      lastAssigned: "Last Assigned Person",
      assignedUser: "Assigned User",
      ocr: "OCR",
      status: "Status",
      action: "Action",
    };
    return <span className="font-medium">{labels[columnId]}</span>;
  }

  function renderCell(record: WorkflowRecord, columnId: ExceptionColumn) {
    const priority = getPriority(record);

    switch (columnId) {
      case "document":
        return <td key="document" className="max-w-[240px] px-2.5 py-2"><div className="truncate font-mono text-xs font-medium">{record.id}</div><div className="mt-0.5 flex items-center gap-2"><span className="rounded border border-border px-1 py-0.5 text-[9px] font-medium text-muted-foreground">{record.documentType}</span><span className="text-[10px] text-muted-foreground">{record.returnedFrom || "Document intake"}</span></div></td>;
      case "priority":
        return <td key="priority" className="whitespace-nowrap px-2.5 py-2"><span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${getPriorityClasses(priority)}`}>{priority}</span></td>;
      case "reason":
        return <td key="reason" className="max-w-[230px] px-2.5 py-2"><div className="line-clamp-2 text-xs text-destructive">{record.exceptionReason || "Requires manual exception handling"}</div></td>;
      case "lastAssigned":
        return <td key="lastAssigned" className="whitespace-nowrap px-2.5 py-2"><div className="text-[11px]">{getLastFromPerson(record)}</div><div className="text-[9px] font-medium text-muted-foreground">From {getLastFromStage(record)}</div></td>;
      case "assignedUser":
        return <td key="assignedUser" className="px-2.5 py-2"><select value={record.assignedUser || "Client"} onChange={(event) => updateRecord(record.id, { assignedUser: event.target.value, owner: event.target.value })} className="h-7 rounded-md border border-border bg-card px-2 text-[11px]"><option>Client</option><option>OCR Operator</option><option>QC User</option></select></td>;
      case "ocr":
        return <td key="ocr" className="whitespace-nowrap px-2.5 py-2"><ConfidenceBadge value={record.confidence} /></td>;
      case "status":
        return <td key="status" className="whitespace-nowrap px-2.5 py-2"><StatusBadge status={record.resolutionStatus || "Exception"} /></td>;
      case "action":
        return <td key="action" className="px-3 py-2"><Btn variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setReviewId(record.id)}><Eye className="size-3" />Review</Btn></td>;
      default:
        return null;
    }
  }
  return (
    <div className="space-y-3">
      <PageHeader
        title="Exception Queue"
        description="Review failed validations, assign ownership, and return resolved documents to the correct workflow stage."
        actions={
          <>
            <Btn
              variant="outline"
              size="sm"
              disabled={selectedRecords.length === 0}
              onClick={() => resolveRecords(selectedRecords, "ocr")}
            >
              <RotateCcw className="size-3.5" />
              Return to OCR
            </Btn>
            <Btn
              variant="success"
              size="sm"
              disabled={selectedRecords.length === 0}
              onClick={() => resolveRecords(selectedRecords, "qc")}
            >
              <CheckCircle2 className="size-3.5" />
              Return to QC
            </Btn>
            <Btn
              variant="destructive"
              size="sm"
              disabled={selectedRecords.length === 0}
              onClick={() => clearRecords(selectedRecords)}
            >
              <XCircle className="size-3.5" />
              Close
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "Open Exceptions",
            value: exceptionRecords.length,
            detail: "Awaiting resolution",
            icon: AlertTriangle,
            tone: "text-destructive bg-destructive/12",
          },
          {
            label: "User Assigned",
            value: userCount,
            detail: "Internal review owners",
            icon: Users,
            tone: "text-primary bg-primary/12",
          },
          {
            label: "Client Assigned",
            value: clientCount,
            detail: "Waiting on client input",
            icon: UserCheck,
            tone: "text-info bg-info/12",
          },
          {
            label: "High Risk",
            value: criticalCount,
            detail: "OCR confidence below 80%",
            icon: XCircle,
            tone: "text-warning bg-warning/12",
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
            <h3 className="text-sm font-semibold">Exception Records</h3>
            <p className="text-[11px] text-muted-foreground">
              {filteredRecords.length} records in the current view
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <div className="flex shrink-0 gap-1 rounded-md border border-border bg-muted/30 p-0.5">
              {ownerTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`h-7 whitespace-nowrap rounded px-2 text-[11px] font-medium capitalize transition ${
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "user" ? "User" : tab === "client" ? "Client" : "All"}
                  <span className="ml-1 text-[10px] text-muted-foreground">{tabCounts[tab]}</span>
                </button>
              ))}
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:border-primary/60 focus:outline-none"
            >
              {documentTypeFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:border-primary/60 focus:outline-none"
            >
              {priorityFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:border-primary/60 focus:outline-none"
            >
              {sourceFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-8 text-[11px] focus:border-primary/60 focus:outline-none"
                placeholder="Search ID, reason, owner..."
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear exception search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            {(activeTab !== "all" || typeFilter !== "All Types" || priorityFilter !== "All Priorities" || sourceFilter !== "All Sources" || query) && (
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
              columns={exceptionColumns}
              isColumnVisible={isColumnVisible}
              setColumnVisible={setColumnVisible}
              resetColumns={resetColumns}
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-col gap-2 border-b border-border bg-primary/5 px-3 py-1.5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong>{selectedIds.length}</strong> exception
              {selectedIds.length === 1 ? "" : "s"} selected
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
          <table className="w-full min-w-[1040px] text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-card shadow-[0_1px_0_var(--color-border)]">
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
                return (
                  <tr
                    key={record.id}
                    className={`border-b border-border/50 transition hover:bg-accent/35 ${
                      selectedIds.includes(record.id) ? "bg-primary/5" : ""
                    }`}
                  >
                    {columnOrder.map((columnId) => isColumnVisible(columnId) ? renderCell(record, columnId) : null)}
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-muted-foreground" colSpan={visibleColumns.length}>
                    No exceptions match the current owner filter and search.
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
          label="exception records"
          onPageChange={setCurrentPage}
        />
      </Card>

      {reviewRecord && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 md:p-6">
          <Card className="flex max-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col overflow-hidden bg-background p-0 shadow-elegant">
            <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">Exception Review</h2>
                <p className="text-xs text-muted-foreground">
                  Inspect the source document, capture resolution notes, and return it to the
                  correct stage.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => resolveRecords([reviewRecord], "ocr")}
                >
                  <RotateCcw className="size-3.5" />
                  Return to OCR
                </Btn>
                <Btn
                  variant="success"
                  size="sm"
                  onClick={() => resolveRecords([reviewRecord], "qc")}
                >
                  <CheckCircle2 className="size-3.5" />
                  Return to QC
                </Btn>
                <Btn variant="outline" size="sm" onClick={() => setReviewId("")}>
                  Close
                </Btn>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_420px] lg:overflow-hidden">
              <section className="flex min-h-[520px] flex-col border-b border-border bg-muted/35 lg:min-h-0 lg:border-b-0 lg:border-r">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="truncate font-mono text-sm font-medium">{reviewRecord.id}</span>
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {reviewRecord.documentType}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {reviewRecord.returnedFrom || "Document intake"}
                  </span>
                </div>
                <div className="grid-bg flex min-h-0 flex-1 items-start justify-center overflow-auto p-4">
                  {reviewRecord.documentUrl ? (
                    reviewRecord.documentIsPdf ? (
                      <object
                        data={reviewRecord.documentUrl}
                        type="application/pdf"
                        className="h-[720px] w-full max-w-4xl bg-white shadow-sm"
                      >
                        <iframe
                          title={reviewRecord.id}
                          src={reviewRecord.documentUrl}
                          className="h-[720px] w-full bg-white"
                        />
                      </object>
                    ) : (
                      <ZoomableDocumentImage
                        src={reviewRecord.documentUrl}
                        alt={reviewRecord.id}
                        className="max-h-[calc(100vh-15rem)] max-w-full select-none object-contain bg-white shadow-sm"
                      />
                    )
                  ) : (
                    <div className="m-auto max-w-sm rounded-lg border border-dashed border-border bg-background p-8 text-center">
                      <FileText className="mx-auto size-8 text-muted-foreground" />
                      <div className="mt-3 text-sm font-medium">Source preview unavailable</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        This exception has no retained image or PDF.
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <aside className="min-h-0 overflow-y-auto bg-background">
                <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Resolution Details</div>
                      <div className="text-[11px] text-muted-foreground">
                        {reviewRecord.returnedFrom
                          ? `Raised from ${reviewRecord.returnedFrom}`
                          : "Raised during document processing"}
                      </div>
                    </div>
                    <ConfidenceBadge value={reviewRecord.confidence} />
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="rounded-lg border border-destructive/25 bg-destructive/8 p-3">
                    <div className="text-[10px] font-semibold uppercase text-destructive">
                      Exception Reason
                    </div>
                    <div className="mt-1 text-sm">
                      {reviewRecord.exceptionReason || "Requires manual exception handling"}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">Assigned User</span>
                    <select
                      value={reviewRecord.assignedUser || "Client"}
                      onChange={(event) =>
                        updateRecord(reviewRecord.id, {
                          assignedUser: event.target.value,
                          owner: event.target.value,
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                    >
                      <option>Client</option>
                      <option>OCR Operator</option>
                      <option>QC User</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">
                      Resolution Comments
                    </span>
                    <textarea
                      value={
                        reviewRecord.comments || "Review source image and confirm fields manually."
                      }
                      onChange={(event) =>
                        updateRecord(reviewRecord.id, { comments: event.target.value })
                      }
                      className="mt-1 min-h-32 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm leading-5 focus:border-primary/60 focus:outline-none"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-card/50 p-3">
                      <div className="text-[9px] font-medium uppercase text-muted-foreground">
                        Priority
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${getPriorityClasses(getPriority(reviewRecord))}`}
                        >
                          {getPriority(reviewRecord)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-card/50 p-3">
                      <div className="text-[9px] font-medium uppercase text-muted-foreground">
                        Current Status
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={reviewRecord.resolutionStatus || "Exception"} />
                      </div>
                    </div>
                  </div>

                  <Btn
                    variant="destructive"
                    className="w-full"
                    onClick={() => clearRecords([reviewRecord])}
                  >
                    <XCircle className="size-3.5" />
                    Close Exception Without Return
                  </Btn>
                </div>
              </aside>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

