import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export const apiService = {
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
    const response = await api.get<{ success: boolean; data: T }>(url, { params });
    return response.data.data;
  },

  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await api.post<{ success: boolean; data: T }>(url, data);
    return response.data.data;
  },

  put: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await api.put<{ success: boolean; data: T }>(url, data);
    return response.data.data;
  },

  delete: async <T>(url: string): Promise<T> => {
    const response = await api.delete<{ success: boolean; data: T }>(url);
    return response.data.data;
  },
};
