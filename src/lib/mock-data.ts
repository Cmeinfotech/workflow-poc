// Realistic enterprise sample data used across the app.

export const kpis = [
  { label: "Total Documents", value: "184,392", delta: "+12.4%", trend: "up", icon: "FileText" },
  { label: "Pending Reviews", value: "1,247", delta: "-3.2%", trend: "down", icon: "Inbox" },
  { label: "OCR Accuracy", value: "98.6%", delta: "+0.8%", trend: "up", icon: "ScanText" },
  { label: "Active Users", value: "3,418", delta: "+128", trend: "up", icon: "Users" },
  { label: "Failed Workflows", value: "42", delta: "-18%", trend: "down", icon: "AlertTriangle" },
  { label: "Avg. Processing Time", value: "2.4s", delta: "-0.6s", trend: "down", icon: "Timer" },
  { label: "Revenue Processed", value: "₹48.2 Cr", delta: "+9.1%", trend: "up", icon: "IndianRupee" },
  { label: "SLA Performance", value: "96.2%", delta: "+1.4%", trend: "up", icon: "Gauge" },
] as const;

export const workflowTrend = [
  { day: "Mon", processed: 4200, approved: 3800, failed: 120 },
  { day: "Tue", processed: 5100, approved: 4700, failed: 90 },
  { day: "Wed", processed: 4800, approved: 4400, failed: 140 },
  { day: "Thu", processed: 6200, approved: 5800, failed: 110 },
  { day: "Fri", processed: 7100, approved: 6600, failed: 180 },
  { day: "Sat", processed: 3200, approved: 3000, failed: 60 },
  { day: "Sun", processed: 2800, approved: 2700, failed: 40 },
];

export const accuracyTrend = [
  { month: "Jan", accuracy: 94.2 },
  { month: "Feb", accuracy: 95.1 },
  { month: "Mar", accuracy: 95.8 },
  { month: "Apr", accuracy: 96.4 },
  { month: "May", accuracy: 97.1 },
  { month: "Jun", accuracy: 97.8 },
  { month: "Jul", accuracy: 98.2 },
  { month: "Aug", accuracy: 98.6 },
];

export const documentTypes = [
  { name: "BOL", value: 4820 },
  { name: "HBL", value: 2640 },
  { name: "Invoices", value: 1980 },
];

export const reviewerProductivity = [
  { name: "A. Sharma", reviewed: 312, approved: 290 },
  { name: "P. Iyer", reviewed: 284, approved: 265 },
  { name: "R. Khan", reviewed: 256, approved: 238 },
  { name: "M. Verma", reviewed: 240, approved: 221 },
  { name: "S. Nair", reviewed: 218, approved: 205 },
  { name: "V. Patel", reviewed: 198, approved: 184 },
];

export type WorkflowStatus =
  | "Processing"
  | "Pending Review"
  | "Approved"
  | "Rejected"
  | "Escalated"
  | "Failed"
  | "Synced";

export type Priority = "Critical" | "High" | "Medium" | "Low";

export interface WorkflowItem {
  id: string;
  document: string;
  vendor: string;
  amount: string;
  type: string;
  stage: string;
  assignee: string;
  priority: Priority;
  confidence: number;
  status: WorkflowStatus;
  sla: string;
  updated: string;
}

