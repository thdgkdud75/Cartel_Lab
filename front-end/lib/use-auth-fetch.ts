"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { API_BASE_URL } from "./api-client";

export function useAuthFetch() {
  const { data: session, update } = useSession();
  const accessToken = session?.user?.access_token ?? null;

  const authFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const buildHeaders = (token?: string | null): Record<string, string> => {
        const base = options.headers as Record<string, string> | undefined;
        const h: Record<string, string> = { ...(base ?? {}) };
        if (!(options.body instanceof FormData)) {
          h["Content-Type"] = "application/json";
        }
        if (token) {
          h["Authorization"] = `Bearer ${token}`;
        }
        return h;
      };

      const doFetch = (token?: string | null) =>
        fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: buildHeaders(token),
          credentials: "include",
        });

      let response = await doFetch(accessToken);

      // 401이면 NextAuth 세션 갱신 (jwt 콜백에서 refresh_token으로 서버사이드 재발급)
      if (response.status === 401) {
        const newSession = await update();
        const newToken = newSession?.user?.access_token;
        if (newToken) {
          response = await doFetch(newToken);
        }
      }

      if (!response.ok) {
        let errorMessage = `API 오류: ${response.status}`;

        try {
          const data = await response.json();
          if (typeof data?.error === "string" && data.error.trim()) {
            errorMessage = data.error;
          } else if (typeof data?.detail === "string" && data.detail.trim()) {
            errorMessage = data.detail;
          } else if (typeof data?.message === "string" && data.message.trim()) {
            errorMessage = data.message;
          }
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }

        throw new Error(errorMessage);
      }

      return response.json();
    },
    [accessToken, update]
  );

  return authFetch;
}
