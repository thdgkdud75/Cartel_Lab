"use client";

import { useState } from "react";
import { Methods, Routes } from "@/constants/enums";
import type { AttendanceLocationSetting, AttendanceTimeSetting } from "./_status-section";
import { attendanceCardClassName } from "./_styles";

type Props = {
  locationSetting: AttendanceLocationSetting;
  timeSetting: AttendanceTimeSetting;
  authFetch: (endpoint: string, options?: RequestInit) => Promise<unknown>;
  onRefresh: () => Promise<void>;
};

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("브라우저에서 위치 정보를 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("위치 정보를 가져오지 못했습니다.")));
  });
}

export function AdminSection({ locationSetting, timeSetting, authFetch, onRefresh }: Props) {
  const [locationName, setLocationName] = useState(locationSetting?.name ?? "연구실");
  const [radius, setRadius] = useState(String(locationSetting?.radius ?? 50));
  const [checkIn, setCheckIn] = useState(timeSetting.check_in_deadline ?? "10:00");
  const [checkOut, setCheckOut] = useState(timeSetting.check_out_minimum ?? "18:00");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSetLocation() {
    try {
      const position = await getCurrentPosition();
      const result = await authFetch(`${Routes.ATTENDANCE}/set-location/`, {
        method: Methods.POST,
        body: JSON.stringify({
          name: locationName,
          radius: Number(radius),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      }) as { message?: string };
      setMessage(result.message ?? "위치가 저장되었습니다.");
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "위치 저장에 실패했습니다.");
    }
  }

  async function handleSetTime() {
    try {
      const result = await authFetch(`${Routes.ATTENDANCE}/set-time/`, {
        method: Methods.POST,
        body: JSON.stringify({ check_in: checkIn, check_out: checkOut }),
      }) as { message?: string };
      setMessage(result.message ?? "시간 설정이 저장되었습니다.");
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "시간 저장에 실패했습니다.");
    }
  }

  return (
    <section className={`${attendanceCardClassName} p-5 sm:p-7`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff7a18]">ADMIN CONTROLS</p>
      <h2 className="mt-2 text-[1.5rem] font-black tracking-[-0.04em] text-[#202124] sm:text-[1.8rem]">관리자 설정</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[24px] border border-[#eceef2] bg-[#fafafb] p-4 sm:p-5">
          <h3 className="text-lg font-black tracking-[-0.03em] text-[#202124]">출결 위치</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              className="rounded-2xl border border-[#d9dde3] px-4 py-3 text-sm outline-none"
              placeholder="위치 이름"
            />
            <input
              value={radius}
              onChange={(event) => setRadius(event.target.value)}
              className="rounded-2xl border border-[#d9dde3] px-4 py-3 text-sm outline-none"
              placeholder="반경(m)"
            />
            <button onClick={() => void handleSetLocation()} className="rounded-full bg-[#111827] px-4 py-3 text-sm font-semibold text-white">
              현재 위치로 저장
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#eceef2] bg-[#fafafb] p-4 sm:p-5">
          <h3 className="text-lg font-black tracking-[-0.03em] text-[#202124]">지각 / 조퇴 기준 시간</h3>
          <div className="mt-4 grid gap-3">
            <input type="time" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="rounded-2xl border border-[#d9dde3] px-4 py-3 text-sm outline-none" />
            <input type="time" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="rounded-2xl border border-[#d9dde3] px-4 py-3 text-sm outline-none" />
            <button onClick={() => void handleSetTime()} className="rounded-full bg-[#111827] px-4 py-3 text-sm font-semibold text-white">
              시간 설정 저장
            </button>
          </div>
        </div>
      </div>

      {message && <p className="mt-4 rounded-2xl bg-[#f7f8fa] px-4 py-3 text-sm text-[#4b5563]">{message}</p>}
    </section>
  );
}
