import { api } from "@/lib/api";
import type { ApiResponse, DashboardStats } from "@/types";

export const statsService = {
  async get(centerId?: string): Promise<DashboardStats> {
    const params = centerId ? { center_id: centerId } : {};
    const { data } = await api.get<ApiResponse<DashboardStats>>("/admin/stats", { params });
    return data.data;
  },

  exportUrl(params: Record<string, string> = {}): string {
    const qs = new URLSearchParams(params);
    const token = localStorage.getItem("esonoya_admin_token");
    qs.set("token", token ?? "");
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
    return `${base}/admin/stats/export?${qs.toString()}`;
  },
};
