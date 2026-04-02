"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pages, Routes } from "@/constants/enums";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { pageContainerStyle, pageShellStyle } from "./_styles";
import { SeatHeroSection } from "./_hero-section";
import { SeatBoardSection } from "./_seat-board-section";
import { SeatTimetableSection } from "./_timetable-section";
import type { SeatBoardData } from "./_seat-board-section";

export default function SeatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const versionRef = useRef("");

  const [boardData, setBoardData] = useState<SeatBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [latestMessage, setLatestMessage] = useState("");
  const [activeActionSeat, setActiveActionSeat] = useState<string | null>(null);
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);

  const loadSeats = useCallback(async (silent = false) => {
    if (status === "loading") return;

    if (!silent) setLoading(true);
    setErrorMessage("");

    try {
      const response = await authFetch(`${Routes.SEATS}/`);
      setBoardData(response);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "좌석 정보를 불러오지 못했습니다.";
      setErrorMessage(nextMessage);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authFetch, status]);

  const checkSeatVersion = useCallback(async () => {
    if (status === "loading") return;

    try {
      const response = await authFetch(`${Routes.SEATS}/version/`);
      if (response.version !== versionRef.current) {
        versionRef.current = response.version;
        await loadSeats(true);
      }
    } catch {
      // 상태 폴링은 조용히 실패시키고, 실제 에러 표시는 상세 조회 요청에서만 노출한다.
    }
  }, [authFetch, loadSeats, status]);

  useEffect(() => {
    if (status === "loading") return;
    void loadSeats();
  }, [status, loadSeats]);

  useEffect(() => {
    if (status === "loading") return;

    const interval = window.setInterval(() => {
      void checkSeatVersion();
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void checkSeatVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, checkSeatVersion]);

  async function handleRegisterSeat(seatNumber: number) {
    if (status !== "authenticated") {
      router.push(`/${Pages.LOGIN}`);
      return;
    }

    setActiveActionSeat(`register-${seatNumber}`);
    setErrorMessage("");

    try {
      const response = await authFetch(`${Routes.SEATS}/${seatNumber}/register/`, {
        method: "POST",
      });
      setLatestMessage(response.message ?? `${seatNumber}번 좌석으로 등록했습니다.`);
      await loadSeats(true);
      const version = await authFetch(`${Routes.SEATS}/version/`);
      versionRef.current = version.version;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "좌석 등록에 실패했습니다.");
    } finally {
      setActiveActionSeat(null);
    }
  }

  async function handleClearSeat(seatNumber: number) {
    if (status !== "authenticated") {
      router.push(`/${Pages.LOGIN}`);
      return;
    }

    setActiveActionSeat(`clear-${seatNumber}`);
    setErrorMessage("");

    try {
      const response = await authFetch(`${Routes.SEATS}/${seatNumber}/clear/`, {
        method: "POST",
      });
      setLatestMessage(response.message ?? `${seatNumber}번 좌석을 초기화했습니다.`);
      await loadSeats(true);
      const version = await authFetch(`${Routes.SEATS}/version/`);
      versionRef.current = version.version;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "좌석 초기화에 실패했습니다.");
    } finally {
      setActiveActionSeat(null);
    }
  }

  if (status === "loading") {
    return null;
  }

  return (
    <div style={pageShellStyle}>
      <div style={pageContainerStyle} className="space-y-6 sm:space-y-7">
        <SeatHeroSection
          showUserStatus={status === "authenticated"}
          currentUserName={session?.user?.name ?? "사용자"}
          currentUserSeatNumber={boardData?.current_user_seat_number ?? null}
          isSuperuser={Boolean(boardData?.is_superuser)}
          isTimetableOpen={isTimetableOpen}
          latestMessage={latestMessage}
          onOpenTimetable={() => setIsTimetableOpen(true)}
        />

        <SeatBoardSection
          loading={loading}
          boardData={boardData}
          errorMessage={errorMessage}
          isAuthenticated={status === "authenticated"}
          activeActionSeat={activeActionSeat}
          onRegisterSeat={handleRegisterSeat}
          onClearSeat={handleClearSeat}
        />
      </div>

      <SeatTimetableSection
        classGroup={session?.user?.class_group}
        open={isTimetableOpen}
        onClose={() => setIsTimetableOpen(false)}
      />
    </div>
  );
}
