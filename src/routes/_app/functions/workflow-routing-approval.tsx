import { createFileRoute } from "@tanstack/react-router";
import { FunctionModulePage } from "@/components/functions/FunctionModulePage";
import { functionModuleMap } from "@/lib/functions-data";

export const Route = createFileRoute("/_app/functions/workflow-routing-approval")({
  component: WorkflowRoutingApproval,
  head: () => ({ meta: [{ title: "Workflow Routing & Approval — Nexus AI" }] }),
});

function WorkflowRoutingApproval() {
  return <FunctionModulePage module={functionModuleMap["workflow-routing-approval"]} />;
}
