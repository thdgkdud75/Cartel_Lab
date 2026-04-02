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

function buildPreviewTags(job: JobPosting) {
  const source = job.ui_tags.length > 0 ? job.ui_tags : job.ui_main_tasks;
  return source
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function getSummaryLine(job: JobPosting) {
  const candidates = [...job.ui_main_tasks, job.summary_text ?? ""]
    .map((value) => value.trim())
    .filter(Boolean);

  const ignoredPatterns = [
    /^이런 업무를 담당합니다\.?$/,
    /^이런 분을 찾고 있어요\.?$/,
    /^주요 업무입니다\.?$/,
    /^상세 업무는 자세히 보기에서 확인/,
  ];

  const summary =
    candidates.find((value) => ignoredPatterns.every((pattern) => !pattern.test(value))) ??
    null;

  return summary || "상세 업무는 자세히 보기에서 확인할 수 있습니다.";
}

function getIntroLine(job: JobPosting) {
  const cleaned = getSummaryLine(job)
    .replace(/\[[^\]]+\]/g, "")
    .replace(/^[-•\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned === "상세 업무는 자세히 보기에서 확인할 수 있습니다.") {
    return job.job_role || job.company_name;
  }

  return cleaned;
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
      : jobs.filter(
          (job) =>
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
              지금 바로 살펴볼 공고
              <br />
              한눈에 훑는 채용 리스트
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
              목록에서는 빠르게 훑고, 필요할 때만 상세를 여는 구조로 정리했습니다. 모바일은
              위에서 아래로 스캔하기 쉽게 유지합니다.
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
              <div style={{ marginTop: 5, fontSize: 12, color: PALETTE.body }}>
                신입 키워드 포함 공고
              </div>
            </div>

            <div style={metricTileStyle}>
              <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>추천 점수</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: PALETTE.ink }}>
                {scoringEnabled && averageScore !== null ? `${averageScore}점` : "비공개"}
              </div>
              <div style={{ marginTop: 5, fontSize: 12, color: PALETTE.body }}>
                {scoringEnabled ? "로그인 상태 평균" : "로그인 후 확인"}
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
              GitHub 연동 이력을 모두 등록하면 공고별 추천도와 AI 해석을 함께 볼 수 있습니다.
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
          <div style={{ fontSize: 18, fontWeight: 800, color: PALETTE.ink }}>
            공고를 불러오지 못했습니다.
          </div>
          <p style={{ margin: "8px 0 16px", fontSize: 14, color: PALETTE.body }}>{error}</p>
          <button onClick={onRetry} style={primaryButtonStyle}>
            다시 불러오기
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div style={{ ...sectionCardStyle, padding: 28 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: PALETTE.ink }}>
            조건에 맞는 공고가 없습니다.
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: PALETTE.body }}>
            다른 카테고리를 선택해서 다시 확인해보세요.
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
                <div
                  style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.05em", color: PALETTE.ink }}
                >
                  지금 바로 살펴볼 공고
                </div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.75, color: PALETTE.body }}>
                  요약 카드만 보여주고, 상세는 카드 클릭으로 이어지게 정리했습니다.
                </div>
              </div>
              <div style={{ fontSize: 13, color: PALETTE.muted }}>
                {selectedCategory === "all" ? "전체 공고" : `필터 ${selectedCategory}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((job) => {
              const deadlineTone = getDeadlineTone(job.ui_deadline_label);
              const previewTags = buildPreviewTags(job);
              const introLine = getIntroLine(job);
              const summaryLine = getSummaryLine(job);

              return (
                <button
                  key={job.id}
                  onClick={() => onSelect(job)}
                  style={{
                    ...listRowStyle,
                    border: `1px solid ${PALETTE.line}`,
                    borderRadius: 22,
                    background: PALETTE.surface,
                    overflow: "hidden",
                    minHeight: 372,
                    textAlign: "left",
                  }}
                >
                  <div className="flex h-full flex-col gap-4 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span style={{ fontSize: 13, fontWeight: 800, color: PALETTE.muted }}>
                            {job.company_name}
                          </span>
                          <span style={{ fontSize: 12, color: PALETTE.faint }}>
                            {getSourceLabel(job.source)}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            lineHeight: 1.55,
                            color: PALETTE.body,
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {introLine}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 18,
                            lineHeight: 1.22,
                            letterSpacing: "-0.04em",
                            fontWeight: 900,
                            color: PALETTE.ink,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            minHeight: 44,
                          }}
                        >
                          {job.title}
                        </div>
                      </div>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 999,
                          padding: "7px 11px",
                          fontSize: 11,
                          fontWeight: 900,
                          background: deadlineTone.background,
                          border: `1px solid ${deadlineTone.border}`,
                          color: deadlineTone.text,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {deadlineTone.label}
                      </span>
                    </div>

                    <div className="flex min-h-[64px] flex-wrap content-start gap-2">
                      {[job.location, job.employment_type, job.experience_label, job.education_level]
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((item) => (
                          <span key={`${job.id}-${item}`} style={subtleBadgeStyle}>
                            {item}
                          </span>
                        ))}
                    </div>

                    <div className="flex min-h-[56px] flex-wrap content-start gap-2">
                      {previewTags.length > 0 ? (
                        previewTags.map((tag) => (
                          <span
                            key={`${job.id}-${tag}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: 999,
                              background: PALETTE.surfaceTint,
                              color: PALETTE.brandText,
                              padding: "7px 11px",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 12, color: PALETTE.muted }}>태그 준비 중</span>
                      )}
                    </div>

                    <div
                      style={{
                        minHeight: 66,
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: PALETTE.body,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {summaryLine}
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <a
                        href={job.external_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 48,
                          borderRadius: 16,
                          border: `1px solid ${PALETTE.line}`,
                          background: PALETTE.surfaceSubtle,
                          fontSize: 14,
                          fontWeight: 800,
                          color: PALETTE.ink,
                          textDecoration: "none",
                        }}
                      >
                        공고보기
                      </a>

                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 48,
                          borderRadius: 16,
                          border: `1px solid ${PALETTE.brandSoftStrong}`,
                          background: PALETTE.brandSoft,
                          fontSize: 14,
                          fontWeight: 900,
                          color: PALETTE.brandText,
                        }}
                      >
                        자세히 보기
                      </span>
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
