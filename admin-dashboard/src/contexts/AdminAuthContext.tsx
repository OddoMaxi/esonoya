"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { adminAuthService } from "@/services/admin-auth.service";
import type { AdminUser } from "@/types";

interface AdminAuthContextValue {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  logout: () => Promise<void>;
  setAdmin: (admin: AdminUser) => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdminState] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = adminAuthService.getStoredUser();
    const token = localStorage.getItem("esonoya_admin_token");

    if (stored && token) {
      setAdminState(stored);
    }
    setIsLoading(false);
  }, []);

  const setAdmin = useCallback((user: AdminUser) => {
    setAdminState(user);
  }, []);

  const logout = useCallback(async () => {
    await adminAuthService.logout();
    setAdminState(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!admin) return false;
      // super-admin a tout
      if (admin.roles.includes("super-admin")) return true;
      return admin.permissions.includes(permission);
    },
    [admin]
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!admin) return false;
      return admin.roles.includes(role);
    },
    [admin]
  );

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        hasPermission,
        hasRole,
        logout,
        setAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error("useAdminAuth doit être utilisé dans <AdminAuthProvider>");
  return ctx;
}
