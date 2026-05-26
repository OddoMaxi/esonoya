import { api } from "@/lib/api";
import type { Appointment, ApiResponse, PaginatedResponse, AppointmentFilters } from "@/types";

export const appointmentsService = {
  async list(filters: AppointmentFilters = {}): Promise<PaginatedResponse<Appointment>> {
    const { data } = await api.get<PaginatedResponse<Appointment>>("/admin/appointments", {
      params: filters,
    });
    return data;
  },

  async get(id: string): Promise<Appointment> {
    const { data } = await api.get<ApiResponse<Appointment>>(`/admin/appointments/${id}`);
    return data.data;
  },

  async updateStatus(
    id: string,
    status: string,
    reason?: string
  ): Promise<Appointment> {
    const { data } = await api.patch<ApiResponse<Appointment>>(
      `/admin/appointments/${id}/status`,
      { status, reason }
    );
    return data.data;
  },

  async downloadPdf(id: string): Promise<void> {
    const response = await api.get(`/admin/appointments/${id}/pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data as BlobPart], { type: "application/pdf" });
    const url  = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticket-rdv-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  exportUrl(filters: AppointmentFilters = {}): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== "") params.set(k, String(v));
    });
    const token = localStorage.getItem("esonoya_admin_token");
    params.set("token", token ?? "");
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
    return `${base}/admin/appointments/export?${params.toString()}`;
  },
};
