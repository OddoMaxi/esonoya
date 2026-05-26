import { api } from "@/lib/api";
import type { ApiResponse, CenterClosure, PublicHoliday, Quota } from "@/types";

export const quotaService = {
  // ── Quotas ──────────────────────────────────────────────────

  async list(centerId: string, month?: string): Promise<Quota[]> {
    const params: Record<string, string> = { center_id: centerId };
    if (month) params.month = month;
    const { data } = await api.get<ApiResponse<Quota[]>>("/admin/quotas", { params });
    return data.data;
  },

  async create(payload: {
    center_id: string;
    date: string;
    total_slots: number;
  }): Promise<Quota> {
    const { data } = await api.post<ApiResponse<Quota>>("/admin/quotas", payload);
    return data.data;
  },

  async update(quotaId: string, totalSlots: number): Promise<Quota> {
    const { data } = await api.put<ApiResponse<Quota>>(`/admin/quotas/${quotaId}`, {
      total_slots: totalSlots,
    });
    return data.data;
  },

  async remove(quotaId: string): Promise<void> {
    await api.delete(`/admin/quotas/${quotaId}`);
  },

  async bulk(payload: {
    center_id: string;
    date_from: string;
    date_to: string;
    total_slots: number;
    skip_weekends?: boolean;
    overwrite?: boolean;
  }): Promise<{ created: number; message: string }> {
    const { data } = await api.post("/admin/quotas/bulk", payload);
    return data;
  },

  async suspend(quotaId: string, reason?: string): Promise<Quota> {
    const { data } = await api.patch<ApiResponse<Quota>>(
      `/admin/quotas/${quotaId}/suspend`,
      { reason }
    );
    return data.data;
  },

  async reactivate(quotaId: string): Promise<Quota> {
    const { data } = await api.patch<ApiResponse<Quota>>(
      `/admin/quotas/${quotaId}/reactivate`
    );
    return data.data;
  },

  // ── Fermetures ───────────────────────────────────────────────

  async listClosures(centerId: string): Promise<CenterClosure[]> {
    const { data } = await api.get<ApiResponse<CenterClosure[]>>("/admin/center-closures", {
      params: { center_id: centerId },
    });
    return data.data;
  },

  async createClosure(payload: {
    center_id: string;
    date_from: string;
    date_to: string;
    reason?: string;
  }): Promise<CenterClosure> {
    const { data } = await api.post<ApiResponse<CenterClosure>>(
      "/admin/center-closures",
      payload
    );
    return data.data;
  },

  async deleteClosure(id: string): Promise<void> {
    await api.delete(`/admin/center-closures/${id}`);
  },

  // ── Jours fériés ─────────────────────────────────────────────

  async listHolidays(): Promise<PublicHoliday[]> {
    const { data } = await api.get<ApiResponse<PublicHoliday[]>>("/admin/public-holidays");
    return data.data;
  },

  async createHoliday(payload: {
    name: string;
    date: string;
    is_recurring?: boolean;
    description?: string;
  }): Promise<PublicHoliday> {
    const { data } = await api.post<ApiResponse<PublicHoliday>>(
      "/admin/public-holidays",
      payload
    );
    return data.data;
  },

  async deleteHoliday(id: string): Promise<void> {
    await api.delete(`/admin/public-holidays/${id}`);
  },
};
