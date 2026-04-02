"use client";

import { useEffect, useState } from "react";
import { DASHBOARD_PALETTE } from "@/constants/colors";
import { Routes } from "@/constants/enums";

export type LocationSetting = {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

export type TimeSetting = {
  check_in_deadline: string;
  check_out_minimum: string;
};
import { fieldStyle, primaryButtonStyle, secondaryButtonStyle, sectionCardStyle } from "./_styles";

const PALETTE = DASHBOARD_PALETTE;

type AuthFetch = (url: string, options?: RequestInit) => Promise<any>;

function LocationSettingCard({
  setting,
  authFetch,
  onRefresh,
}: {
  setting: LocationSetting | null;
  authFetch: AuthFetch;
  onRefresh: () => void;
}) {
  const [locName, setLocName] = useState(setting?.name ?? "연구실");
  const [locRadius, setLocRadius] = useState(String(setting?.radius ?? 50));
  const [locMsg, setLocMsg] = useState("");

  useEffect(() => {
    if (setting) {
      setLocName(setting.name);
      setLocRadius(String(setting.radius));
    }
  }, [setting]);

  function handleSetLocation() {
    if (!navigator.geolocation) {
      setLocMsg("위치 정보를 지원하지 않는 브라우저입니다.");
      return;
    }
    setLocMsg("위치 가져오는 중...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await authFetch(`${Routes.ADMIN}/api/set-location/`, {
          method: "POST",
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            name: locName,
            radius: parseFloat(locRadius) || 50,
          }),
        }).catch(() => null);
        setLocMsg(result?.message ?? "설정 완료");
        if (result?.status === "success") onRefresh();
      },
      () => setLocMsg("위치 정보를 가져올 수 없습니다.")
    );
  }

  return (
    <div style={{ ...sectionCardStyle, padding: 22 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>
        출결 허용 위치
      </h3>
      <p style={{ margin: "8px 0 16px", fontSize: 13, lineHeight: 1.65, color: PALETTE.muted }}>
        현재 위치를 기준으로 출결 가능 범위를 설정합니다.
      </p>

      <div
        style={{
          borderRadius: 16,
          background: PALETTE.surfaceSubtle,
          border: `1px solid ${PALETTE.line}`,
          padding: 14,
          marginBottom: 16,
          fontSize: 13,
          lineHeight: 1.7,
          color: setting ? PALETTE.body : PALETTE.danger,
        }}
      >
        {setting ? (
          <>
            <span style={{ color: PALETTE.muted }}>위치명</span> {setting.name}
            <br />
            <span style={{ color: PALETTE.muted }}>위도</span> {setting.latitude}
            <br />
            <span style={{ color: PALETTE.muted }}>경도</span> {setting.longitude}
            <br />
            <span style={{ color: PALETTE.muted }}>허용 반경</span> {setting.radius}m
          </>
        ) : (
          "설정된 위치가 없습니다. 학생 출결 전에 먼저 설정해 주세요."
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={locName}
          onChange={(e) => setLocName(e.target.value)}
          placeholder="위치명"
          style={{ ...fieldStyle, width: 110 }}
        />
        <input
          value={locRadius}
          onChange={(e) => setLocRadius(e.target.value)}
          type="number"
          placeholder="반경(m)"
          style={{ ...fieldStyle, width: 100 }}
        />
        <button onClick={handleSetLocation} style={primaryButtonStyle}>
          현재 위치로 설정
        </button>
      </div>
      {locMsg && (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 13,
            color: locMsg.includes("설정") ? PALETTE.success : PALETTE.danger,
          }}
        >
          {locMsg}
        </p>
      )}
    </div>
  );
}

function AutoCheckoutCard({ authFetch }: { authFetch: AuthFetch }) {
  const [message, setMessage] = useState("");

  async function handleAutoCheckout() {
    setMessage("처리 중...");
    const result = await authFetch(`${Routes.ADMIN}/api/auto-checkout/`, { method: "POST" }).catch(() => null);
    setMessage(result?.message ?? "완료");
  }

  return (
    <div style={{ ...sectionCardStyle, padding: 22 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>
        미퇴실 일괄 처리
      </h3>
      <p style={{ margin: "8px 0 16px", fontSize: 13, lineHeight: 1.65, color: PALETTE.muted }}>
        어제 퇴실을 안 찍은 인원을 오후 5시 기준으로 빠르게 정리합니다.
      </p>

      <div
        style={{
          borderRadius: 16,
          background: PALETTE.surfaceSubtle,
          border: `1px solid ${PALETTE.line}`,
          padding: 14,
          marginBottom: 16,
          fontSize: 13,
          lineHeight: 1.7,
          color: PALETTE.body,
        }}
      >
        반복 확인 전에 한 번에 정리하는 운영용 액션입니다.
      </div>

      <button
        onClick={handleAutoCheckout}
        style={{
          ...secondaryButtonStyle,
          background: PALETTE.ink,
          borderColor: PALETTE.ink,
          color: "#fff",
        }}
      >
        퇴실시간 맞추기
      </button>
      {message && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: PALETTE.success }}>
          {message}
        </p>
      )}
    </div>
  );
}

