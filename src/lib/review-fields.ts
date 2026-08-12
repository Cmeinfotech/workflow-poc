import { type ExtractedField } from "@/lib/bill-of-lading-samples";
import { normalizeDocumentType, type WorkflowRecord } from "@/lib/workflow-state";

export function getReviewFields(record: WorkflowRecord): ExtractedField[] {
  const baseConfidence = record.confidence;

  if (record.ocrFields?.length) {
    return [
      ...addStructuredAddressFields(record.ocrFields),
      {
        label: "QC Decision Field",
        value:
          "Validate B/L number, parties, vessel, container, seal, ports, freight terms, and weights",
        confidence: 98,
      },
    ];
  }

  return addStructuredAddressFields([
    {
      label: "Bill of Lading No.",
      value: `${normalizeDocumentType(record.documentType) === "HBL" ? "HBL" : "BOL"}-${record.id.slice(-5)}`,
      confidence: Math.min(99, baseConfidence + 5),
    },
    {
      label: "Carrier / Forwarder",
      value: "Chiaro Freight Services",
      confidence: Math.min(99, baseConfidence + 2),
    },
    {
      label: "Line Item",
      value: record.productName,
      confidence: Math.min(99, baseConfidence + 1),
    },
    {
      label: "SKU",
      value: record.sku,
      confidence: Math.max(70, baseConfidence - 2),
    },
    {
      label: "Quantity",
      value: String(record.quantity),
      confidence: Math.max(70, baseConfidence - 3),
    },
    {
      label: "Amount Due",
      value: record.inventoryValue,
      confidence: Math.max(70, baseConfidence - 2),
    },
  ]);
}

const addressPartyLabels = new Set(["Shipper", "Consignee", "Notify Party"]);

export function addStructuredAddressFields(fields: ExtractedField[]): ExtractedField[] {
  return fields.flatMap((field) => {
    if (!addressPartyLabels.has(field.label) || field.value.toUpperCase().includes("SAME AS")) {
      return [field];
    }

    return [field, ...buildAddressDetailFields(field)];
  });
}

function buildAddressDetailFields(field: ExtractedField): ExtractedField[] {
  const parts = field.value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const fullName = parts[0] ?? field.value;
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? fullName;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const addressParts = parts.slice(1);
  const country = addressParts.length > 0 ? addressParts[addressParts.length - 1] : "";
  const cityStatePostal = addressParts.length > 1 ? addressParts[addressParts.length - 2] : "";
  const addressLine = addressParts.slice(0, -2).join(", ") || addressParts[0] || "";

  return [
    { label: `${field.label} First Name`, value: firstName, confidence: field.confidence },
    { label: `${field.label} Last Name`, value: lastName || "Not available", confidence: field.confidence },
    { label: `${field.label} Address Line`, value: addressLine || "Not available", confidence: field.confidence },
    { label: `${field.label} City / State / Postal`, value: cityStatePostal || "Not available", confidence: field.confidence },
    { label: `${field.label} Country`, value: country || "Not available", confidence: field.confidence },
  ];
}

const reviewFieldGroups = [
  {
    title: "Document",
    match: [
      "Bill of Lading",
      "Document Type",
      "Carrier",
      "SCAC",
      "Booking",
      "Export Reference",
      "Service Contract",
      "B/L Date",
      "OTI",
    ],
  },
  {
    title: "Parties",
    match: [
      "Shipper",
      "Consignee",
      "Notify Party",
      "Forwarding Agent",
      "Signed for Carrier",
      "Authorized Signatory",
      "First Name",
      "Last Name",
      "Address Line",
      "City",
      "Country",
    ],
  },
  {
    title: "Routing",
    match: [
      "Vessel",
      "Port",
      "Place of",
      "Loading Pier",
      "Pre-Carriage",
      "Onward Inland",
      "Type of Move",
      "Point of Origin",
      "Laden on Board",
    ],
  },
  {
    title: "Cargo",
    match: [
      "Container",
      "Seal",
      "Packages",
      "Description of Goods",
      "Marks and Numbers",
      "Gross Weight",
      "Measurement",
    ],
  },
  {
    title: "Freight",
    match: ["Freight", "Declared Value", "Grand Total", "Domestic Routing", "Document Status"],
  },
] as const;

const trainityReviewFieldGroups = [
  {
    title: "Header info",
    labels: ["Date", "BOL", "SCAC Code", "Customer PO", "PRO/Manifest ID", "Quote #"],
  },
  {
    title: "Carrier",
    prefixes: ["Carrier "],
  },
  {
    title: "ORIGIN / SHIPPER",
    prefixes: ["Origin / Shipper "],
  },
  {
    title: "DESTINATION / CONSIGNEE",
    prefixes: ["Destination / Consignee "],
  },
  {
    title: "FREIGHT CHARGES TO / Bill To",
    labels: ["Freight Charges Terms"],
    prefixes: ["Bill To "],
  },
  {
    title: "Items / Table",
    labels: ["QTY/PCS", "Weight", "Class", "NMFC #", "NMFC#", "SKU", "HZ", "Description", "Dimensions"],
  },
  {
    title: "Other info",
    labels: ["Total Weight", "Special Instructions", "Pickup Notes", "Delivery Notes"],
  },
] as const;

