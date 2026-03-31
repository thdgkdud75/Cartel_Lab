"use client";

import { useSession } from "next-auth/react";
import { useCallback, useRef } from "react";
import { API_BASE_URL } from "./api-client";

export function useAuthFetch() {
  const { data: session } = useSession();
  // 갱신된 access_token을 캐싱 (NextAuth 세션은 30분 만료 후 갱신 안 됨)
  const tokenRef = useRef<string | null>(null);

  const authFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const token = tokenRef.current ?? session?.user?.access_token;

      const buildHeaders = (tok?: string | null): Record<string, string> => {
        const base = options.headers as Record<string, string> | undefined;
        const h: Record<string, string> = { ...(base ?? {}) };
        // FormData는 브라우저가 Content-Type(boundary 포함)을 자동 설정하므로 수동 지정 금지
        if (!(options.body instanceof FormData)) {
          h["Content-Type"] = "application/json";
        }
        if (tok) {
          h["Authorization"] = `Bearer ${tok}`;
        }
        return h;
      };

      const doFetch = (tok?: string | null) =>
        fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: buildHeaders(tok),
          credentials: "include",
        });

      let response = await doFetch(token);

      // 401이면 refresh_token 쿠키로 토큰 갱신 후 재시도
      if (response.status === 401) {
        try {
          const refreshResp = await fetch(`${API_BASE_URL}/auth/refresh/`, {
            method: "POST",
            credentials: "include",
          });
          if (refreshResp.ok) {
            const data = await refreshResp.json();
            tokenRef.current = data.access_token;
            response = await doFetch(tokenRef.current);
          }
        } catch {
          // refresh 자체 실패 시 원본 401 에러로 처리
        }
      }

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      return response.json();
    },
    [session]
  );

  return authFetch;
}
