import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ColumnVisibilityMenu, useColumnVisibility, type ColumnVisibilityOption } from "@/components/column-visibility-menu";
import { Card, PageHeader, ConfidenceBadge, Btn } from "@/components/ui-kit";
import { inventoryRecords } from "@/lib/ocr-inventory-data";
import { mergeQueue, moveRecord, normalizeDocumentType, type WorkflowRecord } from "@/lib/workflow-state";

export const Route = createFileRoute("/_app/inventory")({
  component: Inventory,
  head: () => ({ meta: [{ title: "Inventory - Chiaro OCR" }] }),
});

const quickTabs = ["All", "BOL", "HBL"];
const priorityFilters = ["All Priorities", "High", "Mid", "Low"];
const slaFilters = ["All SLA", "Breached", "Due < 2h", "Due 2-4h", "Due > 4h"];
const dateFilters = ["All Dates", "Today", "Last 7 Days", "Last 30 Days", "This Month", "Older"];

const seedRecords = inventoryRecords.map((record, index) => ({
  ...record,
  status: "Inventory" as const,
  documentType: index % 2 === 0 ? "BOL" : "HBL",
})) as WorkflowRecord[];

type SortKey =
  | "id"
  | "importedAt"
  | "source"
  | "type"
  | "stage"
  | "lastAssignee"
  | "currentAssignee"
  | "priority"
  | "ocr"
  | "sla";
type SortDirection = "asc" | "desc";
type InventoryColumn =
  | "id"
  | "importedAt"
  | "source"
  | "type"
  | "queue"
  | "currentAssigned"
  | "lastAssigned"
  | "priority"
  | "ocr"
  | "sla"
  | "action";
const inventoryDisplayTotal = 4820;
const pageSize = 20;
const sourceTypes = ["Email", "FTP", "SFTP", "S3", "Azure Blob", "OneDrive", "Google Cloud Storage"];
const tabDisplayCounts: Record<string, number> = {
  All: inventoryDisplayTotal,
  "BOL": 2410,
  "HBL": 2410,
};
const pinnedInventoryIds = ["DS-TRAINITY-832611300031", "DS-TRAINITY-832525100049"];
const inventoryColumns: ColumnVisibilityOption<InventoryColumn>[] = [
  { id: "id", label: "ID", locked: true },
  { id: "importedAt", label: "Imported Date/Time" },
  { id: "source", label: "Source" },
  { id: "type", label: "Type" },
  { id: "queue", label: "Current Queue" },
  { id: "currentAssigned", label: "Current Assigned Person" },
  { id: "lastAssigned", label: "Last Assigned Person" },
  { id: "priority", label: "Priority" },
  { id: "ocr", label: "OCR" },
  { id: "sla", label: "SLA" },
  { id: "action", label: "Action", locked: true },
];

const workflowStageOrder = [
  "Document Received",
  "Inventory",
  "OCR Review",
  "Processing",
  "QC",
  "Audit",
  "Export",
  "Completed",
  "Exception",
];

const slaDeadlineStorageKey = "dataspan-document-sla-deadlines";
const slaDemoVersionStorageKey = "dataspan-document-sla-demo-version";
const slaDemoVersion = "trainity-10-minute-v1";
const demoSlaSeconds: Record<string, number> = {
  "DS-TRAINITY-832611300031": 10 * 60,
  "DS-TRAINITY-832525100049": 7 * 60 + 30,
  "DS-INV-150113": 5 * 60 + 15,
};

