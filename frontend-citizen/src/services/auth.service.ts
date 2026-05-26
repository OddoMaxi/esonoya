import { api } from "@/lib/api";
import type { AuthUser } from "@/types";

interface SendOtpResponse {
  message: string;
  expires_in: number;
}

interface VerifyOtpResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  async sendOtp(phone: string): Promise<SendOtpResponse> {
    const { data } = await api.post<SendOtpResponse>("/auth/send-otp", { phone });
    return data;
  },

  async verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
    const { data } = await api.post<VerifyOtpResponse>("/auth/verify-otp", { phone, code });

    if (data.token) {
      localStorage.setItem("esonoya_token", data.token);
    }

    return data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout").catch(() => null);
    localStorage.removeItem("esonoya_token");
  },

  isAuthenticated(): boolean {
    return typeof window !== "undefined" && !!localStorage.getItem("esonoya_token");
  },
};
