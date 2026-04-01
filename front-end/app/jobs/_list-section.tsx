"use client";

import { useState } from "react";
import { DASHBOARD_PALETTE } from "@/constants/colors";
import type { JobCategory, JobPosting } from "@/types/jobs";
import {
  filterChipStyle,
  heroCardStyle,
  listRowStyle,
  metricTileStyle,
  primaryButtonStyle,
  sectionCardStyle,
  subtleBadgeStyle,
} from "./_styles";

const PALETTE = DASHBOARD_PALETTE;

function parseDeadlineValue(label: string | null) {
  if (!label || !label.startsWith("D-")) return null;
  const value = Number(label.replace("D-", ""));
  return Number.isNaN(value) ? null : value;
}

function getSourceLabel(source: string) {
  switch (source) {
    case "wanted":
      return "Wanted";
    case "saramin":
      return "Saramin";
    default:
      return source || "채용";
  }
}

function getDeadlineTone(label: string | null) {
  const value = parseDeadlineValue(label);

  if (!label) {
    return {
      background: PALETTE.surfaceSubtle,
      border: PALETTE.line,
      text: PALETTE.muted,
      label: "상시 확인",
    };
  }

  if (label === "마감") {
    return {
      background: PALETTE.dangerSoft,
      border: "#fecaca",
      text: PALETTE.danger,
      label,
    };
  }

  if (value !== null && value <= 7) {
    return {
      background: PALETTE.brandSoft,
      border: PALETTE.brandSoftStrong,
      text: PALETTE.brandText,
      label,
    };
  }

  return {
    background: PALETTE.surfaceTint,
    border: PALETTE.line,
    text: PALETTE.body,
    label,
  };
}

