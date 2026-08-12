import { createFileRoute } from "@tanstack/react-router";
import { FunctionModulePage } from "@/components/functions/FunctionModulePage";
import { functionModuleMap } from "@/lib/functions-data";

export const Route = createFileRoute("/_app/functions/document-classification-filtering")({
  component: ClassificationFiltering,
  head: () => ({ meta: [{ title: "Document Classification & Filtering — Nexus AI" }] }),
});

function ClassificationFiltering() {
  return <FunctionModulePage module={functionModuleMap["document-classification-filtering"]} />;
}
