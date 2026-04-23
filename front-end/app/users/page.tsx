"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { Routes, ApiPaths } from "@/constants/enums";
import { DEFAULT_PROFILE_IMAGES } from "@/constants/images";
import { GithubSection } from "./_github-section";
import { ResumeSection } from "./_resume-section";
import { AnalysisSection } from "./_analysis-section";
import type { User, Profile } from "@/types/user";

export default function MyPage() {
  const { data: session } = useSession();
  const authFetch = useAuthFetch();
  const [me, setMe] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!session) return;

    setProfileLoading(true);
    setProfileError(null);

    try {
      const [meData, profileData] = await Promise.all([
        authFetch(`${Routes.AUTH}${ApiPaths.ME}`),
        authFetch(`${Routes.AUTH}${ApiPaths.PROFILE}`),
      ]);

      setMe(meData as User);
      setProfile(profileData as Profile);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "프로필 정보를 불러오지 못했습니다.");
    } finally {
      setProfileLoading(false);
    }
  }, [session, authFetch]);

  useEffect(() => {
    if (!session) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("github") === "success") {
      window.history.replaceState({}, "", Routes.USERS);
    }

    refreshProfile();
  }, [session, refreshProfile]);

  const name = me?.name ?? session?.user?.name ?? "";
  const profileImage = me?.profile_image || (session?.user
    ? (session.user.image || DEFAULT_PROFILE_IMAGES[Number(session.user.id) % DEFAULT_PROFILE_IMAGES.length])
    : null);

  return (
    <div className="bg-[#f5f6f8] min-h-screen px-6 py-8">
      <div className="mx-auto max-w-[1380px]">
        <div style={{ background: "#fff", borderRadius: 28, border: "1px solid #e8eaed", overflow: "hidden" }}>
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
                <h1 style={{ margin: "0 0 4px", fontSize: "clamp(28px,4vw,44px)", letterSpacing: "-0.04em" }}>
                  {name}님의 분석 프로필
                </h1>
              </div>
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
              {profileError && (
                <p style={{ margin: "14px 0 0", color: "#dc2626", fontSize: 13, lineHeight: 1.6 }}>
                  프로필 정보를 다시 불러오지 못했습니다. {profileError}
                </p>
              )}
            </div>

            {/* GitHub + 이력서 패널 */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,0.95fr)", gap: 18, alignItems: "start" }}>
              <GithubSection
                profile={profile}
                profileLoading={profileLoading}
                setProfile={setProfile}
                onRefresh={refreshProfile}
              />
              <ResumeSection profile={profile} setProfile={setProfile} onRefresh={refreshProfile} />
            </div>

            {/* AI 분석 결과 */}
            <AnalysisSection profile={profile} setProfile={setProfile} onRefresh={refreshProfile} />

          </div>
        </div>
      </div>
    </div>
  );
}