export function JobsListSection({
  jobs,
  categories,
  loading,
  error,
  scoringEnabled,
  onRetry,
  onSelect,
}: {
  jobs: JobPosting[];
  categories: JobCategory[];
  loading: boolean;
  error: string | null;
  scoringEnabled: boolean;
  onRetry: () => void;
  onSelect: (job: JobPosting) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredJobs =
    selectedCategory === "all"
      ? jobs
      : jobs.filter((job) =>
          job.ui_categories.includes(selectedCategory) || job.job_role === selectedCategory,
        );

  const scoredJobs = jobs.filter((job) => job.ui_recommendation_score !== null);
  const urgentCount = jobs.filter((job) => {
    const value = parseDeadlineValue(job.ui_deadline_label);
    return value !== null && value <= 7;
  }).length;
  const juniorCount = jobs.filter((job) => job.is_junior_friendly).length;
  const averageScore = scoringEnabled
    ? Math.round(
        scoredJobs.reduce((sum, job) => sum + (job.ui_recommendation_score ?? 0), 0) /
          Math.max(scoredJobs.length, 1),
      )
    : null;

  return (
    <section className="grid gap-4 md:gap-5">
      <div style={{ ...heroCardStyle, padding: 20 }}>
        <div className="grid gap-5 md:gap-6">
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                background: PALETTE.surface,
                border: `1px solid ${PALETTE.brandSoftStrong}`,
                color: PALETTE.brandText,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 14,
              }}
            >
              OPPORTUNITIES BOARD
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 8vw, 52px)",
                lineHeight: 1.04,
                letterSpacing: "-0.05em",
                fontWeight: 900,
                color: PALETTE.ink,
              }}
            >
              공고를 한 장씩 넘기지 않고
              <br />
              한 번에 읽히는 채용 리스트
            </h1>

            <p
              style={{
                margin: "14px 0 0",
                maxWidth: 680,
                fontSize: 14,
                lineHeight: 1.75,
                color: PALETTE.body,
              }}
            >
              신입 친화 공고, 마감 시점, 핵심 업무를 세로 흐름으로 먼저 훑고 필요한 공고만 열어보는 구조입니다.
              모바일에서는 빠른 스캔과 탭 동선이 우선입니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div style={metricTileStyle}>
              <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>현재 공고</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
                {filteredJobs.length}개
              </div>
              <div style={{ marginTop: 5, fontSize: 12, color: PALETTE.body }}>
                {selectedCategory === "all" ? "전체 목록 기준" : "선택 카테고리 기준"}
              </div>
            </div>

            <div style={metricTileStyle}>
              <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>마감 임박</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
                {urgentCount}개
              </div>
              <div style={{ marginTop: 5, fontSize: 12, color: PALETTE.body }}>7일 이내 공고</div>
            </div>

            <div style={metricTileStyle}>
              <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>신입 친화</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
                {juniorCount}개
              </div>
              <div style={{ marginTop: 5, fontSize: 12, color: PALETTE.body }}>신입 우대 태그 포함</div>
            </div>

            <div style={metricTileStyle}>
              <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>추천 점수</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
                {scoringEnabled && averageScore !== null ? `${averageScore}점` : "비공개"}
              </div>
              <div style={{ marginTop: 5, fontSize: 12, color: PALETTE.body }}>
                {scoringEnabled ? "로그인 상태 평균" : "로그인 후 노출"}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>카테고리 필터</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory("all")}
                style={{
                  ...filterChipStyle,
                  border: `1px solid ${selectedCategory === "all" ? PALETTE.brand : PALETTE.line}`,
                  background: selectedCategory === "all" ? PALETTE.brandSoft : PALETTE.surface,
                  color: selectedCategory === "all" ? PALETTE.brandText : PALETTE.body,
                }}
              >
                전체
              </button>
              {categories.map((category) => {
                const active = selectedCategory === category.key;
                return (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    style={{
                      ...filterChipStyle,
                      border: `1px solid ${active ? PALETTE.brand : PALETTE.line}`,
                      background: active ? PALETTE.brandSoft : PALETTE.surface,
                      color: active ? PALETTE.brandText : PALETTE.body,
                    }}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!scoringEnabled && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 18,
                background: PALETTE.surface,
                border: `1px solid ${PALETTE.line}`,
                fontSize: 13,
                lineHeight: 1.75,
                color: PALETTE.body,
              }}
            >
              GitHub 링크와 이력서를 모두 등록하면 공고별 프로필 적합도와 AI 추천 해석이 함께 표시됩니다.
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ ...sectionCardStyle, padding: 28, textAlign: "center", color: PALETTE.muted }}>
          채용 정보를 불러오는 중입니다.
        </div>
      ) : error ? (
        <div style={{ ...sectionCardStyle, padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: PALETTE.ink }}>공고를 불러오지 못했습니다.</div>
          <p style={{ margin: "8px 0 16px", fontSize: 14, color: PALETTE.body }}>{error}</p>
          <button onClick={onRetry} style={primaryButtonStyle}>
            다시 불러오기
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div style={{ ...sectionCardStyle, padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: PALETTE.ink }}>조건에 맞는 공고가 없습니다.</div>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: PALETTE.body }}>
            다른 카테고리를 선택해서 다시 확인해 보세요.
          </p>
        </div>
      ) : (
        <div style={{ ...sectionCardStyle, padding: 0, background: PALETTE.surface }}>
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: "18px 18px 16px",
              background: PALETTE.surface,
              borderBottom: `1px solid ${PALETTE.line}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText }}>LIST VIEW</div>
            <div className="grid gap-2 md:flex md:items-end md:justify-between">
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.05em", color: PALETTE.ink }}>
                  지금 바로 살펴볼 공고
                </div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.75, color: PALETTE.body }}>
                  모바일에선 위에서 아래로 빠르게 스캔하고, 필요할 때만 상세를 엽니다.
                </div>
              </div>
              <div style={{ fontSize: 13, color: PALETTE.muted }}>
                {selectedCategory === "all" ? "전체 공고" : `필터 ${selectedCategory}`}
              </div>
            </div>
          </div>

          <div className="grid">
            {filteredJobs.map((job, index) => {
              const deadlineTone = getDeadlineTone(job.ui_deadline_label);

              return (
                <button
                  key={job.id}
                  onClick={() => onSelect(job)}
                  style={{
                    ...listRowStyle,
                    borderTop: index === 0 ? "none" : `1px solid ${PALETTE.lineSoft}`,
                  }}
                >
                  <div
                    className="grid gap-4 px-4 py-4 md:px-5 md:py-5 lg:grid-cols-[minmax(0,1fr)_248px]"
                    style={{ alignItems: "start" }}
                  >
                    <div className="grid gap-3">
                      <div className="flex items-start gap-4">
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 48,
                            height: 48,
                            borderRadius: 16,
                            background: index % 2 === 0 ? PALETTE.surfaceTint : PALETTE.surfaceSubtle,
                            color: PALETTE.brandText,
                            fontSize: 15,
                            fontWeight: 900,
                            flexShrink: 0,
                          }}
                        >
                          {job.ui_company_mark || job.company_name.slice(0, 2)}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span style={{ fontSize: 13, fontWeight: 700, color: PALETTE.muted }}>
                              {job.company_name}
                            </span>
                            <span style={{ fontSize: 12, color: PALETTE.faint }}>{getSourceLabel(job.source)}</span>
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 22,
                              lineHeight: 1.15,
                              letterSpacing: "-0.04em",
                              fontWeight: 900,
                              color: PALETTE.ink,
                            }}
                          >
                            {job.title}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {[job.location, job.employment_type, job.experience_label, job.education_level]
                              .filter(Boolean)
                              .map((item) => (
                                <span key={`${job.id}-${item}`} style={subtleBadgeStyle}>
                                  {item}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {job.ui_tags.slice(0, 4).map((tag) => (
                          <span
                            key={`${job.id}-${tag}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: 999,
                              background: PALETTE.surfaceTint,
                              color: PALETTE.brandText,
                              padding: "7px 12px",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: "grid", gap: 7 }}>
                        {job.ui_main_tasks.length > 0 ? (
                          job.ui_main_tasks.slice(0, 2).map((task) => (
                            <div
                              key={`${job.id}-${task}`}
                              style={{
                                fontSize: 13,
                                lineHeight: 1.7,
                                color: PALETTE.body,
                                display: "grid",
                                gridTemplateColumns: "10px minmax(0,1fr)",
                                gap: 6,
                                alignItems: "start",
                              }}
                            >
                              <span style={{ color: PALETTE.brandText, fontWeight: 900 }}>•</span>
                              <span>{task}</span>
                            </div>
                          ))
                        ) : job.summary_text ? (
                          <div style={{ fontSize: 13, lineHeight: 1.75, color: PALETTE.body }}>{job.summary_text}</div>
                        ) : (
                          <div style={{ fontSize: 13, lineHeight: 1.75, color: PALETTE.muted }}>
                            요약 정보가 없는 공고입니다.
                          </div>
                        )}
                      </div>

                      {scoringEnabled && job.ui_recommendation_score !== null && job.ui_recommendation_reasons.length > 0 && (
                        <div
                          style={{
                            display: "grid",
                            gap: 5,
                            padding: "12px 14px",
                            borderRadius: 18,
                            background: PALETTE.brandSoft,
                            border: `1px solid ${PALETTE.brandSoftStrong}`,
                          }}
                        >
                          {job.ui_recommendation_reasons.slice(0, 2).map((reason) => (
                            <div key={`${job.id}-${reason}`} style={{ fontSize: 12, lineHeight: 1.65, color: PALETTE.brandText }}>
                              {reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          padding: 16,
                          borderRadius: 20,
                          background: PALETTE.surfaceSubtle,
                          border: `1px solid ${PALETTE.line}`,
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: 999,
                              padding: "8px 12px",
                              fontSize: 12,
                              fontWeight: 800,
                              background: deadlineTone.background,
                              border: `1px solid ${deadlineTone.border}`,
                              color: deadlineTone.text,
                            }}
                          >
                            {deadlineTone.label}
                          </span>
                          {job.is_junior_friendly && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                borderRadius: 999,
                                background: PALETTE.successSoft,
                                color: PALETTE.success,
                                padding: "8px 12px",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              신입 친화
                            </span>
                          )}
                        </div>

                        {scoringEnabled && job.ui_recommendation_score !== null ? (
                          <div style={{ display: "grid", gap: 4 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>매칭도</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: PALETTE.ink }}>
                              {job.ui_recommendation_score}점
                            </div>
                            {job.ui_recommendation_reasons[0] && (
                              <div style={{ fontSize: 12, lineHeight: 1.7, color: PALETTE.body }}>
                                {job.ui_recommendation_reasons[0]}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, lineHeight: 1.7, color: PALETTE.body }}>
                            상세에서 요구사항과 우대 조건을 더 확인할 수 있습니다.
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "2px 2px 0",
                        }}
                      >
                        <div style={{ fontSize: 12, lineHeight: 1.7, color: PALETTE.muted }}>
                          탭해서 상세, 기술, 외부 링크까지 확인
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={job.external_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            style={{ fontSize: 12, fontWeight: 700, color: PALETTE.muted, textDecoration: "none" }}
                          >
                            원문 이동
                          </a>
                          <span style={{ fontSize: 13, fontWeight: 800, color: PALETTE.brandText }}>
                            자세히 보기
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
