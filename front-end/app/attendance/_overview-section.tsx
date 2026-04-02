"use client";

import { HEATMAP_COLOR_BY_STATUS } from "@/constants/attendance";
import { attendanceCardClassName } from "./_styles";

export type AttendanceStats = {
  streak: number;
  attendance_rate: number;
  present_count: number;
  late_count: number;
  leave_count: number;
  weekdays_in_month: number;
  month: string;
};

export type AttendanceHeatmap = Record<string, {
  status: keyof typeof HEATMAP_COLOR_BY_STATUS;
  in: keyof typeof HEATMAP_COLOR_BY_STATUS;
  out: keyof typeof HEATMAP_COLOR_BY_STATUS;
}>;

type HeatmapDay = {
  date: string;
  colorClassName: string;
  tooltip: string;
  isOutsideYear: boolean;
};

type HeatmapWeek = {
  label: string;
  monthIndex: number | null;
  days: HeatmapDay[];
};

type Props = {
  today: string;
  stats: AttendanceStats;
  heatmap: AttendanceHeatmap;
};

const MONTH_OFFSET = 13;

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildHeatmapWeeks(today: string, heatmap: AttendanceHeatmap) {
  const todayDate = new Date(`${today}T00:00:00`);
  const currentYear = todayDate.getFullYear();
  const start = new Date(currentYear, 0, 1);
  const end = new Date(currentYear, 11, 31);
  start.setDate(start.getDate() - start.getDay());
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks: HeatmapWeek[] = [];
  const current = new Date(start);
  let currentMonthPrinted = -1;

  while (current <= end) {
    const weekStart = new Date(current);
    const anchorDate = new Date(weekStart);
    anchorDate.setDate(anchorDate.getDate() + 3);

    let label = "";
    let monthIndex: number | null = null;

    if (anchorDate.getFullYear() === currentYear) {
      const anchorMonth = anchorDate.getMonth();
      if (anchorMonth !== currentMonthPrinted) {
        label = `${anchorMonth + 1}월`;
        monthIndex = anchorMonth;
        currentMonthPrinted = anchorMonth;
      }
    }

    const days: HeatmapDay[] = [];

    for (let row = 0; row < 7; row += 1) {
      const iso = toLocalIsoDate(current);
      const data = heatmap[iso];
      const isOutsideYear = current.getFullYear() !== currentYear;

      days.push({
        date: iso,
        colorClassName: isOutsideYear ? "bg-transparent" : HEATMAP_COLOR_BY_STATUS[data?.out ?? data?.status ?? "none"],
        tooltip: isOutsideYear
          ? `${iso} · 다른 연도`
          : current > todayDate
            ? `${iso} · 아직 지나지 않은 날짜`
            : data
              ? `${iso} · ${data.status}`
              : `${iso} · 기록 없음`,
        isOutsideYear,
      });

      current.setDate(current.getDate() + 1);
    }

    weeks.push({ label, monthIndex, days });
  }

  return weeks;
}

export function OverviewSection({ today, heatmap }: Props) {
  const weeks = buildHeatmapWeeks(today, heatmap);

  return (
    <section className={`${attendanceCardClassName} p-3 sm:p-5`}>
      <h2 className="text-[18px] font-bold text-[#202124] sm:text-[22px]">올해의 출결 현황</h2>

      <div className="mt-4 bg-white">
        <div className="overflow-hidden">
          <div className="ml-3 flex w-fit max-w-full flex-col sm:ml-4">
            <div className="relative mb-[5px] ml-7 h-[15px] text-[10px] text-[#868b94]">
              {weeks.map((week, index) => {
                if (week.monthIndex === null) return null;

                return (
                  <span
                    key={`${week.label}-${index}`}
                    className="absolute whitespace-nowrap"
                    style={{ left: `${index * MONTH_OFFSET}px` }}
                  >
                    {week.label}
                  </span>
                );
              })}
            </div>

            <div className="flex w-fit gap-2">
              <div className="w-5 shrink-0 text-left text-[10px] text-[#868b94]">
                <span className="block h-[11px]" />
                <span className="mt-[2px] block h-[11px] leading-[11px]">월</span>
                <span className="mt-[15px] block h-[11px] leading-[11px]">수</span>
                <span className="mt-[15px] block h-[11px] leading-[11px]">금</span>
              </div>

              <div className="overflow-hidden pb-3">
                <div className="flex gap-[2px]">
                  {weeks.map((week, index) => (
                    <div key={`${week.label}-${index}`} className="flex flex-col gap-[2px]">
                      {week.days.map((day) => (
                        <div
                          key={day.date}
                          title={day.tooltip}
                          className={`h-[11px] w-[11px] rounded-[2px] ${day.colorClassName} ${day.isOutsideYear ? "border-none" : ""}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 flex w-full flex-wrap items-center justify-end gap-[6px] text-[11px] font-medium text-[#868b94] sm:text-[11px]">
              <span>결석/미출석</span>
              <span className="h-[11px] w-[11px] rounded-[2px] bg-[#ebedf0]" />
              <span className="h-[11px] w-[11px] rounded-[2px] bg-[#f6c453]" />
              <span className="h-[11px] w-[11px] rounded-[2px] bg-[#ab8bff]" />
              <span className="h-[11px] w-[11px] rounded-[2px] bg-[#34c759]" />
              <span>출석/기타</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
