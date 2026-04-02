"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { Routes } from "@/constants/enums";
import { DASHBOARD_PALETTE } from "@/constants/colors";
import { useRouter } from "next/navigation";
import { AdminConsoleHero } from "./_hero";
import { PendingDeletionSection } from "./_pending-section";
import { QuizDashboardSection } from "./_quiz-section";
import { SettingsPanel } from "./_settings-section";
import type { DashboardStudent } from "./_attendance-section";
import type { PendingUser } from "./_pending-section";
import type { LocationSetting, TimeSetting } from "./_settings-section";
import type { QuizData } from "./_quiz-section";

type DashData = {
  week_start: string;
  week_end: string;
  today: string;
  today_weekday: number;
  grade_filter: string;
  class_filter: string;
  show_attendance: boolean;
  students: DashboardStudent[];
  pending_deletion: PendingUser[];
  location_setting: LocationSetting | null;
  time_setting: TimeSetting | null;
  quiz_data: QuizData | null;
};
import { WeeklyAttendanceSection } from "./_attendance-section";

const PALETTE = DASHBOARD_PALETTE;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const authFetch = useAuthFetch();

  const [grade, setGrade] = useState("2");
  const [classGroup, setClassGroup] = useState("");
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(Routes.ROOT);
      return;
    }
    if (status === "authenticated" && !session?.user?.is_staff) {
      router.replace(Routes.ROOT);
    }
  }, [status, session, router]);

  const fetchData = useCallback(() => {
    if (status !== "authenticated" || !session?.user?.is_staff) return;

    setLoading(true);
    const params = new URLSearchParams({ grade });
    if (classGroup) params.set("class", classGroup);

    authFetch(`${Routes.ADMIN}/api/main/?${params}`)
      .then((d: DashData) => setData(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [status, session, grade, classGroup, authFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (status === "loading" || !session?.user?.is_staff) return null;

  async function handleDeleteAction(action: "schedule" | "cancel" | "confirm", studentId: string, name?: string) {
    const confirmMsg: Partial<Record<string, string>> = {
      schedule: `'${name}'을 3일 뒤 삭제 예정으로 이동할까요?`,
      confirm: `'${name}' 계정을 지금 즉시 삭제할까요?\n모든 데이터가 삭제됩니다.`,
    };
    if (confirmMsg[action] && !confirm(confirmMsg[action])) return;
    await authFetch(`${Routes.ADMIN}/api/student/${studentId}/${action}-delete/`, { method: "POST" }).catch(() => null);
    fetchData();
  }

  const studentCount = data?.students.length ?? 0;
  const pendingCount = data?.pending_deletion.length ?? 0;
  const locationSummary = data?.location_setting
    ? `${data.location_setting.name} · 반경 ${data.location_setting.radius}m`
    : "출결 허용 위치 미설정";
  const timeSummary = data?.time_setting
    ? `지각 ${data.time_setting.check_in_deadline} / 조퇴 ${data.time_setting.check_out_minimum}`
    : "시간 기준 미설정";

  return (
    <div style={{ minHeight: "100vh", background: PALETTE.page }}>
      <div className="mx-auto max-w-[1240px] px-4 py-6 md:px-6 md:py-8">
        <AdminConsoleHero
          pendingCount={pendingCount}
          grade={grade}
          classGroup={classGroup}
          studentCount={studentCount}
          today={data?.today ?? "--"}
          weekStart={data?.week_start ?? "--"}
          weekEnd={data?.week_end ?? "--"}
          showAttendance={data?.show_attendance ?? false}
          locationSummary={locationSummary}
          timeSummary={timeSummary}
          onGradeChange={setGrade}
          onClassGroupChange={setClassGroup}
        />

        <WeeklyAttendanceSection
          loading={loading}
          showAttendance={data?.show_attendance ?? false}
          studentCount={studentCount}
          today={data?.today ?? "--"}
          weekStart={data?.week_start ?? "--"}
          weekEnd={data?.week_end ?? "--"}
          todayWeekday={data?.today_weekday ?? -1}
          students={data?.students ?? []}
          authFetch={authFetch}
          onRefresh={fetchData}
          onDeleteAction={handleDeleteAction}
        />

        {data?.quiz_data && (
          <QuizDashboardSection
            quizData={data.quiz_data}
            today={data.today}
          />
        )}

        <PendingDeletionSection
          users={data?.pending_deletion ?? []}
          onDeleteAction={handleDeleteAction}
        />

        <SettingsPanel
          locationSetting={data?.location_setting ?? null}
          timeSetting={data?.time_setting ?? null}
          authFetch={authFetch}
          onRefresh={fetchData}
        />

        <style jsx global>{`
          .attendance-badge-face {
            transition: opacity 0.18s ease, transform 0.18s ease;
          }
          .attendance-badge-label {
            opacity: 1;
            transform: translateY(0);
          }
          .attendance-badge-times {
            opacity: 0;
            transform: translateY(4px);
            pointer-events: none;
          }
          @media (hover: hover) {
            .attendance-badge:hover .attendance-badge-label {
              opacity: 0;
              transform: translateY(-4px);
            }
            .attendance-badge:hover .attendance-badge-times {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .attendance-badge.is-showing-times .attendance-badge-label {
            opacity: 0;
            transform: translateY(-4px);
          }
          .attendance-badge.is-showing-times .attendance-badge-times {
            opacity: 1;
            transform: translateY(0);
          }
        `}</style>
      </div>
    </div>
  );
}
