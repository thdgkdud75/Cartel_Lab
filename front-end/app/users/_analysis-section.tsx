"use client";

import { LANG_STYLE } from "./_analysis-constants";
import { parseRecommendationBlocks } from "./_analysis-parser";
import { useProfileAnalyze } from "./_use-profile-analyze";
import { Responses } from "@/constants/enums";
import type { Profile } from "@/types/user";

function LangChip({ name }: { name: string }) {
  const s = LANG_STYLE[name] ?? { bg: "#f0f0f2", color: "#39404a", dot: "#9ca3af" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, background: s.bg, fontSize: 13, fontWeight: 600, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {name}
    </span>
  );
}

type Props = {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  onRefresh: () => Promise<void>;
};

export function AnalysisSection({ profile, setProfile, onRefresh }: Props) {
  const { analyzing, analyzingTip, responseType, responseMessage, handleAnalyze } = useProfileAnalyze(setProfile, onRefresh);
  const canAnalyze = !!(profile?.github_username && profile?.resume_file) && !analyzing;

  const cardStyle = { padding: 20, borderRadius: 18, background: "#fbfbfc", border: "1px solid #eef0f3" };
  const h3Style = { margin: "0 0 12px", fontSize: 16, letterSpacing: "-0.02em", color: "#1a1d23" };
  const chipStyle = { display: "inline-flex", padding: "4px 10px", borderRadius: 999, background: "#f0f0f2", fontSize: 13, fontWeight: 600, color: "#39404a" };
  const listStyle = { margin: 0, paddingLeft: 18, color: "#39404a", lineHeight: 1.8, fontSize: 14 } as React.CSSProperties;

  return (
    <>
      {/* 분석 로딩 오버레이 */}
      {analyzing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(24,24,28,0.42)" }} />
          <div style={{ position: "relative", width: "min(460px, 100%)", padding: "32px 28px", background: "#fff", borderRadius: 24, textAlign: "center", boxShadow: "0 24px 80px rgba(15,23,42,0.18)" }}>
            <div style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: "50%", border: "6px solid #ffe4d2", borderTopColor: "#ff6f0f", animation: "spin 0.9s linear infinite" }} />
            <h3 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.04em" }}>분석 중입니다</h3>
            <p style={{ margin: "10px 0 0", color: "#5c6471", lineHeight: 1.7 }}>GitHub와 이력서를 읽고, 프로필 분석을 적용하고 있습니다.</p>
            <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 14, background: "#fff7f2", color: "#5d4b42", fontSize: 14, lineHeight: 1.6 }}>
              {analyzingTip}
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <section style={{ padding: 24, border: "1px solid #ebecef", borderRadius: 22, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "#f0f7ff", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.03em" }}>저장된 분석 결과</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {profile?.remaining_analysis_count !== undefined && (
            <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
              오늘 남은 횟수 {profile.remaining_analysis_count}회
            </p>
          )}
          <button
            onClick={canAnalyze ? handleAnalyze : undefined}
            disabled={!canAnalyze}
            style={{
              marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", border: "none", borderRadius: 10,
              background: canAnalyze ? "#ff6f0f" : "#e5e7eb",
              color: canAnalyze ? "#fff" : "#9ca3af",
              fontSize: 13, fontWeight: 700,
              cursor: canAnalyze ? "pointer" : "not-allowed",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {analyzing ? "분석 중..." : canAnalyze ? "AI 분석하기" : "GitHub + 이력서 등록 후 분석 가능"}
          </button>
        </div>
        {responseType === Responses.ERROR && responseMessage && (
          <p style={{ margin: "0 0 16px", color: "#dc2626", fontSize: 13, lineHeight: 1.6 }}>
            {responseMessage}
          </p>
        )}
        {profile?.profile_analyzed_at ? (() => {
          const payload = profile.ai_profile_payload ?? {};
          const targetRoles: string[] = (payload.target_roles as string[]) ?? [];
          const coreSkills: string[] = (payload.core_skills as string[]) ?? [];
          const projectEvidence: string[] = (payload.project_evidence as string[]) ?? [];
          const strengths: string[] = (payload.strengths as string[]) ?? [];
          const gaps: string[] = (payload.gaps as string[]) ?? [];
          const studyPriorities: string[] = (payload.study_priorities as string[]) ?? [];
          const recommendBlocks = parseRecommendationBlocks(profile.analysis_recommendation ?? "");
          const topLanguages = (profile.github_top_languages || "").split(",").map(s => s.trim()).filter(Boolean);

          return (
            <div style={{ display: "grid", gap: 16 }}>
              {/* 상단 칩 행 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ ...cardStyle, padding: 16 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>핵심 기술</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {coreSkills.length > 0 ? coreSkills.slice(0, 6).map(s => <LangChip key={s} name={s} />) : <span style={{ fontSize: 13, color: "#c4c9d4" }}>—</span>}
                  </div>
                </div>
                <div style={{ ...cardStyle, padding: 16 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>주요 언어</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {topLanguages.length > 0 ? topLanguages.slice(0, 6).map(l => <LangChip key={l} name={l} />) : <span style={{ fontSize: 13, color: "#c4c9d4" }}>—</span>}
                  </div>
                </div>
                <div style={{ ...cardStyle, padding: 16 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>권장 직무</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {targetRoles.length > 0 ? targetRoles.map(r => <span key={r} style={{ ...chipStyle, background: "#fff0e7", color: "#c2560c" }}>{r}</span>) : <span style={{ fontSize: 13, color: "#c4c9d4" }}>—</span>}
                  </div>
                </div>
              </div>

              {/* 종합 요약 */}
              <article style={cardStyle}>
                <h3 style={h3Style}>종합 분석 요약</h3>
                {profile.ai_profile_summary && (
                  <p style={{ margin: "0 0 16px", color: "#39404a", lineHeight: 1.7, fontSize: 14 }}>{profile.ai_profile_summary}</p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ padding: "14px 16px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#16a34a", letterSpacing: "0.04em" }}>강점</p>
                    {strengths.length > 0
                      ? <ul style={listStyle}>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      : projectEvidence.length > 0
                        ? <ul style={listStyle}>{projectEvidence.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}</ul>
                        : <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>—</p>
                    }
                  </div>
                  <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#ef4444", letterSpacing: "0.04em" }}>보완 필요</p>
                    {gaps.length > 0
                      ? <ul style={listStyle}>{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
                      : <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>—</p>
                    }
                  </div>
                </div>
                {profile.github_profile_summary && (
                  <p style={{ margin: "16px 0 0", fontSize: 13, color: "#6b7280", lineHeight: 1.7, paddingTop: 14, borderTop: "1px solid #eef0f3" }}>
                    <strong style={{ color: "#39404a" }}>GitHub</strong>{"  "}{profile.github_profile_summary}
                  </p>
                )}
              </article>

              {/* 학습 우선순위 */}
              {studyPriorities.length > 0 && (
                <article style={cardStyle}>
                  <h3 style={h3Style}>📚 학습 우선순위</h3>
                  <ol style={{ ...listStyle, paddingLeft: 20 }}>{studyPriorities.map((s, i) => <li key={i}>{s}</li>)}</ol>
                </article>
              )}

              {/* 추천 보완 포인트 */}
              {recommendBlocks.length > 0 && (
                <article style={cardStyle}>
                  <h3 style={h3Style}>추천 보완 포인트</h3>
                  <div style={{ display: "grid", gap: 12 }}>
                    {recommendBlocks.map((block, i) => {
                      const projectHint = block.problem_sentence
                        ? block.problem_sentence.split(/[,.\n]/)[0].trim().slice(0, 40)
                        : null;
                      return (
                        <details key={i} style={{ borderRadius: 12, border: "1px solid #e8eaed", overflow: "hidden" }} open={i === 0}>
                          <summary style={{ padding: "12px 16px", cursor: "pointer", background: "#f9f9fb", listStyle: "none", display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <strong style={{ fontSize: 14 }}>보완 포인트 {i + 1}</strong>
                                {projectHint && (
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fff0e7", color: "#c2560c" }}>
                                    {projectHint}
                                  </span>
                                )}
                              </div>
                              {block.problem_sentence && (
                                <small style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.5 }}>
                                  {block.problem_sentence.length > 100 ? block.problem_sentence.slice(0, 100) + "…" : block.problem_sentence}
                                </small>
                              )}
                            </div>
                          </summary>
                          <div style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
                            {block.problem_sentence && (
                              <p style={{ margin: 0, fontSize: 14, color: "#39404a", lineHeight: 1.6, padding: "10px 12px", background: "#fff7f2", borderRadius: 8, borderLeft: "3px solid #ff6f0f" }}>
                                {block.problem_sentence}
                              </p>
                            )}
                            {block.problem_points.length > 0 && (
                              <div>
                                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>문제점</p>
                                <ul style={listStyle}>{block.problem_points.map((p, j) => <li key={j}>{p}</li>)}</ul>
                              </div>
                            )}
                            {block.improvement_points.length > 0 && (
                              <div>
                                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>개선 방향</p>
                                <ul style={listStyle}>{block.improvement_points.map((p, j) => <li key={j}>{p}</li>)}</ul>
                              </div>
                            )}
                            {(block.before_example || block.after_example) && (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
                                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#ef4444" }}>BEFORE</p>
                                  <p style={{ margin: 0, fontSize: 13, color: "#39404a", lineHeight: 1.6 }}>{block.before_example}</p>
                                </div>
                                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#16a34a" }}>AFTER</p>
                                  <p style={{ margin: 0, fontSize: 13, color: "#39404a", lineHeight: 1.6 }}>{block.after_example}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </article>
              )}
            </div>
          );
        })() : (
          <p style={{ color: "#6b7280", lineHeight: 1.7 }}>
            GitHub 또는 이력서를 등록하면 AI 분석 결과가 여기에 표시됩니다.
          </p>
        )}
      </section>
    </>
  );
}
