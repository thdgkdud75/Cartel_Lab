"use client";

import * as React from "react";

import {
  getAllTimetables,
  getClassTimetable,
  getMergedTimetableRows,
  WEEKDAY_FIELD_KEYS,
  type TimetableMatrixRow,
} from "@/constants/timetable";
import { modalCardStyle, modalOverlayStyle, neutralBadgeStyle, timetableTableStyle } from "./_styles";

type SeatTimetableSectionProps = {
  classGroup: string | null | undefined;
  open: boolean;
  onClose: () => void;
};

export function SeatTimetableSection({ classGroup, open, onClose }: SeatTimetableSectionProps) {
  if (!open) return null;

  const selected = getClassTimetable(classGroup);
  const modalTitle = selected?.modalTitle ?? "강의시간표";
  const cards = selected ? [selected] : [...getAllTimetables()];

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#eceef2] bg-white/95 px-6 py-5 backdrop-blur sm:px-8">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span style={neutralBadgeStyle}>시간표 확인</span>
              {classGroup ? <span style={neutralBadgeStyle}>{classGroup}반</span> : null}
            </div>
            <h3 className="text-[26px] font-[800] tracking-[-0.04em] text-[#212124]">{modalTitle}</h3>
            {classGroup ? null : (
              <p className="mt-1 text-sm text-[#6b7280]">
                반 정보가 없어도 전체 시간표는 볼 수 있습니다. 반을 설정하면 해당 반 시간표를 먼저 보여드립니다.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dde2e8] bg-white text-lg font-bold text-[#57606a]"
            aria-label="시간표 닫기"
          >
            ×
          </button>
        </div>

        <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          {cards.map((card) => (
            <TimetableCard
              key={card.classGroup}
              title={card.title}
              rows={card.rows}
              accent={card.classGroup === "A" ? "orange" : "green"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimetableCard({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: TimetableMatrixRow[];
  accent: "orange" | "green";
}) {
  const accentStyle =
    accent === "orange"
      ? { borderColor: "#ff6f0f", background: "#fff7f1", color: "#9a3412" }
      : { borderColor: "#22a06b", background: "#effaf5", color: "#166534" };
  const mergedRows = getMergedTimetableRows(rows);

  return (
    <section className="rounded-[24px] border border-[#eceff3] bg-[#fcfcfd] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="h-7 w-1.5 rounded-full" style={{ background: accentStyle.borderColor }} />
        <h4 className="text-[20px] font-[800] tracking-[-0.03em]" style={{ color: accentStyle.color }}>
          {title}
        </h4>
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-[#e6e9ee] bg-white">
        <table style={timetableTableStyle}>
          <thead>
            <tr>
              <HeaderCell style={accentStyle}>교시</HeaderCell>
              <HeaderCell style={accentStyle}>월</HeaderCell>
              <HeaderCell style={accentStyle}>화</HeaderCell>
              <HeaderCell style={accentStyle}>수</HeaderCell>
              <HeaderCell style={accentStyle}>목</HeaderCell>
              <HeaderCell style={accentStyle}>금</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {mergedRows.map((row) => (
              <tr key={row.period}>
                <BodyCell muted>{row.period}</BodyCell>
                {WEEKDAY_FIELD_KEYS.map((key) => {
                  const cell = row[key];
                  if (!cell) return null;
                  return <CourseCell key={key} value={cell.value} rowSpan={cell.rowSpan} accent={accent} />;
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
}: {
  value: { subject: string; detail: string } | null;
  rowSpan: number;
  accent: "orange" | "green";
}) {
  if (!value) {
    return (
      <td
        rowSpan={rowSpan}
        style={{
          border: "1px solid #e3e7ec",
          padding: "12px 10px",
          textAlign: "center",
          verticalAlign: "middle",
          fontSize: 13,
          fontWeight: 600,
          color: "#94a3b8",
          background: "#f8fafc",
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
        border: "1px solid #e3e7ec",
        padding: "12px 8px",
        textAlign: "center",
        verticalAlign: "middle",
        background,
        color,
        minWidth: 136,
      }}
    >
      <div className="text-[13px] font-[800] leading-5">{value.subject}</div>
      <div className="mt-1 text-[11px] font-[700] opacity-80">{value.detail}</div>
    </td>
  );
}
