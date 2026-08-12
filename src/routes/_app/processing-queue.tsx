import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CheckCircle2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ColumnVisibilityMenu, useColumnVisibility, type ColumnVisibilityOption } from "@/components/column-visibility-menu";
import { Btn, Card, ConfidenceBadge, PageHeader, TablePagination } from "@/components/ui-kit";
import { useDraggableColumnOrder } from "@/hooks/use-draggable-column-order";
import { inventoryRecords } from "@/lib/ocr-inventory-data";
import { mergeQueue, moveRecord, normalizeDocumentType, type WorkflowRecord } from "@/lib/workflow-state";

export const Route = createFileRoute("/_app/processing-queue")({
  component: ProcessingQueue,
  head: () => ({ meta: [{ title: "Processing Queue - Chiaro OCR" }] }),
});

const documentTypes = ["BOL", "HBL"] as const;
const assignees = ["Aarav Sharma", "Priya Iyer", "Rohan Khan", "Meera Verma", "Sara Nair", "Vikram Patel"];
const sourceTypes = ["FTP", "SFTP"];
const processingTotal = 6120;
const pageSize = 20;
const trainityDocumentIds = ["DS-TRAINITY-832611300031", "DS-TRAINITY-832525100049"];
const ocrFilters = ["All OCR", "High OCR", "Mid OCR", "Low OCR"];
const ageFilters = ["All Ages", "Due < 2h", "Due 2-4h", "Due > 4h"];
const processingSeedRows = Array.from({ length: 72 }, (_, index) => {
  const base = inventoryRecords[index % inventoryRecords.length];
  const documentType = documentTypes[index % documentTypes.length];
  const idNumber = 260000 + index;
  const source = sourceTypes[index % sourceTypes.length];
  const extension = source === "PNG" ? "png" : source === "JPG" ? "jpg" : "pdf";
  const confidence = 85 + ((index * 8) % 15);
  const stage = index % 4 === 0 ? "Ready for Manual QC" : index % 4 === 1 ? "Field Normalization" : index % 4 === 2 ? "Business Rule Check" : "QC Handoff";
  const prefix = documentType === "BOL"
    ? "ocean-bill-of-lading"
    : "house-bill-of-lading";

  return {
    ...base,
    id: `DS-PROC-${idNumber}`,
    fileName: `${prefix}-${idNumber}.${extension}`,
    uploadedBy: source,
    status: "QC Review" as const,
    owner: assignees[index % assignees.length],
    documentType,
    productName: documentType === "BOL" ? "Ocean freight bill of lading" : "House bill of lading",
    sku: documentType === "BOL" ? `BOL-${90000 + index}` : `HOL-${90000 + index}`,
    quantity: 40 + ((index * 29) % 900),
    confidence,
    inventoryValue: `$${(2200 + ((index * 410) % 22000)).toLocaleString("en-US")}.00`,
    uploadDate: `06 Jun 2026, ${String(9 + (index % 9)).padStart(2, "0")}:${String((index * 11) % 60).padStart(2, "0")}`,
    processingStage: stage,
    queueAge: `${1 + (index % 6)}h ${String(10 + ((index * 5) % 48)).padStart(2, "0")}m`,
  };
}) as Array<WorkflowRecord & { processingStage: string; queueAge: string }>;

type SortKey = "id" | "type" | "assignee" | "ocr" | "age";
type SortDirection = "asc" | "desc";
type ProcessingColumn = "id" | "type" | "assignee" | "lastAssigned" | "ocr" | "age" | "action";
const processingColumnOrder: ProcessingColumn[] = ["id", "type", "assignee", "lastAssigned", "ocr", "age", "action"];
const processingColumns: ColumnVisibilityOption<ProcessingColumn>[] = [
  { id: "id", label: "ID", locked: true },
  { id: "type", label: "Type" },
  { id: "assignee", label: "Assignee" },
  { id: "lastAssigned", label: "Last Assigned Person" },
  { id: "ocr", label: "OCR" },
  { id: "age", label: "Queue Age" },
  { id: "action", label: "Action", locked: true },
];

