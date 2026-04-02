"use client";

import * as React from "react";

import {
  WEEKDAY_FIELD_KEYS,
  WEEKDAY_SHORT_LABELS,
  getMergedTimetableRows,
  type ClassTimetable,
  type TimetableMatrixRow,
} from "@/constants/timetable";
import { sectionCardStyle } from "./_styles";

type WeeklyTimetableSectionProps = {
  schedules: ClassTimetable[];
  todayWeekday: number;
};

export function WeeklyTimetableSection({
  schedules,
  todayWeekday,
}: WeeklyTimetableSectionProps) {
  return (
    <section style={sectionCardStyle} className="overflow-hidden">
      <div className="border-b border-[#edf0f3] px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[28px] font-[800] tracking-[-0.04em] text-[#212124]">주간 시간표</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              운영 `seats` 모달과 같은 `교시 x 요일` 구조로 주간 흐름을 그대로 확인할 수 있습니다.
            </p>
          </div>
          <p className="text-sm font-medium text-[#8b919b]">오늘 열은 강조 표시됩니다.</p>
        </div>
      </div>

      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {schedules.map((schedule) => (
          <TimetableTableCard
            key={schedule.classGroup}
            title={schedule.title}
            rows={schedule.rows}
            accent={schedule.classGroup === "A" ? "orange" : "green"}
            todayWeekday={todayWeekday}
          />
        ))}
      </div>
    </section>
  );
}

function TimetableTableCard({
  title,
  rows,
  accent,
  todayWeekday,
}: {
  title: string;
  rows: TimetableMatrixRow[];
  accent: "orange" | "green";
  todayWeekday: number;
}) {
  const accentStyle =
    accent === "orange"
      ? { borderColor: "#ff6f0f", background: "#fff7f1", color: "#9a3412", soft: "#fff4ea" }
      : { borderColor: "#22a06b", background: "#effaf5", color: "#166534", soft: "#eefaf4" };
  const mergedRows = getMergedTimetableRows(rows);

  return (
    <section className="rounded-[24px] border border-[#eceff3] bg-[#fcfcfd] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-7 w-1.5 rounded-full" style={{ background: accentStyle.borderColor }} />
        <h3 className="text-[20px] font-[800] tracking-[-0.03em]" style={{ color: accentStyle.color }}>
          {title}
        </h3>
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-[#e6e9ee] bg-white">
        <table className="w-full min-w-[920px] border-collapse bg-white">
          <thead>
            <tr>
              <HeaderCell style={accentStyle}>교시</HeaderCell>
              {WEEKDAY_SHORT_LABELS.map((label, index) => (
                <HeaderCell
                  key={label}
                  style={index === todayWeekday ? { ...accentStyle, background: accentStyle.soft } : accentStyle}
                >
                  {label}
                </HeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {mergedRows.map((row) => (
              <tr key={row.period}>
                <BodyCell muted>{row.period}</BodyCell>
                {WEEKDAY_FIELD_KEYS.map((key, index) => {
                  const cell = row[key];
                  if (!cell) return null;
                  return (
                    <CourseCell
                      key={key}
                      value={cell.value}
                      rowSpan={cell.rowSpan}
                      accent={accent}
                      isToday={todayWeekday === index}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HeaderCell({
  children,
  style,
}: {
  children: React.ReactNode;
  style: { borderColor: string; background: string; color: string };
}) {
  return (
    <th
      style={{
        border: "1px solid #e3e7ec",
        background: style.background,
        color: style.color,
        padding: "12px 10px",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {children}
    </th>
  );
}

function BodyCell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      style={{
        border: "1px solid #e3e7ec",
        padding: "12px 10px",
        textAlign: "center",
        verticalAlign: "middle",
        fontSize: 13,
        fontWeight: muted ? 700 : 600,
        color: muted ? "#667085" : "#2c3440",
        background: muted ? "#fafbfc" : "#ffffff",
        minWidth: muted ? 132 : 136,
      }}
    >
      {children}
    </td>
  );
}

function CourseCell({
  value,
  rowSpan,
  accent,
  isToday,
}: {
  value: { subject: string; detail: string } | null;
  rowSpan: number;
  accent: "orange" | "green";
  isToday: boolean;
}) {
  if (!value) {
    return (
      <td
        rowSpan={rowSpan}
        style={{
          border: isToday ? "1px solid #ffcfaa" : "1px solid #e3e7ec",
          padding: "12px 10px",
          textAlign: "center",
          verticalAlign: "middle",
          fontSize: 13,
          fontWeight: 600,
          color: "#94a3b8",
          background: isToday ? "#fffaf6" : "#f8fafc",
          minWidth: 136,
        }}
      >
        -
      </td>
    );
  }

  const background = accent === "orange" ? "#fff4ea" : "#effaf5";
  const color = accent === "orange" ? "#9a3412" : "#166534";

  return (
    <td
      rowSpan={rowSpan}
      style={{
        border: isToday ? "1px solid #ffb98c" : "1px solid #e3e7ec",
        padding: "12px 8px",
        textAlign: "center",
        verticalAlign: "middle",
        background: isToday ? "#fff8f2" : background,
        color,
        minWidth: 136,
      }}
    >
      <div className="text-[13px] font-[800] leading-5">{value.subject}</div>
      <div className="mt-1 text-[11px] font-[700] opacity-80">{value.detail}</div>
    </td>
  );
}
