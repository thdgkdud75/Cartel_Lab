import { API_BASE_URL } from "@/lib/api-client";
import type { FarmMe, Animal, FarmEvent } from "./types";

async function api<T>(endpoint: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    let code = `HTTP_${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code;
    } catch {
      /* ignore */
    }
    throw new Error(code);
  }
  return res.json();
}

export const farmApi = {
  me: (token: string) => api<FarmMe>("/farm/me", token),
  drawEgg: (token: string) =>
    api<{ animal: Animal; events: FarmEvent[] }>("/farm/eggs/draw", token, {
      method: "POST",
      body: JSON.stringify({ egg_type: "normal" }),
    }),
  pet: (token: string, id: number) =>
    api<{ events: FarmEvent[] }>(`/farm/animals/${id}/pet`, token, { method: "POST" }),
  feed: (token: string, id: number) =>
    api<{ events: FarmEvent[] }>(`/farm/animals/${id}/feed`, token, { method: "POST" }),
  rename: (token: string, id: number, nickname: string) =>
    api<Animal>(`/farm/animals/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ nickname }),
    }),
};
