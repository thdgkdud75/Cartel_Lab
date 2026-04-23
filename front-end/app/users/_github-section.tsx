"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { Routes, ApiPaths, Methods } from "@/constants/enums";
import type { Profile } from "@/types/user";

type Props = {
  profile: Profile | null;
  profileLoading: boolean;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  onRefresh: () => Promise<void>;
};

export function GithubSection({ profile, profileLoading, setProfile, onRefresh }: Props) {
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const callbackUri = `${window.location.origin}/api/github/callback`;
      const data = await authFetch(
        `${Routes.AUTH}${ApiPaths.GITHUB_CONNECT}?redirect_uri=${encodeURIComponent(callbackUri)}`
      );
      window.location.href = data.oauth_url;
    } catch {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await authFetch(`${Routes.AUTH}${ApiPaths.PROFILE_GITHUB}`, {
      method: Methods.POST,
      body: JSON.stringify({ github_url: "" }),
    }).catch(() => null);
    setProfile((prev) => prev ? { ...prev, github_url: "", github_username: "" } : prev);
    await onRefresh().catch(() => null);
  }

  return (
    <section style={{ padding: 24, border: "1px solid #ebecef", borderRadius: 22, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "#f0f0f0", flexShrink: 0 }}>
          <Image src="/icons/github.svg" alt="" aria-hidden="true" width={20} height={20} />
        </span>
        <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.03em" }}>GitHub 연동</h2>
      </div>
      <p style={{ margin: "0 0 18px", color: "#6b7280", lineHeight: 1.7 }}>
        GitHub를 연동하면 프로젝트 기반으로 맞춤 분석을 받을 수 있습니다.
      </p>
      {profileLoading ? (
        <p style={{ color: "#9ca3af", fontSize: 14 }}>불러오는 중...</p>
      ) : profile?.github_username ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px solid #e2e5e9", borderRadius: 12, background: "#f9f9fb" }}>
          <Image src="/icons/github.svg" alt="" aria-hidden="true" width={16} height={16} />
          <span style={{ fontWeight: 600 }}>@{profile.github_username}</span>
          <button
            onClick={handleDisconnect}
            style={{ marginLeft: "auto", fontSize: 13, color: "#c2410c", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            연동 해제
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 16px", border: "1px solid #e2e5e9", borderRadius: 12,
            background: "#fff", color: "#333", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
          }}
        >
          <Image src="/icons/github.svg" alt="" aria-hidden="true" width={16} height={16} />
          {loading ? "이동 중..." : "GitHub 연동하기"}
        </button>
      )}
    </section>
  );
}
