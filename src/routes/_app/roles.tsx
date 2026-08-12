import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ClipboardCheck,
  Download,
  LayoutDashboard,
  ListChecks,
  Plus,
  Save,
  ScanText,
  Settings2,
  Trash2,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, PageHeader, Btn } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  type AccessTabKey,
  type RolePermission,
  createRolePermissions,
  pocAccessTabs,
} from "@/lib/access-management";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/roles")({
  component: Roles,
  head: () => ({ meta: [{ title: "Roles & Permissions - Nexus AI" }] }),
});

type RoleConfig = {
  name: string;
  users: number;
  status: "Active" | "Inactive";
  permissions: Record<AccessTabKey, RolePermission>;
};

const permissionIcons: Record<AccessTabKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  inventory: ListChecks,
  ocrReview: ScanText,
  processingQueue: Settings2,
  qc: ClipboardCheck,
  audit: UserCheck,
  export: Download,
  exception: AlertTriangle,
  users: Users,
  roles: ShieldCheck,
};

const ROLES_STORAGE_KEY = "dataspan-access-roles";
const USERS_STORAGE_KEY = "dataspan-access-users";

const initialRoles: RoleConfig[] = [
  {
    name: "Super Admin",
    users: 3,
    status: "Active",
    permissions: createRolePermissions(["ocrReview", "processingQueue", "qc", "audit", "export", "users", "roles"]),
  },
  {
    name: "Manager",
    users: 18,
    status: "Active",
    permissions: createRolePermissions(["ocrReview", "processingQueue", "qc", "audit", "export"]),
  },
  {
    name: "OCR Person",
    users: 42,
    status: "Active",
    permissions: createRolePermissions(["ocrReview", "processingQueue"]),
  },
  {
    name: "QC Person",
    users: 16,
    status: "Active",
    permissions: createRolePermissions(["qc"]),
  },
  {
    name: "Export Person",
    users: 10,
    status: "Active",
    permissions: createRolePermissions(["export"]),
  },
  {
    name: "Audit Person",
    users: 8,
    status: "Active",
    permissions: createRolePermissions(["audit"]),
  },
  {
    name: "Client User",
    users: 26,
    status: "Active",
    permissions: createRolePermissions([]),
  },
  {
    name: "user-only",
    users: 1,
    status: "Active",
    permissions: createRolePermissions(["ocrReview"]),
  },
];


const initialUserRoles = [
  "Super Admin",
  "Manager",
  "OCR Person",
  "OCR Person",
  "Audit Person",
  "Manager",
  "Client User",
  "user-only",
];

type StoredUserRecord = {
  role: string;
};

function countUsersByRole(users: StoredUserRecord[]): Record<string, number> {
  return users.reduce<Record<string, number>>((counts, user) => {
    const role = user.role?.trim();
    if (!role) return counts;
    counts[role] = (counts[role] ?? 0) + 1;
    return counts;
  }, {});
}

function readUserRoleCounts(): Record<string, number> {
  if (typeof window === "undefined") {
    return countUsersByRole(initialUserRoles.map((role) => ({ role })));
  }

  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return countUsersByRole(initialUserRoles.map((role) => ({ role })));

    const users = JSON.parse(raw) as StoredUserRecord[];
    return Array.isArray(users) ? countUsersByRole(users) : {};
  } catch {
    return countUsersByRole(initialUserRoles.map((role) => ({ role })));
  }
}

