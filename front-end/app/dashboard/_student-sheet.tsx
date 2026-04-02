"use client";

import { useState } from "react";
import {
  DASHBOARD_PALETTE,
  DASHBOARD_STATUS_COLOR,
} from "@/constants/colors";
import type { DetailAttendanceRow } from "@/types/attendance";
import type {
  PlannerDailyGoalItem,
  PlannerDailyGoalWeekSummary,
  PlannerDailyTodoItem,
  PlannerStudentSnapshot,
  PlannerTodayTodoSummary,
  PlannerWeeklyGoalItem,
  PlannerWeeklyGoalSummary,
} from "@/types/planner";
import type { UserProfileSummary } from "@/types/user";
import { sectionCardStyle } from "./_styles";

const PALETTE = DASHBOARD_PALETTE;
const COLOR = DASHBOARD_STATUS_COLOR;

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

export type RawStudentDetail = {
  student: UserProfileSummary;
  today: string;
  attendance_rows: DetailAttendanceRow[];
  daily_todos: PlannerDailyTodoItem[];
  weekly_goals: PlannerWeeklyGoalItem[];
  weekly_goal_summary: PlannerWeeklyGoalSummary;
  today_todo_summary: PlannerTodayTodoSummary;
  weekly_achievement: PlannerDailyGoalWeekSummary;
};

export type StudentDetail = {
  student: UserProfileSummary;
  attendance_rows: DetailAttendanceRow[];
  planner: PlannerStudentSnapshot;
};

export function normalizeStudentDetail(detail: RawStudentDetail): StudentDetail {
  return {
    student: detail.student,
    attendance_rows: detail.attendance_rows,
    planner: {
      today: {
        date: detail.today,
        todos: detail.daily_todos,
        todo_summary: detail.today_todo_summary,
      },
      weekly: {
        goals: detail.weekly_goals,
        goal_summary: detail.weekly_goal_summary,
        daily_goals: detail.weekly_achievement,
        lab_wide_goals: [],
      },
    },
  };
}

function formatHeatmapDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHeatmapMonth(date: Date) {
  return `${date.getMonth() + 1}월`;
}

function formatHeatmapLabel(date: Date) {
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}

