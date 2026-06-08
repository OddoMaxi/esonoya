import { api } from "@/lib/api";
import type { Appointment, BookingFormData, Center, Quota, ApiResponse } from "@/types";

export const appointmentService = {
  async getCenters(): Promise<Center[]> {
    const { data } = await api.get<ApiResponse<Center[]>>("/centers");
    return data.data;
  },

  async getAvailableDates(centerId: string): Promise<Quota[]> {
    const { data } = await api.get<ApiResponse<Quota[]>>(
      `/centers/${centerId}/available-dates`
    );
    return data.data;
  },

  async createAppointment(payload: BookingFormData): Promise<Appointment> {
    const { data } = await api.post<ApiResponse<Appointment>>("/appointments", payload);
    return data.data;
  },

  async getAppointment(id: string): Promise<Appointment> {
    const { data } = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    return data.data;
  },

  async getMyAppointments(): Promise<Appointment[]> {
    const { data } = await api.get<ApiResponse<Appointment[]>>("/my-appointments");
    return data.data;
  },

  async cancelAppointment(id: string, reason: string): Promise<void> {
    await api.delete(`/appointments/${id}`, { data: { reason } });
  },

  getPdfUrl(id: string): string {
    const token = typeof window !== "undefined" ? localStorage.getItem("esonoya_token") : null;
    return `/api/pdf/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  },

  async downloadPdf(id: string, _reference: string): Promise<void> {
    const url = appointmentService.getPdfUrl(id);
    window.open(url, "_blank", "noopener");
  },

  getFicheUrl(id: string): string {
    const token = typeof window !== "undefined" ? localStorage.getItem("esonoya_token") : null;
    return `/api/fiche/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  },

  async downloadFiche(id: string): Promise<void> {
    const url = appointmentService.getFicheUrl(id);
    window.open(url, "_blank", "noopener");
  },
};
