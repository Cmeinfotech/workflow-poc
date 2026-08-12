export const AUTH_STORAGE_KEY = "dataspan-auth-session";
export const MANAGED_USERS_STORAGE_KEY = "dataspan-managed-users";
export const MANAGED_DELETED_USERS_STORAGE_KEY = "dataspan-managed-deleted-users";
export const LOGIN_ID = "info@chiaro";
export const LOGIN_PASSWORD = "dataspan@2026";
const AUTH_VERSION = 2;

export type AuthSession = {
  email: string;
  name: string;
  role: string;
  version: number;
};

export type ManagedLoginUser = {
  email: string;
  name: string;
  role: string;
  status: "Active" | "Inactive";
  password: string;
};

const defaultSession: AuthSession = {
  email: LOGIN_ID,
  name: "Admin User",
  role: "Admin",
  version: AUTH_VERSION,
};

const seededManagedLoginUsers: ManagedLoginUser[] = [
  { email: "aarav@acmecorp.com", name: "Aarav Sharma", role: "Super Admin", status: "Active", password: "pass@123" },
  { email: "priya@acmecorp.com", name: "Priya Iyer", role: "Manager", status: "Active", password: "pass@123" },
  { email: "rohan@acmecorp.com", name: "Rohan Khan", role: "OCR Person", status: "Active", password: "pass@123" },
  { email: "meera@acmecorp.com", name: "Meera Verma", role: "OCR Person", status: "Active", password: "pass@123" },
  { email: "sara@acmecorp.com", name: "Sara Nair", role: "Audit Person", status: "Active", password: "pass@123" },
  { email: "vikram@acmecorp.com", name: "Vikram Patel", role: "Manager", status: "Inactive", password: "pass@123" },
  { email: "neha@acmecorp.com", name: "Neha Gupta", role: "Client User", status: "Inactive", password: "pass@123" },
  { email: "nandini.kotkar@acmecorp.com", name: "Nandini Kotkar", role: "user-only", status: "Active", password: "pass@123" },
];

function saveSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("dataspan-auth-change"));
  return session;
}

function readStoredManagedLoginUsers(): ManagedLoginUser[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(MANAGED_USERS_STORAGE_KEY);
    if (!raw) return [];
    const users = JSON.parse(raw) as ManagedLoginUser[];
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function readDeletedManagedLoginUserEmails(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(MANAGED_DELETED_USERS_STORAGE_KEY);
    if (!raw) return [];

    const emails = JSON.parse(raw) as string[];
    return Array.isArray(emails) ? emails : [];
  } catch {
    return [];
  }
}

function saveDeletedManagedLoginUserEmails(emails: string[]) {
  window.localStorage.setItem(MANAGED_DELETED_USERS_STORAGE_KEY, JSON.stringify(emails));
}

export function getManagedLoginUsers(): ManagedLoginUser[] {
  const storedUsers = readStoredManagedLoginUsers();
  const storedEmails = new Set(storedUsers.map((user) => user.email.trim().toLowerCase()));
  const deletedEmails = new Set(readDeletedManagedLoginUserEmails());

  return [
    ...storedUsers,
    ...seededManagedLoginUsers.filter((user) => {
      const email = user.email.trim().toLowerCase();
      return !storedEmails.has(email) && !deletedEmails.has(email);
    }),
  ];
}

export function saveManagedLoginUser(user: ManagedLoginUser) {
  if (typeof window === "undefined") return;

  const normalizedEmail = user.email.trim().toLowerCase();
  const nextUsers = [
    user,
    ...readStoredManagedLoginUsers().filter(
      (existingUser) => existingUser.email.trim().toLowerCase() !== normalizedEmail,
    ),
  ];
  const nextDeletedEmails = readDeletedManagedLoginUserEmails().filter(
    (email) => email !== normalizedEmail,
  );

  window.localStorage.setItem(MANAGED_USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  saveDeletedManagedLoginUserEmails(nextDeletedEmails);
  window.dispatchEvent(new Event("dataspan-users-change"));
}

export function removeManagedLoginUser(email: string) {
  if (typeof window === "undefined") return;

  const normalizedEmail = email.trim().toLowerCase();
  const nextUsers = readStoredManagedLoginUsers().filter(
    (user) => user.email.trim().toLowerCase() !== normalizedEmail,
  );
  const nextDeletedEmails = Array.from(
    new Set([...readDeletedManagedLoginUserEmails(), normalizedEmail]),
  );

  window.localStorage.setItem(MANAGED_USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  saveDeletedManagedLoginUserEmails(nextDeletedEmails);
  window.dispatchEvent(new Event("dataspan-users-change"));
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as AuthSession;
    if (session.version !== AUTH_VERSION) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getAuthSession());
}

export function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();
  const validLoginIds = [LOGIN_ID, `${LOGIN_ID}.com`];

  if (validLoginIds.includes(normalizedEmail) && normalizedPassword === LOGIN_PASSWORD) {
    return saveSession({
      ...defaultSession,
      email: LOGIN_ID,
    });
  }

  const managedUser = getManagedLoginUsers().find(
    (user) => user.email.trim().toLowerCase() === normalizedEmail,
  );
  if (!managedUser || managedUser.status !== "Active" || managedUser.password !== normalizedPassword) {
    return null;
  }

  return saveSession({
    email: managedUser.email,
    name: managedUser.name,
    role: managedUser.role,
    version: AUTH_VERSION,
  });
}

export function loginWithProvider(provider: "Slack" | "Microsoft Teams") {
  return saveSession({
    ...defaultSession,
    name: `${provider} User`,
  });
}

export function logout() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event("dataspan-auth-change"));
}






