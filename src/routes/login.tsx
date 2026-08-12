import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Eye, EyeOff, Lock, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getManagedLoginUsers, isAuthenticated, login } from "@/lib/auth";
import { getAvailableRoles } from "@/lib/access-management";
import { ChiaroLogo } from "@/components/brand/ChiaroLogo";
import { Btn } from "@/components/ui-kit";

const preLoginPassword = "N4@kP7!xR9#vL2&d";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && isAuthenticated()) {
      throw redirect({ to: "/workspace" });
    }
  },
  component: Login,
  head: () => ({ meta: [{ title: "Login - Chiaro OCR Inventory" }] }),
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [gatePassword, setGatePassword] = useState("");
  const [showGatePassword, setShowGatePassword] = useState(false);
  const [gateError, setGateError] = useState("");
  const [loginVisible, setLoginVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Admin");
  const [selectedUserEmail, setSelectedUserEmail] = useState("admin");
  const [roles, setRoles] = useState<string[]>([]);
  const [managedUsers, setManagedUsers] = useState(() => getManagedLoginUsers());

  useEffect(() => {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");

    const availableRoles = getAvailableRoles();
    setRoles(availableRoles);

    setEmail("info@chiaro");
    setPassword("dataspan@2026");
  }, []);


  useEffect(() => {
    const refreshUsers = () => setManagedUsers(getManagedLoginUsers());
    window.addEventListener("storage", refreshUsers);
    window.addEventListener("dataspan-users-change", refreshUsers);
    return () => {
      window.removeEventListener("storage", refreshUsers);
      window.removeEventListener("dataspan-users-change", refreshUsers);
    };
  }, []);

  const getActiveUsersForRole = (role: string) =>
    managedUsers.filter(
      (user) => user.role.toLowerCase() === role.toLowerCase() && user.status === "Active",
    );

  const fillUserCredentials = (userEmail: string, role = selectedRole) => {
    setSelectedUserEmail(userEmail);
    setError("");

    if (role === "Admin" && userEmail === "admin") {
      setEmail("info@chiaro");
      setPassword("dataspan@2026");
      return;
    }

    const matchedUser = managedUsers.find(
      (user) => user.email.trim().toLowerCase() === userEmail.trim().toLowerCase(),
    );

    if (matchedUser) {
      setEmail(matchedUser.email);
      setPassword(matchedUser.password);
    } else {
      setEmail("");
      setPassword("");
    }
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);

    if (role === "Admin") {
      fillUserCredentials("admin", role);
      return;
    }

    const firstUser = getActiveUsersForRole(role)[0];
    fillUserCredentials(firstUser?.email ?? "", role);
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Enter username and password to continue.");
      return;
    }

    const session = login(email, password);
    if (!session) {
      setError("Invalid login ID or password.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirect") || "/workspace";
    navigate({ to: redirectTo });
  }

  function handleGateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGateError("");

    if (gatePassword !== preLoginPassword) {
      setGateError("Enter the correct access password to continue.");
      return;
    }

    setLoginVisible(true);
  }


  const roleUsers = selectedRole === "Admin" ? [] : getActiveUsersForRole(selectedRole);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-sm">
          <ChiaroLogo className="mb-6" />

          {!loginVisible ? (
            <form
              onSubmit={handleGateSubmit}
              autoComplete="off"
              className="rounded-2xl border border-border glass p-5 shadow-elegant sm:p-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Secure access</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Enter the access password to open the login screen.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Access password</span>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showGatePassword ? "text" : "password"}
                      value={gatePassword}
                      onChange={(event) => {
                        setGatePassword(event.target.value);
                        if (gateError) setGateError("");
                      }}
                      autoComplete="new-password"
                      name="dataspan-access-password"
                      className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-10 text-sm focus:outline-none focus:border-primary/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGatePassword((visible) => !visible)}
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      aria-label={showGatePassword ? "Hide password" : "Show password"}
                      title={showGatePassword ? "Hide password" : "Show password"}
                    >
                      {showGatePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>

                {gateError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {gateError}
                  </div>
                )}

                <Btn type="submit" variant="primary" className="w-full">
                  Continue
                </Btn>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              autoComplete="off"
              className="rounded-2xl border border-border glass p-5 shadow-elegant sm:p-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Access the inventory OCR processing dashboard.
                </p>
              </div>

              <div className="mt-5 space-y-4">

                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/8 p-3">
                  <ShieldCheck className="mt-0.5 size-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Protected workflow console</div>
                    <div className="text-xs text-muted-foreground">
                      Sign in to access review queues and workflow actions.
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Sign in as</span>
                  <div className="relative mt-1.5">
                    <select
                      value={selectedRole}
                      onChange={(event) => handleRoleChange(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-card pl-3 pr-10 text-sm focus:outline-none focus:border-primary/60 appearance-none cursor-pointer"
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </label>

                {selectedRole !== "Admin" && (
                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">User</span>
                    <div className="relative mt-1.5">
                      <select
                        value={selectedUserEmail}
                        onChange={(event) => fillUserCredentials(event.target.value)}
                        className="h-10 w-full rounded-lg border border-border bg-card pl-3 pr-10 text-sm focus:outline-none focus:border-primary/60 appearance-none cursor-pointer"
                      >
                        {roleUsers.length === 0 ? (
                          <option value="">No active users for this role</option>
                        ) : (
                          roleUsers.map((user) => (
                            <option key={user.email} value={user.email}>
                              {user.name} - {user.email}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </label>
                )}
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Email</span>
                  <div className="relative mt-1.5">
                    <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="off"
                      name="dataspan-login-id"
                      className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm focus:outline-none focus:border-primary/60"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Password</span>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="new-password"
                      name="dataspan-login-password"
                      className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-10 text-sm focus:outline-none focus:border-primary/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input type="checkbox" className="size-4 rounded border-border" defaultChecked />
                    Remember this device
                  </label>
                  <button className="text-primary hover:underline">Forgot password?</button>
                </div>

                <Btn type="submit" variant="primary" className="w-full">
                  Sign in to dashboard
                </Btn>


              </div>
            </form>
          )}
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Chiaro - Secure operations console
          </p>
        </div>
      </main>
    </div>
  );
}











