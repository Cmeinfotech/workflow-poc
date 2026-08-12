import { createFileRoute } from "@tanstack/react-router";
import { FunctionModulePage } from "@/components/functions/FunctionModulePage";
import { functionModuleMap } from "@/lib/functions-data";

export const Route = createFileRoute("/_app/functions/document-intake")({
  component: DocumentIntake,
  head: () => ({ meta: [{ title: "Document Intake — Nexus AI" }] }),
});

function DocumentIntake() {
  return <FunctionModulePage module={functionModuleMap["document-intake"]} />;
}
