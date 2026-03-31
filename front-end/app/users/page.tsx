"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { Routes, ApiPaths, Methods } from "@/constants/enums";
import type { User, Profile } from "@/types/user";

export default function MyPage() {
  const { data: session } = useSession();
  const authFetch = useAuthFetch();
  const [me, setMe] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("github") === "success") {
      window.history.replaceState({}, "", "/users");
    }

    Promise.all([
      authFetch(`${Routes.AUTH}${ApiPaths.ME}`).then(setMe).catch(() => null),
      authFetch(`${Routes.AUTH}${ApiPaths.PROFILE}`).then(setProfile).catch(() => null),
    ]).finally(() => setProfileLoading(false));
  }, [session]);

  const name = me?.name ?? session?.user?.name ?? "";
  const DEFAULT_PROFILE_IMAGES = ["/images/default_01.png", "/images/default_02.png", "/images/default_03.png", "/images/default_04.png"];
  // 헤더와 동일한 로직
  const profileImage = me?.profile_image || (session?.user
    ? (session.user.image || DEFAULT_PROFILE_IMAGES[Number(session.user.id) % DEFAULT_PROFILE_IMAGES.length])
    : null);

  async function handleGithubConnect() {
    setGithubLoading(true);
    try {
      const callbackUri = `${window.location.origin}/api/github/callback`;
      const data = await authFetch(
        `${Routes.AUTH}${ApiPaths.GITHUB_CONNECT}?redirect_uri=${encodeURIComponent(callbackUri)}`
      );
      window.location.href = data.oauth_url;
    } catch {
      setGithubLoading(false);
    }
  }

  async function handleGithubDisconnect() {
    await authFetch(`${Routes.AUTH}${ApiPaths.PROFILE_GITHUB}`, {
      method: Methods.POST,
      body: JSON.stringify({ github_url: "" }),
    }).catch(() => null);
    setProfile((prev) => prev ? { ...prev, github_url: "", github_username: "" } : prev);
  }

  return (
    <div className="bg-[#f5f6f8] min-h-screen px-6 py-8">
      <div className="mx-auto max-w-[1380px]">
      <div style={{ background: "#fff", borderRadius: 28, border: "1px solid #e8eaed", overflow: "hidden" }}>

        {/* 히어로는 카드 안에 바로, 나머지는 패딩 영역 안에 */}
        <div style={{ display: "grid", gap: 20, padding: "0 0 28px" }}>

        {/* 히어로 */}
        <div style={{
          padding: 28, borderRadius: 26, border: "1px solid #ebecef",
          background: "radial-gradient(circle at top right,rgba(255,111,15,0.14),transparent 26%),linear-gradient(180deg,#fff7f2 0%,#ffffff 100%)",
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "4px 12px",
            borderRadius: 999, background: "#fff0e7", color: "#c2560c",
            fontSize: 13, fontWeight: 700, marginBottom: 16,
          }}>
            학생 프로필
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
            {/* 프로필 사진 */}
            {profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImage} alt="프로필"
                style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e5e9", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "#dbeafe", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 32, fontWeight: 700,
                color: "#1d4ed8", border: "3px solid #e2e5e9", flexShrink: 0,
              }}>
                {name.slice(0, 1)}
              </div>
            )}
            <div>
              <h1 style={{ margin: "0 0 4px", fontSize: "clamp(28px,4vw,44px)", letterSpacing: "-0.04em" }}>
                {name}님의 분석 프로필
              </h1>
            </div>
          </div>

          {/* 메타 pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {me?.student_id && (
              <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 999, background: "#f6f7f9", color: "#5f6672", fontSize: 14, fontWeight: 700 }}>
                학번 {me.student_id}
              </span>
            )}
            {me?.grade && (
              <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 999, background: "#f6f7f9", color: "#5f6672", fontSize: 14, fontWeight: 700 }}>
                {me.grade}학년
              </span>
            )}
            {me?.class_group && (
              <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 999, background: "#f6f7f9", color: "#5f6672", fontSize: 14, fontWeight: 700 }}>
                {me.class_group}반
              </span>
            )}
            {profile?.github_username && (
              <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 999, background: "#f6f7f9", color: "#5f6672", fontSize: 14, fontWeight: 700 }}>
                GitHub @{profile.github_username}
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 999, background: "#f6f7f9", color: "#5f6672", fontSize: 14, fontWeight: 700 }}>
              마지막 분석{" "}
              {profile?.profile_analyzed_at
                ? new Date(profile.profile_analyzed_at).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                : "Unknown"}
            </span>
          </div>
        </div>

        {/* 패널 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,0.95fr)", gap: 18, alignItems: "start" }}>

          {/* GitHub 연동 */}
          <section style={{ padding: 24, border: "1px solid #ebecef", borderRadius: 22, background: "#fff" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, letterSpacing: "-0.03em" }}>GitHub 연동</h2>
            <p style={{ margin: "0 0 18px", color: "#6b7280", lineHeight: 1.7 }}>
              GitHub를 연동하면 프로젝트 기반으로 맞춤 분석을 받을 수 있습니다.
            </p>
            {profileLoading ? (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>불러오는 중...</p>
            ) : profile?.github_username ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px solid #e2e5e9", borderRadius: 12, background: "#f9f9fb" }}>
                <span style={{ fontWeight: 600 }}>@{profile.github_username}</span>
                <button
                  onClick={handleGithubDisconnect}
                  style={{ marginLeft: "auto", fontSize: 13, color: "#c2410c", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  연동 해제
                </button>
              </div>
            ) : (
              <button
                onClick={handleGithubConnect}
                disabled={githubLoading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 16px", border: "1px solid #e2e5e9", borderRadius: 12,
                  background: "#fff", color: "#333", fontSize: 14, fontWeight: 600,
                  cursor: githubLoading ? "not-allowed" : "pointer", opacity: githubLoading ? 0.5 : 1,
                }}
              >
                {githubLoading ? "이동 중..." : "GitHub 연동하기"}
              </button>
            )}
          </section>

          {/* 이력서 등록 */}
          <section style={{ padding: 24, border: "1px solid #ebecef", borderRadius: 22, background: "#fff" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, letterSpacing: "-0.03em" }}>이력서 등록</h2>
            <p style={{ margin: "0 0 18px", color: "#6b7280", lineHeight: 1.7 }}>
              PDF 또는 텍스트 파일을 업로드하면 AI가 분석해드립니다.
            </p>
            <button
              disabled
              style={{ padding: "10px 16px", border: "1px solid #dfe3ea", borderRadius: 12, background: "#fff", fontSize: 14, fontWeight: 600, opacity: 0.45, cursor: "not-allowed" }}
            >
              준비 중
            </button>
          </section>
        </div>

        {/* AI 분석 결과 */}
        <section style={{ padding: 24, border: "1px solid #ebecef", borderRadius: 22, background: "#fff" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, letterSpacing: "-0.03em" }}>저장된 분석 결과</h2>
          {profile?.remaining_analysis_count !== undefined && (
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13 }}>
              오늘 남은 횟수 {profile.remaining_analysis_count}회
            </p>
          )}
          {profile?.profile_analyzed_at ? (
            <div style={{ display: "grid", gap: 16 }}>
              {profile.ai_profile_summary && (
                <article style={{ padding: 18, borderRadius: 18, background: "#fbfbfc", border: "1px solid #eef0f3" }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 17, letterSpacing: "-0.02em" }}>AI 요약</h3>
                  <p style={{ margin: 0, color: "#39404a", lineHeight: 1.7 }}>{profile.ai_profile_summary}</p>
                </article>
              )}
              {profile.github_profile_summary && (
                <article style={{ padding: 18, borderRadius: 18, background: "#fbfbfc", border: "1px solid #eef0f3" }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 17, letterSpacing: "-0.02em" }}>GitHub 분석</h3>
                  <p style={{ margin: 0, color: "#39404a", lineHeight: 1.7 }}>{profile.github_profile_summary}</p>
                </article>
              )}
              {profile.resume_analysis_summary && (
                <article style={{ padding: 18, borderRadius: 18, background: "#fbfbfc", border: "1px solid #eef0f3" }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 17, letterSpacing: "-0.02em" }}>이력서 분석</h3>
                  <p style={{ margin: 0, color: "#39404a", lineHeight: 1.7 }}>{profile.resume_analysis_summary}</p>
                </article>
              )}
            </div>
          ) : (
            <p style={{ color: "#6b7280", lineHeight: 1.7 }}>
              GitHub 또는 이력서를 등록하면 AI 분석 결과가 여기에 표시됩니다.
            </p>
          )}
        </section>

        </div>
      </div>
      </div>
    </div>
  );
}
