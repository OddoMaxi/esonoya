import axios, { AxiosError } from "axios";
import type { ApiError } from "@/types";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Injecter le token Bearer si présent dans le localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("esonoya_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Gestion centralisée des erreurs
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("esonoya_token");
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.message ?? "Une erreur est survenue.";
  }
  if (error instanceof Error) return error.message;
  return "Une erreur est survenue.";
}
