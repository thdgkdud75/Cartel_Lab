"use client";

import { useMemo, useState } from "react";
import { ATTENDANCE_STATUS_META } from "@/constants/attendance";
import { Methods, Routes } from "@/constants/enums";
import { attendanceCardClassName } from "./_styles";

export type AttendanceUser = {
  name: string;
  student_id: string;
  grade: string;
  class_group: string;
  profile_image: string | null;
  is_staff: boolean;
};

export type TodayRecord = {
  status: keyof typeof ATTENDANCE_STATUS_META;
  status_label: string;
  check_in_at: string | null;
  check_out_at: string | null;
  note: string | null;
} | null;

export type TodayStatus = {
  attendance: "none" | "checked_in" | "checked_out";
  checkout_request: "pending" | "approved" | "rejected" | null;
};

export type AttendanceTimeSetting = {
  check_in_deadline: string | null;
  check_out_minimum: string | null;
};

export type AttendanceLocationSetting = {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
} | null;

type Props = {
  user: AttendanceUser;
  todayRecord: TodayRecord;
  todayStatus: TodayStatus;
  timeSetting: AttendanceTimeSetting;
  authFetch: (endpoint: string, options?: RequestInit) => Promise<unknown>;
  onRefresh: () => Promise<void>;
};

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("브라우저에서 위치 정보를 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () => {
      reject(new Error("위치 정보를 가져오지 못했습니다."));
    });
  });
}

