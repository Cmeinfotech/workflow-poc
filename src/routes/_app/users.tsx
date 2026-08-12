import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Filter, Pencil, Save, Search, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, PageHeader, Btn } from "@/components/ui-kit";
import { useDraggableColumnOrder } from "@/hooks/use-draggable-column-order";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type AccessTabKey,
  createRolePermissions,
  pocAccessTabs,
} from "@/lib/access-management";
import { getManagedLoginUsers, removeManagedLoginUser, saveManagedLoginUser } from "@/lib/auth";

export const Route = createFileRoute("/_app/users")({
  component: Users,
  head: () => ({ meta: [{ title: "Users - Nexus AI" }] }),
});

type UserStatus = "Active" | "Inactive";

type UserRecord = {
  username: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  password: string;
  overrides: Partial<Record<AccessTabKey, boolean>>;
  last: string;
};

type UserColumn = "username" | "status" | "role" | "allowedTabs" | "lastActive" | "action";

const userColumnOrder: UserColumn[] = ["username", "status", "role", "allowedTabs", "lastActive", "action"];

type UserForm = Pick<UserRecord, "username" | "name" | "email" | "role" | "status" | "password"> & {
  overrides: Partial<Record<AccessTabKey, boolean>>;
};

type FinalTab = (typeof pocAccessTabs)[number] & {
  roleEnabled: boolean;
  finalEnabled: boolean;
  overridden: boolean;
};

type StoredRoleConfig = {
  name: string;
  permissions: Record<AccessTabKey, { enabled: boolean }>;
};

const defaultRoleTabs: Record<string, AccessTabKey[]> = {
  "Super Admin": ["ocrReview", "processingQueue", "qc", "audit", "export", "users", "roles"],
  Manager: ["ocrReview", "processingQueue", "qc", "audit", "export"],
  "OCR Person": ["ocrReview", "processingQueue"],
  "QC Person": ["qc"],
  "Export Person": ["export"],
  "Audit Person": ["audit"],
  "Client User": [],
  "user-only": ["ocrReview"],
};

const ROLES_STORAGE_KEY = "dataspan-access-roles";

const emptyDraft: UserForm = {
  username: "",
  name: "",
  email: "",
  role: "",
  status: "Active",
  password: "",
  overrides: {},
};

const initialUsers: UserRecord[] = [
  { username: "ethan.carter", name: "Ethan Carter", email: "ethan.carter@chiaro.com", role: "Super Admin", status: "Active", password: "pass@123", overrides: {}, last: "Active now" },
  { username: "olivia.bennett", name: "Olivia Bennett", email: "olivia.bennett@chiaro.com", role: "Manager", status: "Active", password: "pass@123", overrides: {}, last: "5 min ago" },
  { username: "mason.brooks", name: "Mason Brooks", email: "mason.brooks@chiaro.com", role: "OCR Person", status: "Active", password: "pass@123", overrides: { export: true }, last: "12 min ago" },
  { username: "ava.reynolds", name: "Ava Reynolds", email: "ava.reynolds@chiaro.com", role: "OCR Person", status: "Active", password: "pass@123", overrides: {}, last: "24 min ago" },
  { username: "sophia.mitchell", name: "Sophia Mitchell", email: "sophia.mitchell@chiaro.com", role: "Audit Person", status: "Active", password: "pass@123", overrides: { qc: true }, last: "1 hr ago" },
  { username: "jackson.hayes", name: "Jackson Hayes", email: "jackson.hayes@chiaro.com", role: "Manager", status: "Inactive", password: "pass@123", overrides: {}, last: "Yesterday" },
  { username: "emily.parker", name: "Emily Parker", email: "emily.parker@chiaro.com", role: "Client User", status: "Inactive", password: "pass@123", overrides: { qc: false }, last: "5 days ago" },
  { username: "madison.cooper", name: "Madison Cooper", email: "madison.cooper@chiaro.com", role: "user-only", status: "Active", password: "pass@123", overrides: {}, last: "Not logged in" },
];

const USERS_STORAGE_KEY = "dataspan-access-users";

function readStoredUsers(): UserRecord[] {
  if (typeof window === "undefined") return initialUsers;

  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return initialUsers;

    const users = JSON.parse(raw) as UserRecord[];
    return Array.isArray(users) ? users : initialUsers;
  } catch {
    return initialUsers;
  }
}

