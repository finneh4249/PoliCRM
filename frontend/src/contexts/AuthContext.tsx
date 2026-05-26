import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface User {
  id: string;
  name: string;
  email: string;
  role: "sys_admin" | "state_secretary" | "branch_organiser" | "volunteer" | "read_only";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/* ─── Context ────────────────────────────────────────────────────────────── */
const AuthContext = createContext<AuthContextType | null>(null);

/* ─── Stub data ──────────────────────────────────────────────────────────── */
// TODO: Replace with real auth (Firebase or otherwise) in Phase 2.
const STUB_USER: User = {
  id: "stub-001",
  name: "Demo User",
  email: "admin@policrm.au",
  role: "sys_admin",
};

const STORAGE_KEY = "policrm_stub_auth";

/* ─── Provider ───────────────────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        // Validate required shape before trusting stored data
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          "id" in parsed &&
          "name" in parsed &&
          "email" in parsed &&
          "role" in parsed
        ) {
          setUser(parsed as User);
        } else {
          console.error("Invalid auth payload in storage; clearing.", STORAGE_KEY);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error("Failed to restore auth session from storage:", STORAGE_KEY, err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    if (import.meta.env.MODE !== "development") {
      throw new Error("Authentication is not yet configured for production.");
    }
    // Dev stub: accept any credentials.
    // TODO: Replace with real auth (Firebase or otherwise) in Phase 2.
    await new Promise((r) => setTimeout(r, 600)); // Simulate network delay
    setUser(STUB_USER);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STUB_USER));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
