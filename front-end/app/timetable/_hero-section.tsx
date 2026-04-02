"use client";

import {
  WEEKDAY_LABELS,
  getDailyTimetableItems,
  type ClassTimetable,
} from "@/constants/timetable";
import { badgeStyle, heroCardStyle, neutralBadgeStyle, subCardStyle } from "./_styles";

type TimetableHeroSectionProps = {
  primarySchedule: ClassTimetable;
  todayWeekday: number;
  userName: string;
  classGroupLabel: string;
};

export function TimetableHeroSection({
  primarySchedule,
  todayWeekday,
  userName,
  classGroupLabel,
}: TimetableHeroSectionProps) {
  const todayEntries = getDailyTimetableItems(primarySchedule.classGroup, todayWeekday);
  const firstClass = todayEntries[0];

  return (
    <section style={heroCardStyle}>
      <div className="grid gap-5 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:px-10">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span style={badgeStyle}>시간표</span>
            <span style={neutralBadgeStyle}>{classGroupLabel}</span>
          </div>
          <h1 className="text-[clamp(32px,5vw,54px)] font-[800] tracking-[-0.05em] text-[#212124]">
            {userName}님에게 맞는 반 시간표를
            <br className="hidden sm:block" /> 실제 모달 구조 그대로 옮겼습니다.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280] sm:text-[15px]">
            운영 `seats`에서 보이는 시간표 기준으로 `교시`, `과목`, `교수/강의실` 정보를 그대로 반영했습니다.
            반 정보가 있으면 해당 반 표가 우선 노출되고, 일간 보기에서도 같은 반 기준으로 수업을 읽을 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <SummaryCard label="기준 반" value={classGroupLabel} helper={primarySchedule.modalTitle} />
          <SummaryCard label="오늘 요일" value={WEEKDAY_LABELS[todayWeekday] ?? "월요일"} helper="운영 모달 기준 강조 열" />
          <SummaryCard label="오늘 첫 수업" value={firstClass?.period ?? "없음"} helper={firstClass ? `${firstClass.subject} · ${firstClass.detail}` : "오늘 수업 없음"} />
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div style={subCardStyle} className="rounded-[22px] p-5">
      <p className="text-[13px] font-[800] tracking-[0.02em] text-[#8b919b]">{label}</p>
      <p className="mt-2 text-[30px] font-[800] tracking-[-0.05em] text-[#212124]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#6b7280]">{helper}</p>
    </div>
  );
}
