"use client";

import { useState } from "react";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { Routes, ApiPaths, Methods, Responses } from "@/constants/enums";
import { ANALYZING_TIPS } from "./_analysis-constants";
import type { Profile } from "@/types/user";

export function useProfileAnalyze(
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>,
  onRefresh: () => Promise<void>,
) {
  const authFetch = useAuthFetch();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingTip, setAnalyzingTip] = useState("");
  const [responseType, setResponseType] = useState<Responses | null>(null);
  const [responseMessage, setResponseMessage] = useState("");

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzingTip(ANALYZING_TIPS[0]);
    setResponseType(null);
    setResponseMessage("");
    let tipIndex = 0;
    const tipTimer = setInterval(() => {
      tipIndex = (tipIndex + 1) % ANALYZING_TIPS.length;
      setAnalyzingTip(ANALYZING_TIPS[tipIndex]);
    }, 3000);

    try {
      const result = await authFetch(`${Routes.AUTH}${ApiPaths.PROFILE_ANALYZE}`, {
        method: Methods.POST,
      });
      setProfile((prev) => prev ? {
        ...prev,
        github_username: result.github_username ?? prev.github_username,
        github_profile_summary: result.github_profile_summary ?? prev.github_profile_summary,
        github_top_languages: result.github_top_languages ?? prev.github_top_languages,
        resume_analysis_summary: result.resume_analysis_summary ?? prev.resume_analysis_summary,
        analysis_recommendation: result.analysis_recommendation ?? prev.analysis_recommendation,
        ai_profile_summary: result.ai_profile_summary ?? prev.ai_profile_summary,
        ai_profile_payload: result.ai_profile_payload ?? prev.ai_profile_payload,
        profile_analyzed_at: result.profile_analyzed_at ?? prev.profile_analyzed_at,
        remaining_analysis_count: result.remaining_analysis_count ?? prev.remaining_analysis_count,
      } : prev);
      await onRefresh().catch(() => null);
    } catch (error) {
      setResponseType(Responses.ERROR);
      setResponseMessage(error instanceof Error ? error.message : "분석에 실패했습니다.");
    } finally {
      clearInterval(tipTimer);
      setAnalyzing(false);
    }
  }

  return { analyzing, analyzingTip, responseType, responseMessage, handleAnalyze };
}
