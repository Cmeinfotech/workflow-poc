import { createFileRoute } from "@tanstack/react-router";
import { FunctionModulePage } from "@/components/functions/FunctionModulePage";
import { functionModuleMap } from "@/lib/functions-data";

export const Route = createFileRoute("/_app/functions/template-management")({
  component: TemplateManagement,
  head: () => ({ meta: [{ title: "Template Management — Nexus AI" }] }),
});

function TemplateManagement() {
  return <FunctionModulePage module={functionModuleMap["template-management"]} />;
}
