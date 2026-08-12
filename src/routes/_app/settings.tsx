import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, PageHeader, Btn } from "@/components/ui-kit";
import {
  defaultReviewFieldPolicies,
  saveReviewFieldPolicies,
  updateReviewFieldPolicy,
  useReviewFieldPolicies,
  type ReviewFieldPolicy,
} from "@/lib/review-field-policy";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Settings — Nexus AI" }] }),
});

function Settings() {
  const { policies, setPolicies } = useReviewFieldPolicies();
  const [activeGroup, setActiveGroup] = useState("All");
  const groups = useMemo(
    () => ["All", ...Array.from(new Set(policies.map((policy) => policy.group)))],
    [policies],
  );
  const filteredPolicies = useMemo(
    () =>
      activeGroup === "All"
        ? policies
        : policies.filter((policy) => policy.group === activeGroup),
    [activeGroup, policies],
  );
  const ocrVisibleCount = policies.filter((policy) => policy.showInOcr || policy.autoSelected).length;
  const qcVisibleCount = policies.filter((policy) => policy.showInQc || policy.autoSelected).length;
  const auditVisibleCount = policies.filter(
    (policy) => policy.showInAudit || policy.autoSelected,
  ).length;

  function updatePolicy(key: string, patch: Partial<ReviewFieldPolicy>) {
    const next = updateReviewFieldPolicy(policies, key, patch);
    setPolicies(next);
    saveReviewFieldPolicies(next);
  }

  function resetPolicies() {
    setPolicies(defaultReviewFieldPolicies);
    saveReviewFieldPolicies(defaultReviewFieldPolicies);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Organization, security, billing and platform configuration." />

      <Card>
        <CardHeader title="Organization Profile" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Organization Name", "Acme Corporation"],
            ["Industry", "Logistics & Manufacturing"],
            ["Country", "India"],
            ["Time Zone", "Asia/Kolkata (IST)"],
            ["Default Currency", "INR (₹)"],
            ["Fiscal Year Start", "April"],
          ].map(([l, v]) => (
            <div key={l}>
              <label className="text-xs text-muted-foreground">{l}</label>
              <input defaultValue={v} className="mt-1 w-full h-9 px-3 text-sm rounded-md bg-card border border-border focus:outline-none focus:border-primary/60" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="outline" size="sm">Cancel</Btn>
          <Btn variant="primary" size="sm">Save Changes</Btn>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Review Field Access"
          subtitle={`${ocrVisibleCount} OCR Page · ${qcVisibleCount} QC Page · ${auditVisibleCount} Audit Page fields`}
          actions={
            <Btn variant="outline" size="sm" onClick={resetPolicies}>
              Reset Defaults
            </Btn>
          }
        />

        <div className="mb-3 flex gap-1 overflow-x-auto rounded-md border border-border bg-muted/40 p-1">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setActiveGroup(group)}
              className={cn(
                "h-7 shrink-0 rounded px-2.5 text-xs font-medium transition",
                activeGroup === group
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {group}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Group</th>
                <th className="px-3 py-2 text-center font-medium">OCR Page</th>
                <th className="px-3 py-2 text-center font-medium">QC Page</th>
                <th className="px-3 py-2 text-center font-medium">Audit Page</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map((policy) => (
                <tr key={policy.key} className="border-b border-border/60 last:border-b-0 hover:bg-accent/20">
                  <td className="px-3 py-2">
                    <div className="font-medium text-xs">{policy.label}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{policy.key}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{policy.group}</td>
                  <td className="px-3 py-2 text-center">
                    <PolicyCheckbox
                      checked={policy.showInOcr || policy.autoSelected}
                      disabled={policy.autoSelected}
                      onChange={(checked) => updatePolicy(policy.key, { showInOcr: checked })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <PolicyCheckbox
                      checked={policy.showInQc || policy.autoSelected}
                      disabled={policy.autoSelected}
                      onChange={(checked) => updatePolicy(policy.key, { showInQc: checked })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <PolicyCheckbox
                      checked={policy.showInAudit || policy.autoSelected}
                      disabled={policy.autoSelected}
                      onChange={(checked) => updatePolicy(policy.key, { showInAudit: checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PolicyCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="size-4 rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
