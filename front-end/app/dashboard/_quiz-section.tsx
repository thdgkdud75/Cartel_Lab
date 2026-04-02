"use client";

import { useState } from "react";
import { DASHBOARD_PALETTE, DASHBOARD_QUIZ_DOT } from "@/constants/colors";
import type { User } from "@/types/user";
import type { DashboardQuizDotKey } from "@/constants/colors";
import { sectionCardStyle } from "./_styles";

export type QuizCell = { date: string; status: DashboardQuizDotKey };
export type YearCell = { date: string; status: DashboardQuizDotKey; count: number };
export type WeekAttempt = {
  attempted_at: string;
  title: string;
  submitted_answer: string;
  is_correct: boolean;
  is_ai_flagged: boolean;
};
export type Freshman = Pick<User, "name" | "student_id"> & {
  week_cells: QuizCell[];
  year_cells: YearCell[];
  week_attempts: WeekAttempt[];
  week_solved: number;
  week_correct: number;
};
export type QuizData = {
  quiz_week_dates: string[];
  month_labels: string[];
  freshman_data: Freshman[];
};

const PALETTE = DASHBOARD_PALETTE;
const QDOT = DASHBOARD_QUIZ_DOT;

export function QuizDashboardSection({
  quizData,
  today,
}: {
  quizData: QuizData;
  today: string;
}) {
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  function toggleCard(studentId: string) {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  return (
    <section className="mt-8">
      <div className="mb-4">
        <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText, marginBottom: 6 }}>
          QUIZ DASHBOARD
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: PALETTE.ink,
          }}
        >
          1학년 퀴즈 현황
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: PALETTE.muted }}>
          백엔드 템플릿의 주간 표와 학생별 제출 내역 구조를 그대로 유지합니다.
        </p>
      </div>

      <div style={{ ...sectionCardStyle, padding: 18, marginBottom: 16 }}>
        <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: PALETTE.ink }}>
          이번 주 퀴즈 참여 현황
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    fontSize: 12,
                    color: PALETTE.muted,
                    borderBottom: `1px solid ${PALETTE.line}`,
                    background: PALETTE.surfaceSubtle,
                  }}
                >
                  학생
                </th>
                {quizData.quiz_week_dates.map((date) => (
                  <th
                    key={date}
                    style={{
                      padding: "12px 14px",
                      textAlign: "center",
                      fontSize: 12,
                      color: PALETTE.muted,
                      borderBottom: `1px solid ${PALETTE.line}`,
                      background: PALETTE.surfaceSubtle,
                    }}
                  >
                    {date}
                  </th>
                ))}
                <th
                  style={{
                    padding: "12px 14px",
                    textAlign: "center",
                    fontSize: 12,
                    color: PALETTE.muted,
                    borderBottom: `1px solid ${PALETTE.line}`,
                    background: PALETTE.surfaceSubtle,
                  }}
                >
                  이번주
                </th>
              </tr>
            </thead>
            <tbody>
              {quizData.freshman_data.map((item) => (
                <tr key={item.student_id} style={{ borderBottom: `1px solid ${PALETTE.lineSoft}` }}>
                  <td style={{ padding: "14px", fontWeight: 800, color: PALETTE.ink }}>
                    {item.name}
                    <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: PALETTE.muted }}>
                      {item.student_id}
                    </div>
                  </td>
                  {item.week_cells.map((cell, index) => {
                    const qdot = QDOT[cell.status] ?? QDOT.none;
                    return (
                      <td key={`${item.student_id}-${index}`} style={{ padding: "14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            width: 28,
                            height: 28,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            fontSize: 13,
                            fontWeight: 800,
                            background: qdot.bg,
                            color: qdot.color,
                          }}
                        >
                          {qdot.label}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ padding: "14px", textAlign: "center", fontSize: 12, fontWeight: 800, color: PALETTE.muted }}>
                    {item.week_solved}/7
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: PALETTE.muted }}>
          ○ 정답 · △ 오답 · ─ 미제출
        </p>
      </div>

      <div className="grid gap-3">
        {quizData.freshman_data.map((item) => {
          const isOpen = openCards.has(item.student_id);
          return (
            <div key={item.student_id} style={sectionCardStyle}>
              <div
                onClick={() => toggleCard(item.student_id)}
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>{item.name}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: PALETTE.muted }}>
                    {item.student_id} · 이번 주 {item.week_solved}일 참여 / {item.week_correct}일 정답
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {item.week_correct > 0 && (
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "5px 10px",
                        background: PALETTE.successSoft,
                        color: PALETTE.success,
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      정답 {item.week_correct}일
                    </span>
                  )}
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    width="18"
                    height="18"
                    style={{
                      color: PALETTE.muted,
                      transition: "transform .2s ease",
                      transform: isOpen ? "rotate(180deg)" : "none",
                    }}
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: `1px solid ${PALETTE.lineSoft}`, padding: 20 }}>
                  <div style={{ overflowX: "auto", paddingBottom: 8 }}>
                    <div className="mb-3 flex min-w-max items-center gap-1 text-[11px] font-semibold text-[#868b94]">
                      {quizData.month_labels.map((label, index) => (
                        <span key={`${item.student_id}-month-${index}`} style={{ minWidth: 17 }}>
                          {label}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateRows: "repeat(7, 14px)",
                        gridAutoFlow: "column",
                        gridAutoColumns: "14px",
                        gap: 3,
                      }}
                    >
                      {item.year_cells.map((cell) => (
                        <div
                          key={`${item.student_id}-${cell.date}`}
                          title={`${cell.date} · ${cell.status}${cell.count > 0 ? ` · ${cell.count}개` : ""}`}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            background:
                              cell.status === "correct"
                                ? "#22c55e"
                                : cell.status === "ai"
                                  ? "#f97316"
                                  : cell.status === "wrong"
                                    ? "#facc15"
                                    : cell.status === "future"
                                      ? "#f3f4f6"
                                      : "#e5e7eb",
                            outline: cell.date === today ? `2px solid ${PALETTE.brand}` : "none",
                            outlineOffset: 1,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-[#868b94]">
                    <span className="inline-flex items-center gap-1.5">
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: "#22c55e" }} />
                      정답
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: "#f97316" }} />
                      AI의심
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: "#facc15" }} />
                      오답
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: "#e5e7eb" }} />
                      미제출
                    </span>
                  </div>

                  <div style={{ marginTop: 18, marginBottom: 10, fontSize: 13, fontWeight: 800, color: PALETTE.muted }}>
                    이번 주 제출 내역
                  </div>

                  {item.week_attempts.length > 0 ? (
                    <div className="grid gap-2">
                      {item.week_attempts.map((attempt, index) => (
                        <div
                          key={`${item.student_id}-attempt-${index}`}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            borderRadius: 14,
                            border: `1px solid ${PALETTE.lineSoft}`,
                            background: PALETTE.surfaceSubtle,
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ fontSize: 12, color: PALETTE.muted, whiteSpace: "nowrap", marginTop: 2 }}>
                            {attempt.attempted_at}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: PALETTE.ink, marginBottom: 4 }}>
                              {attempt.title}
                            </div>
                            <div style={{ fontSize: 13, color: PALETTE.body }}>
                              제출: <strong>{attempt.submitted_answer}</strong>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span
                              style={{
                                borderRadius: 999,
                                padding: "4px 9px",
                                fontSize: 11,
                                fontWeight: 800,
                                background: attempt.is_correct ? PALETTE.successSoft : "#fee2e2",
                                color: attempt.is_correct ? PALETTE.success : "#991b1b",
                              }}
                            >
                              {attempt.is_correct ? "✓ 정답" : "✗ 오답"}
                            </span>
                            {attempt.is_ai_flagged && (
                              <span
                                style={{
                                  borderRadius: 999,
                                  padding: "4px 9px",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  border: "1px solid #fde68a",
                                }}
                              >
                                ⚠ AI 의심
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: PALETTE.muted }}>
                      이번 주 제출한 답변이 없습니다.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
