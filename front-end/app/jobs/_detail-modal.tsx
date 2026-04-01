"use client";

import { useEffect, useState } from "react";
import { DASHBOARD_PALETTE } from "@/constants/colors";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import type { JobAiRecommendation, JobDetail } from "@/types/jobs";
import { ghostButtonStyle, modalCardStyle, primaryButtonStyle, subtleBadgeStyle } from "./_styles";

const PALETTE = DASHBOARD_PALETTE;

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <section
      style={{
        display: "grid",
        gap: 10,
        paddingTop: 20,
        borderTop: `1px solid ${PALETTE.lineSoft}`,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, color: PALETTE.body, lineHeight: 1.75 }}>
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function AiCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "strengths" | "gaps" | "study";
}) {
  if (items.length === 0) return null;

  const toneStyle =
    tone === "strengths"
      ? { background: "#f0faf2", border: "#c6e8cc", text: "#1e7e34" }
      : tone === "gaps"
        ? { background: "#fff8f0", border: "#f5d9b8", text: "#b85c00" }
        : { background: "#f0f4ff", border: "#c5d4f8", text: "#2850b8" };

  return (
    <section
      style={{
        display: "grid",
        gap: 10,
        padding: 16,
        borderRadius: 18,
        background: toneStyle.background,
        border: `1px solid ${toneStyle.border}`,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: toneStyle.text }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 7, color: PALETTE.body, lineHeight: 1.65 }}>
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function AiRecommendationSection({
  recommendation,
  error,
  loading,
}: {
  recommendation?: JobAiRecommendation;
  error?: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section
        style={{
          display: "grid",
          gap: 12,
          padding: 18,
          borderRadius: 20,
          background: PALETTE.surfaceSubtle,
          border: `1px solid ${PALETTE.line}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText }}>AI 추천 해석</div>
        <div style={{ fontSize: 14, color: PALETTE.body }}>AI 분석 중입니다. 잠시 후 결과가 추가됩니다.</div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        style={{
          display: "grid",
          gap: 8,
          padding: 18,
          borderRadius: 20,
          background: PALETTE.surfaceSubtle,
          border: `1px solid ${PALETTE.line}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>AI 추천 해석</div>
        <div style={{ fontSize: 14, color: PALETTE.body }}>
          AI 추천 분석을 불러오지 못했습니다.
          {error ? ` ${error}` : ""}
        </div>
      </section>
    );
  }

  if (!recommendation) return null;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 18,
          borderRadius: 20,
          background: PALETTE.brandSoft,
          border: `1px solid ${PALETTE.brandSoftStrong}`,
        }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText }}>AI 추천 해석</div>
            <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.75, color: PALETTE.body }}>
              {recommendation.summary}
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: PALETTE.brandText, flexShrink: 0 }}>
            {recommendation.fit_score}점
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <AiCard title="강점" items={recommendation.strengths} tone="strengths" />
        <AiCard title="보완점" items={recommendation.gaps} tone="gaps" />
        <AiCard title="학습 추천" items={recommendation.study_plan} tone="study" />
      </div>
    </section>
  );
}

