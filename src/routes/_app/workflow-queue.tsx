import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, PageHeader, Btn } from "@/components/ui-kit";

export const Route = createFileRoute("/_app/workflow-queue")({
  component: InventoryAlias,
  head: () => ({ meta: [{ title: "Inventory - Chiaro OCR" }] }),
});

function InventoryAlias() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Workflow Queue has been renamed to Inventory for the OCR inventory processing workflow."
        actions={<Link to="/inventory"><Btn variant="primary" size="sm">Open Inventory<ArrowRight className="size-3.5" /></Btn></Link>}
      />
      <Card>
        <div className="text-sm text-muted-foreground">
          Use Inventory as the entry queue for files that must pass OCR Review, QC Review, and Export before completion.
        </div>
      </Card>
    </div>
  );
}
