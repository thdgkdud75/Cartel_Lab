"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getAllTimetables,
  getClassTimetable,
  type ClassTimetable,
} from "@/constants/timetable";
import { Pages } from "@/constants/enums";
import { pageContainerStyle, pageShellStyle } from "./_styles";
import { TimetableHeroSection } from "./_hero-section";
import { WeeklyTimetableSection } from "./_weekly-section";
import { DailyTimetableSection } from "./_daily-section";

export default function TimetablePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/${Pages.LOGIN}`);
    }
  }, [router, status]);

  if (status === "loading") {
    return null;
  }

  const classGroup = session?.user?.class_group;
  const selectedSchedule = getClassTimetable(classGroup) ?? getAllTimetables()[0];
  const schedules = getSchedulesForView(classGroup, selectedSchedule);
  const todayWeekday = normalizeWeekday(new Date().getDay());
  const classGroupLabel =
    classGroup === "A" || classGroup === "B" ? `${classGroup}반` : "반 정보 없음";

  return (
    <div style={pageShellStyle}>
      <div style={pageContainerStyle} className="space-y-6 sm:space-y-7">
        <TimetableHeroSection
          primarySchedule={selectedSchedule}
          todayWeekday={todayWeekday}
          userName={session?.user?.name ?? "사용자"}
          classGroupLabel={classGroupLabel}
        />
        <WeeklyTimetableSection schedules={schedules} todayWeekday={todayWeekday} />
        <DailyTimetableSection
          schedules={schedules}
          initialClassGroup={selectedSchedule.classGroup}
          initialWeekday={todayWeekday}
        />
      </div>
    </div>
  );
}

function getSchedulesForView(
  classGroup: string | null | undefined,
  selectedSchedule: ClassTimetable,
) {
  if (classGroup === "A" || classGroup === "B") {
    return [selectedSchedule];
  }
  return [...getAllTimetables()];
}

function normalizeWeekday(day: number) {
  if (day >= 1 && day <= 5) {
    return day - 1;
  }
  return 0;
}