export function JobDetailModal({
  jobId,
  onClose,
}: {
  jobId: number | null;
  onClose: () => void;
}) {
  const authFetch = useAuthFetch();
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    setLoading(true);
    setAiLoading(false);
    setError(null);
    setDetail(null);

    authFetch(`/jobs/${jobId}/detail/?ai=0`)
      .then((baseDetail: JobDetail) => {
        if (cancelled) return;
        setDetail(baseDetail);
        setLoading(false);
        setAiLoading(true);

        return authFetch(`/jobs/${jobId}/detail/`)
          .then((fullDetail: JobDetail) => {
            if (cancelled) return;
            setDetail((prev) => ({
              ...(prev ?? baseDetail),
              ...fullDetail,
            }));
          })
          .catch((aiErr: unknown) => {
            if (cancelled) return;
            setDetail((prev) =>
              prev
                ? {
                    ...prev,
                    ai_recommendation_error:
                      aiErr instanceof Error ? aiErr.message : "AI 분석을 불러오지 못했습니다.",
                  }
                : prev,
            );
          })
          .finally(() => {
            if (!cancelled) setAiLoading(false);
          });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "상세 정보를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, authFetch]);

  if (!jobId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
        background: PALETTE.overlay,
      }}
      onClick={onClose}
    >
      <div
        className="mt-16 max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] md:mt-0 md:ml-auto md:h-full md:max-h-none md:max-w-[760px] md:rounded-none md:rounded-l-[28px]"
        style={{
          ...modalCardStyle,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${PALETTE.line}`,
            padding: "18px 18px 16px",
          }}
        >
          <div
            style={{
              width: 44,
              height: 4,
              borderRadius: 999,
              background: PALETTE.line,
              margin: "0 auto 14px",
            }}
          />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText, marginBottom: 8 }}>
                JOB DETAIL
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: PALETTE.muted }}>
                {detail?.company_name ?? "채용 정보"}
              </div>
              <h2
                style={{
                  margin: "6px 0 0",
                  fontSize: "clamp(24px, 6vw, 40px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.05em",
                  fontWeight: 900,
                  color: PALETTE.ink,
                }}
              >
                {detail?.title ?? "상세 정보를 불러오는 중"}
              </h2>
            </div>

            <button
              onClick={onClose}
              style={{
                ...ghostButtonStyle,
                width: 42,
                height: 42,
                padding: 0,
                flexShrink: 0,
                color: PALETTE.muted,
              }}
            >
              ×
            </button>
          </div>

          {detail && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {[detail.location, detail.experience_label, detail.education_level, detail.job_role, detail.source_display]
                .filter(Boolean)
                .map((item) => (
                  <span key={item} style={subtleBadgeStyle}>
                    {item}
                  </span>
                ))}
              {detail.recommendation_score !== null && (
                <span
                  style={{
                    ...subtleBadgeStyle,
                    background: PALETTE.brandSoft,
                    borderColor: PALETTE.brandSoftStrong,
                    color: PALETTE.brandText,
                  }}
                >
                  프로필 적합도 {detail.recommendation_score}점
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: 18, display: "grid", gap: 20 }}>
          {loading ? (
            <div style={{ padding: "18px 0", fontSize: 14, color: PALETTE.muted }}>
              상세 정보를 불러오는 중입니다.
            </div>
          ) : error ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: PALETTE.ink }}>
                상세 정보를 불러오지 못했습니다.
              </div>
              <div style={{ fontSize: 14, color: PALETTE.body }}>{error}</div>
            </div>
          ) : detail ? (
            <>
              {detail.recommendation_score !== null && (
                <section
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: 18,
                    borderRadius: 20,
                    background: PALETTE.surfaceSubtle,
                    border: `1px solid ${PALETTE.line}`,
                  }}
                >
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>내 프로필 기준 적합도</div>
                      <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.75, color: PALETTE.body }}>
                        {detail.recommendation_reasons.join(" ")}
                      </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: PALETTE.ink, flexShrink: 0 }}>
                      {detail.recommendation_score}점
                    </div>
                  </div>
                </section>
              )}

              <AiRecommendationSection
                recommendation={detail.ai_recommendation}
                error={detail.ai_recommendation_error}
                loading={aiLoading}
              />

              {detail.overview && (
                <section
                  style={{
                    display: "grid",
                    gap: 12,
                    borderRadius: 20,
                    background: PALETTE.surfaceTint,
                    border: `1px solid ${PALETTE.brandSoftStrong}`,
                    padding: 18,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>공고 요약</h3>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: PALETTE.body }}>{detail.overview}</p>
                </section>
              )}

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="grid gap-6">
                  {detail.required_skills.length > 0 && (
                    <section style={{ display: "grid", gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>기술 스택</h3>
                      <div className="flex flex-wrap gap-2">
                        {detail.required_skills.map((skill) => (
                          <span key={skill} style={subtleBadgeStyle}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  <DetailList title="주요 업무" items={detail.main_tasks} />
                  <DetailList title="자격 요건" items={detail.requirements} />
                  <DetailList title="우대 사항" items={detail.preferred_points} />
                  <DetailList title="복리후생" items={detail.benefits} />
                </div>

                <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                  {detail.detail_links.length > 0 && (
                    <section
                      style={{
                        display: "grid",
                        gap: 10,
                        padding: 18,
                        borderRadius: 20,
                        background: PALETTE.surfaceSubtle,
                        border: `1px solid ${PALETTE.line}`,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>세부 지원 링크</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {detail.detail_links.map((link) => (
                          <a
                            key={`${link.label}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 13, fontWeight: 700, color: PALETTE.brandText, textDecoration: "none" }}
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {detail.detail_images.length > 0 && (
                    <section style={{ display: "grid", gap: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>상세요강 이미지</div>
                      <div className="grid gap-3">
                        {detail.detail_images.map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt={`${detail.title} 상세 이미지`}
                            style={{
                              width: "100%",
                              borderRadius: 18,
                              border: `1px solid ${PALETTE.line}`,
                              background: PALETTE.surface,
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>

              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  paddingTop: 10,
                  paddingBottom: 2,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.96) 26%, rgba(255,255,255,1) 100%)",
                }}
              >
                <a
                  href={detail.external_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...primaryButtonStyle, textDecoration: "none", flex: "1 1 180px", textAlign: "center" }}
                >
                  원문 공고로 이동
                </a>
                <button onClick={onClose} style={{ ...ghostButtonStyle, flex: "1 1 140px" }}>
                  닫기
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
