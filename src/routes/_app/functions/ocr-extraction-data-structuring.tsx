import { createFileRoute } from "@tanstack/react-router";
import { FunctionModulePage } from "@/components/functions/FunctionModulePage";
import { functionModuleMap } from "@/lib/functions-data";

export const Route = createFileRoute("/_app/functions/ocr-extraction-data-structuring")({
  component: OcrExtractionDataStructuring,
  head: () => ({ meta: [{ title: "OCR Extraction & Data Structuring — Nexus AI" }] }),
});

function OcrExtractionDataStructuring() {
  return <FunctionModulePage module={functionModuleMap["ocr-extraction-data-structuring"]} />;
}
