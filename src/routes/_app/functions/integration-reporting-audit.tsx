import { createFileRoute } from "@tanstack/react-router";
import { FunctionModulePage } from "@/components/functions/FunctionModulePage";
import { functionModuleMap } from "@/lib/functions-data";

export const Route = createFileRoute("/_app/functions/integration-reporting-audit")({
  component: IntegrationReportingAudit,
  head: () => ({ meta: [{ title: "Integration, Reporting & Audit — Nexus AI" }] }),
});

function IntegrationReportingAudit() {
  return <FunctionModulePage module={functionModuleMap["integration-reporting-audit"]} />;
}
