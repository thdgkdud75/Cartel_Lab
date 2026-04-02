"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pages, Routes } from "@/constants/enums";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { AdminSection } from "./_admin-section";
import { MembersSection, type CurrentMember } from "./_members-section";
import { OverviewSection, type AttendanceHeatmap, type AttendanceStats } from "./_overview-section";
import { RequestsSection, type CheckoutRequestItem } from "./_requests-section";
import {
  StatusSection,
  type AttendanceLocationSetting,
  type AttendanceTimeSetting,
  type AttendanceUser,
  type TodayRecord,
  type TodayStatus,
} from "./_status-section";
import { attendanceContainerClassName, attendanceShellClassName } from "./_styles";

type AttendanceDashboardData = {
  today: string;
  user: AttendanceUser;
  today_record: TodayRecord;
  today_status: TodayStatus;
  time_setting: AttendanceTimeSetting;
  location_setting: AttendanceLocationSetting;
  stats: AttendanceStats;
  current_members: { members: CurrentMember[]; count: number };
  checkout_requests: { requests: CheckoutRequestItem[] };
  heatmap: AttendanceHeatmap;
};

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<AttendanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const accessToken = session?.user?.access_token ?? null;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/${Pages.LOGIN}`);
    }
  }, [router, status]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authFetch(`${Routes.ATTENDANCE}/dashboard/`) as AttendanceDashboardData;
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    void fetchDashboard();
  }, [accessToken, fetchDashboard, status]);

  if (status === "loading" || (status === "authenticated" && !accessToken) || (status === "authenticated" && loading && !data)) {
    return (
      <div className={`${attendanceShellClassName} flex items-center justify-center`}>
        <div className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#5f6368] shadow-sm">출결 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`${attendanceShellClassName} flex items-center justify-center`}>
        <div className="rounded-[28px] border border-[#e7e9ee] bg-white px-8 py-10 text-center shadow-sm">
          <h1 className="text-2xl font-black tracking-[-0.04em] text-[#202124]">출결 데이터를 불러오지 못했습니다</h1>
          <button onClick={() => void fetchDashboard()} className="mt-5 rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={attendanceShellClassName}>
      <div className={`${attendanceContainerClassName} py-8 pb-16`}>
        <div className="rounded-[28px] border border-[#e9ebef] bg-white p-4 shadow-[0_10px_30px_rgba(17,24,39,0.06)] sm:p-6">
          <div className="grid gap-6">
            <div className="order-2 xl:order-none">
              <RequestsSection requests={data.checkout_requests.requests} authFetch={authFetch} onRefresh={fetchDashboard} />
            </div>

            <div className="order-1 grid gap-6 xl:order-none xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)] xl:items-start">
              <div className="order-1">
                <StatusSection
                  user={data.user}
                  todayRecord={data.today_record}
                  todayStatus={data.today_status}
                  timeSetting={data.time_setting}
                  authFetch={authFetch}
                  onRefresh={fetchDashboard}
                />
              </div>
              <div className="order-2">
                <MembersSection members={data.current_members.members} count={data.current_members.count} />
              </div>

              <div className="order-3 xl:col-span-1">
                <OverviewSection today={data.today} stats={data.stats} heatmap={data.heatmap} />
              </div>
            </div>
          </div>

          {data.user.is_staff && (
            <div className="mt-6">
              <AdminSection
                locationSetting={data.location_setting}
                timeSetting={data.time_setting}
                authFetch={authFetch}
                onRefresh={fetchDashboard}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