function readRoleAccessMap(): Record<string, AccessTabKey[]> {
  const roleAccessMap = { ...defaultRoleTabs };
  if (typeof window === "undefined") return roleAccessMap;

  try {
    const raw = window.localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return roleAccessMap;

    const storedRoles = JSON.parse(raw) as StoredRoleConfig[];
    if (!Array.isArray(storedRoles)) return roleAccessMap;

    storedRoles.forEach((role) => {
      if (!role.name || !role.permissions) return;
      roleAccessMap[role.name] = pocAccessTabs
        .filter((tab) => !tab.preset && role.permissions[tab.key]?.enabled)
        .map((tab) => tab.key);
    });
  } catch {
    return roleAccessMap;
  }

  return roleAccessMap;
}

function Users() {
  const [users, setUsers] = useState<UserRecord[]>(() => readStoredUsers());
  const [roleAccessMap, setRoleAccessMap] = useState<Record<string, AccessTabKey[]>>(() => readRoleAccessMap());
  const [activeUsername, setActiveUsername] = useState(initialUsers[0].username);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserForm>(emptyDraft);
  const { columnOrder, getDragClassName, getDragProps } = useDraggableColumnOrder(userColumnOrder);

  useEffect(() => {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    window.dispatchEvent(new Event("dataspan-users-change"));
  }, [users]);

  useEffect(() => {
    const refreshRoles = () => setRoleAccessMap(readRoleAccessMap());
    window.addEventListener("storage", refreshRoles);
    window.addEventListener("dataspan-roles-change", refreshRoles);
    return () => {
      window.removeEventListener("storage", refreshRoles);
      window.removeEventListener("dataspan-roles-change", refreshRoles);
    };
  }, []);
  const filteredUsers = users.filter((user) =>
    [user.username, user.name, user.email, user.role].some((value) =>
      value.toLowerCase().includes(query.toLowerCase()),
    ),
  );
  const activeCount = users.filter((user) => user.status === "Active").length;
  const roles = Object.keys(roleAccessMap);
  const draftFinalTabs = buildFinalTabs(draft.role, draft.overrides, roleAccessMap);
  const usernameExists = users.some(
    (user) =>
      user.username.toLowerCase() === draft.username.trim().toLowerCase() &&
      user.username !== editingUsername,
  );
  const canSaveUser =
    draft.username.trim().length > 0 &&
    draft.name.trim().length > 0 &&
    draft.email.trim().length > 0 &&
    draft.role.trim().length > 0 &&
    !usernameExists &&
    (dialogMode === "edit" || draft.password.trim().length > 0);

  const openAddUser = () => {
    setRoleAccessMap(readRoleAccessMap());
    setDialogMode("create");
    setEditingUsername(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };

  const openEditUser = (user: UserRecord) => {
    setDialogMode("edit");
    setEditingUsername(user.username);
    setDraft({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      password: user.password,
      overrides: user.overrides,
    });
    setDialogOpen(true);
  };

  const saveUser = () => {
    if (!canSaveUser) return;

    const savedUser: UserRecord = {
      username: draft.username.trim(),
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role,
      status: draft.status,
      password: draft.password.trim(),
      overrides: draft.overrides,
      last:
        dialogMode === "create"
          ? "Not logged in"
          : users.find((user) => user.username === editingUsername)?.last ?? "Not logged in",
    };

    const loginUsers = getManagedLoginUsers();
    const previousUser = users.find((user) => user.username === editingUsername);
    const previousLoginUser = previousUser
      ? loginUsers.find(
        (user) => user.email.trim().toLowerCase() === previousUser.email.trim().toLowerCase(),
      )
      : null;

    if (dialogMode === "create") {
      setUsers((currentUsers) => [savedUser, ...currentUsers]);
    } else {
      if (previousUser && previousUser.email !== savedUser.email) removeManagedLoginUser(previousUser.email);
      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.username === editingUsername ? savedUser : user)),
      );
    }

    const existingLoginUser = loginUsers.find(
      (user) => user.email.trim().toLowerCase() === savedUser.email.trim().toLowerCase(),
    );
    const nextPassword = savedUser.password || existingLoginUser?.password || previousLoginUser?.password;
    if (nextPassword) {
      saveManagedLoginUser({
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
        status: savedUser.status,
        password: nextPassword,
      });
    }

    setActiveUsername(savedUser.username);
    setQuery("");
    setDialogOpen(false);
    setDraft(emptyDraft);
    setEditingUsername(null);
  };

  const deleteUser = (username: string) => {
    const userToDelete = users.find((user) => user.username === username);
    if (userToDelete) removeManagedLoginUser(userToDelete.email);

    setUsers((currentUsers) => {
      const nextUsers = currentUsers.filter((user) => user.username !== username);
      if (activeUsername === username && nextUsers[0]) setActiveUsername(nextUsers[0].username);
      return nextUsers;
    });
  };

  const toggleDraftOverride = (tabKey: AccessTabKey) => {
    const tab = pocAccessTabs.find((item) => item.key === tabKey);
    if (tab?.preset) return;

    const current = draftFinalTabs.find((item) => item.key === tabKey)?.finalEnabled ?? false;
    setDraft((currentDraft) => ({
      ...currentDraft,
      overrides: {
        ...currentDraft.overrides,
        [tabKey]: !current,
      },
    }));
  };

  const clearDraftOverride = (tabKey: AccessTabKey) => {
    setDraft((currentDraft) => {
      const nextOverrides = { ...currentDraft.overrides };
      delete nextOverrides[tabKey];
      return { ...currentDraft, overrides: nextOverrides };
    });
  };

  function getUserHeaderLabel(columnId: UserColumn) {
    const labels: Record<UserColumn, string> = {
      username: "Username",
      status: "Status",
      role: "Role",
      allowedTabs: "Allowed tabs",
      lastActive: "Last Active",
      action: "Action",
    };
    return labels[columnId];
  }

  function renderUserCell(user: UserRecord, columnId: UserColumn) {
    const permissions = createRolePermissions(roleAccessMap[user.role] ?? []);
    const enabledCount = pocAccessTabs.filter(
      (tab) => tab.preset || (user.overrides[tab.key] ?? permissions[tab.key].enabled),
    ).length;

    switch (columnId) {
      case "username":
        return <td key="username" className="px-5 py-3"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{user.name.split(" ").map((name) => name[0]).join("")}</div><div><div className="font-medium">{user.username}</div><div className="text-xs text-muted-foreground">{user.email}</div></div></div></td>;
      case "status":
        return <td key="status" className="px-3 py-3"><span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${user.status === "Active" ? "border-success/30 bg-success/15 text-success" : "border-border bg-muted text-muted-foreground"}`}>{user.status}</span></td>;
      case "role":
        return <td key="role" className="px-3 py-3"><span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{user.role}</span></td>;
      case "allowedTabs":
        return <td key="allowedTabs" className="px-3 py-3 text-xs text-muted-foreground">{enabledCount} tabs</td>;
      case "lastActive":
        return <td key="lastActive" className="px-3 py-3 text-xs text-muted-foreground">{user.last}</td>;
      case "action":
        return <td key="action" className="px-5 py-3"><div className="flex justify-end gap-1.5"><button type="button" onClick={(event) => { event.stopPropagation(); openEditUser(user); }} className="grid size-8 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary" title="Edit user"><Pencil className="size-3.5" /></button><button type="button" onClick={(event) => { event.stopPropagation(); deleteUser(user.username); }} className="grid size-8 place-items-center rounded-md border border-destructive/25 bg-destructive/10 text-destructive transition hover:bg-destructive/20" title="Delete user"><Trash2 className="size-3.5" /></button></div></td>;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="User Management" description="" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Users", value: users.length.toString() },
          { label: "Active", value: activeCount.toString() },
          { label: "Inactive", value: (users.length - activeCount).toString() },
          { label: "Roles", value: roles.length.toString() },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</div>
            <div className="mt-1 text-2xl font-bold">{stat.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm">
              <Filter className="size-3.5" />
              Filters
            </Btn>
            <Btn variant="primary" size="sm" onClick={openAddUser}>
              <UserPlus className="size-3.5" />
              Add User
            </Btn>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-card/60">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {columnOrder.map((columnId, index) => (
                  <th
                    key={columnId}
                    {...getDragProps(index)}
                    className={`px-3 py-3 cursor-grab select-none font-medium transition-all duration-150 active:cursor-grabbing hover:bg-muted ${columnId === "username" ? "px-5" : ""} ${columnId === "action" ? "px-5 text-right" : ""} ${getDragClassName(index)}`}
                  >
                    <div className={`flex items-center gap-1 ${columnId === "action" ? "justify-end" : ""}`}>
                      <span className="text-[9px] text-muted-foreground opacity-40">::</span>
                      {getUserHeaderLabel(columnId)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.username}
                  onClick={() => setActiveUsername(user.username)}
                  className={`border-b border-border/50 transition hover:bg-accent/30 ${activeUsername === user.username ? "bg-primary/5" : ""}`}
                >
                  {columnOrder.map((columnId) => renderUserCell(user, columnId))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0 pb-1">
            <DialogTitle>{dialogMode === "create" ? "Add User" : "Edit User"}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              Username
              <input
                value={draft.username}
                readOnly={dialogMode === "edit"}
                onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))}
                placeholder="first.last"
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
              />
              {draft.username.trim().length > 0 && usernameExists && (
                <span className="text-[11px] text-destructive">Username already exists.</span>
              )}
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              Full name
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Full name"
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              Email
              <input
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                placeholder="name@company.com"
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
              Password
              <input
                type="text"
                value={draft.password}
                readOnly={dialogMode === "edit"}
                onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                placeholder="Set password"
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none read-only:bg-muted/40"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Status
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as UserStatus }))}
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                Role
                <select
                  value={draft.role}
                  onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value, overrides: {} }))}
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
                >
                  <option value="" disabled>Select role</option>
                  {roles.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>
            </div>

            <PermissionDropdown
              disabled={!draft.role}
              tabs={draftFinalTabs}
              onToggle={toggleDraftOverride}
              onClear={clearDraftOverride}
            />
          </div>
          <DialogFooter className="shrink-0 border-t border-border pt-3">
            <Btn variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" size="sm" onClick={saveUser} disabled={!canSaveUser}>
              <Save className="size-3.5" />
              Save
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildFinalTabs(
  role: string,
  overrides: Partial<Record<AccessTabKey, boolean>>,
  roleAccessMap: Record<string, AccessTabKey[]>,
): FinalTab[] {
  const permissions = createRolePermissions(roleAccessMap[role] ?? []);
  return pocAccessTabs.map((tab) => {
    const roleEnabled = permissions[tab.key].enabled;
    return {
      ...tab,
      roleEnabled,
      finalEnabled: tab.preset || (overrides[tab.key] ?? roleEnabled),
      overridden: overrides[tab.key] !== undefined,
    };
  });
}

function PermissionDropdown({
  disabled,
  tabs,
  onToggle,
  onClear,
}: {
  disabled?: boolean;
  tabs: FinalTab[];
  onToggle: (tabKey: AccessTabKey) => void;
  onClear: (tabKey: AccessTabKey) => void;
}) {
  const enabledCount = tabs.filter((tab) => tab.finalEnabled).length;

  if (disabled) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm opacity-75">
        <div className="flex cursor-not-allowed items-center justify-between gap-3 bg-card/60 px-3.5 py-3 text-sm font-semibold text-muted-foreground">
          <span>Final permissions</span>
          <span className="text-xs font-normal">Select role to enable</span>
        </div>
      </div>
    );
  }

  return (
    <details className="group overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-card/70 px-3.5 py-3 text-sm font-semibold transition hover:bg-accent/40">
        <span>Final permissions</span>
        <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          {enabledCount} tabs enabled
          <ChevronDown className="size-4 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="max-h-52 space-y-2 overflow-y-auto border-t border-border bg-muted/20 p-3 pr-2">
        {tabs.map((tab) => (
          <div key={tab.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 shadow-sm">
            <div className="min-w-0">
              <div className="text-sm font-medium">{tab.label}</div>
            </div>
            <div className="flex items-center gap-2">
              {tab.overridden && !tab.preset && (
                <button
                  type="button"
                  onClick={() => onClear(tab.key)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                disabled={tab.preset}
                onClick={() => onToggle(tab.key)}
                className={`h-6 w-11 rounded-full p-0.5 transition disabled:cursor-not-allowed disabled:opacity-70 ${tab.finalEnabled ? "bg-success/70" : "bg-muted"
                  }`}
                title={tab.finalEnabled ? "Enabled" : "Disabled"}
              >
                <span
                  className={`block size-5 rounded-full bg-background shadow transition ${tab.finalEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}



























