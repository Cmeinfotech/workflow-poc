import { type InventoryStatus } from "@/lib/ocr-inventory-data";
import {
  billingProjectSamples,
  makeBillOfLadingRecord,
  uploadedBolSamples,
  worstCaseBillOfLadingSamples,
  type ExtractedField,
} from "@/lib/bill-of-lading-samples";

export type WorkflowRecord = {
  id: string;
  fileName: string;
  uploadDate: string;
  uploadedBy: string;
  status: InventoryStatus;
  owner: string;
  productName: string;
  sku: string;
  quantity: number;
  inventoryValue: string;
  confidence: number;
  exceptionReason: string;
  documentType: string;
  documentUrl?: string;
  documentIsPdf?: boolean;
  documentPages?: Array<{
    label: string;
    fileName: string;
    documentUrl: string;
    documentIsPdf?: boolean;
  }>;
  ocrFields?: ExtractedField[];
  comments?: string;
  assignedUser?: string;
  resolutionStatus?: string;
  returnedFrom?: string;
  exceptionReturnReason?: string;
  exceptionReturnComments?: string;
  exceptionReturnAssignedUser?: string;
  exceptionReturnSourceStage?: string;
  exceptionReturnTargetStage?: string;
  exceptionReturnedAt?: string;
};

export type QueueName =
  | "inventory"
  | "ocr"
  | "processing"
  | "qc"
  | "manual"
  | "export"
  | "exception";

const keyByQueue: Record<QueueName, string> = {
  inventory: "dataspan-workflow-inventory",
  ocr: "dataspan-workflow-ocr",
  processing: "dataspan-workflow-processing",
  qc: "dataspan-workflow-qc",
  manual: "dataspan-workflow-manual",
  export: "dataspan-workflow-export",
  exception: "dataspan-workflow-exception",
};

const demoDataVersion = "billing-project-exact-fields-v30-trainity-workflow";
const demoDataVersionKey = "dataspan-workflow-demo-version";
const demoDocuments = [
  { type: "BOL", file: "ocean-bill-of-lading", source: "FTP", product: "Containerized freight document", sku: "BOL-8842", value: "$4,860.00", confidence: 96 },
  { type: "HBL", file: "house-bill-of-lading", source: "SFTP", product: "House shipment bill", sku: "HOL-2201", value: "$2,940.00", confidence: 89 },
  { type: "BOL", file: "ocean-bill-of-lading-export", source: "FTP", product: "Ocean freight manifest", sku: "BOL-4430", value: "$6,710.00", confidence: 97 },
  { type: "HBL", file: "house-bill-of-lading-consignee", source: "SFTP", product: "Forwarder house bill", sku: "HOL-7711", value: "$1,890.00", confidence: 88 },
  { type: "BOL", file: "ocean-bill-of-lading-carrier", source: "FTP", product: "Carrier release document", sku: "BOL-2231", value: "$5,430.00", confidence: 92 },
  { type: "HBL", file: "house-bill-of-lading-forwarder", source: "SFTP", product: "Forwarder cargo document", sku: "HOL-6620", value: "$7,356.00", confidence: 90 },
];

