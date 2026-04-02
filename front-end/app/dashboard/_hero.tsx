"use client";

import { DASHBOARD_PALETTE } from "@/constants/colors";
import { type ReactNode } from "react";
import { panelStyle } from "./_styles";

const PALETTE = DASHBOARD_PALETTE;

function MetricBlock({
  eyebrow,
  value,
  caption,
  accent = false,
}: {
  eyebrow: string;
  value: string;
  caption: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${accent ? PALETTE.brandSoftStrong : PALETTE.line}`,
        background: accent ? PALETTE.brandSoft : PALETTE.surfaceSubtle,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, marginBottom: 8 }}>
        {eyebrow}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: PALETTE.ink }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: PALETTE.body, marginTop: 4 }}>{caption}</div>
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "9px 16px",
        border: `1px solid ${active ? PALETTE.brand : PALETTE.line}`,
        background: active ? PALETTE.brandSoft : PALETTE.surface,
        color: active ? PALETTE.brandText : PALETTE.body,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

type AdminConsoleHeroProps = {
  pendingCount: number;
  grade: string;
  classGroup: string;
  studentCount: number;
  today: string;
  weekStart: string;
  weekEnd: string;
  showAttendance: boolean;
  locationSummary: string;
  timeSummary: string;
  onGradeChange: (grade: string) => void;
  onClassGroupChange: (classGroup: string) => void;
};

export function AdminConsoleHero({
  pendingCount,
  grade,
  classGroup,
  studentCount,
  today,
  weekStart,
  weekEnd,
  showAttendance,
  locationSummary,
  timeSummary,
  onGradeChange,
  onClassGroupChange,
}: AdminConsoleHeroProps) {
  return (
    <section
      style={{
        ...panelStyle,
        padding: 28,
        background:
          "linear-gradient(180deg, rgba(255,241,232,0.96) 0%, rgba(255,255,255,1) 56%), radial-gradient(circle at top right, rgba(255,111,15,0.12), transparent 28%)",
      }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-[760px]">
            <div
              style={{
                display: "inline-flex",
                width: "fit-content",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                background: PALETTE.surface,
                border: `1px solid ${PALETTE.brandSoftStrong}`,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 800,
                color: PALETTE.brandText,
                marginBottom: 14,
              }}
            >
              LAB ADMIN CONSOLE
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 4vw, 44px)",
                lineHeight: 1.08,
                letterSpacing: "-0.05em",
                fontWeight: 900,
                color: PALETTE.ink,
              }}
            >
              연구실 운영 정보를 한 화면에서 정리하는 대시보드
            </h1>
            <p
              style={{
                margin: "14px 0 0",
                maxWidth: 700,
                fontSize: 15,
                lineHeight: 1.7,
                color: PALETTE.body,
              }}
            >
              출결 관리, 학생 플랜 확인, 설정 조정, 삭제 예정 인원 대응까지 관리자 작업 흐름을 한 축으로 압축했습니다.
            </p>
          </div>

          <div
            style={{
              minWidth: 250,
              borderRadius: 18,
              background: pendingCount > 0 ? PALETTE.dangerSoft : PALETTE.surface,
              border: `1px solid ${pendingCount > 0 ? "#fecaca" : PALETTE.line}`,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.muted, marginBottom: 6 }}>
              운영 상태
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: pendingCount > 0 ? PALETTE.danger : PALETTE.ink,
              }}
            >
              {pendingCount > 0 ? "삭제 예정 인원 확인 필요" : "정상 운영 중"}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: PALETTE.body }}>{locationSummary}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: PALETTE.body }}>{timeSummary}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={grade === "2"}
            onClick={() => {
              onGradeChange("2");
              onClassGroupChange("");
            }}
          >
            2학년
          </FilterChip>
          <FilterChip
            active={grade === "1"}
            onClick={() => {
              onGradeChange("1");
              onClassGroupChange("");
            }}
          >
            1학년
          </FilterChip>
          <div style={{ width: 1, height: 20, background: PALETTE.line, margin: "0 4px" }} />
          <FilterChip active={classGroup === ""} onClick={() => onClassGroupChange("")}>
            전체
          </FilterChip>
          <FilterChip active={classGroup === "A"} onClick={() => onClassGroupChange("A")}>
            A반
          </FilterChip>
          <FilterChip active={classGroup === "B"} onClick={() => onClassGroupChange("B")}>
            B반
          </FilterChip>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricBlock
            eyebrow="이번 화면"
            value={`${studentCount}명`}
            caption={`${grade}학년 ${classGroup || "전체"} 기준 학생 수`}
            accent
          />
          <MetricBlock
            eyebrow="기준일"
            value={today}
            caption={`${weekStart} - ${weekEnd} 주간 운영`}
          />
          <MetricBlock
            eyebrow="삭제 예정"
            value={pendingCount > 0 ? `${pendingCount}명` : "없음"}
            caption={pendingCount > 0 ? "예정 인원 관리 필요" : "현재 보류 중인 삭제 예약 없음"}
          />
          <MetricBlock
            eyebrow="출결 모드"
            value={showAttendance ? "출결" : "퀴즈"}
            caption={showAttendance ? "주간 출결 테이블 표시 중" : "1학년 퀴즈 현황 표시 중"}
          />
        </div>
      </div>
    </section>
  );
}
