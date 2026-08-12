import { useEffect, useMemo, useState } from "react";
import { type ExtractedField } from "@/lib/bill-of-lading-samples";

export type ReviewStage = "ocr" | "qc" | "audit";

export type ReviewFieldPolicy = {
  key: string;
  label: string;
  group: string;
  aliases?: string[];
  showInOcr: boolean;
  showInQc: boolean;
  showInAudit: boolean;
  required: boolean;
  editableInOcr: boolean;
  editableInQc: boolean;
  autoSelected: boolean;
  escalateLowConfidence: boolean;
};

const storageKey = "dataspan-review-field-policies-v1";
const policyChangedEvent = "dataspan-review-field-policy-changed";

const coreDocumentKeys = new Set([
  "BOLNumber",
  "ShipmentDate",
  "PRONumber",
  "LoadNumber",
  "CustomerReferenceNumber",
  "PONumber",
  "OrderNumber",
  "FreightTerms",
]);

const fieldDefinitions: Array<Pick<ReviewFieldPolicy, "key" | "label" | "group" | "aliases">> = [
  { key: "BOLNumber", label: "BOL Number", group: "Document", aliases: ["Bill of Lading No.", "BOL"] },
  { key: "ShipmentDate", label: "Shipment Date", group: "Document", aliases: ["B/L Date", "Place / Date of Issue", "Invoice Date"] },
  { key: "PRONumber", label: "PRO Number", group: "Document", aliases: ["PRO/Manifest ID"] },
  { key: "LoadNumber", label: "Load Number", group: "Document" },
  { key: "CustomerReferenceNumber", label: "Customer Reference Number", group: "Document", aliases: ["Export Reference", "Quote #"] },
  { key: "PONumber", label: "PO Number", group: "Document", aliases: ["Purchase Order", "Customer PO"] },
  { key: "OrderNumber", label: "Order Number", group: "Document", aliases: ["Booking No."] },
  { key: "FreightTerms", label: "Freight Terms", group: "Document", aliases: ["Payment Terms", "Freight Charges Terms"] },
  { key: "ShipperName", label: "Shipper Name", group: "Shipper", aliases: ["Shipper", "Shipper First Name", "Shipper Last Name", "Origin / Shipper Name"] },
  { key: "ShipperAddress1", label: "Shipper Address 1", group: "Shipper", aliases: ["Shipper Address Line", "Origin / Shipper Address"] },
  { key: "ShipperAddress2", label: "Shipper Address 2", group: "Shipper" },
  { key: "ShipperCity", label: "Shipper City", group: "Shipper", aliases: ["Shipper City / State / Postal", "Origin / Shipper City"] },
  { key: "ShipperState", label: "Shipper State", group: "Shipper", aliases: ["Origin / Shipper State"] },
  { key: "ShipperPostalCode", label: "Shipper Postal Code", group: "Shipper", aliases: ["Origin / Shipper Zip Code"] },
  { key: "ShipperCountry", label: "Shipper Country", group: "Shipper" },
  { key: "ShipperContactName", label: "Shipper Contact Name", group: "Shipper", aliases: ["Origin / Shipper Contact"] },
  { key: "ShipperPhone", label: "Shipper Phone", group: "Shipper", aliases: ["Origin / Shipper Phone"] },
  { key: "ShipperEmail", label: "Shipper Email", group: "Shipper", aliases: ["Origin / Shipper Email(s)"] },
  { key: "ConsigneeName", label: "Consignee Name", group: "Consignee", aliases: ["Consignee", "Consignee First Name", "Consignee Last Name", "Destination / Consignee Name"] },
  { key: "ConsigneeAddress1", label: "Consignee Address 1", group: "Consignee", aliases: ["Consignee Address Line", "Destination / Consignee Address"] },
  { key: "ConsigneeAddress2", label: "Consignee Address 2", group: "Consignee" },
  { key: "ConsigneeCity", label: "Consignee City", group: "Consignee", aliases: ["Consignee City / State / Postal", "Destination / Consignee City"] },
  { key: "ConsigneeState", label: "Consignee State", group: "Consignee", aliases: ["Destination / Consignee State"] },
  { key: "ConsigneePostalCode", label: "Consignee Postal Code", group: "Consignee", aliases: ["Destination / Consignee Zip Code"] },
  { key: "ConsigneeCountry", label: "Consignee Country", group: "Consignee" },
  { key: "ConsigneeContactName", label: "Consignee Contact Name", group: "Consignee", aliases: ["Destination / Consignee Contact"] },
  { key: "ConsigneePhone", label: "Consignee Phone", group: "Consignee", aliases: ["Destination / Consignee Phone"] },
  { key: "ConsigneeEmail", label: "Consignee Email", group: "Consignee", aliases: ["Destination / Consignee Email(s)"] },
  { key: "BillToName", label: "Bill To Name", group: "Billing", aliases: ["Bill To", "Vendor Name"] },
  { key: "BillToAddress1", label: "Bill To Address 1", group: "Billing", aliases: ["Bill To Address"] },
  { key: "BillToAddress2", label: "Bill To Address 2", group: "Billing" },
  { key: "BillToCity", label: "Bill To City", group: "Billing" },
  { key: "BillToState", label: "Bill To State", group: "Billing" },
  { key: "BillToPostalCode", label: "Bill To Postal Code", group: "Billing", aliases: ["Bill To Zip Code"] },
  { key: "BillToCountry", label: "Bill To Country", group: "Billing" },
  { key: "BillToContactName", label: "Bill To Contact Name", group: "Billing" },
  { key: "BillToPhone", label: "Bill To Phone", group: "Billing" },
  { key: "BillToEmail", label: "Bill To Email", group: "Billing", aliases: ["Bill To Email(s)"] },
  { key: "CarrierName", label: "Carrier Name", group: "Carrier", aliases: ["Carrier", "Carrier / Forwarder"] },
  { key: "CarrierSCAC", label: "Carrier SCAC", group: "Carrier", aliases: ["SCAC", "SCAC Code"] },
  { key: "CarrierAccountNumber", label: "Carrier Account Number", group: "Carrier", aliases: ["Service Contract"] },
  { key: "DriverName", label: "Driver Name", group: "Carrier" },
  { key: "DriverPhone", label: "Driver Phone", group: "Carrier" },
  { key: "TruckNumber", label: "Truck Number", group: "Carrier" },
  { key: "TrailerNumber", label: "Trailer Number", group: "Carrier" },
  { key: "TotalPieces", label: "Total Pieces", group: "Totals", aliases: ["Packages", "Container / Package Count", "Container Count", "Quantity"] },
  { key: "TotalWeight", label: "Total Weight", group: "Totals", aliases: ["Gross Weight", "Weight"] },
  { key: "WeightUOM", label: "Weight UOM", group: "Totals" },
  { key: "TotalCube", label: "Total Cube", group: "Totals", aliases: ["Measurement"] },
  { key: "HazmatFlag", label: "Hazmat Flag", group: "Hazmat", aliases: ["HZ"] },
  { key: "DeclaredValue", label: "Declared Value", group: "Totals", aliases: ["Declared Value", "Amount Due", "Total Amount", "Grand Total", "Subtotal"] },
  { key: "Line1_Pieces", label: "Line 1 Pieces", group: "Line Items", aliases: ["QTY/PCS"] },
  { key: "Line1_PackageType", label: "Line 1 Package Type", group: "Line Items" },
  { key: "Line1_CommodityDescription", label: "Line 1 Commodity Description", group: "Line Items", aliases: ["Description", "Description of Goods", "Line Item"] },
  { key: "Line1_NMFCCode", label: "Line 1 NMFC Code", group: "Line Items", aliases: ["NMFC #", "NMFC#"] },
  { key: "Line1_FreightClass", label: "Line 1 Freight Class", group: "Line Items", aliases: ["Class"] },
  { key: "Line1_Weight", label: "Line 1 Weight", group: "Line Items" },
  { key: "Line1_Length", label: "Line 1 Length", group: "Line Items", aliases: ["Dimensions"] },
  { key: "Line1_Width", label: "Line 1 Width", group: "Line Items" },
  { key: "Line1_Height", label: "Line 1 Height", group: "Line Items" },
  { key: "Line2_Pieces", label: "Line 2 Pieces", group: "Line Items" },
  { key: "Line2_PackageType", label: "Line 2 Package Type", group: "Line Items" },
  { key: "Line2_CommodityDescription", label: "Line 2 Commodity Description", group: "Line Items" },
  { key: "Line2_NMFCCode", label: "Line 2 NMFC Code", group: "Line Items" },
  { key: "Line2_FreightClass", label: "Line 2 Freight Class", group: "Line Items" },
  { key: "Line2_Weight", label: "Line 2 Weight", group: "Line Items" },
  { key: "Line2_Length", label: "Line 2 Length", group: "Line Items" },
  { key: "Line2_Width", label: "Line 2 Width", group: "Line Items" },
  { key: "Line2_Height", label: "Line 2 Height", group: "Line Items" },
  { key: "Line3_Pieces", label: "Line 3 Pieces", group: "Line Items" },
  { key: "Line3_PackageType", label: "Line 3 Package Type", group: "Line Items" },
  { key: "UNNumber", label: "UN Number", group: "Hazmat" },
  { key: "HazardClass", label: "Hazard Class", group: "Hazmat" },
  { key: "PackingGroup", label: "Packing Group", group: "Hazmat" },
  { key: "EmergencyContact", label: "Emergency Contact", group: "Hazmat" },
  { key: "HazmatContactPhone", label: "Hazmat Contact Phone", group: "Hazmat" },
  { key: "ShipperSignature", label: "Shipper Signature", group: "Signatures", aliases: ["Authorized Signatory"] },
  { key: "DriverSignature", label: "Driver Signature", group: "Signatures", aliases: ["Signed for Carrier"] },
  { key: "SignatureDate", label: "Signature Date", group: "Signatures" },
  { key: "ReceivedDate", label: "Received Date", group: "Signatures", aliases: ["Laden on Board Date"] },
  { key: "QCDecisionField", label: "QC Decision Field", group: "QC", aliases: ["QC Decision Field"] },
];

