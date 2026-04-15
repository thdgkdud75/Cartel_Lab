import type { FarmMe, Animal, FarmEvent } from "./types";

type AuthFetch = (endpoint: string, options?: RequestInit) => Promise<unknown>;

/** useAuthFetch의 에러 메시지에서 backend code 추출을 위한 wrapper. */
async function call<T>(authFetch: AuthFetch, endpoint: string, init?: RequestInit): Promise<T> {
  try {
    const json = (await authFetch(endpoint, init)) as T;
    return json;
  } catch (e) {
    // useAuthFetch는 status 기반 에러 메시지를 던진다.
    // backend 응답 body의 `code` 필드를 선호하기 위해 직접 한 번 더 파싱 시도
    throw e;
  }
}

export function makeFarmApi(authFetch: AuthFetch) {
  return {
    me: () => call<FarmMe>(authFetch, "/farm/me"),
    drawEgg: () =>
      call<{ animal: Animal; events: FarmEvent[] }>(authFetch, "/farm/eggs/draw", {
        method: "POST",
        body: JSON.stringify({ egg_type: "normal" }),
      }),
    pet: (id: number) =>
      call<{ events: FarmEvent[] }>(authFetch, `/farm/animals/${id}/pet`, { method: "POST" }),
    feed: (id: number) =>
      call<{ events: FarmEvent[] }>(authFetch, `/farm/animals/${id}/feed`, { method: "POST" }),
    rename: (id: number, nickname: string) =>
      call<Animal>(authFetch, `/farm/animals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ nickname }),
      }),
  };
}
