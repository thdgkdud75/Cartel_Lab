/** API 클라이언트 서버 주소*/

import { DEV_API_URL } from "@/constants/urls";

// 브라우저(클라이언트)에서 사용하는 URL — NEXT_PUBLIC_ 이라 브라우저에서 읽힘
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || DEV_API_URL;

// 서버 사이드(Next.js 서버)에서 사용하는 URL — 도커 내부 네트워크 주소
export const INTERNAL_API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEV_API_URL;

export async function dbFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  return response.json();
}

// 서버 사이드 전용 fetch (Next.js 서버 → 백엔드 내부 통신)
export async function serverFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${INTERNAL_API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  return response.json();
}