export const defaultReviewFieldPolicies: ReviewFieldPolicy[] = fieldDefinitions.map((field) => {
  const autoSelected = coreDocumentKeys.has(field.key);
  const qcVisibleGroups = new Set(["Document", "Shipper", "Consignee", "Carrier", "Totals", "Hazmat", "Line Items", "Signatures", "QC"]);

  return {
    ...field,
    showInOcr: true,
    showInQc: autoSelected || qcVisibleGroups.has(field.group),
    showInAudit: autoSelected || qcVisibleGroups.has(field.group),
    required: autoSelected || ["BOLNumber", "CarrierName", "TotalPieces", "TotalWeight"].includes(field.key),
    editableInOcr: !autoSelected,
    editableInQc: !autoSelected && field.key !== "QCDecisionField",
    autoSelected,
    escalateLowConfidence: autoSelected || ["HazmatFlag", "DeclaredValue", "TotalWeight"].includes(field.key),
  };
});

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const defaultPolicyByKey = new Map(defaultReviewFieldPolicies.map((policy) => [policy.key, policy]));

function buildLookup(policies: ReviewFieldPolicy[]) {
  const lookup = new Map<string, ReviewFieldPolicy>();
  policies.forEach((policy) => {
    [policy.key, policy.label, ...(policy.aliases ?? [])].forEach((name) => {
      lookup.set(normalizeName(name), policy);
    });
  });
  return lookup;
}