function formatSlaTimer(totalSeconds: number) {
  const clampedSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;

  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function getStoredSlaDeadlines() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(localStorage.getItem(slaDeadlineStorageKey) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function getDocumentSlaDeadline(recordId: string, baseSeconds: number) {
  if (typeof window === "undefined") return Date.now() + baseSeconds * 1000;

  const deadlines = getStoredSlaDeadlines();
  const shouldResetDemoDeadline =
    recordId in demoSlaSeconds && localStorage.getItem(slaDemoVersionStorageKey) !== slaDemoVersion;
  if (shouldResetDemoDeadline) {
    const resetDeadline = Date.now() + baseSeconds * 1000;
    localStorage.setItem(
      slaDeadlineStorageKey,
      JSON.stringify({
        ...deadlines,
        [recordId]: resetDeadline,
      }),
    );
    localStorage.setItem(slaDemoVersionStorageKey, slaDemoVersion);
    return resetDeadline;
  }

  if (typeof deadlines[recordId] === "number" && deadlines[recordId] > Date.now()) return deadlines[recordId];

  const deadline = Date.now() + baseSeconds * 1000;
  localStorage.setItem(
    slaDeadlineStorageKey,
    JSON.stringify({
      ...deadlines,
      [recordId]: deadline,
    }),
  );
  return deadline;
}

const statusStageMap: Partial<Record<WorkflowRecord["status"], string>> = {
  Received: "Document Received",
  Inventory: "Inventory",
  "OCR Review": "OCR Review",
  "OCR Approved": "OCR Review",
  "QC Processing": "Processing",
  "QC Review": "QC",
  "QC Approved": "QC",
  "Manual Review": "Audit",
  "Export Ready": "Export",
  "Export Completed": "Completed",
  Exception: "Exception",
};

const previousStageByStage: Record<string, string> = {
  "Document Received": "Source Upload",
  Inventory: "Document Received",
  "OCR Review": "Inventory",
  Processing: "OCR Review",
  QC: "Processing",
  Audit: "QC",
  Export: "QC",
  Completed: "Export",
  Exception: "Previous Stage",
};

const stageAliasMap: Record<string, string> = {
  Received: "Document Received",
  "Received Files": "Document Received",
  "OCR Approved": "OCR Review",
  "QC Processing": "Processing",
  "QC Review": "QC",
  "QC Approved": "QC",
  "Manual Review": "Audit",
  "Export Ready": "Export",
  "Export Completed": "Completed",
};

function normalizeStageLabel(stage: string) {
  return stageAliasMap[stage] ?? stage;
}

function withInventoryExampleTrails(records: WorkflowRecord[]) {
  return records.map((record, index) => {
    if (record.exceptionReturnReason) return record;

    if (index === 0 || record.id === "DS-INV-150115") {
      return {
        ...record,
        assignedUser: "Client",
        returnedFrom: "Exception",
        exceptionReturnReason: "OCR confidence below threshold on B/L number and container fields.",
        exceptionReturnComments: "Client confirmed the missing bill number and returned corrected details.",
        exceptionReturnAssignedUser: "Client",
        exceptionReturnSourceStage: "OCR Review",
        exceptionReturnTargetStage: "Inventory",
        exceptionReturnedAt: "06 Jun 2026, 10:42",
      };
    }

    if (index === 1 || record.id === "DS-INV-150114") {
      return {
        ...record,
        assignedUser: "QC User",
        returnedFrom: "Exception",
        exceptionReturnReason: "Business field mismatch requires QC validation.",
        exceptionReturnComments: "QC returned the record for extraction correction before approval.",
        exceptionReturnAssignedUser: "QC User",
        exceptionReturnSourceStage: "QC",
        exceptionReturnTargetStage: "Inventory",
        exceptionReturnedAt: "06 Jun 2026, 10:55",
      };
    }

    return record;
  });
}

function Inventory() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WorkflowRecord[]>(() => {
    const loaded = mergeQueue("inventory", seedRecords);
    return withInventoryExampleTrails(loaded).map((r, index) => {
      const normalizedDocType = normalizeDocumentType(r.documentType);
      return {
        ...r,
        documentType: normalizedDocType,
        uploadedBy: sourceTypes[index % sourceTypes.length],
      };
    });
  });
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [slaFilter, setSlaFilter] = useState("All SLA");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [slaTimerTick, setSlaTimerTick] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: "id", direction: "desc" });
  const { isColumnVisible, setColumnVisible, resetColumns, visibleColumns } = useColumnVisibility(
    "dataspan-inventory-visible-columns",
    inventoryColumns,
  );

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();

    const searchedRecords = records.filter((record) => {
      const priority = getPriority(record);
      const slaValue = getSlaValue(record);
      const matchesType = activeTab === "All" || record.documentType === activeTab;
      const matchesPriority = priorityFilter === "All Priorities" || priority === priorityFilter;
      const matchesDate = dateFilter === "All Dates" || matchesDateFilter(record, dateFilter);
      const matchesSla =
        slaFilter === "All SLA" ||
        (slaFilter === "Breached" && getSla(record) === "Breached") ||
        (slaFilter === "Due < 2h" && getSla(record) !== "Breached" && slaValue < 120) ||
        (slaFilter === "Due 2-4h" && getSla(record) !== "Breached" && slaValue >= 120 && slaValue <= 240) ||
        (slaFilter === "Due > 4h" && getSla(record) !== "Breached" && slaValue > 240);
      const matchesSearch = !search || [
        record.fileName,
        record.id,
        record.uploadDate,
        record.status,
        record.documentType,
        record.owner,
        record.assignedUser,
        record.productName,
        record.sku,
      ].some((value) => String(value).toLowerCase().includes(search));

      return matchesType && matchesPriority && matchesSla && matchesDate && matchesSearch;
    });

    return [...searchedRecords].sort((a, b) => {
      const aPinnedIndex = pinnedInventoryIds.indexOf(a.id);
      const bPinnedIndex = pinnedInventoryIds.indexOf(b.id);
      if (aPinnedIndex !== -1 || bPinnedIndex !== -1) {
        if (aPinnedIndex === -1) return 1;
        if (bPinnedIndex === -1) return -1;
        return aPinnedIndex - bPinnedIndex;
      }
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [activeTab, dateFilter, priorityFilter, query, records, slaFilter, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const displayedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allVisibleSelected = displayedRecords.length > 0 && displayedRecords.every((record) => selectedIds.includes(record.id));
  const averageConfidence = Math.round(records.reduce((sum, record) => sum + record.confidence, 0) / Math.max(records.length, 1));
  const highPriorityCount = records.filter((record) => record.confidence < 90).length;
  const processingCount = records.filter((record) => ["OCR Review", "QC Processing", "QC Review"].includes(record.status)).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, dateFilter, priorityFilter, query, slaFilter, sortConfig]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlaTimerTick((tick) => tick + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function getPriority(record: WorkflowRecord) {
    if (record.confidence < 90) return "High";
    if (record.confidence < 95) return "Mid";
    return "Low";
  }

  function getSourceType(record: WorkflowRecord) {
    return sourceTypes.includes(record.uploadedBy) ? record.uploadedBy : "Email";
  }

  function getStage(record: WorkflowRecord) {
    return statusStageMap[record.status] ?? "Audit";
  }

  function getLastAssignedStage(record: WorkflowRecord) {
    if (record.returnedFrom === "Exception" || record.exceptionReturnReason) return "Exception";

    const currentStage = getStage(record);
    const returnedFromStage = record.returnedFrom ? normalizeStageLabel(record.returnedFrom) : "";

    if (returnedFromStage && returnedFromStage !== currentStage) {
      return returnedFromStage;
    }

    const previousStage = previousStageByStage[currentStage] ?? "Previous Stage";
    if (previousStage !== currentStage) return previousStage;

    const currentIndex = workflowStageOrder.indexOf(currentStage);
    return currentIndex > 0 ? workflowStageOrder[currentIndex - 1] : "Previous Stage";
  }

  function getLastAssignedPerson(record: WorkflowRecord) {
    if (record.exceptionReturnAssignedUser) return record.exceptionReturnAssignedUser;
    if (record.assignedUser) return record.assignedUser;

    const map: Record<string, string> = {
      "OCR Operator": "Aarav Sharma",
      "QC User": "Priya Iyer",
      "Export User": "Meera Verma",
      Admin: "Neha Gupta",
    };

    return map[record.owner] || record.owner;
  }

  function getCurrentAssignedPerson(record: WorkflowRecord) {
    const names = [
      "Aarav Sharma",
      "Priya Iyer",
      "Rohan Khan",
      "Meera Verma",
      "Sara Nair",
      "Vikram Patel",
      "Ananya Rao",
      "Karan Mehta",
      "Neha Gupta",
      "Arjun Desai",
    ];
    const idTotal = record.id
      .split("")
      .reduce((total, character) => total + character.charCodeAt(0), 0);

    return names[idTotal % names.length];
  }

  function getSla(record: WorkflowRecord) {
    const tail = Number(record.id.slice(-2));
    if (record.confidence < 70) return "Breached";
    return `${1 + (tail % 5)}h ${String(8 + (tail % 46)).padStart(2, "0")}m`;
  }

  function getSlaValue(record: WorkflowRecord) {
    const sla = getSla(record);
    if (sla === "Breached") return Number.MAX_SAFE_INTEGER;
    const match = sla.match(/(\d+)h\s+(\d+)m/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }

  function getSlaTimer(record: WorkflowRecord) {
    if (getSla(record) === "Breached") return "Breached";

    const deadline = getDocumentSlaDeadline(record.id, demoSlaSeconds[record.id] ?? getSlaValue(record) * 60);
    return formatSlaTimer(Math.ceil((deadline - Date.now()) / 1000));
  }

  function isSlaUrgent(record: WorkflowRecord) {
    if (getSla(record) === "Breached") return true;

    const deadline = getDocumentSlaDeadline(record.id, demoSlaSeconds[record.id] ?? getSlaValue(record) * 60);
    return Math.ceil((deadline - Date.now()) / 1000) < 10 * 60;
  }

  function getImportDate(record: WorkflowRecord) {
    const date = new Date(record.uploadDate);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function matchesDateFilter(record: WorkflowRecord, filter: string) {
    const importDate = getImportDate(record);
    if (!importDate) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfImportDay = new Date(importDate.getFullYear(), importDate.getMonth(), importDate.getDate());
    const daysOld = Math.floor((startOfToday.getTime() - startOfImportDay.getTime()) / 86400000);

    if (filter === "Today") return daysOld === 0;
    if (filter === "Last 7 Days") return daysOld >= 0 && daysOld <= 7;
    if (filter === "Last 30 Days") return daysOld >= 0 && daysOld <= 30;
    if (filter === "This Month") return importDate.getFullYear() === now.getFullYear() && importDate.getMonth() === now.getMonth();
    if (filter === "Older") return daysOld > 30;
    return true;
  }

  function getLastAssignedDetail(record: WorkflowRecord) {
    return getQueueTransition(record);
  }

  function getLastAssignedTitle(record: WorkflowRecord) {
    const transition = getQueueTransition(record);

    if (!(record.returnedFrom === "Exception" || record.exceptionReturnReason)) {
      return `${record.id}\n${transition}`;
    }

    return [
      `${record.id} returned from Exception`,
      `Queue transition: ${transition}`,
      `Reason: ${record.exceptionReturnReason || record.exceptionReason || "Not captured"}`,
      `Last assigned: ${record.exceptionReturnAssignedUser || record.assignedUser || record.owner || "Unassigned"}`,
      `Resolution note: ${record.exceptionReturnComments || record.comments || "No note captured"}`,
      record.exceptionReturnedAt ? `Returned at: ${record.exceptionReturnedAt}` : "",
    ].filter(Boolean).join("\n");
  }

  function getQueueTransition(record: WorkflowRecord) {
    const targetQueue = getStage(record);
    const sourceQueue = getQueueTransitionSource(record, targetQueue);
    return `${sourceQueue} --> ${getQueueTransitionLabel(targetQueue)}`;
  }

  function getQueueTransitionSource(record: WorkflowRecord, targetQueue: string) {
    if (record.returnedFrom === "Exception" || record.exceptionReturnReason) return "Exception";

    if (targetQueue === "OCR Review") return "Processing";
    if (targetQueue === "Processing") return "QC";
    if (targetQueue === "QC") return "Processing";
    if (targetQueue === "Inventory") return "Document Received";

    const sourceQueue = getLastAssignedStage(record);
    if (sourceQueue !== "Inventory") return sourceQueue;

    return "Document Received";
  }

  function getQueueTransitionLabel(queue: string) {
    return queue;
  }

  function getSortValue(record: WorkflowRecord, key: SortKey) {
    const map: Record<SortKey, string | number> = {
      id: record.id,
      importedAt: record.uploadDate,
      source: getSourceType(record),
      type: record.documentType,
      stage: getStage(record),
      lastAssignee: getLastAssignedPerson(record),
      currentAssignee: getCurrentAssignedPerson(record),
      priority: { High: 3, Mid: 2, Low: 1 }[getPriority(record)] ?? 0,
      ocr: record.confidence,
      sla: getSlaValue(record),
    };
    return map[key];
  }

  function toggleSort(key: SortKey) {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function getToneClasses(label: string) {
    const map: Record<string, string> = {
      High: "border-warning/30 bg-warning/10 text-warning",
      Mid: "border-info/30 bg-info/10 text-info",
      Low: "border-border bg-muted text-muted-foreground",
    };
    return map[label] ?? "border-border bg-muted text-muted-foreground";
  }

  function toggleSelected(recordId: string) {
    setSelectedIds((ids) => ids.includes(recordId) ? ids.filter((id) => id !== recordId) : [...ids, recordId]);
  }

  function clearFilters() {
    setActiveTab("All");
    setPriorityFilter("All Priorities");
    setSlaFilter("All SLA");
    setDateFilter("All Dates");
    setQuery("");
  }

  function sendToOcr(record: WorkflowRecord) {
    const nextRecord = { ...record, status: "OCR Review" as const, owner: "OCR Operator" };
    moveRecord("inventory", "ocr", nextRecord);
    setRecords((items) => {
      const next = items.filter((item) => item.id !== record.id);
      return next;
    });
    navigate({ to: "/ocr-review-queue", search: { document: record.id } });
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

  const [columnOrder, setColumnOrder] = useState<InventoryColumn[]>([
    "id",
    "importedAt",
    "source",
    "type",
    "queue",
    "currentAssigned",
    "lastAssigned",
    "priority",
    "ocr",
    "sla",
    "action",
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newOrder = [...columnOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);
    setColumnOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  function renderCell(record: WorkflowRecord, columnId: InventoryColumn) {
    switch (columnId) {
      case "id":
        return <td key="id" className="whitespace-nowrap px-2.5 py-2 font-mono text-[11px] font-medium">{record.id}</td>;
      case "importedAt":
        return <td key="importedAt" className="whitespace-nowrap px-2.5 py-2 text-[11px] text-muted-foreground">{record.uploadDate}</td>;
      case "source":
        return (
          <td key="source" className="whitespace-nowrap px-2.5 py-2">
            <span className="inline-flex rounded border border-primary/20 bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {getSourceType(record)}
            </span>
          </td>
        );
      case "type":
        return (
          <td key="type" className="px-2.5 py-2">
            <span className="inline-flex rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium">
              {record.documentType}
            </span>
          </td>
        );
      case "queue":
        return (
          <td key="queue" className="min-w-[160px] whitespace-nowrap px-2.5 py-2">
            <div className="flex items-start">
              <span
                title={getLastAssignedTitle(record)}
                className={`inline-flex max-w-full rounded border px-1 py-0 text-[9px] font-medium ${
                  record.returnedFrom === "Exception" || record.exceptionReturnReason
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <span className="truncate">{getLastAssignedDetail(record)}</span>
              </span>
            </div>
          </td>
        );
      case "currentAssigned":
        return (
          <td key="currentAssigned" className="min-w-[140px] px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <span className="grid size-5 place-items-center rounded-full bg-success/15 text-[8px] font-semibold text-success">
                {getCurrentAssignedPerson(record).split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[11px]">{getCurrentAssignedPerson(record)}</div>
              </div>
            </div>
          </td>
        );
      case "lastAssigned":
        return (
          <td key="lastAssigned" className="min-w-[135px] px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[8px] font-semibold text-primary">
                {getLastAssignedPerson(record).split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[11px]">{getLastAssignedPerson(record)}</div>
              </div>
            </div>
          </td>
        );
      case "priority":
        return (
          <td key="priority" className="whitespace-nowrap px-2.5 py-2">
            <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${getToneClasses(getPriority(record))}`}>
              {getPriority(record)}
            </span>
          </td>
        );
      case "ocr":
        return <td key="ocr" className="whitespace-nowrap px-2.5 py-2"><ConfidenceBadge value={record.confidence} /></td>;
      case "sla":
        return <td key="sla" className={`whitespace-nowrap px-2.5 py-2 font-mono text-[11px] font-semibold tabular-nums ${isSlaUrgent(record) ? "text-destructive" : "text-muted-foreground"}`}>{getSlaTimer(record)}</td>;
      case "action":
        return (
          <td key="action" className="px-3 py-2">
            <Btn
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={(event) => {
                event.stopPropagation();
                sendToOcr(record);
              }}
            >
              Open
            </Btn>
          </td>
        );
      default:
        return null;
    }
  }

  function getHeaderLabel(columnId: InventoryColumn) {
    switch (columnId) {
      case "id": return <SortHeader label="ID" sortKey="id" />;
      case "importedAt": return <SortHeader label="Imported Date/Time" sortKey="importedAt" />;
      case "source": return <SortHeader label="Source" sortKey="source" />;
      case "type": return <SortHeader label="Type" sortKey="type" />;
      case "queue": return <SortHeader label="Current Queue" sortKey="stage" />;
      case "currentAssigned": return <SortHeader label="Current Assigned Person" sortKey="currentAssignee" />;
      case "lastAssigned": return <SortHeader label="Last Assigned Person" sortKey="lastAssignee" />;
      case "priority": return <SortHeader label="Priority" sortKey="priority" />;
      case "ocr": return <SortHeader label="OCR" sortKey="ocr" />;
      case "sla": return <SortHeader label="SLA" sortKey="sla" />;
      case "action": return <span className="font-medium">Action</span>;
      default: return null;
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Inventory"
        description="BOL and HBL documents moving through OCR Review, Processing, QC, Audit, and Export."
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: "Total Documents", value: inventoryDisplayTotal.toLocaleString("en-US"), detail: "BOL and HBL inventory", tone: "text-primary" },
          { label: "In Workflow", value: processingCount.toLocaleString("en-US"), detail: "OCR, Processing, and QC", tone: "text-info" },
          { label: "High Priority", value: highPriorityCount.toLocaleString("en-US"), detail: "OCR confidence below 90%", tone: "text-warning" },
          { label: "Average OCR", value: `${averageConfidence}%`, detail: "Across visible sample data", tone: "text-success" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-md border border-border bg-card px-3 py-2">
            <div className="text-[9px] font-medium uppercase text-muted-foreground">{metric.label}</div>
            <div className={`mt-0.5 text-lg font-bold tabular-nums ${metric.tone}`}>{metric.value}</div>
            <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{metric.detail}</div>
          </div>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border px-3 py-2 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Inventory Queue</h3>
            <p className="text-[11px] text-muted-foreground">
              {filteredRecords.length.toLocaleString("en-US")} matching documents · click any row to open OCR Review
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <div className="flex shrink-0 gap-1 rounded-md border border-border bg-muted/30 p-0.5">
              {quickTabs.map((tab) => {
                const count = tabDisplayCounts[tab] ?? records.filter((record) => record.documentType === tab).length;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`h-7 whitespace-nowrap rounded px-2 text-[11px] font-medium transition ${
                      activeTab === tab
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab} <span className="ml-1 text-[10px] text-muted-foreground">{count.toLocaleString("en-US")}</span>
                  </button>
                );
              })}
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:outline-none focus:border-primary/60"
              aria-label="Filter inventory by priority"
            >
              {priorityFilters.map((filter) => (
                <option key={filter} value={filter}>{filter}</option>
              ))}
            </select>
            <select
              value={slaFilter}
              onChange={(event) => setSlaFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:outline-none focus:border-primary/60"
              aria-label="Filter inventory by SLA"
            >
              {slaFilters.map((filter) => (
                <option key={filter} value={filter}>{filter}</option>
              ))}
            </select>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[11px] text-foreground focus:outline-none focus:border-primary/60"
              aria-label="Filter inventory by imported date"
            >
              {dateFilters.map((filter) => (
                <option key={filter} value={filter}>{filter}</option>
              ))}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-8 text-[11px] focus:outline-none focus:border-primary/60"
                placeholder="Search ID, person, document..."
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear inventory search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            {(activeTab !== "All" || priorityFilter !== "All Priorities" || slaFilter !== "All SLA" || dateFilter !== "All Dates" || query) && (
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
              columns={inventoryColumns}
              isColumnVisible={isColumnVisible}
              setColumnVisible={setColumnVisible}
              resetColumns={resetColumns}
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between border-b border-border bg-primary/5 px-3 py-1.5 text-[11px]">
            <span><strong>{selectedIds.length}</strong> document{selectedIds.length === 1 ? "" : "s"} selected</span>
            <button type="button" onClick={() => setSelectedIds([])} className="font-medium text-primary hover:underline">Clear selection</button>
          </div>
        )}

        <div className="max-h-[calc(100vh-300px)] min-h-[420px] overflow-auto">
          <table className="w-full min-w-[1200px] text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-card shadow-[0_1px_0_var(--color-border)]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {columnOrder.map((colId, idx) => {
                  if (!isColumnVisible(colId)) return null;
                  return (
                    <th
                      key={colId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`px-2.5 py-2.5 cursor-grab active:cursor-grabbing hover:bg-muted select-none transition-all duration-150 ${
                        draggedIndex === idx ? "opacity-30" : ""
                      } ${
                        dragOverIndex === idx ? "border-l-2 border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground opacity-40">::</span>
                        {getHeaderLabel(colId)}
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
                  className="cursor-pointer border-b border-border/50 transition hover:bg-accent/35 focus-within:bg-accent/35"
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ${record.id} in OCR Review`}
                  onClick={() => sendToOcr(record)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      sendToOcr(record);
                    }
                  }}
                >
                  {columnOrder.map((colId) => {
                    if (!isColumnVisible(colId)) return null;
                    return renderCell(record, colId);
                  })}

                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-muted-foreground" colSpan={visibleColumns.length}>
                    No documents match the current search and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredRecords.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border px-3 py-2 text-[11px] sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} loaded records
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                aria-label="Previous inventory page"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="grid size-7 place-items-center rounded-md border border-border hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                aria-label="Next inventory page"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
