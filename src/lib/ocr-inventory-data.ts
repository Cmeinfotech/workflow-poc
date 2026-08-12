import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileInput,
  FileText,
  PackageCheck,
  ScanText,
} from "lucide-react";

export type InventoryStatus =
  | "Received"
  | "Inventory"
  | "OCR Review"
  | "OCR Approved"
  | "QC Processing"
  | "QC Review"
  | "QC Approved"
  | "Manual Review"
  | "Export Ready"
  | "Export Completed"
  | "Exception";

export const workflowStages = [
  "Received Files",
  "Inventory",
  "OCR Review",
  "QC Review",
  "Manual Review",
  "Export",
  "Completed",
] as const;

export const inventoryRecords = [
  {
    id: "DS-INV-10042",
    fileName: "warehouse-cycle-count-0528.pdf",
    uploadDate: "28 May 2026, 09:14",
    uploadedBy: "R. Mehta",
    status: "Inventory" as InventoryStatus,
    owner: "OCR Operator",
    productName: "Industrial Barcode Scanner",
    sku: "DS-SCN-8842",
    quantity: 128,
    inventoryValue: "₹8,96,000",
    confidence: 96,
    exceptionReason: "",
  },
  {
    id: "DS-INV-10041",
    fileName: "receiving-dock-batch-17.png",
    uploadDate: "28 May 2026, 09:02",
    uploadedBy: "A. Rao",
    status: "OCR Review" as InventoryStatus,
    owner: "OCR Operator",
    productName: "Thermal Label Roll",
    sku: "DS-LBL-2201",
    quantity: 420,
    inventoryValue: "₹1,68,000",
    confidence: 88,
    exceptionReason: "",
  },
  {
    id: "DS-INV-10040",
    fileName: "bin-audit-zone-c.xlsx",
    uploadDate: "28 May 2026, 08:46",
    uploadedBy: "S. Nair",
    status: "QC Review" as InventoryStatus,
    owner: "QC User",
    productName: "RFID Inventory Tag",
    sku: "DS-RFID-7704",
    quantity: 1000,
    inventoryValue: "₹2,40,000",
    confidence: 94,
    exceptionReason: "",
  },
  {
    id: "DS-INV-10039",
    fileName: "export-ready-finished-goods.csv",
    uploadDate: "28 May 2026, 08:20",
    uploadedBy: "M. Khan",
    status: "Export Ready" as InventoryStatus,
    owner: "Export User",
    productName: "Rugged Tablet Mount",
    sku: "DS-MNT-4430",
    quantity: 64,
    inventoryValue: "₹3,52,000",
    confidence: 99,
    exceptionReason: "",
  },
  {
    id: "DS-INV-10038",
    fileName: "damaged-label-scan-11.jpg",
    uploadDate: "28 May 2026, 08:05",
    uploadedBy: "P. Iyer",
    status: "Exception" as InventoryStatus,
    owner: "Admin",
    productName: "Unreadable item label",
    sku: "Needs review",
    quantity: 0,
    inventoryValue: "Pending",
    confidence: 42,
    exceptionReason: "OCR confidence below threshold and SKU not readable",
  },
  {
    id: "DS-INV-10037",
    fileName: "night-shift-stock-ledger.pdf",
    uploadDate: "27 May 2026, 22:18",
    uploadedBy: "N. Shah",
    status: "Export Completed" as InventoryStatus,
    owner: "Export User",
    productName: "Handheld Terminal Battery",
    sku: "DS-BAT-1098",
    quantity: 240,
    inventoryValue: "₹4,80,000",
    confidence: 98,
    exceptionReason: "",
  },
];

export const dashboardMetrics = [
  { label: "Received Files", value: "186", status: "Received", to: "/inventory", icon: FileInput },
  { label: "OCR Processing", value: "42", status: "OCR Review", to: "/ocr-review-queue", icon: ScanText },
  { label: "Processing In Progress", value: "31", status: "QC Review", to: "/qc-review", icon: ClipboardCheck },
  { label: "Exceptions", value: "9", status: "Exception", to: "/exceptions", icon: AlertTriangle },
  { label: "Export Ready", value: "18", status: "Export Ready", to: "/export", icon: Download },
  { label: "Export Completed", value: "328", status: "Export Completed", to: "/export", icon: CheckCircle2 },
];

export const recentActivity = [
  { user: "R. Mehta", action: "uploaded warehouse-cycle-count-0528.pdf", time: "4 min ago", status: "Received" },
  { user: "OCR Operator", action: "approved OCR for DS-INV-10041", time: "11 min ago", status: "OCR Approved" },
  { user: "QC User", action: "returned DS-INV-10035 to OCR Review", time: "19 min ago", status: "OCR Review" },
  { user: "Export User", action: "completed export batch EXP-7742", time: "28 min ago", status: "Export Completed" },
];

export const auditTrail = [
  { file: "DS-INV-10042", user: "R. Mehta", previous: "Received", next: "Inventory", time: "28 May 2026, 09:15", comments: "File accepted into inventory queue" },
  { file: "DS-INV-10041", user: "OCR Operator", previous: "Inventory", next: "OCR Review", time: "28 May 2026, 09:08", comments: "OCR extraction loaded" },
  { file: "DS-INV-10040", user: "QC User", previous: "OCR Approved", next: "QC Review", time: "28 May 2026, 08:58", comments: "Ready for business validation" },
  { file: "DS-INV-10039", user: "QC User", previous: "QC Approved", next: "Export Ready", time: "28 May 2026, 08:33", comments: "QC approved all required fields" },
];

export const statusOverview = [
  { label: "Inventory", count: 186 },
  { label: "OCR", count: 42 },
  { label: "QC", count: 31 },
  { label: "Export", count: 18 },
  { label: "Exception", count: 9 },
];

export const processingVolume = [
  { day: "Mon", received: 140, completed: 118 },
  { day: "Tue", received: 168, completed: 149 },
  { day: "Wed", received: 186, completed: 171 },
  { day: "Thu", received: 152, completed: 144 },
  { day: "Fri", received: 204, completed: 188 },
];

export const exportHistory = [
  { batch: "EXP-7742", format: "CSV", records: 84, status: "Export Completed", time: "28 May 2026, 08:44" },
  { batch: "EXP-7741", format: "XLSX", records: 62, status: "Export Completed", time: "27 May 2026, 18:12" },
  { batch: "EXP-7740", format: "JSON", records: 41, status: "Export Ready", time: "27 May 2026, 16:05" },
];

export const roleCards = [
  { role: "OCR Operator", permissions: "Inventory queue, OCR review, approve or reject OCR" },
  { role: "QC User", permissions: "QC queue, validate inventory fields, return records" },
  { role: "Export User", permissions: "Export queue, generate files, complete exports" },
  { role: "Admin", permissions: "Full access, users, monitoring, exceptions and audit logs" },
];

export const workflowIconMap = {
  Received: FileInput,
  Inventory: PackageCheck,
  "OCR Review": ScanText,
  "QC Review": ClipboardCheck,
  "Manual Review": ClipboardCheck,
  "Export Ready": Download,
  "Export Completed": CheckCircle2,
  Exception: AlertTriangle,
};
