import { api } from "@/lib/api";
import type { AdminUser } from "@/types";

interface LoginResponse {
  message: string;
  temp_token: string;
}

interface VerifyOtpResponse {
  token: string;
  user: AdminUser;
}

export const adminAuthService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/admin/auth/login", {
      email,
      password,
    });
    return data;
  },

  async verifyOtp(tempToken: string, code: string): Promise<VerifyOtpResponse> {
    const { data } = await api.post<VerifyOtpResponse>("/admin/auth/verify-otp", {
      temp_token: tempToken,
      code,
    });

    if (data.token) {
      localStorage.setItem("esonoya_admin_token", data.token);
      localStorage.setItem("esonoya_admin_user", JSON.stringify(data.user));
    }

    return data;
  },

  async logout(): Promise<void> {
    await api.post("/admin/auth/logout").catch(() => null);
    localStorage.removeItem("esonoya_admin_token");
    localStorage.removeItem("esonoya_admin_user");
  },

  isAuthenticated(): boolean {
    return (
      typeof window !== "undefined" &&
      !!localStorage.getItem("esonoya_admin_token")
    );
  },

  getStoredUser(): AdminUser | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("esonoya_admin_user");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AdminUser;
    } catch {
      return null;
    }
  },
};