function mergePolicies(savedPolicies: ReviewFieldPolicy[]) {
  const savedByKey = new Map(savedPolicies.map((policy) => [policy.key, policy]));

  return defaultReviewFieldPolicies.map((policy) => ({
    ...policy,
    ...savedByKey.get(policy.key),
    key: policy.key,
    label: policy.label,
    group: policy.group,
    aliases: policy.aliases,
  }));
}

export function readReviewFieldPolicies() {
  if (typeof window === "undefined") return defaultReviewFieldPolicies;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultReviewFieldPolicies;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultReviewFieldPolicies;
    return mergePolicies(parsed);
  } catch {
    return defaultReviewFieldPolicies;
  }
}

export function saveReviewFieldPolicies(policies: ReviewFieldPolicy[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(policies));
  window.dispatchEvent(new Event(policyChangedEvent));
}

export function useReviewFieldPolicies() {
  const [policies, setPolicies] = useState(readReviewFieldPolicies);

  useEffect(() => {
    const refresh = () => setPolicies(readReviewFieldPolicies());
    window.addEventListener("storage", refresh);
    window.addEventListener(policyChangedEvent, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(policyChangedEvent, refresh);
    };
  }, []);

  const policyLookup = useMemo(() => buildLookup(policies), [policies]);

  return { policies, policyLookup, setPolicies };
}

export function resolveReviewFieldPolicy(
  label: string,
  policies: ReviewFieldPolicy[] = defaultReviewFieldPolicies,
) {
  const lookup = buildLookup(policies);
  return lookup.get(normalizeName(label));
}

function canShowPolicy(policy: ReviewFieldPolicy | undefined, stage: ReviewStage) {
  if (!policy) return true;
  if (policy.autoSelected) return true;
  if (stage === "ocr") return policy.showInOcr;
  if (stage === "qc") return policy.showInQc;
  return policy.showInAudit;
}

export function applyReviewFieldPolicy(
  fields: ExtractedField[],
  stage: ReviewStage,
  policies: ReviewFieldPolicy[],
) {
  const lookup = buildLookup(policies);
  return fields.filter((field) => canShowPolicy(lookup.get(normalizeName(field.label)), stage));
}

export function isReviewFieldEditable(
  label: string,
  stage: ReviewStage,
  policies: ReviewFieldPolicy[],
) {
  const policy = resolveReviewFieldPolicy(label, policies);
  if (!policy) return true;
  if (policy.autoSelected) return false;
  if (stage === "audit") return false;
  return stage === "ocr" ? policy.editableInOcr : policy.editableInQc;
}

export function updateReviewFieldPolicy(
  policies: ReviewFieldPolicy[],
  key: string,
  patch: Partial<ReviewFieldPolicy>,
) {
  return policies.map((policy) => {
    if (policy.key !== key) return policy;
    const defaultPolicy = defaultPolicyByKey.get(key);
    const autoSelected = defaultPolicy?.autoSelected ?? policy.autoSelected;
    return {
      ...policy,
      ...patch,
      autoSelected,
      showInOcr: autoSelected ? true : patch.showInOcr ?? policy.showInOcr,
      showInQc: autoSelected ? true : patch.showInQc ?? policy.showInQc,
      showInAudit: autoSelected ? true : patch.showInAudit ?? policy.showInAudit,
      required: autoSelected ? true : patch.required ?? policy.required,
      editableInOcr: autoSelected ? false : patch.editableInOcr ?? policy.editableInOcr,
      editableInQc: autoSelected ? false : patch.editableInQc ?? policy.editableInQc,
    };
  });
}