export const workflowQueue: WorkflowItem[] = [
  { id: "WF-10421", document: "OID000011-Ocean-Bill-Of-Lading.png", vendor: "Blue Harbor Exporters Ltd.", amount: "$4,860.00", type: "BOL", stage: "Manual Review", assignee: "A. Sharma", priority: "High", confidence: 94, status: "Pending Review", sla: "2h 14m", updated: "5 min ago" },
  { id: "WF-10420", document: "worst-case-ocean-bill-of-lading.png", vendor: "Atlantic Retail Imports LLC", amount: "Pending Review", type: "BOL", stage: "OCR Exception", assignee: "OCR Engine", priority: "Critical", confidence: 43, status: "Escalated", sla: "Breached", updated: "12 min ago" },
  { id: "WF-10419", document: "house-bill-of-lading-content-3.png", vendor: "Global Textile Mills", amount: "$2,940.00", type: "HBL", stage: "Manual Review", assignee: "P. Iyer", priority: "Medium", confidence: 91, status: "Pending Review", sla: "5h 02m", updated: "21 min ago" },
  { id: "WF-10418", document: "worst-case-house-bill-of-lading.png", vendor: "Northstar Apparel Group", amount: "Pending Review", type: "HBL", stage: "OCR Exception", assignee: "OCR Engine", priority: "Critical", confidence: 47, status: "Escalated", sla: "Breached", updated: "33 min ago" },
  { id: "WF-10417", document: "INV-MARUTI-8821.pdf", vendor: "Maruti Suzuki India", amount: "₹6,71,000", type: "Invoice", stage: "Completed", assignee: "M. Verma", priority: "Low", confidence: 97, status: "Approved", sla: "Completed", updated: "1 hr ago" },
  { id: "WF-10416", document: "INV-HDFC-7711.pdf", vendor: "HDFC Bank", amount: "₹1,28,900", type: "Invoice", stage: "OCR Extraction", assignee: "OCR Engine", priority: "Medium", confidence: 88, status: "Processing", sla: "On Track", updated: "2 hr ago" },
  { id: "WF-10415", document: "bill-of-lading.pdf", vendor: "Continental Export House", amount: "$3,520.00", type: "BOL", stage: "QC Review", assignee: "QC User", priority: "Medium", confidence: 89, status: "Processing", sla: "On Track", updated: "2 hr ago" },
  { id: "WF-10414", document: "INV-FLIP-2231.pdf", vendor: "Flipkart Wholesale", amount: "₹54,300", type: "Invoice", stage: "Rejected", assignee: "S. Nair", priority: "High", confidence: 52, status: "Rejected", sla: "Closed", updated: "3 hr ago" },
];

export const workflowStages = [
  { name: "Upload", icon: "Upload", count: 248 },
  { name: "OCR Extraction", icon: "ScanText", count: 184 },
  { name: "AI Validation", icon: "Sparkles", count: 132 },
  { name: "Manual Review", icon: "Eye", count: 96 },
  { name: "Manager Approval", icon: "ShieldCheck", count: 64 },
  { name: "ERP Sync", icon: "Database", count: 38 },
  { name: "Completed", icon: "CheckCircle2", count: 14820 },
];

export const ocrFields = [
  { label: "Vendor Name", value: "Reliance Logistics Pvt Ltd", confidence: 99 },
  { label: "Invoice Number", value: "INV-2025-0921", confidence: 98 },
  { label: "Invoice Date", value: "12 Nov 2025", confidence: 97 },
  { label: "Due Date", value: "26 Nov 2025", confidence: 95 },
  { label: "Bill of Lading No.", value: "OBL-77244", confidence: 92 },
  { label: "Subtotal", value: "₹ 4,08,898.00", confidence: 99 },
  { label: "GST (18%)", value: "₹ 73,602.00", confidence: 96 },
  { label: "Total Amount", value: "₹ 4,82,500.00", confidence: 99 },
  { label: "GSTIN", value: "27AABCR1234M1Z5", confidence: 88 },
  { label: "Payment Terms", value: "Net 14 days", confidence: 76 },
];

export const documentTimeline = [
  { stage: "Document Uploaded", user: "P. Iyer", time: "12 Nov, 09:14 AM", status: "done" },
  { stage: "OCR Extraction Completed", user: "OCR Engine v4.2", time: "12 Nov, 09:14 AM", status: "done" },
  { stage: "AI Validation Passed (96%)", user: "AI Engine", time: "12 Nov, 09:15 AM", status: "done" },
  { stage: "Assigned to Manual Review", user: "Auto-router", time: "12 Nov, 09:16 AM", status: "done" },
  { stage: "Pending Manager Approval", user: "A. Sharma", time: "12 Nov, 11:42 AM", status: "active" },
  { stage: "ERP Sync (SAP)", user: "—", time: "Pending", status: "todo" },
  { stage: "Workflow Completed", user: "—", time: "Pending", status: "todo" },
];

