import { createFileRoute } from "@tanstack/react-router";
import { FunctionModulePage } from "@/components/functions/FunctionModulePage";
import { functionModuleMap } from "@/lib/functions-data";

export const Route = createFileRoute("/_app/functions/validation-human-review")({
  component: ValidationHumanReview,
  head: () => ({ meta: [{ title: "Validation & Human Review — Nexus AI" }] }),
});

function ValidationHumanReview() {
  return <FunctionModulePage module={functionModuleMap["validation-human-review"]} />;
}