export function StatusSection({ user, todayRecord, todayStatus, timeSetting, authFetch, onRefresh }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"check-in" | "check-out" | "request" | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedTime, setRequestedTime] = useState("");

  const statusMeta = useMemo(() => {
    if (!todayRecord) return ATTENDANCE_STATUS_META.absent;
    return ATTENDANCE_STATUS_META[todayRecord.status] ?? ATTENDANCE_STATUS_META.absent;
  }, [todayRecord]);

  async function handleCheckIn() {
    setLoadingAction("check-in");
    setMessage(null);
    try {
      const position = await getCurrentPosition();
      const result = await authFetch(`${Routes.ATTENDANCE}/check-in/`, {
        method: Methods.POST,
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      }) as { message?: string };
      setMessage(result.message ?? "출석이 처리되었습니다.");
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "출석 처리에 실패했습니다.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCheckOut() {
    setLoadingAction("check-out");
    setMessage(null);
    try {
      const position = await getCurrentPosition();
      const result = await authFetch(`${Routes.ATTENDANCE}/check-out/`, {
        method: Methods.POST,
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      }) as { status?: string; request_status?: string; message?: string };

      if (result.status === "outside_geofence") {
        setRequestedTime(timeSetting.check_out_minimum ?? "");
        setShowRequestModal(true);
      }

      setMessage(result.message ?? "퇴실 처리 결과를 확인하세요.");
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "퇴실 처리에 실패했습니다.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSubmitCheckoutRequest() {
    if (!requestedTime) {
      setMessage("퇴실 요청 시간을 선택하세요.");
      return;
    }
    setLoadingAction("request");
    try {
      const result = await authFetch(`${Routes.ATTENDANCE}/checkout-request/`, {
        method: Methods.POST,
        body: JSON.stringify({ requested_time: requestedTime }),
      }) as { message?: string };
      setMessage(result.message ?? "퇴실 요청이 접수되었습니다.");
      setShowRequestModal(false);
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "퇴실 요청에 실패했습니다.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <section className={`${attendanceCardClassName} p-3 sm:p-5`}>
      <div className="flex flex-wrap items-center gap-3">
        {user.profile_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.profile_image} alt={user.name} className="h-11 w-11 rounded-full border-2 border-[#e2e5e9] object-cover sm:h-12 sm:w-12" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#e2e5e9] bg-[#dbeafe] text-[18px] font-bold text-[#1d4ed8] sm:h-12 sm:w-12 sm:text-[20px]">
            {user.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-[#202124] sm:text-[22px]">
            {user.name}님의 오늘의 출결 현황
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#5f6368] sm:text-sm">
            <span>{user.student_id}</span>
            <span>{user.grade}학년 {user.class_group}반</span>
            {todayStatus.checkout_request && (
              <span className="rounded-full bg-[#ede9fe] px-3 py-1.5 font-semibold text-[#6d28d9]">
                퇴실 요청 {todayStatus.checkout_request}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-col items-center sm:mt-5">
        <div className={`inline-flex rounded-[12px] px-4 py-1 text-[18px] font-extrabold sm:px-7 sm:py-[8px] sm:text-[28px] ${statusMeta.badgeClassName}`}>
            {todayRecord?.status_label ?? "출석 전"}
        </div>

        <div className="mt-4 grid w-full max-w-[210px] grid-cols-2 gap-5 text-center sm:mt-5 sm:max-w-[240px] sm:gap-8">
          <div>
            <p className="mb-[2px] text-[11px] text-[#868b94] sm:mb-2 sm:text-[14px]">체크인</p>
            <p className="text-[14px] font-bold text-[#202124] sm:text-[18px]">{formatTime(todayRecord?.check_in_at ?? null)}</p>
          </div>
          <div>
            <p className="mb-[2px] text-[11px] text-[#868b94] sm:mb-2 sm:text-[14px]">체크아웃</p>
            <p className="text-[14px] font-bold text-[#202124] sm:text-[18px]">{formatTime(todayRecord?.check_out_at ?? null)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[#868b94] sm:mt-5 sm:text-[13px]">
          <span>지각 기준 {timeSetting.check_in_deadline ?? "-"}</span>
          <span>조퇴 기준 {timeSetting.check_out_minimum ?? "-"}</span>
        </div>

        <div className="mt-4 flex w-full justify-center sm:mt-5">
          {todayStatus.attendance === "none" && (
            <button
              onClick={handleCheckIn}
              disabled={loadingAction !== null}
              className="rounded-[10px] bg-[#ff6f0f] px-[14px] py-[6px] text-[13px] font-bold text-white disabled:opacity-60 sm:px-5 sm:py-[10px] sm:text-[14px]"
            >
              {loadingAction === "check-in" ? "출석 처리 중..." : "출석체크 하기"}
            </button>
          )}
          {todayStatus.attendance === "checked_in" && (
            <button
              onClick={handleCheckOut}
              disabled={loadingAction !== null}
              className="rounded-[10px] bg-[#fa5252] px-[14px] py-[6px] text-[13px] font-bold text-white disabled:opacity-60 sm:px-5 sm:py-[10px] sm:text-[14px]"
            >
              {loadingAction === "check-out" ? "퇴실 처리 중..." : "퇴실하기"}
            </button>
          )}
          {todayStatus.attendance === "checked_out" && (
            <div className="rounded-[10px] bg-[#f1f2f4] px-[14px] py-[6px] text-[13px] font-bold text-[#202124] sm:px-5 sm:py-[10px] sm:text-[14px]">
              퇴실 완료
            </div>
          )}
        </div>

        {message && (
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-[#4b5563]">
            {message}
          </p>
        )}
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-2xl sm:p-6">
            <h3 className="text-lg font-black tracking-[-0.03em] text-[#202124] sm:text-xl">퇴실 요청 보내기</h3>
            <p className="mt-2 text-sm leading-6 text-[#5f6368]">
              반경 밖에서 퇴실하면 확인 요청으로 전환됩니다. 원하는 퇴실 시간을 선택하세요.
            </p>
            <input
              type="time"
              value={requestedTime}
              onChange={(event) => setRequestedTime(event.target.value)}
              className="mt-5 w-full rounded-2xl border border-[#d9dde3] px-4 py-3 text-sm outline-none"
            />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="rounded-full border border-[#d9dde3] px-4 py-2.5 text-sm font-semibold text-[#5f6368]"
              >
                취소
              </button>
              <button
                onClick={handleSubmitCheckoutRequest}
                disabled={loadingAction === "request"}
                className="rounded-full bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loadingAction === "request" ? "요청 중..." : "요청하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
