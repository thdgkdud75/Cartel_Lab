"use client";

import { useEffect, useState } from "react";
import {
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  getDailyTimetableItems,
  type ClassTimetable,
} from "@/constants/timetable";
import { sectionCardStyle, subCardStyle } from "./_styles";

type DailyTimetableSectionProps = {
  schedules: ClassTimetable[];
  initialClassGroup: "A" | "B";
  initialWeekday: number;
};

export function DailyTimetableSection({
  schedules,
  initialClassGroup,
  initialWeekday,
}: DailyTimetableSectionProps) {
  const [selectedClassGroup, setSelectedClassGroup] = useState<"A" | "B">(initialClassGroup);
  const [selectedWeekday, setSelectedWeekday] = useState(normalizeWeekday(initialWeekday));

  useEffect(() => {
    setSelectedClassGroup(initialClassGroup);
  }, [initialClassGroup]);

  useEffect(() => {
    setSelectedWeekday(normalizeWeekday(initialWeekday));
  }, [initialWeekday]);

  const dailyEntries = getDailyTimetableItems(selectedClassGroup, selectedWeekday);

  return (
    <section style={sectionCardStyle} className="overflow-hidden">
      <div className="border-b border-[#edf0f3] px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[28px] font-[800] tracking-[-0.04em] text-[#212124]">일간 시간표</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              주간 표에서 선택한 반 기준으로 하루 수업만 끊어서 확인할 수 있습니다.
            </p>
          </div>

          {schedules.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {schedules.map((schedule) => {
                const active = schedule.classGroup === selectedClassGroup;
                return (
                  <button
                    key={schedule.classGroup}
                    type="button"
                    onClick={() => setSelectedClassGroup(schedule.classGroup)}
                    className="rounded-full px-4 py-2 text-sm font-[700] transition-colors"
                    style={{
                      background: active ? "#ff6f0f" : "#f4f5f7",
                      color: active ? "#ffffff" : "#5f6672",
                    }}
                  >
                    {schedule.classGroup}반
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_SHORT_LABELS.map((label, index) => {
            const active = index === selectedWeekday;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedWeekday(index)}
                className="rounded-full px-4 py-2 text-sm font-[700] transition-colors"
                style={{
                  background: active ? "#212124" : "#f4f5f7",
                  color: active ? "#ffffff" : "#5f6672",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div
          className="mt-5 rounded-[24px] border p-5"
          style={{
            ...subCardStyle,
            background: "#fffaf6",
            borderColor: "#f3e0d2",
          }}
        >
          <p className="text-sm font-[700] text-[#c2560c]">선택된 일정</p>
          <h3 className="mt-1 text-[30px] font-[800] tracking-[-0.05em] text-[#212124]">
            {selectedClassGroup}반 · {WEEKDAY_LABELS[selectedWeekday]}
          </h3>
          <p className="mt-2 text-sm text-[#7b6f67]">
            {dailyEntries.length > 0
              ? `${dailyEntries.length}개의 수업이 있습니다.`
              : "선택한 요일에는 수업이 없습니다."}
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {dailyEntries.map((entry) => (
            <article
              key={`${selectedClassGroup}-${entry.weekday}-${entry.period}-${entry.subject}`}
              className="grid gap-4 rounded-[22px] border border-[#e7eaee] bg-white px-5 py-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-center"
            >
              <div className="rounded-[18px] bg-[#f7f8fa] px-4 py-4 text-center md:text-left">
                <p className="text-[13px] font-[800] tracking-[0.02em] text-[#8b919b]">PERIOD</p>
                <p className="mt-1 text-[18px] font-[800] tracking-[-0.03em] text-[#212124]">{entry.period}</p>
              </div>
              <div>
                <p className="text-sm font-[700] text-[#c2560c]">{entry.weekdayLabel}</p>
                <h4 className="mt-1 text-[22px] font-[800] tracking-[-0.04em] text-[#212124]">{entry.subject}</h4>
                <p className="mt-2 text-sm font-[700] text-[#6b7280]">{entry.detail}</p>
              </div>
            </article>
          ))}

          {dailyEntries.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#d7dde4] bg-[#fafbfc] px-5 py-10 text-center text-sm font-medium text-[#98a0aa]">
              선택한 요일에 등록된 수업이 없습니다.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function normalizeWeekday(weekday: number) {
  return weekday >= 0 && weekday <= 4 ? weekday : 0;
}
