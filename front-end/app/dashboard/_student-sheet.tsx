"use client";

import { useEffect, useState } from "react";
import {
  DASHBOARD_PALETTE,
  DASHBOARD_STATUS_COLOR,
} from "@/constants/colors";
import { Routes } from "@/constants/enums";
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
import { fieldStyle, primaryButtonStyle, sectionCardStyle } from "./_styles";

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

/* ─── Monthly Calendar Section ─── */

type MonthlyRecord = {
  date: string;
  status: string;
  color: string;
  label: string;
  check_out: string | null;
};

type MonthlySummary = {
  present: number;
  late: number;
  absent: number;
  leave: number;
};

type DailyGoalEntry = {
  content: string;
  is_achieved: boolean;
};

type WeeklyGoalEntry = {
  weekday: number;
  weekday_label: string;
  content: string;
  is_completed: boolean;
  planned_time: string | null;
};

type WeeklyGoalGroup = {
  week_start: string;
  goals: WeeklyGoalEntry[];
};

type MonthlyData = {
  records: MonthlyRecord[];
  summary: MonthlySummary;
  daily_goals: Record<string, DailyGoalEntry>;
  weekly_goals: WeeklyGoalGroup[];
};

function MonthlyCalendarSection({
  attendanceRows,
  studentId,
  today,
  authFetch,
}: {
  attendanceRows: DetailAttendanceRow[];
  studentId: string;
  today: string;
  authFetch: (url: string, options?: RequestInit) => Promise<any>;
}) {
  const [open, setOpen] = useState(false);
  const todayDate = new Date(`${today}T00:00:00`);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [dataCache, setDataCache] = useState<Map<string, MonthlyData>>(new Map());
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  function extractFromRows(key: string): MonthlyData | null {
    const [y, m] = key.split("-").map(Number);
    const matching = attendanceRows.filter((row) => {
      const d = new Date(`${row.date}T00:00:00`);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    if (matching.length === 0) return null;

    const statusFromColor: Record<string, keyof MonthlySummary> = {
      green: "present",
      yellow: "late",
      red: "absent",
      orange: "leave",
    };
    const summary: MonthlySummary = { present: 0, late: 0, absent: 0, leave: 0 };
    const records = matching.map((row) => {
      const status = statusFromColor[row.color] ?? "present";
      summary[status] += 1;
      return { date: row.date, status, color: row.color, label: row.label, check_out: row.check_out };
    });
    return { records, summary, daily_goals: {}, weekly_goals: [] };
  }

  useEffect(() => {
    if (!open) return;
    if (dataCache.has(monthKey)) return;

    setLoading(true);
    authFetch(`${Routes.ADMIN}/api/student/${studentId}/monthly-attendance/?month=${monthKey}`)
      .then((resp: { records: MonthlyRecord[]; summary: MonthlySummary; daily_goals?: Record<string, DailyGoalEntry>; weekly_goals?: WeeklyGoalGroup[] }) => {
        setDataCache((prev) => new Map(prev).set(monthKey, {
          records: resp.records,
          summary: resp.summary,
          daily_goals: resp.daily_goals ?? {},
          weekly_goals: resp.weekly_goals ?? [],
        }));
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [open, monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = dataCache.get(monthKey);
  const recordMap = new Map((data?.records ?? []).map((r) => [r.date, r]));
  const dailyGoals = data?.daily_goals ?? {};
  const weeklyGoals = data?.weekly_goals ?? [];
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  // 데이터 로드 시 첫 번째 주간목표 자동 펼침
  useEffect(() => {
    if (weeklyGoals.length > 0 && expandedWeek === null) {
      setExpandedWeek(weeklyGoals[0].week_start);
    }
  }, [weeklyGoals]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  function goMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
    setExpandedWeek(null);
  }

  const monthOptions: { label: string; year: number; month: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
    monthOptions.push({
      label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }

  const summary = data?.summary;
  const todayStr = today;
  const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <section style={sectionCardStyle}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 18px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, color: PALETTE.ink }}>월간 출결 캘린더</span>
        <span
          style={{
            fontSize: 18,
            color: PALETTE.muted,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px" }}>
          {/* Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => goMonth(-1)}
              style={{
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 10,
                background: PALETTE.surface,
                padding: "6px 10px",
                fontSize: 14,
                cursor: "pointer",
                color: PALETTE.body,
              }}
            >
              ‹
            </button>
            <select
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setYear(y);
                setMonth(m);
                setExpandedWeek(null);
              }}
              style={{ ...fieldStyle, padding: "6px 10px", fontSize: 13, fontWeight: 700, textAlign: "center", minWidth: 130 }}
            >
              {monthOptions.map((opt) => (
                <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => goMonth(1)}
              style={{
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 10,
                background: PALETTE.surface,
                padding: "6px 10px",
                fontSize: 14,
                cursor: "pointer",
                color: PALETTE.body,
              }}
            >
              ›
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: PALETTE.muted, fontSize: 13 }}>불러오는 중...</div>
          ) : (
            <>
              {/* Weekday header */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                {DOW_LABELS.map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: d === "일" ? PALETTE.danger : d === "토" ? PALETTE.brandText : PALETTE.muted,
                      padding: "6px 0",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {cells.map((cell, idx) => {
                  if (!cell.day) {
                    return <div key={`empty-${idx}`} style={{ aspectRatio: "1 / 1" }} />;
                  }
                  const record = cell.dateStr ? recordMap.get(cell.dateStr) : null;
                  const goal = cell.dateStr ? dailyGoals[cell.dateStr] : null;
                  const c = record ? (COLOR[record.color as keyof typeof COLOR] ?? COLOR.gray) : null;
                  const isToday = cell.dateStr === todayStr;

                  return (
                    <div
                      key={cell.dateStr}
                      title={
                        [
                          record ? record.label : "기록 없음",
                          record?.check_out ? `퇴실 ${record.check_out}` : "",
                          goal ? `목표: ${goal.content}${goal.is_achieved ? " (달성)": ""}` : "",
                        ].filter(Boolean).join(" · ")
                      }
                      style={{
                        aspectRatio: "1 / 1",
                        borderRadius: 10,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        fontSize: 12,
                        fontWeight: isToday ? 800 : 600,
                        color: record ? c!.text : PALETTE.faint,
                        background: record ? c!.bg : "transparent",
                        border: isToday
                          ? `2px solid ${PALETTE.ink}`
                          : record
                            ? `1px solid ${c!.dot}3d`
                            : "1px solid transparent",
                        boxSizing: "border-box",
                      }}
                    >
                      <span>{cell.day}</span>
                      {record?.check_out && (
                        <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.75, lineHeight: 1 }}>
                          {record.check_out}
                        </span>
                      )}
                      {goal && (
                        <span style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: goal.is_achieved ? PALETTE.success : PALETTE.warning,
                          marginTop: 1,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                {[
                  { label: "출석", color: COLOR.green },
                  { label: "지각", color: COLOR.yellow },
                  { label: "조퇴", color: COLOR.orange },
                  { label: "결석", color: COLOR.red },
                ].map((item) => (
                  <span
                    key={item.label}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: PALETTE.muted }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: item.color.dot }} />
                    {item.label}
                  </span>
                ))}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: PALETTE.muted }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: PALETTE.success }} />
                  목표달성
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: PALETTE.muted }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: PALETTE.warning }} />
                  목표진행
                </span>
              </div>

              {/* Monthly summary */}
              {summary && (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    background: PALETTE.surfaceSubtle,
                    border: `1px solid ${PALETTE.lineSoft}`,
                    padding: "10px 14px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: COLOR.green.text }}>출석 {summary.present}일</span>
                  <span style={{ color: COLOR.yellow.text }}>지각 {summary.late}일</span>
                  <span style={{ color: COLOR.red.text }}>결석 {summary.absent}일</span>
                  <span style={{ color: COLOR.orange.text }}>조퇴 {summary.leave}일</span>
                </div>
              )}

              {/* Weekly goals history */}
              {weeklyGoals.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink, marginBottom: 10 }}>
                    주간 목표 히스토리
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {weeklyGoals.map((wg) => {
                      const wsDate = new Date(`${wg.week_start}T00:00:00`);
                      const weDate = new Date(wsDate);
                      weDate.setDate(weDate.getDate() + 6);
                      const label = `${wsDate.getMonth() + 1}/${wsDate.getDate()} ~ ${weDate.getMonth() + 1}/${weDate.getDate()}`;
                      const isExpanded = expandedWeek === wg.week_start;
                      const completed = wg.goals.filter((g) => g.is_completed).length;
                      const total = wg.goals.length;

                      return (
                        <div key={wg.week_start}>
                          <button
                            onClick={() => setExpandedWeek(isExpanded ? null : wg.week_start)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: `1px solid ${PALETTE.lineSoft}`,
                              background: isExpanded ? PALETTE.brandSoft : PALETTE.surfaceSubtle,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 700,
                              color: PALETTE.body,
                            }}
                          >
                            <span>{label}</span>
                            <span style={{ color: completed === total ? PALETTE.success : PALETTE.muted }}>
                              {completed}/{total} 완료
                            </span>
                          </button>
                          {isExpanded && (
                            <div style={{ padding: "8px 0 4px", display: "grid", gap: 4 }}>
                              {wg.goals.map((g, gi) => (
                                <div
                                  key={gi}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    background: PALETTE.surface,
                                    border: `1px solid ${PALETTE.lineSoft}`,
                                  }}
                                >
                                  <span style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: "50%",
                                    background: g.is_completed ? PALETTE.success : PALETTE.line,
                                    flexShrink: 0,
                                  }} />
                                  <span style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: g.is_completed ? PALETTE.muted : PALETTE.ink,
                                    textDecoration: g.is_completed ? "line-through" : "none",
                                    flex: 1,
                                  }}>
                                    {g.content}
                                  </span>
                                  <span style={{ fontSize: 10, color: PALETTE.faint, whiteSpace: "nowrap" }}>
                                    {g.weekday_label}{g.planned_time ? ` ${g.planned_time}` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export function StudentDetailSheet({
  detail,
  loading,
  onClose,
  onPasswordChange,
  authFetch,
}: {
  detail: StudentDetail | null;
  loading: boolean;
  onClose: () => void;
  onPasswordChange: (studentId: string, newPassword: string, newPasswordConfirm: string) => Promise<string>;
  authFetch: (url: string, options?: RequestInit) => Promise<any>;
}) {
  const [selectedAchievementDay, setSelectedAchievementDay] = useState<PlannerDailyGoalItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function handlePasswordSubmit() {
    if (!detail || passwordSaving) return;
    setPasswordMessage(null);
    setPasswordError(null);
    setPasswordSaving(true);

    try {
      const message = await onPasswordChange(detail.student.student_id, newPassword, newPasswordConfirm);
      setPasswordMessage(message);
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setPasswordSaving(false);
    }
  }

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
              <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${PALETTE.lineSoft}` }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: PALETTE.ink }}>비밀번호 변경</div>
                <div style={{ marginTop: 4, fontSize: 13, color: PALETTE.muted }}>
                  관리자 권한으로 학생 비밀번호를 바로 재설정합니다.
                </div>
              </div>
              <div style={{ padding: 18, display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: PALETTE.body }}>새 비밀번호</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 입력"
                    autoComplete="new-password"
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: PALETTE.body }}>새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="한 번 더 입력"
                    autoComplete="new-password"
                    style={fieldStyle}
                  />
                </div>
                {passwordMessage && (
                  <div
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${PALETTE.brandSoftStrong}`,
                      background: PALETTE.brandSoft,
                      color: PALETTE.brandText,
                      padding: "11px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {passwordMessage}
                  </div>
                )}
                {passwordError && (
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      padding: "11px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {passwordError}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div style={{ fontSize: 12, color: PALETTE.muted }}>
                    변경 후 학생에게 새 비밀번호를 따로 전달해야 합니다.
                  </div>
                  <button
                    onClick={handlePasswordSubmit}
                    disabled={passwordSaving}
                    style={{
                      ...primaryButtonStyle,
                      minWidth: 112,
                      opacity: passwordSaving ? 0.6 : 1,
                    }}
                  >
                    {passwordSaving ? "저장 중..." : "비밀번호 저장"}
                  </button>
                </div>
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

            <MonthlyCalendarSection
              attendanceRows={detail.attendance_rows}
              studentId={detail.student.student_id}
              today={detail.planner.today.date}
              authFetch={authFetch}
            />

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