export function groupReviewFields(fields: ExtractedField[]) {
  if (isTrainityLtlFieldSet(fields)) {
    return groupFieldsByTrainityHeaders(fields);
  }

  const assigned = new Set<string>();
  const groups = reviewFieldGroups
    .map((group) => {
      const items = fields.filter((field) => {
        const matches = group.match.some((term) =>
          field.label.toLowerCase().includes(term.toLowerCase()),
        );
        if (matches) assigned.add(field.label);
        return matches;
      });
      return { title: group.title, items };
    })
    .filter((group) => group.items.length > 0);
  const other = fields.filter((field) => !assigned.has(field.label));

  return other.length > 0 ? [...groups, { title: "Additional", items: other }] : groups;
}

function isTrainityLtlFieldSet(fields: ExtractedField[]) {
  const labels = new Set(fields.map((field) => field.label));
  return labels.has("PRO/Manifest ID") || labels.has("QTY/PCS") || labels.has("Pickup Notes");
}

function groupFieldsByTrainityHeaders(fields: ExtractedField[]) {
  const assigned = new Set<string>();
  const groups = trainityReviewFieldGroups
    .map((group) => {
      const labels = "labels" in group ? group.labels : [];
      const prefixes = "prefixes" in group ? group.prefixes : [];
      const items = fields.filter((field) => {
        const matches =
          labels.includes(field.label) || prefixes.some((prefix) => field.label.startsWith(prefix));
        if (matches) assigned.add(field.label);
        return matches;
      });

      return { title: group.title, items };
    })
    .filter((group) => group.items.length > 0);
  const other = fields.filter((field) => !assigned.has(field.label));

  return other.length > 0 ? [...groups, { title: "Additional", items: other }] : groups;
}

export type ExtractedTable = {
  title: string;
  columns: string[];
  rows: string[][];
  accuracy: number;
};

export function buildLineItemTable(fields: ExtractedField[]): ExtractedTable | null {
  const findField = (label: string) => fields.find((item) => item.label === label);
  const field = (label: string) => findField(label)?.value ?? "";
  const confidence = (label: string) => findField(label)?.confidence;
  const findAnyField = (labels: string[]) => labels.map(findField).find(Boolean);
  const ltlFields = [
    findAnyField(["QTY/PCS", "Quantity"]),
    findAnyField(["Weight", "Total Weight"]),
    findAnyField(["Class"]),
    findAnyField(["NMFC #", "NMFC#"]),
    findAnyField(["SKU"]),
    findAnyField(["HZ"]),
    findAnyField(["Description", "Description of Goods"]),
    findAnyField(["Dimensions"]),
  ];
  const hasLtlTable = ltlFields.some((item) => item?.value);

  if (hasLtlTable) {
    const confidenceValues = ltlFields
      .map((item) => item?.confidence)
      .filter((value): value is number => typeof value === "number");

    return {
      title: "Items / Table",
      columns: ["QTY/PCS", "Weight", "Class", "NMFC #", "SKU", "HZ", "Description", "Dimensions"],
      accuracy: confidenceValues.length > 0
        ? Math.round(confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length)
        : 95,
      rows: [[
        ltlFields[0]?.value || "Not available",
        ltlFields[1]?.value || "Not available",
        ltlFields[2]?.value || "Not available",
        ltlFields[3]?.value || "Not available",
        ltlFields[4]?.value || "Not available",
        ltlFields[5]?.value || "Not available",
        ltlFields[6]?.value || "Not available",
        ltlFields[7]?.value || "Not available",
      ]],
    };
  }

  const containsField = (term: string) =>
    fields.find((item) => item.label.toLowerCase().includes(term.toLowerCase()));
  const description = field("Description of Goods") || field("Line Item");
  const containerField = containsField("Container");
  const sealField = containsField("Seal");
  const container = containerField?.value || field("Marks and Numbers");
  const seal = sealField?.value ?? "";
  const marks = [container, seal ? `Seal: ${seal}` : ""].filter(Boolean).join("\n");
  const packages = field("Packages") || field("Container / Package Count") || field("Quantity");
  const grossWeight = field("Gross Weight");
  const measurement = field("Measurement");
  const amountDue = field("Amount Due") || field("Grand Total") || field("Declared Value");
  const confidenceValues = [
    containerField?.confidence ?? confidence("Marks and Numbers"),
    sealField?.confidence,
    confidence("Packages") ?? confidence("Container / Package Count") ?? confidence("Quantity"),
    confidence("Description of Goods") ?? confidence("Line Item"),
    confidence("Gross Weight"),
    confidence("Measurement"),
    confidence("Amount Due") ?? confidence("Grand Total") ?? confidence("Declared Value"),
  ].filter((value): value is number => typeof value === "number");

  if (!description && !packages && !grossWeight && !measurement && !amountDue) return null;

  return {
    title: "Source Table Layout",
    columns: ["Marks / Container", "Packages / Qty", "Description of Goods", "Gross Weight", "Measurement"],
    accuracy: confidenceValues.length > 0
      ? Math.round(confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length)
      : 95,
    rows: [[
      marks || "Not available",
      packages || "Not available",
      description || amountDue || "Not available",
      grossWeight || "Not available",
      measurement || "Not available",
    ]],
  };
}
