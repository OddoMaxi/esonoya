import { api } from "@/lib/api";
import type { ApiResponse, Center } from "@/types";

export const centersService = {
  async list(): Promise<Center[]> {
    const { data } = await api.get<ApiResponse<Center[]>>("/admin/centers");
    return data.data;
  },

  async create(payload: Omit<Center, "id">): Promise<Center> {
    const { data } = await api.post<ApiResponse<Center>>("/admin/centers", payload);
    return data.data;
  },

  async update(id: string, payload: Partial<Omit<Center, "id">>): Promise<Center> {
    const { data } = await api.put<ApiResponse<Center>>(`/admin/centers/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/centers/${id}`);
  },
};