function TimeSettingCard({
  setting,
  authFetch,
  onRefresh,
}: {
  setting: TimeSetting | null;
  authFetch: AuthFetch;
  onRefresh: () => void;
}) {
  const [checkInTime, setCheckInTime] = useState(setting?.check_in_deadline ?? "10:00");
  const [checkOutTime, setCheckOutTime] = useState(setting?.check_out_minimum ?? "18:00");
  const [timeMsg, setTimeMsg] = useState("");

  useEffect(() => {
    if (setting) {
      setCheckInTime(setting.check_in_deadline);
      setCheckOutTime(setting.check_out_minimum);
    }
  }, [setting]);

  async function handleSetTime() {
    const result = await authFetch(`${Routes.ADMIN}/api/set-time/`, {
      method: "POST",
      body: JSON.stringify({ check_in: checkInTime, check_out: checkOutTime }),
    }).catch(() => null);
    setTimeMsg(result?.message ?? "저장 완료");
    if (result?.status === "success") onRefresh();
  }

  return (
    <div style={{ ...sectionCardStyle, padding: 22 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: PALETTE.ink }}>
        출결 시간 기준
      </h3>
      <p style={{ margin: "8px 0 16px", fontSize: 13, lineHeight: 1.65, color: PALETTE.muted }}>
        지각과 조퇴를 판단하는 기준 시간을 같은 줄에서 조정합니다.
      </p>

      <div
        style={{
          borderRadius: 16,
          background: PALETTE.surfaceSubtle,
          border: `1px solid ${PALETTE.line}`,
          padding: 14,
          marginBottom: 16,
          fontSize: 13,
          lineHeight: 1.7,
          color: PALETTE.body,
        }}
      >
        {setting ? (
          <>
            <span style={{ color: PALETTE.muted }}>지각 기준</span> {setting.check_in_deadline}
            <br />
            <span style={{ color: PALETTE.muted }}>조퇴 기준</span> {setting.check_out_minimum}
          </>
        ) : (
          "설정된 시간 기준이 없습니다."
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label style={{ fontSize: 13, color: PALETTE.muted, fontWeight: 700 }}>지각</label>
        <input
          type="time"
          value={checkInTime}
          onChange={(e) => setCheckInTime(e.target.value)}
          style={{ ...fieldStyle, width: 112 }}
        />
        <label style={{ fontSize: 13, color: PALETTE.muted, fontWeight: 700 }}>조퇴</label>
        <input
          type="time"
          value={checkOutTime}
          onChange={(e) => setCheckOutTime(e.target.value)}
          style={{ ...fieldStyle, width: 112 }}
        />
        <button onClick={handleSetTime} style={primaryButtonStyle}>
          저장
        </button>
      </div>
      {timeMsg && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: PALETTE.success }}>
          {timeMsg}
        </p>
      )}
    </div>
  );
}

export function SettingsPanel({
  locationSetting,
  timeSetting,
  authFetch,
  onRefresh,
}: {
  locationSetting: LocationSetting | null;
  timeSetting: TimeSetting | null;
  authFetch: AuthFetch;
  onRefresh: () => void;
}) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText, marginBottom: 6 }}>
          SETTINGS
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: PALETTE.ink,
          }}
        >
          운영 설정 패널
        </h2>
      </div>

      <div className="grid gap-4">
        <LocationSettingCard setting={locationSetting} authFetch={authFetch} onRefresh={onRefresh} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <AutoCheckoutCard authFetch={authFetch} />
          <TimeSettingCard setting={timeSetting} authFetch={authFetch} onRefresh={onRefresh} />
        </div>
      </div>
    </section>
  );
}