const extensionByType: Record<string, string> = {
  "BOL": "pdf",
  "HBL": "pdf",
  "HOL": "pdf",
};
const inventoryAssignees = [
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
const inventorySourceTypes = ["FTP", "SFTP"];
const inventoryDocumentTypes = ["BOL", "HBL"];
const inventoryQueueTotal = 4820;
const inventorySampleRows = 120;
const processingQueueTotal = 6120;

let normalizingWorkflowStorage = false;

function normalizeOcrConfidence(value: number) {
  return Math.max(85, Math.min(100, Math.round(value)));
}

function balanceOcrFields(fields: ExtractedField[] | undefined) {
  return fields?.map((field, index) => {
    const confidence = index === 0
      ? 88
      : index % 3 === 0
        ? 92
        : index % 3 === 1
          ? 96
          : 98;

    return {
      ...field,
      confidence,
    };
  });
}

export function normalizeDocumentType(documentType: string) {
  return documentType.includes("House") || documentType === "HOL" || documentType === "HBL" ? "HBL" : "BOL";
}

function normalizeRecordDocumentType(record: WorkflowRecord): WorkflowRecord {
  const documentType = normalizeDocumentType(record.documentType);
  return {
    ...record,
    documentType,
    uploadedBy: record.uploadedBy === "HOL" || record.uploadedBy === "HBL" || record.uploadedBy === "hol" || record.uploadedBy === "hbl"
      ? "SFTP"
      : record.uploadedBy,
  };
}

function isPinnedTrainityDocument(id: string) {
  return id === "DS-TRAINITY-832611300031" || id === "DS-TRAINITY-832525100049";
}

function makeUploadedBolQueueRecords(
  status: InventoryStatus,
  owner: string,
  uploadHour: number,
) {
  return uploadedBolSamples.map((sample, index) => ({
    ...makeBillOfLadingRecord(sample, status, owner, `29 Jun 2026, ${String(uploadHour).padStart(2, "0")}:${String(34 + index).padStart(2, "0")}`),
    assignedUser: owner,
  }));
}

function withBillingProjectSample(record: WorkflowRecord, index: number): WorkflowRecord {
  // A coprime step distributes all six source documents evenly without obvious repeats.
  const sample = record.id === "DS-INV-150115"
    ? billingProjectSamples[0]
    : billingProjectSamples[(index * 5 + 2) % billingProjectSamples.length];
  const extension = sample.fileName.split(".").pop() ?? "png";

  return {
    ...record,
    fileName: `${sample.fileName.replace(/\.[^.]+$/, "")}-${record.id}.${extension}`,
    uploadedBy: sample.uploadedBy,
    productName: sample.productName,
    sku: sample.sku,
    quantity: sample.quantity,
    inventoryValue: sample.inventoryValue,
    confidence: Math.max(85, Math.min(99, record.confidence)),
    documentType: sample.title.includes("House") ? "HBL" : "BOL",
    documentUrl: sample.documentUrl,
    documentIsPdf: false,
    ocrFields: sample.fields.map((field) => ({
      ...field,
      confidence: Math.max(85, Math.min(99, field.confidence - (index % 4))),
    })),
  };
}

function withReturnedException(
  record: WorkflowRecord,
  targetStage: "OCR Review" | "QC Review",
  index: number,
): WorkflowRecord {
  const examples = [
    {
      reason: "Carrier name and B/L number did not match the uploaded source document.",
      comments: "Client confirmed the carrier as Ocean Network Express and asked review team to re-check the B/L number before approval.",
      assignedUser: "Client",
      returnedAt: "06 Jun 2026, 11:18",
    },
    {
      reason: "Container and seal number confidence was below approval threshold.",
      comments: "Exception reviewer highlighted the container section and returned it for field-level correction.",
      assignedUser: "Priya Iyer",
      returnedAt: "06 Jun 2026, 11:31",
    },
    {
      reason: "Quantity total did not reconcile with the parsed line-item table.",
      comments: "QC reviewer requested validation against the source table before sending the document forward.",
      assignedUser: "QC User",
      returnedAt: "06 Jun 2026, 11:44",
    },
  ];
  const example = examples[index % examples.length];

  return {
    ...record,
    returnedFrom: "Exception",
    exceptionReason: example.reason,
    exceptionReturnReason: example.reason,
    exceptionReturnComments: example.comments,
    exceptionReturnAssignedUser: example.assignedUser,
    exceptionReturnSourceStage: "Exception Queue",
    exceptionReturnTargetStage: targetStage,
    exceptionReturnedAt: example.returnedAt,
  };
}

function makeDemoRecord(
  index: number,
  idNumber: number,
  status: InventoryStatus,
  owner: string,
  confidenceOffset = 0,
): WorkflowRecord {
  const item = demoDocuments[index % demoDocuments.length];
  const confidence = Math.max(85, Math.min(99, item.confidence + confidenceOffset));
  const quantity = 24 + ((index * 37) % 980);

  return withBillingProjectSample({
    id: `DS-INV-${idNumber}`,
    fileName: `${item.file}-${idNumber}.${extensionByType[item.type] ?? "pdf"}`,
    uploadDate: `05 Jun 2026, ${String(8 + (index % 8)).padStart(2, "0")}:${String(10 + ((index * 7) % 49)).padStart(2, "0")}`,
    uploadedBy: item.source,
    status,
    owner,
    productName: item.product,
    sku: item.sku,
    quantity,
    inventoryValue: item.value,
    confidence,
    exceptionReason: "",
    documentType: normalizeDocumentType(item.type),
  }, index);
}

function makeEnterpriseInventoryRecord(index: number): WorkflowRecord {
  const documentType = inventoryDocumentTypes[index % inventoryDocumentTypes.length];
  const sourceType = inventorySourceTypes[index % inventorySourceTypes.length];
  const idNumber = 150000 + index;
  const confidence = 85 + ((index * 7) % 15);
  const quantity = 18 + ((index * 31) % 1200);
  const value = `$${(1800 + ((index * 317) % 18600)).toLocaleString("en-US")}.00`;
  const ext = index % 5 === 0 ? "png" : index % 5 === 1 ? "jpg" : "pdf";
  const filePrefix = documentType === "BOL"
    ? "ocean-bill-of-lading"
    : "house-bill-of-lading";
  const statusCycle: InventoryStatus[] = ["Inventory", "OCR Review", "QC Processing", "QC Review"];

  return withBillingProjectSample({
    id: `DS-INV-${idNumber}`,
    fileName: `${filePrefix}-${idNumber}.${ext}`,
    uploadDate: `06 Jun 2026, ${String(7 + (index % 11)).padStart(2, "0")}:${String((index * 13) % 60).padStart(2, "0")}`,
    uploadedBy: sourceType,
    status: statusCycle[index % statusCycle.length],
    owner: inventoryAssignees[index % inventoryAssignees.length],
    productName: documentType === "BOL" ? "Ocean freight bill of lading" : "House bill of lading",
    sku: documentType === "BOL" ? `BOL-${60000 + index}` : `HOL-${60000 + index}`,
    quantity,
    inventoryValue: value,
    confidence,
    exceptionReason: "",
    documentType,
  }, index);
}

function writeDemoQueues() {
  (Object.keys(keyByQueue) as QueueName[]).forEach((queue) => {
    window.localStorage.setItem(keyByQueue[queue], JSON.stringify(getDemoQueueSeed(queue)));
  });
  window.localStorage.setItem(demoDataVersionKey, demoDataVersion);
}

function ensureDemoDataVersion() {
  if (typeof window === "undefined") return;

  if (window.localStorage.getItem(demoDataVersionKey) !== demoDataVersion) {
    writeDemoQueues();
    window.dispatchEvent(new Event("dataspan-workflow-change"));
    return;
  }

  let addedQueue = false;
  (Object.keys(keyByQueue) as QueueName[]).forEach((queue) => {
    if (window.localStorage.getItem(keyByQueue[queue]) !== null) return;
    window.localStorage.setItem(keyByQueue[queue], JSON.stringify(getDemoQueueSeed(queue)));
    addedQueue = true;
  });

  if (addedQueue) window.dispatchEvent(new Event("dataspan-workflow-change"));
}

function readQueueRaw(queue: QueueName): WorkflowRecord[] {
  try {
    const raw = window.localStorage.getItem(keyByQueue[queue]);
    return raw ? JSON.parse(raw) as WorkflowRecord[] : [];
  } catch {
    return [];
  }
}

function normalizeWorkflowStorage() {
  if (typeof window === "undefined" || normalizingWorkflowStorage) return;

  normalizingWorkflowStorage = true;
  const priority: QueueName[] = [
    "exception",
    "export",
    "manual",
    "qc",
    "processing",
    "ocr",
    "inventory",
  ];
  const seen = new Set<string>();
  let changed = false;

  priority.forEach((queue) => {
    const existing = readQueueRaw(queue);
    const unique = existing.filter((record) => {
      if (isPinnedTrainityDocument(record.id)) return true;

      if (seen.has(record.id)) {
        changed = true;
        return false;
      }

      seen.add(record.id);
      return true;
    });

    if (unique.length !== existing.length) {
      window.localStorage.setItem(keyByQueue[queue], JSON.stringify(unique));
    }
  });

  normalizingWorkflowStorage = false;
  if (changed) window.dispatchEvent(new Event("dataspan-workflow-change"));
}

function ensureUploadedBolInventoryRecords(records: WorkflowRecord[]) {
  const uploadedInventoryRecords = makeUploadedBolQueueRecords("Inventory", "Aarav Sharma", 12);
  const existingIds = new Set(records.map((record) => record.id));
  const missingRecords = uploadedInventoryRecords.filter((record) => !existingIds.has(record.id));

  if (missingRecords.length === 0) return records;

  const next = [...missingRecords, ...records];
  window.localStorage.setItem(keyByQueue.inventory, JSON.stringify(next));
  return next;
}

export function getDemoQueueSeed(queue: QueueName): WorkflowRecord[] {
  if (queue === "inventory") {
    const featuredRecords = [
      ...uploadedBolSamples.map((sample, index) => (
        makeBillOfLadingRecord(sample, "Inventory", "Aarav Sharma", `29 Jun 2026, 12:${String(34 + index).padStart(2, "0")}`)
      )),
      {
        ...makeBillOfLadingRecord(billingProjectSamples[0], "Inventory", "Aarav Sharma", "06 Jun 2026, 09:10"),
        id: "DS-BOL-INV-90002",
      },
      {
        ...makeBillOfLadingRecord(billingProjectSamples[1], "Inventory", "Priya Iyer", "06 Jun 2026, 09:18"),
        id: "DS-BOL-INV-90001",
      },
      makeDemoRecord(0, 11024, "Inventory", "Rohan Khan", 0),
      makeDemoRecord(1, 11023, "Inventory", "Meera Verma", 0),
    ];

    return [
      ...featuredRecords,
      ...Array.from({ length: inventorySampleRows - featuredRecords.length }, (_, index) => makeEnterpriseInventoryRecord(index)),
    ];
  }

  if (queue === "ocr") {
    const seed = [
      ...uploadedBolSamples.map((sample, index) => (
        makeBillOfLadingRecord(sample, "OCR Review", "OCR Operator", `29 Jun 2026, 12:${String(34 + index).padStart(2, "0")}`)
      )),
      ...worstCaseBillOfLadingSamples.map((sample, index) => (
        makeBillOfLadingRecord(sample, "OCR Review", "OCR Operator", `06 Jun 2026, 09:${String(42 + index * 8).padStart(2, "0")}`)
      )),
      ...billingProjectSamples.slice(0, 2).map((sample, index) => (
        makeBillOfLadingRecord(sample, "OCR Review", "OCR Operator", `06 Jun 2026, 10:${String(2 + index * 7).padStart(2, "0")}`)
      )),
      makeBillOfLadingRecord(billingProjectSamples[4], "OCR Review", "OCR Operator", "06 Jun 2026, 10:04"),
      ...Array.from({ length: 15 }, (_, index) => makeDemoRecord(index + 1, 21018 - index, "OCR Review", "OCR Operator", -(index % 8))),
    ];
    return seed.map((record, index) => {
      const normalized = {
        ...record,
        confidence: normalizeOcrConfidence(record.confidence),
        ocrFields: balanceOcrFields(record.ocrFields),
      };

      return index < 3 ? withReturnedException(normalized, "OCR Review", index) : normalized;
    });
  }

  if (queue === "processing") {
    return [
      ...makeUploadedBolQueueRecords("QC Processing", "Priya Iyer", 13),
      ...Array.from({ length: 72 }, (_, index) => {
      const record = makeEnterpriseInventoryRecord(index + 71);

      return {
        ...record,
        id: `DS-PROC-${260071 - index}`,
        status: "QC Processing",
        owner: inventoryAssignees[index % inventoryAssignees.length],
        uploadDate: `06 Jun 2026, ${String(9 + (index % 9)).padStart(2, "0")}:${String((index * 11) % 60).padStart(2, "0")}`,
      };
      }),
    ];
  }

  if (queue === "qc") {
    return [
      ...makeUploadedBolQueueRecords("QC Review", "QC User", 14),
      makeBillOfLadingRecord(billingProjectSamples[5], "QC Review", "QC User", "06 Jun 2026, 10:22"),
      ...Array.from({ length: 15 }, (_, index) => makeDemoRecord(index + 2, 31016 - index, "QC Review", "QC User", -(index % 5))),
    ].map((record, index) => (
      index < 3 ? withReturnedException(record, "QC Review", index + 1) : record
    ));
  }

  if (queue === "manual") {
    return [
      ...makeUploadedBolQueueRecords("Manual Review", "Priya Iyer", 15).map((record) => ({
        ...record,
        comments: "Trainity document pre-opened for audit validation.",
        returnedFrom: "QC Review",
      })),
      ...billingProjectSamples.slice(2, 4).map((sample, index) => ({
      ...makeBillOfLadingRecord(
        sample,
        "Manual Review",
        index % 2 === 0 ? "Priya Iyer" : "Aarav Sharma",
        `06 Jun 2026, 10:${String(28 + index * 6).padStart(2, "0")}`,
      ),
      comments:
        index % 2 === 0
          ? "Confirm low-confidence shipping fields before export."
          : "Validate consignee, container, and quantity details.",
      assignedUser: index % 2 === 0 ? "Priya Iyer" : "Aarav Sharma",
      returnedFrom: "QC Review",
      })),
    ];
  }

  if (queue === "export") {
    return [
      ...makeUploadedBolQueueRecords("Export Ready", "Export User", 16),
      ...Array.from({ length: 6 }, (_, index) => (
      makeDemoRecord(index + 12, 41006 - index, index < 4 ? "Export Ready" : "Export Completed", "Export User", 3)
      )),
    ];
  }

  return Array.from({ length: 8 }, (_, index) => ({
    ...(index < 2
      ? {
          ...makeBillOfLadingRecord(billingProjectSamples[index], "Exception", "Client", `06 Jun 2026, 10:${String(35 + index * 6).padStart(2, "0")}`),
          id: index === 0 ? "DS-BOL-EXC-90002" : "DS-BOL-EXC-90001",
        }
      : makeDemoRecord(index + 1, 51004 - index, "Exception", "Client", -18)),
    exceptionReason: index % 3 === 0
      ? "Worst-case OCR confidence below threshold"
      : index % 3 === 1
        ? "Business field mismatch requires resolution"
        : "Unregistered vendor or missing tax ID",
    comments: index % 3 === 0
      ? "Review B/L number, container, seal, and port fields manually."
      : index % 3 === 1
        ? "Validate vendor, amount, and quantity before returning to QC."
        : "Verify company registration number with procurement desk.",
    assignedUser: index % 2 === 0 ? "Client" : "QC User",
    resolutionStatus: "Open",
    returnedFrom: index % 2 === 0 ? "OCR Review" : "QC Review",
  }));
}

export function readQueue(queue: QueueName): WorkflowRecord[] {
  if (typeof window === "undefined") return [];

  ensureDemoDataVersion();
  normalizeWorkflowStorage();
  const records = readQueueRaw(queue).map(normalizeRecordDocumentType);
  return queue === "inventory" ? ensureUploadedBolInventoryRecords(records) : records;
}

export function queueExists(queue: QueueName) {
  if (typeof window === "undefined") return false;
  ensureDemoDataVersion();
  return window.localStorage.getItem(keyByQueue[queue]) !== null;
}

export function writeQueue(queue: QueueName, records: WorkflowRecord[]) {
  window.localStorage.setItem(keyByQueue[queue], JSON.stringify(records));
  window.dispatchEvent(new Event("dataspan-workflow-change"));
}

export function addToQueue(queue: QueueName, record: WorkflowRecord) {
  const existing = readQueue(queue).filter((item) => item.id !== record.id);
  writeQueue(queue, [record, ...existing]);
}

export function mergeQueue(queue: QueueName, seed: WorkflowRecord[]) {
  if (typeof window === "undefined") return seed;

  ensureDemoDataVersion();
  const raw = window.localStorage.getItem(keyByQueue[queue]);
  if (raw !== null) return readQueue(queue);

  writeQueue(queue, seed);
  return seed;
}

export function removeFromQueue(queue: QueueName, recordId: string) {
  const next = readQueue(queue).filter((item) => item.id !== recordId);
  writeQueue(queue, next);
  return next;
}

export function moveRecord(from: QueueName, to: QueueName, record: WorkflowRecord) {
  removeFromQueue(from, record.id);
  addToQueue(to, record);
}

export function getQueueCount(queue: QueueName, seed: { length: number } = []) {
  if (typeof window === "undefined") return seed.length;

  ensureDemoDataVersion();
  if (queue === "inventory") return inventoryQueueTotal;
  if (queue === "processing") return processingQueueTotal;

  const raw = window.localStorage.getItem(keyByQueue[queue]);
  return raw === null ? seed.length : readQueue(queue).length;
}

export function resetWorkflowData() {
  if (typeof window === "undefined") return;

  (Object.keys(keyByQueue) as QueueName[]).forEach((queue) => {
    window.localStorage.setItem(keyByQueue[queue], JSON.stringify(getDemoQueueSeed(queue)));
  });
  window.localStorage.setItem(demoDataVersionKey, demoDataVersion);
  window.dispatchEvent(new Event("dataspan-workflow-change"));
}

export function makeExceptionRecord(
  record: WorkflowRecord,
  from: "OCR Review" | "QC Review" | "Manual Review",
  reason: string,
  comments: string,
  assignedUser: string,
): WorkflowRecord {
  return {
    ...record,
    status: "Exception",
    owner: assignedUser,
    exceptionReason: reason,
    comments,
    assignedUser,
    resolutionStatus: "Open",
    returnedFrom: from,
  };
}