function formatQueueAgeTimer(totalSeconds: number) {
  const clampedSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;

  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function ProcessingQueue() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WorkflowRecord[]>(() => {
    const loaded = mergeQueue("processing", processingSeedRows);
    return loaded.map((r) => ({
      ...r,
      documentType: normalizeDocumentType(r.documentType),
      uploadedBy: r.uploadedBy === "SFTP" || r.uploadedBy === "sftp" || r.uploadedBy === "HOL" || r.uploadedBy === "HBL" || r.uploadedBy === "hol" || r.uploadedBy === "hbl" ? "SFTP" : "FTP",
    }));
  });
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [assigneeFilter, setAssigneeFilter] = useState("All Assignees");
  const [ocrFilter, setOcrFilter] = useState("All OCR");
  const [ageFilter, setAgeFilter] = useState("All Ages");
  const [selectedId, setSelectedId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("document") ?? trainityDocumentIds[0];
  });
  const [timerTick, setTimerTick] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: "id", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const { isColumnVisible, setColumnVisible, resetColumns, visibleColumns } = useColumnVisibility(
    "dataspan-processing-visible-columns",
    processingColumns,
  );
  const { columnOrder, getDragClassName, getDragProps } = useDraggableColumnOrder(processingColumnOrder);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    const searchedRecords = records.filter((record) => {
      const matchesSearch = !search || [
        record.id,
        record.fileName,
        record.uploadedBy,
        record.documentType,
        record.owner,
        record.sku,
      ].some((value) => String(value).toLowerCase().includes(search));
      const matchesType = typeFilter === "All Types" || record.documentType === typeFilter;
      const matchesAssignee = assigneeFilter === "All Assignees" || record.owner === assigneeFilter;
      const matchesOcr =
        ocrFilter === "All OCR" ||
        (ocrFilter === "High OCR" && record.confidence >= 95) ||
        (ocrFilter === "Mid OCR" && record.confidence >= 90 && record.confidence < 95) ||
        (ocrFilter === "Low OCR" && record.confidence < 90);
      const ageMinutes = getQueueAgeValue(record);
      const matchesAge =
        ageFilter === "All Ages" ||
        (ageFilter === "Due < 2h" && ageMinutes < 120) ||
        (ageFilter === "Due 2-4h" && ageMinutes >= 120 && ageMinutes <= 240) ||
        (ageFilter === "Due > 4h" && ageMinutes > 240);

      return matchesSearch && matchesType && matchesAssignee && matchesOcr && matchesAge;
    });

    return [...searchedRecords].sort((a, b) => {
      if (selectedId) {
        if (a.id === selectedId) return -1;
        if (b.id === selectedId) return 1;
      }

      const direction = sortConfig.direction === "asc" ? 1 : -1;
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [ageFilter, assigneeFilter, ocrFilter, query, records, selectedId, sortConfig, typeFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const displayedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [ageFilter, assigneeFilter, ocrFilter, query, sortConfig, typeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimerTick((tick) => tick + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function getQueueAge(record: WorkflowRecord) {
    if ("queueAge" in record && typeof record.queueAge === "string") return record.queueAge;
    const tail = Number(record.id.match(/(\d+)$/)?.[1] ?? 0);
    return `${1 + (tail % 6)}h ${String(10 + ((tail * 5) % 48)).padStart(2, "0")}m`;
  }

  function getQueueAgeValue(record: WorkflowRecord) {
    const match = getQueueAge(record).match(/^(\d+)h\s+(\d+)m$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }

  function getQueueAgeTimer(record: WorkflowRecord) {
    return formatQueueAgeTimer(getQueueAgeValue(record) * 60 - timerTick);
  }

  function getLastFromPerson(record: WorkflowRecord) {
    return record.exceptionReturnAssignedUser || record.assignedUser || "OCR Operator";
  }

  function getLastFromStage(record: WorkflowRecord) {
    if (record.returnedFrom === "Exception" || record.exceptionReturnReason) return "Exception";
    return record.returnedFrom || "OCR Review";
  }

  function getSortValue(record: WorkflowRecord, key: SortKey) {
    const map: Record<SortKey, string | number> = {
      id: record.id,
      type: record.documentType,
      assignee: record.owner,
      ocr: record.confidence,
      age: getQueueAgeValue(record),
    };
    return map[key];
  }

  function toggleSort(key: SortKey) {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function openManualQc(record: WorkflowRecord) {
    const qcRecord: WorkflowRecord = {
      ...record,
      status: "QC Review",
      owner: record.owner,
    };
    moveRecord("processing", "qc", qcRecord);
    setRecords((items) => {
      const next = items.filter((item) => item.id !== record.id);
      return next;
    });
    navigate({ to: "/qc-review", search: { document: record.id } });
  }

  function clearFilters() {
    setQuery("");
    setTypeFilter("All Types");
    setAssigneeFilter("All Assignees");
    setOcrFilter("All OCR");
    setAgeFilter("All Ages");
  }

  function SortHeader({ label, sortKey }: { label: string; sortKey: SortKey }) {
    const active = sortConfig.key === sortKey;
    const Icon = sortConfig.direction === "desc" ? ArrowDown : ArrowUp;

    return (
      <button
        onClick={() => toggleSort(sortKey)}
        className={`inline-flex items-center gap-1 font-medium transition hover:text-foreground ${active ? "text-primary" : ""}`}
      >
        {label}
        {active && <Icon className="size-3" />}
      </button>
    );
  }
  function getHeaderLabel(columnId: ProcessingColumn) {
    switch (columnId) {
      case "id": return <SortHeader label="ID" sortKey="id" />;
      case "type": return <SortHeader label="Type" sortKey="type" />;
      case "assignee": return <SortHeader label="Assignee" sortKey="assignee" />;
      case "lastAssigned": return <span className="font-medium">Last Assigned Person</span>;
      case "ocr": return <SortHeader label="OCR" sortKey="ocr" />;
      case "age": return <SortHeader label="Queue Age" sortKey="age" />;
      case "action": return <span className="font-medium">Action</span>;
      default: return null;
    }
  }

  function renderCell(record: WorkflowRecord, columnId: ProcessingColumn) {
    switch (columnId) {
      case "id":
        return <td key="id" className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground">{record.id}</td>;
      case "type":
        return <td key="type" className="px-2.5 py-2"><span className="inline-flex rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium">{record.documentType}</span></td>;
      case "assignee":
        return <td key="assignee" className="whitespace-nowrap px-2.5 py-2 text-[11px]">{record.owner}</td>;
      case "lastAssigned":
        return <td key="lastAssigned" className="whitespace-nowrap px-2.5 py-2"><div className="text-[11px]">{getLastFromPerson(record)}</div><div className="text-[9px] font-medium text-muted-foreground">From {getLastFromStage(record)}</div></td>;
      case "ocr":
        return <td key="ocr" className="whitespace-nowrap px-2.5 py-2"><ConfidenceBadge value={record.confidence} /></td>;
      case "age":
        return <td key="age" className="whitespace-nowrap px-2.5 py-2 font-mono text-[11px] tabular-nums text-muted-foreground">{getQueueAgeTimer(record)}</td>;
      case "action":
        return <td key="action" className="px-3 py-2"><Btn variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={(event) => { event.stopPropagation(); openManualQc(record); }}><CheckCircle2 className="size-3" />Open</Btn></td>;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Processing Queue"
      />


      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">
              {processingTotal.toLocaleString("en-US")} total records. Showing a fast working sample for client demo navigation.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-3 text-[11px] focus:outline-none focus:border-primary/60 sm:w-64"
                placeholder="Search processing queue..."
              />
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px]"
            >
              <option>All Types</option>
              {documentTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px]"
            >
              <option>All Assignees</option>
              {assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}
            </select>
            <select
              value={ocrFilter}
              onChange={(event) => setOcrFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px]"
            >
              {ocrFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            <select
              value={ageFilter}
              onChange={(event) => setAgeFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px]"
            >
              {ageFilters.map((filter) => <option key={filter}>{filter}</option>)}
            </select>
            {(query || typeFilter !== "All Types" || assigneeFilter !== "All Assignees" || ocrFilter !== "All OCR" || ageFilter !== "All Ages") && (
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
              columns={processingColumns}
              isColumnVisible={isColumnVisible}
              setColumnVisible={setColumnVisible}
              resetColumns={resetColumns}
            />
          </div>
        </div>

        <div className="max-h-[calc(100vh-260px)] min-h-[420px] overflow-auto">
          <table className="w-full min-w-[840px] text-xs">
            <thead className="border-b border-border bg-card/60">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {columnOrder.map((columnId, index) => {
                  if (!isColumnVisible(columnId)) return null;
                  return (
                    <th
                      key={columnId}
                      {...getDragProps(index)}
                      className={`px-2.5 py-2.5 cursor-grab select-none transition-all duration-150 active:cursor-grabbing hover:bg-muted ${getDragClassName(index)}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground opacity-40">::</span>
                        {getHeaderLabel(columnId)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayedRecords.map((record) => (
                <tr
                  key={record.id}
                  className={`border-b border-border/50 transition hover:bg-accent/30 ${
                    record.id === selectedId ? "bg-primary/8 shadow-[inset_3px_0_0_var(--color-primary)]" : ""
                  }`}
                  onClick={() => setSelectedId(record.id)}
                >
                  {columnOrder.map((columnId) => isColumnVisible(columnId) ? renderCell(record, columnId) : null)}

                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-muted-foreground" colSpan={visibleColumns.length}>
                    No processing records match the current search.
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
          label="loaded records"
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
}