function readStoredRoles(): RoleConfig[] {
  if (typeof window === "undefined") return initialRoles;

  try {
    const raw = window.localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return initialRoles;

    const roles = JSON.parse(raw) as RoleConfig[];
    return Array.isArray(roles) && roles.length > 0 ? roles : initialRoles;
  } catch {
    return initialRoles;
  }
}
function Roles() {
  const [roles, setRoles] = useState<RoleConfig[]>(() => readStoredRoles());
  const [roleUserCounts, setRoleUserCounts] = useState<Record<string, number>>(() => readUserRoleCounts());
  const [activeRoleName, setActiveRoleName] = useState(initialRoles[6].name);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [draftRole, setDraftRole] = useState<RoleConfig>({
    name: "",
    users: 0,
    status: "Active",
    permissions: createRolePermissions([]),
  });
  const activeRole = useMemo(
    () => roles.find((role) => role.name === activeRoleName) ?? roles[0],
    [activeRoleName, roles],
  );
  const canSaveRole =
    draftRole.name.trim().length > 0 &&
    !roles.some((role) => role.name.toLowerCase() === draftRole.name.trim().toLowerCase());

  useEffect(() => {
    window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    window.dispatchEvent(new Event("dataspan-roles-change"));
  }, [roles]);

  useEffect(() => {
    const refreshUserCounts = () => setRoleUserCounts(readUserRoleCounts());
    window.addEventListener("storage", refreshUserCounts);
    window.addEventListener("dataspan-users-change", refreshUserCounts);
    return () => {
      window.removeEventListener("storage", refreshUserCounts);
      window.removeEventListener("dataspan-users-change", refreshUserCounts);
    };
  }, []);

  const setTabEnabled = (tabKey: AccessTabKey, enabled: boolean) => {
    setRoles((currentRoles) =>
      currentRoles.map((role) => {
        if (role.name !== activeRole.name) return role;
        const tab = pocAccessTabs.find((item) => item.key === tabKey);
        if (tab?.preset) return role;

        return {
          ...role,
          permissions: {
            ...role.permissions,
            [tabKey]: createEnabledPermission(role.permissions[tabKey], enabled),
          },
        };
      }),
    );
  };

  const setDraftTabEnabled = (tabKey: AccessTabKey, enabled: boolean) => {
    setDraftRole((currentRole) => {
      const tab = pocAccessTabs.find((item) => item.key === tabKey);
      if (tab?.preset) return currentRole;

      return {
        ...currentRole,
        permissions: {
          ...currentRole.permissions,
          [tabKey]: createEnabledPermission(currentRole.permissions[tabKey], enabled),
        },
      };
    });
  };

  const openAddRole = () => {
    setDraftRole({
      name: "",
      users: 0,
      status: "Active",
      permissions: createRolePermissions([]),
    });
    setAddRoleOpen(true);
  };

  const saveRole = () => {
    if (!canSaveRole) return;

    const nextRole = {
      ...draftRole,
      name: draftRole.name.trim(),
      users: 0,
    };
    setRoles((currentRoles) => [...currentRoles, nextRole]);
    setActiveRoleName(nextRole.name);
    setAddRoleOpen(false);
  };

  const deleteRole = (roleName: string) => {
    setRoles((currentRoles) => {
      if (currentRoles.length <= 1) return currentRoles;

      const nextRoles = currentRoles.filter((role) => role.name !== roleName);
      if (nextRoles.length === currentRoles.length) return currentRoles;
      if (activeRoleName === roleName) setActiveRoleName(nextRoles[0].name);
      return nextRoles;
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles Management"
        description=""
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="rounded-lg border-border/80 bg-card/80 p-4 shadow-sm">
          <CardHeader title="Roles" subtitle={`${roles.length} configured`} />
          <div className="space-y-2">
            {roles.map((role) => {
              const selected = activeRole.name === role.name;
              return (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => setActiveRoleName(role.name)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left transition",
                    selected
                      ? "border-primary/55 bg-primary/10 shadow-[0_8px_20px_rgba(37,99,235,0.08)]"
                      : "border-transparent hover:border-border hover:bg-accent/35",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Users className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{role.name}</div>
                        <div className="text-xs text-muted-foreground">{roleUserCounts[role.name] ?? 0} {(roleUserCounts[role.name] ?? 0) === 1 ? "user" : "users"}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                          role.status === "Active"
                            ? "border-success/30 bg-success/15 text-success"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {role.status}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        title={roles.length <= 1 ? "At least one role is required" : "Delete role"}
                        aria-label={`Delete ${role.name} role`}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteRole(role.name);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            deleteRole(role.name);
                          }
                        }}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg border transition",
                          roles.length <= 1
                            ? "cursor-not-allowed border-border bg-muted text-muted-foreground/50"
                            : "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15",
                        )}
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden rounded-lg border-border/80 bg-card/80 p-0 shadow-sm">
          <div className="border-b border-border p-5">
            <CardHeader
              title={`${activeRole.name} permissions`}
              subtitle="Configure the navigation areas this role can access."
              actions={
                <Btn variant="outline" size="sm" onClick={openAddRole}>
                  <Plus className="size-3.5" />
                  Add Role
                </Btn>
              }
            />
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Role name
                <input
                  value={activeRole.name}
                  readOnly
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none"
                />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Status
                <select
                  value={activeRole.status}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none"
                  onChange={(event) =>
                    setRoles((currentRoles) =>
                      currentRoles.map((role) =>
                        role.name === activeRole.name
                          ? { ...role, status: event.target.value as RoleConfig["status"] }
                          : role,
                      ),
                    )
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
              <div className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Preset tabs
                <div className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2">
                  {pocAccessTabs
                    .filter((tab) => tab.preset)
                    .map((tab) => (
                      <span key={tab.key} className="rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        {tab.label}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <PermissionTable
            role={activeRole}
            onCheckedChange={setTabEnabled}
          />
        </Card>
      </div>

      <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
        <DialogContent className="flex h-[82vh] max-h-[82vh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Role name
                <input
                  value={draftRole.name}
                  onChange={(event) => setDraftRole((role) => ({ ...role, name: event.target.value }))}
                  placeholder="Role name"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none"
                />
                {draftRole.name.trim().length > 0 && !canSaveRole && (
                  <span className="text-[11px] text-destructive">Role name already exists.</span>
                )}
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Status
                <select
                  value={draftRole.status}
                  onChange={(event) =>
                    setDraftRole((role) => ({ ...role, status: event.target.value as RoleConfig["status"] }))
                  }
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/70 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Permissions</div>
                  <div className="text-xs text-muted-foreground">Select the permissions available for this role.</div>
                </div>
              </div>
              <PermissionTable
                role={draftRole}
                compact
                onCheckedChange={setDraftTabEnabled}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border pt-4">
            <Btn variant="outline" size="sm" onClick={() => setAddRoleOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" size="sm" onClick={saveRole} disabled={!canSaveRole}>
              <Save className="size-3.5" />
              Save
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function createEnabledPermission(permission: RolePermission, enabled: boolean): RolePermission {
  return {
    ...permission,
    enabled,
    view: enabled,
    create: enabled,
    edit: enabled,
    approve: enabled,
    export: enabled,
  };
}

function PermissionTable({
  role,
  compact,
  onCheckedChange,
}: {
  role: RoleConfig;
  compact?: boolean;
  onCheckedChange: (tabKey: AccessTabKey, enabled: boolean) => void;
}) {
  return (
    <div className={compact ? "max-h-96 overflow-y-auto" : "px-5 py-5"}>
      <div className="mx-auto overflow-hidden rounded-lg border border-border/80 bg-background/70 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="w-2/3 px-5 py-3 text-left font-medium">Permission</th>
              <th className="w-1/3 px-5 py-3 text-center font-medium">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {pocAccessTabs.map((tab) => {
              const permission = role.permissions[tab.key];
              const Icon = permissionIcons[tab.key];
              return (
                <tr
                  key={tab.key}
                  className={cn(
                    "border-b border-border/60 transition last:border-0 hover:bg-accent/20",
                    permission.enabled && !tab.preset && "bg-primary/[0.035]",
                  )}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold">{tab.label}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <PermissionToggle
                      checked={permission.enabled}
                      locked={tab.preset}
                      onCheckedChange={(enabled) => onCheckedChange(tab.key, enabled)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissionToggle({
  checked,
  locked,
  onCheckedChange,
}: {
  checked: boolean;
  locked?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Switch
        checked={checked}
        disabled={locked}
        onCheckedChange={onCheckedChange}
        className="h-6 w-11 data-[state=checked]:bg-success data-[state=unchecked]:bg-muted-foreground/30 [&>span]:h-5 [&>span]:w-5 [&>span]:data-[state=checked]:translate-x-5"
        title={locked ? "Preset" : checked ? "Enabled" : "Disabled"}
      />
      <span className={cn("w-16 text-left text-xs font-semibold", checked ? "text-success" : "text-muted-foreground")}>
        {checked ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}
