function buildRecentAttendanceHeatmap(rows: DetailAttendanceRow[], todayString: string, dayCount = 30) {
  const rowMap = new Map(rows.map((row) => [row.date, row]));
  const endDate = new Date(`${todayString}T00:00:00`);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (dayCount - 1));

  const alignedStart = new Date(startDate);
  alignedStart.setDate(startDate.getDate() - startDate.getDay());

  const alignedEnd = new Date(endDate);
  alignedEnd.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const weeks: Array<{
    key: string;
    monthLabel: string | null;
    days: Array<{
      key: string;
      date: string;
      inRange: boolean;
      isToday: boolean;
      row: DetailAttendanceRow | null;
      title: string;
    }>;
  }> = [];

  const cursor = new Date(alignedStart);
  let weekIndex = 0;

  while (cursor.getTime() <= alignedEnd.getTime()) {
    const weekDays: Array<{
      key: string;
      date: string;
      inRange: boolean;
      isToday: boolean;
      row: DetailAttendanceRow | null;
      title: string;
    }> = [];

    for (let rowIndex = 0; rowIndex < 7; rowIndex += 1) {
      const cellDate = new Date(cursor);
      const dateKey = formatHeatmapDate(cellDate);
      const row = rowMap.get(dateKey) ?? null;
      const inRange = cellDate.getTime() >= startDate.getTime() && cellDate.getTime() <= endDate.getTime();
      const isToday = dateKey === todayString;
      const titleParts = [formatHeatmapLabel(cellDate)];

      if (!inRange) {
        titleParts.push("범위 밖");
      } else if (row) {
        titleParts.push(row.label);
        if (row.check_in || row.check_out) {
          titleParts.push(`입실 ${row.check_in ?? "-"} / 퇴실 ${row.check_out ?? "-"}`);
        }
      } else {
        titleParts.push("기록 없음");
      }

      weekDays.push({
        key: `${dateKey}-${rowIndex}`,
        date: dateKey,
        inRange,
        isToday,
        row,
        title: titleParts.join(" · "),
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const monthAnchor =
      weekDays.find((day) => day.inRange && Number(day.date.slice(-2)) === 1) ??
      (weekIndex === 0 ? weekDays.find((day) => day.inRange) : undefined);

    weeks.push({
      key: weekDays[0]?.date ?? `week-${weekIndex}`,
      monthLabel: monthAnchor ? formatHeatmapMonth(new Date(`${monthAnchor.date}T00:00:00`)) : null,
      days: weekDays,
    });

    weekIndex += 1;
  }

  return weeks;
}

function RecentAttendanceHeatmap({
  rows,
  today,
}: {
  rows: DetailAttendanceRow[];
  today: string;
}) {
  const weeks = buildRecentAttendanceHeatmap(rows, today);
  const weekdayLabels = ["", "월", "", "수", "", "금", ""];
  const legend = [
    { label: "기록 없음", color: PALETTE.lineSoft },
    { label: "출석", color: COLOR.green.dot },
    { label: "지각", color: COLOR.yellow.dot },
    { label: "조퇴", color: COLOR.orange.dot },
    { label: "결석", color: COLOR.red.dot },
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${PALETTE.lineSoft}`,
          background: PALETTE.surfaceSubtle,
          padding: 14,
        }}
      >
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <div style={{ minWidth: 290 }}>
            <div
              style={{
                display: "flex",
                gap: 4,
                marginLeft: 24,
                marginBottom: 8,
              }}
            >
              {weeks.map((week) => (
                <div
                  key={`month-${week.key}`}
                  style={{
                    width: 12,
                    fontSize: 10,
                    lineHeight: 1.2,
                    color: PALETTE.muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {week.monthLabel}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  width: 16,
                  display: "grid",
                  gridTemplateRows: "repeat(7, 12px)",
                  gap: 4,
                  fontSize: 10,
                  color: PALETTE.muted,
                }}
              >
                {weekdayLabels.map((label, index) => (
                  <span
                    key={`weekday-${index}`}
                    style={{
                      height: 12,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 4 }}>
                {weeks.map((week) => (
                  <div
                    key={week.key}
                    style={{
                      display: "grid",
                      gridTemplateRows: "repeat(7, 12px)",
                      gap: 4,
                    }}
                  >
                    {week.days.map((day) => {
                      const color = day.row ? COLOR[day.row.color] ?? COLOR.gray : null;

                      return (
                        <div
                          key={day.key}
                          title={day.title}
                          aria-label={day.title}
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: !day.inRange
                              ? "transparent"
                              : color
                                ? color.dot
                                : PALETTE.lineSoft,
                            border: day.isToday
                              ? `1px solid ${PALETTE.ink}`
                              : day.inRange
                                ? `1px solid ${day.row ? "transparent" : PALETTE.line}`
                                : "none",
                            boxSizing: "border-box",
                            opacity: day.inRange ? 1 : 0,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {legend.map((item) => (
          <span
            key={item.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: PALETTE.muted,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: item.color,
                border: `1px solid ${item.color === PALETTE.lineSoft ? PALETTE.line : "transparent"}`,
              }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 12, color: PALETTE.muted }}>
        최근 30일을 주 단위로 정리했습니다. 칸에 마우스를 올리면 날짜와 입실·퇴실 시간을 볼 수 있습니다.
      </p>
    </div>
  );
}

export function StudentDetailSheet({
  detail,
  loading,
  onClose,
}: {
  detail: StudentDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [selectedAchievementDay, setSelectedAchievementDay] = useState<PlannerDailyGoalItem | null>(null);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(15, 23, 42, 0.24)",
      }}
      onClick={onClose}
    >
      <aside
        style={{
          width: "min(460px, 100vw)",
          height: "100vh",
          overflowY: "auto",
          background: PALETTE.surface,
          borderLeft: `1px solid ${PALETTE.line}`,
          boxShadow: "-20px 0 50px rgba(15, 23, 42, 0.12)",
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText, marginBottom: 6 }}>
              STUDENT DETAIL
            </div>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: PALETTE.ink }}>
              {detail?.student.name ?? "학생 정보"}
            </h3>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: PALETTE.muted }}>
              {detail ? `${detail.student.student_id} · 오늘 ${detail.planner.today.date}` : "데이터를 불러오는 중입니다."}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 24,
              lineHeight: 1,
              color: PALETTE.muted,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: PALETTE.muted }}>학생 데이터를 불러오는 중...</div>
        ) : !detail ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: PALETTE.muted }}>표시할 학생 데이터가 없습니다.</div>
        ) : (
          <div className="grid gap-4">
            <section
              style={{
                borderRadius: 22,
                border: `1px solid ${PALETTE.brandSoftStrong}`,
                background: PALETTE.brandSoft,
                padding: 18,
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                {detail.student.class_group && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: 999,
                      background: PALETTE.surface,
                      color: PALETTE.brandText,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {detail.student.grade}학년 {detail.student.class_group}반
                  </span>
                )}
                {detail.student.github_username && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: 999,
                      background: PALETTE.surface,
                      color: PALETTE.body,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    GitHub @{detail.student.github_username}
                  </span>
                )}
                {detail.student.has_resume && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: 999,
                      background: PALETTE.surface,
                      color: PALETTE.body,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    이력서 등록
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MetricBlock
                  eyebrow="하루 목표 달성률"
                  value={`${detail.planner.weekly.daily_goals.rate}%`}
                  caption={`${detail.planner.weekly.daily_goals.achieved}/${detail.planner.weekly.daily_goals.total || 0} 달성`}
                  accent
                />
                <MetricBlock
                  eyebrow="이번 주 주간 목표"
                  value={`${detail.planner.weekly.goal_summary.rate}%`}
                  caption={`${detail.planner.weekly.goal_summary.completed}/${detail.planner.weekly.goal_summary.total || 0} 완료`}
                />
                <MetricBlock
                  eyebrow="오늘 할 일"
                  value={`${detail.planner.today.todo_summary.rate}%`}
                  caption={`${detail.planner.today.todo_summary.completed}/${detail.planner.today.todo_summary.total || 0} 완료`}
                />
              </div>
            </section>

            <section style={sectionCardStyle}>
              <div
                style={{
                  padding: "18px 18px 14px",
                  borderBottom: `1px solid ${PALETTE.lineSoft}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: PALETTE.ink }}>이번 주 하루 목표 달성률</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: PALETTE.muted }}>
                    {detail.planner.weekly.daily_goals.week_start} - {detail.planner.weekly.daily_goals.week_end}
                  </div>
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <div className="grid grid-cols-7 gap-2">
                  {detail.planner.weekly.daily_goals.days.map((day) => (
                    <div
                      key={day.date}
                      title={day.content ?? "등록된 목표 없음"}
                      onClick={day.has_goal ? () => setSelectedAchievementDay(day) : undefined}
                      style={{
                        borderRadius: 14,
                        padding: "10px 8px",
                        textAlign: "center",
                        border: `1px solid ${day.is_achieved ? "#bbf7d0" : day.has_goal ? "#fed7aa" : PALETTE.line}`,
                        background: day.is_achieved ? PALETTE.successSoft : day.has_goal ? "#fff7ed" : PALETTE.surfaceSubtle,
                        cursor: day.has_goal ? "pointer" : "default",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: PALETTE.muted }}>{day.weekday}</div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          fontWeight: 800,
                          color: day.is_achieved ? PALETTE.success : day.has_goal ? PALETTE.brandText : PALETTE.faint,
                        }}
                      >
                        {day.is_achieved ? "달성" : day.has_goal ? "진행" : "없음"}
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 12, color: PALETTE.muted }}>
                  날짜를 누르면 해당 날짜 목표를 자세히 볼 수 있습니다.
                </p>
              </div>
            </section>

            <section style={sectionCardStyle}>
              <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${PALETTE.lineSoft}` }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: PALETTE.ink }}>오늘 할 일</div>
              </div>
              <div style={{ padding: 18 }}>
                {detail.planner.today.todos.length > 0 ? (
                  <div className="grid gap-2">
                    {detail.planner.today.todos.map((todo) => (
                      <div
                        key={todo.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          borderRadius: 14,
                          background: PALETTE.surfaceSubtle,
                          border: `1px solid ${PALETTE.lineSoft}`,
                          padding: "12px 14px",
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 6,
                            border: `2px solid ${todo.is_completed ? PALETTE.success : PALETTE.line}`,
                            background: todo.is_completed ? PALETTE.success : PALETTE.surface,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: todo.is_completed ? PALETTE.muted : PALETTE.ink,
                              textDecoration: todo.is_completed ? "line-through" : "none",
                            }}
                          >
                            {todo.content}
                          </div>
                          {todo.planned_time && (
                            <div style={{ marginTop: 3, fontSize: 12, color: PALETTE.muted }}>{todo.planned_time}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: PALETTE.muted }}>오늘 할 일이 없습니다.</p>
                )}
              </div>
            </section>

            <section style={sectionCardStyle}>
              <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${PALETTE.lineSoft}` }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: PALETTE.ink }}>이번 주 주간 목표</div>
              </div>
              <div style={{ padding: 18 }}>
                {detail.planner.weekly.goals.length > 0 ? (
                  <div className="grid gap-2">
                    {detail.planner.weekly.goals.map((goal) => (
                      <div
                        key={goal.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          borderRadius: 14,
                          background: PALETTE.surfaceSubtle,
                          border: `1px solid ${PALETTE.lineSoft}`,
                          padding: "12px 14px",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 10,
                            background: PALETTE.surface,
                            border: `1px solid ${PALETTE.line}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 800,
                            color: PALETTE.body,
                            flexShrink: 0,
                          }}
                        >
                          {goal.weekday_label}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: goal.is_completed ? PALETTE.muted : PALETTE.ink,
                              textDecoration: goal.is_completed ? "line-through" : "none",
                            }}
                          >
                            {goal.content}
                          </div>
                          {goal.planned_time && (
                            <div style={{ marginTop: 3, fontSize: 12, color: PALETTE.muted }}>{goal.planned_time}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: PALETTE.muted }}>이번 주 주간 목표가 없습니다.</p>
                )}
              </div>
            </section>

            <section style={sectionCardStyle}>
              <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${PALETTE.lineSoft}` }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: PALETTE.ink }}>최근 출결 30일</div>
              </div>
              <div style={{ padding: 18 }}>
                <RecentAttendanceHeatmap rows={detail.attendance_rows} today={detail.planner.today.date} />
                {detail.attendance_rows.length === 0 && (
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: PALETTE.muted }}>출결 기록이 없습니다.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {detail && selectedAchievementDay && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: "rgba(15, 23, 42, 0.38)",
            }}
            onClick={() => setSelectedAchievementDay(null)}
          >
            <div
              style={{
                width: "min(480px, 100%)",
                background: PALETTE.surface,
                borderRadius: 24,
                border: `1px solid ${PALETTE.line}`,
                boxShadow: "0 24px 64px rgba(15, 23, 42, 0.2)",
                padding: 24,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText, marginBottom: 6 }}>
                    DAILY GOAL
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", color: PALETTE.ink }}>
                    {detail.student.name} · {selectedAchievementDay.weekday}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: PALETTE.muted }}>
                    {selectedAchievementDay.date}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAchievementDay(null)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: 24,
                    lineHeight: 1,
                    color: PALETTE.muted,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  borderRadius: 18,
                  border: `1px solid ${selectedAchievementDay.is_achieved ? "#bbf7d0" : PALETTE.brandSoftStrong}`,
                  background: selectedAchievementDay.is_achieved ? PALETTE.successSoft : "#fffaf6",
                  padding: "16px 18px",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: PALETTE.ink }}>
                    {selectedAchievementDay.weekday} 목표
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      borderRadius: 999,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: selectedAchievementDay.is_achieved ? PALETTE.success : PALETTE.brandSoft,
                      color: selectedAchievementDay.is_achieved ? "#fff" : PALETTE.brandText,
                    }}
                  >
                    {selectedAchievementDay.is_achieved ? "달성 완료" : "진행 중"}
                  </span>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.75, color: PALETTE.body }}>
                  {selectedAchievementDay.content}
                </div>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.7, color: PALETTE.muted }}>
                해당 날짜에 등록된 하루 목표만 표시합니다.
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
