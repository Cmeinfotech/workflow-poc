import {
  Archive,
  Boxes,
  CheckSquare,
  ClipboardCheck,
  FileInput,
  FileSearch,
  FileStack,
  GitBranch,
  LayoutTemplate,
  ScanText,
  ShieldCheck,
} from "lucide-react";

export type FunctionModuleSlug =
  | "document-intake"
  | "document-classification-filtering"
  | "template-management"
  | "ocr-extraction-data-structuring"
  | "validation-human-review"
  | "workflow-routing-approval"
  | "integration-reporting-audit";

export interface FunctionMetric {
  label: string;
  value: string;
  delta: string;
  status: "Operational" | "Processing" | "Pending" | "High" | "Critical";
}

export interface FunctionQueueItem {
  id: string;
  name: string;
  owner: string;
  status: string;
  priority: string;
  updated: string;
}

export interface FunctionModule {
  slug: FunctionModuleSlug;
  title: string;
  shortTitle: string;
  description: string;
  route: `/functions/${FunctionModuleSlug}`;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  metrics: FunctionMetric[];
  workflow: string[];
  operations: string[];
  queue: FunctionQueueItem[];
  controls: string[];
  rules: string[];
}

export const functionModules: FunctionModule[] = [
  {
    slug: "document-intake",
    title: "Document Intake",
    shortTitle: "Intake",
    description: "Capture documents from email, API, S3, portal uploads and scheduled imports with duplicate checks.",
    route: "/functions/document-intake",
    icon: FileInput,
    accent: "from-sky-500 to-emerald-500",
    metrics: [
      { label: "Sources Live", value: "12", delta: "4 inboxes, 3 APIs", status: "Operational" },
      { label: "Files Today", value: "1,284", delta: "+18% vs yesterday", status: "Processing" },
      { label: "Duplicates Blocked", value: "37", delta: "2.8% of intake", status: "High" },
    ],
    workflow: ["Receive", "Virus Scan", "De-duplicate", "Normalize", "Queue"],
    operations: ["Connect source", "Run intake test", "Retry failed imports", "Quarantine suspicious files"],
    queue: [
      { id: "IN-8821", name: "ap@acmecorp.com batch", owner: "Email connector", status: "Processing", priority: "High", updated: "2 min ago" },
      { id: "IN-8820", name: "SAP vendor portal upload", owner: "Portal", status: "Pending", priority: "Medium", updated: "8 min ago" },
      { id: "IN-8819", name: "S3 /invoices/may-27", owner: "AWS S3", status: "Completed", priority: "Low", updated: "14 min ago" },
    ],
    controls: ["Accepted file types", "Duplicate hash policy", "Source-level SLA", "Quarantine routing"],
    rules: ["Reject files above 50MB", "Block duplicate invoice + vendor pairs", "Auto-tag by source mailbox"],
  },
  {
    slug: "document-classification-filtering",
    title: "Document Classification & Filtering",
    shortTitle: "Classification",
    description: "Classify uploaded files by business type, confidence, vendor and exception risk before extraction.",
    route: "/functions/document-classification-filtering",
    icon: FileSearch,
    accent: "from-violet-500 to-cyan-500",
    metrics: [
      { label: "Classified Today", value: "1,176", delta: "92% auto-routed", status: "Operational" },
      { label: "Low Confidence", value: "64", delta: "Needs sampling", status: "Pending" },
      { label: "Filtered Out", value: "119", delta: "Spam, duplicate, unsupported", status: "High" },
    ],
    workflow: ["Read Metadata", "Classify Type", "Score Confidence", "Apply Filters", "Route"],
    operations: ["Tune classifier", "Review low-confidence samples", "Create filter rule", "Export classification log"],
    queue: [
      { id: "CL-4408", name: "Unknown B/L carrier format", owner: "OCR classifier", status: "Pending Review", priority: "High", updated: "4 min ago" },
      { id: "CL-4407", name: "Ocean B/L vs house B/L split", owner: "Rules engine", status: "Escalated", priority: "Critical", updated: "17 min ago" },
      { id: "CL-4406", name: "Invoice batch from customer portal", owner: "Portal uploads", status: "Processing", priority: "Medium", updated: "31 min ago" },
    ],
    controls: ["Document type taxonomy", "Confidence threshold", "Vendor allow/block list", "Exception sampling rate"],
    rules: ["Route ocean B/L to OCR review", "Hold confidence under 75%", "Filter unsupported document categories"],
  },
  {
    slug: "template-management",
    title: "Template Management",
    shortTitle: "Templates",
    description: "Maintain extraction templates, vendor layouts, field maps, versions and approval gates.",
    route: "/functions/template-management",
    icon: LayoutTemplate,
    accent: "from-amber-500 to-rose-500",
    metrics: [
      { label: "Active Templates", value: "248", delta: "32 vendor-specific", status: "Operational" },
      { label: "Draft Changes", value: "11", delta: "Awaiting publish", status: "Pending" },
      { label: "Field Coverage", value: "97.4%", delta: "+1.1% this month", status: "Operational" },
    ],
    workflow: ["Detect Layout", "Map Fields", "Validate Samples", "Approve Version", "Publish"],
    operations: ["Create template", "Compare versions", "Run sample pack", "Rollback template"],
    queue: [
      { id: "TP-2104", name: "Reliance Logistics invoice v3", owner: "Template team", status: "Pending", priority: "High", updated: "9 min ago" },
      { id: "TP-2103", name: "DHL ocean B/L field map", owner: "OCR Ops", status: "Processing", priority: "Medium", updated: "22 min ago" },
      { id: "TP-2102", name: "TCS service invoice v2", owner: "Finance Ops", status: "Completed", priority: "Low", updated: "1 hr ago" },
    ],
    controls: ["Field dictionary", "Template versioning", "Sample validation pack", "Approval policy"],
    rules: ["Require 20 passing samples before publish", "Lock GSTIN and amount fields", "Notify owners on layout drift"],
  },
  {
    slug: "ocr-extraction-data-structuring",
    title: "OCR Extraction & Data Structuring",
    shortTitle: "OCR & Structuring",
    description: "Extract text, tables and line items, then structure values into validated business objects.",
    route: "/functions/ocr-extraction-data-structuring",
    icon: ScanText,
    accent: "from-blue-500 to-teal-500",
    metrics: [
      { label: "Extraction Accuracy", value: "98.6%", delta: "+0.8% vs last week", status: "Operational" },
      { label: "Line Items Parsed", value: "42,910", delta: "7-day total", status: "Processing" },
      { label: "Schema Errors", value: "38", delta: "-14% today", status: "High" },
    ],
    workflow: ["OCR", "Table Parse", "Field Normalize", "Schema Build", "Confidence Score"],
    operations: ["Reprocess selected", "Edit schema", "Review confidence bands", "Export JSON payload"],
    queue: [
      { id: "EX-6651", name: "INV-2025-0921.pdf", owner: "OCR Engine v4.2", status: "Processing", priority: "High", updated: "1 min ago" },
      { id: "EX-6650", name: "OBL-MSC-77621.pdf", owner: "Structure parser", status: "Completed", priority: "Medium", updated: "10 min ago" },
      { id: "EX-6649", name: "HBL-MAA-1129.png", owner: "Image OCR", status: "Escalated", priority: "Low", updated: "34 min ago" },
    ],
    controls: ["OCR model version", "Line-item schema", "Currency normalization", "Confidence weighting"],
    rules: ["Flag totals mismatch", "Normalize GST and PAN formats", "Send unreadable line items to review"],
  },
  {
    slug: "validation-human-review",
    title: "Validation & Human Review",
    shortTitle: "Validation",
    description: "Validate extracted data against business rules and assign exceptions to reviewers.",
    route: "/functions/validation-human-review",
    icon: ClipboardCheck,
    accent: "from-emerald-500 to-lime-500",
    metrics: [
      { label: "Auto-pass Rate", value: "84.2%", delta: "+3.4% this week", status: "Operational" },
      { label: "Reviewer Queue", value: "96", delta: "32 high priority", status: "Pending" },
      { label: "Avg Review Time", value: "4m 12s", delta: "-38s today", status: "Processing" },
    ],
    workflow: ["Rule Check", "Master Match", "Exception Score", "Assign Reviewer", "Resolve"],
    operations: ["Assign batch", "Approve clean items", "Escalate exceptions", "Add review note"],
    queue: [
      { id: "RV-5207", name: "GSTIN confidence under threshold", owner: "P. Iyer", status: "Pending Review", priority: "High", updated: "5 min ago" },
      { id: "RV-5206", name: "Consignee mismatch on B/L", owner: "R. Khan", status: "Escalated", priority: "Critical", updated: "18 min ago" },
      { id: "RV-5205", name: "B/L number missing", owner: "A. Sharma", status: "Processing", priority: "Medium", updated: "42 min ago" },
    ],
    controls: ["Reviewer assignment", "Exception taxonomy", "Auto-approval threshold", "Sampling controls"],
    rules: ["Auto-pass confidence above 95%", "Escalate vendor mismatch", "Require comment for rejected fields"],
  },
  {
    slug: "workflow-routing-approval",
    title: "Workflow Routing & Approval",
    shortTitle: "Routing",
    description: "Route work by amount, confidence, role, SLA and policy, then capture approval decisions.",
    route: "/functions/workflow-routing-approval",
    icon: GitBranch,
    accent: "from-fuchsia-500 to-orange-500",
    metrics: [
      { label: "Routes Active", value: "42", delta: "6 approval chains", status: "Operational" },
      { label: "Awaiting Approval", value: "64", delta: "8 critical", status: "Pending" },
      { label: "SLA Risk", value: "14", delta: "Needs action", status: "Critical" },
    ],
    workflow: ["Evaluate Policy", "Assign Owner", "Notify", "Approve/Reject", "Next Stage"],
    operations: ["Create route", "Reassign approver", "Send reminder", "Override policy"],
    queue: [
      { id: "AP-3312", name: "₹89.2L ocean freight B/L", owner: "V. Patel", status: "Pending Review", priority: "Critical", updated: "3 min ago" },
      { id: "AP-3311", name: "₹4.82L Reliance invoice", owner: "A. Sharma", status: "Pending", priority: "High", updated: "12 min ago" },
      { id: "AP-3310", name: "Duplicate invoice rejection", owner: "Finance Admin", status: "Completed", priority: "Medium", updated: "51 min ago" },
    ],
    controls: ["Approval matrix", "Delegation rules", "SLA timers", "Override permissions"],
    rules: ["Amount above ₹50,000 needs manager", "Critical items notify every 30 min", "Route rejected items to audit"],
  },
  {
    slug: "integration-reporting-audit",
    title: "Integration, Reporting & Audit",
    shortTitle: "Integrations",
    description: "Sync approved records to ERP, expose reports, and preserve a complete audit trail.",
    route: "/functions/integration-reporting-audit",
    icon: Archive,
    accent: "from-indigo-500 to-slate-500",
    metrics: [
      { label: "ERP Sync Health", value: "98.4%", delta: "SAP degraded", status: "High" },
      { label: "Reports Ready", value: "18", delta: "4 scheduled today", status: "Operational" },
      { label: "Audit Events", value: "12,480", delta: "7-day trail", status: "Processing" },
    ],
    workflow: ["Map Payload", "Sync ERP", "Confirm Delivery", "Report", "Audit Lock"],
    operations: ["Retry sync", "Generate report", "Export audit pack", "Map integration field"],
    queue: [
      { id: "IA-9944", name: "SAP S/4HANA invoice sync", owner: "ERP service", status: "Failed", priority: "High", updated: "6 min ago" },
      { id: "IA-9943", name: "Monthly compliance report", owner: "Reports engine", status: "Completed", priority: "Medium", updated: "24 min ago" },
      { id: "IA-9942", name: "Audit package Q3 FY25", owner: "Compliance", status: "Processing", priority: "Low", updated: "1 hr ago" },
    ],
    controls: ["ERP connection map", "Report schedules", "Audit retention", "Webhook retry policy"],
    rules: ["Retry failed ERP sync 3 times", "Write immutable audit event per action", "Notify compliance on export"],
  },
];

export const functionModuleMap = Object.fromEntries(
  functionModules.map((module) => [module.slug, module]),
) as Record<FunctionModuleSlug, FunctionModule>;

export const functionHubStats = [
  { icon: Boxes, label: "Functions Online", value: "7", detail: "All core modules mapped" },
  { icon: CheckSquare, label: "Operational Rules", value: "68", detail: "Across intake, validation, routing" },
  { icon: FileStack, label: "Documents in Flow", value: "1,247", detail: "Live queue volume" },
  { icon: ShieldCheck, label: "Controls Active", value: "31", detail: "Policy and audit safeguards" },
];