export const integrations = [
  { name: "SAP S/4HANA", category: "ERP", status: "Connected", health: 99.8, lastSync: "2 min ago", icon: "Database" },
  { name: "Microsoft Dynamics NAV", category: "ERP", status: "Connected", health: 98.2, lastSync: "5 min ago", icon: "Database" },
  { name: "Tally Prime", category: "Accounting", status: "Connected", health: 97.4, lastSync: "8 min ago", icon: "Calculator" },
  { name: "Shopify", category: "Commerce", status: "Connected", health: 99.5, lastSync: "1 min ago", icon: "ShoppingBag" },
  { name: "Amazon Seller Central", category: "Commerce", status: "Degraded", health: 84.1, lastSync: "12 min ago", icon: "Package" },
  { name: "Gmail API", category: "Communication", status: "Connected", health: 99.9, lastSync: "30 sec ago", icon: "Mail" },
  { name: "WhatsApp Business", category: "Communication", status: "Connected", health: 98.7, lastSync: "2 min ago", icon: "MessageCircle" },
  { name: "Slack", category: "Communication", status: "Connected", health: 99.6, lastSync: "1 min ago", icon: "Hash" },
  { name: "AWS S3", category: "Storage", status: "Connected", health: 100, lastSync: "Live", icon: "Cloud" },
  { name: "Azure Blob", category: "Storage", status: "Connected", health: 99.4, lastSync: "Live", icon: "Cloud" },
  { name: "REST Webhooks", category: "API", status: "Connected", health: 96.8, lastSync: "Live", icon: "Webhook" },
  { name: "Stripe", category: "Payments", status: "Disconnected", health: 0, lastSync: "—", icon: "CreditCard" },
];

export const notifications = [
  { title: "3 invoices breached SLA", body: "Vendors: Amazon, Flipkart, DHL", time: "2 min ago", type: "warning" },
  { title: "ERP Sync failed for WF-10411", body: "SAP returned timeout. Retry queued.", time: "12 min ago", type: "error" },
  { title: "OCR engine upgraded to v4.2", body: "Avg. accuracy improved by 1.2%", time: "1 hr ago", type: "info" },
  { title: "New approval request", body: "₹89.2L PO from L&T awaiting your approval", time: "2 hr ago", type: "info" },
  { title: "Monthly compliance report ready", body: "Audit Q3 FY25 generated", time: "5 hr ago", type: "success" },
];

export const auditLogs = [
  { time: "12 Nov 11:42:18", actor: "A. Sharma", action: "Approved", target: "WF-10417", ip: "10.20.4.18" },
  { time: "12 Nov 11:38:02", actor: "P. Iyer", action: "Edited OCR field", target: "WF-10419 / GSTIN", ip: "10.20.4.32" },
  { time: "12 Nov 11:30:45", actor: "System", action: "ERP Sync Failed", target: "WF-10411", ip: "—" },
  { time: "12 Nov 11:24:11", actor: "R. Khan", action: "Escalated", target: "WF-10416", ip: "10.20.4.11" },
  { time: "12 Nov 11:18:55", actor: "Admin", action: "Updated Role", target: "Reviewer → +Approve", ip: "10.20.4.2" },
  { time: "12 Nov 11:12:30", actor: "S. Nair", action: "Rejected", target: "WF-10414", ip: "10.20.4.21" },
  { time: "12 Nov 11:04:09", actor: "AI Engine", action: "Auto-approved", target: "WF-10412", ip: "—" },
  { time: "12 Nov 10:58:44", actor: "V. Patel", action: "Added comment", target: "WF-10413", ip: "10.20.4.27" },
];

export const roles = [
  { name: "Super Admin", users: 3, color: "destructive" },
  { name: "Admin", users: 12, color: "primary" },
  { name: "Manager", users: 48, color: "info" },
  { name: "Team Lead", users: 96, color: "info" },
  { name: "Reviewer", users: 312, color: "warning" },
  { name: "Employee", users: 2840, color: "muted" },
  { name: "Vendor", users: 184, color: "muted" },
  { name: "Client", users: 76, color: "muted" },
  { name: "Auditor", users: 8, color: "success" },
];

export const permissionModules = [
  "Dashboard",
  "Workflow Queue",
  "OCR Processing",
  "AI Validation",
  "Manual Review",
  "Approval Management",
  "Users & Teams",
  "Reports",
  "Audit Logs",
  "Integrations",
  "Settings",
];

export const permissionActions = ["View", "Create", "Edit", "Delete", "Approve", "Export", "Assign", "Escalate"] as const;

export const systemHealth = [
  { name: "API Gateway", uptime: "99.99%", latency: "82ms", status: "Operational" },
  { name: "OCR Engine", uptime: "99.92%", latency: "1.4s", status: "Operational" },
  { name: "AI Validation", uptime: "99.87%", latency: "640ms", status: "Operational" },
  { name: "ERP Sync Service", uptime: "98.41%", latency: "2.2s", status: "Degraded" },
  { name: "Notification Service", uptime: "99.96%", latency: "120ms", status: "Operational" },
  { name: "Queue Processor", uptime: "99.81%", latency: "—", status: "Operational" },
];
