import { api } from "@/lib/api";
import type { AdminUser, ApiResponse } from "@/types";

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  center_id?: string;
  role: string;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  center_id?: string | null;
  role?: string;
  is_active?: boolean;
}

export const usersService = {
  async list(): Promise<AdminUser[]> {
    const { data } = await api.get<ApiResponse<AdminUser[]>>("/admin/users");
    return data.data;
  },

  async create(payload: CreateUserPayload): Promise<AdminUser> {
    const { data } = await api.post<ApiResponse<AdminUser>>("/admin/users", payload);
    return data.data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
    const { data } = await api.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },
};
