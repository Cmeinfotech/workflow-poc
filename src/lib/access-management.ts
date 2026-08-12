export type AccessTabKey =
  | "dashboard"
  | "inventory"
  | "ocrReview"
  | "processingQueue"
  | "qc"
  | "audit"
  | "export"
  | "exception"
  | "users"
  | "roles";

export type RolePermission = {
  enabled: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  export: boolean;
};

export const pocAccessTabs: Array<{
  key: AccessTabKey;
  label: string;
  path: string;
  preset: boolean;
}> = [
  { key: "dashboard", label: "Dashboard", path: "/", preset: true },
  { key: "inventory", label: "Inventory", path: "/inventory", preset: true },
  { key: "ocrReview", label: "OCR Review", path: "/ocr-review-queue", preset: false },
  { key: "processingQueue", label: "Processing Queue", path: "/processing-queue", preset: false },
  { key: "qc", label: "QC", path: "/qc-review", preset: false },
  { key: "audit", label: "Audit", path: "/manual-review", preset: false },
  { key: "export", label: "Export", path: "/export", preset: false },
  { key: "exception", label: "Exception", path: "/exceptions", preset: true },
  { key: "users", label: "Users", path: "/users", preset: false },
  { key: "roles", label: "Roles", path: "/roles", preset: false },
];

export const optionalAccessTabKeys: AccessTabKey[] = [
  "ocrReview",
  "processingQueue",
  "qc",
  "audit",
  "export",
  "users",
  "roles",
];

const ROLES_STORAGE_KEY = "dataspan-access-roles";
const ACCESS_USERS_STORAGE_KEY = "dataspan-access-users";

type StoredRoleConfig = {
  name: string;
  permissions: Record<AccessTabKey, { enabled: boolean }>;
};

type StoredAccessUser = {
  email: string;
  overrides?: Partial<Record<AccessTabKey, boolean>>;
};

export const defaultRoleAccess: Record<string, AccessTabKey[]> = {
  Admin: ["ocrReview", "processingQueue", "qc", "audit", "export", "users", "roles"],
  "Super Admin": ["ocrReview", "processingQueue", "qc", "audit", "export", "users", "roles"],
  Manager: ["ocrReview", "processingQueue", "qc", "audit", "export"],
  "OCR Person": ["ocrReview", "processingQueue"],
  "QC Person": ["qc"],
  "Export Person": ["export"],
  "Audit Person": ["audit"],
  "Client User": [],
  "user-only": ["ocrReview"],
};

function readStoredRoleAccess(): Record<string, AccessTabKey[]> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return {};

    const storedRoles = JSON.parse(raw) as StoredRoleConfig[];
    if (!Array.isArray(storedRoles)) return {};

    return Object.fromEntries(
      storedRoles
        .filter((storedRole) => storedRole.name && storedRole.permissions)
        .map((storedRole) => [
          storedRole.name,
          pocAccessTabs
            .filter((tab) => !tab.preset && storedRole.permissions[tab.key]?.enabled)
            .map((tab) => tab.key),
        ]),
    ) as Record<string, AccessTabKey[]>;
  } catch {
    return {};
  }
}

export function getEnabledKeysForRole(role: string): AccessTabKey[] {
  return readStoredRoleAccess()[role] ?? defaultRoleAccess[role] ?? [];
}

function readStoredUserOverrides(email: string): Partial<Record<AccessTabKey, boolean>> {
  if (typeof window === "undefined" || !email) return {};

  try {
    const raw = window.localStorage.getItem(ACCESS_USERS_STORAGE_KEY);
    if (!raw) return {};

    const users = JSON.parse(raw) as StoredAccessUser[];
    if (!Array.isArray(users)) return {};

    const normalizedEmail = email.trim().toLowerCase();
    return users.find((user) => user.email.trim().toLowerCase() === normalizedEmail)?.overrides ?? {};
  } catch {
    return {};
  }
}

export function getAllowedKeysForUser(role: string, email?: string): Set<AccessTabKey> {
  const permissions = createRolePermissions(getEnabledKeysForRole(role));
  const overrides = email ? readStoredUserOverrides(email) : {};

  return new Set(
    pocAccessTabs
      .filter((tab) => tab.preset || (overrides[tab.key] ?? permissions[tab.key].enabled))
      .map((tab) => tab.key),
  );
}

export function getAllowedKeysForRole(role: string): Set<AccessTabKey> {
  return getAllowedKeysForUser(role);
}

export const rolePermissionActions: Array<keyof RolePermission> = [
  "view",
  "create",
  "edit",
  "approve",
  "export",
];

export const rolePermissionLabels: Record<keyof RolePermission, string> = {
  enabled: "Tab",
  view: "View",
  create: "Create",
  edit: "Edit",
  approve: "Approve",
  export: "Export",
};

export function createRolePermissions(enabledKeys: AccessTabKey[]): Record<AccessTabKey, RolePermission> {
  return Object.fromEntries(
    pocAccessTabs.map((tab) => {
      const enabled = tab.preset || enabledKeys.includes(tab.key);
      return [
        tab.key,
        {
          enabled,
          view: enabled,
          create: enabled && !["audit", "export", "dashboard"].includes(tab.key),
          edit: enabled && !["dashboard", "audit", "export"].includes(tab.key),
          approve: enabled && ["ocrReview", "qc", "exception", "export"].includes(tab.key),
          export: enabled && ["inventory", "audit", "export"].includes(tab.key),
        },
      ];
    }),
  ) as Record<AccessTabKey, RolePermission>;
}

export function getAvailableRoles(): string[] {
  const defaultRoles = [
    "Admin",
    "Super Admin",
    "Manager",
    "OCR Person",
    "QC Person",
    "Export Person",
    "Audit Person",
    "Client User",
    "user-only"
  ];

  if (typeof window === "undefined") return defaultRoles;

  try {
    const raw = window.localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return defaultRoles;

    const storedRoles = JSON.parse(raw);
    if (Array.isArray(storedRoles) && storedRoles.length > 0) {
      const storedNames = storedRoles
        .filter((role: any) => !role.status || role.status === "Active")
        .map((role: any) => role.name)
        .filter(Boolean);
      
      const allRoles = Array.from(new Set(["Admin", ...storedNames, ...defaultRoles]));
      return allRoles;
    }
  } catch {
    // ignore
  }

  return defaultRoles;
}

