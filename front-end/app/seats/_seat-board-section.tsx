"use client";

import * as React from "react";

import { sectionCardStyle, legendItemStyle } from "./_styles";

export type SeatItem = {
  number: number;
  is_occupied: boolean;
  user_name: string | null;
  is_mine: boolean;
  entry_time: string | null;
  exit_time: string | null;
  attendance_status: "none" | "present" | "checked_out" | "absent";
  attendance_labels: string[];
};

export type SeatBoardData = {
  seats: SeatItem[];
  current_user_seat_number: number | null;
  can_select_empty_seat: boolean;
  is_superuser: boolean;
};

type SeatBoardSectionProps = {
  loading: boolean;
  boardData: SeatBoardData | null;
  errorMessage: string;
  isAuthenticated: boolean;
  activeActionSeat: string | null;
  onRegisterSeat: (seatNumber: number) => void | Promise<void>;
  onClearSeat: (seatNumber: number) => void | Promise<void>;
};

const seatPositions: Record<number, string> = {
  1: "1 / 1",
  2: "2 / 1",
  3: "3 / 1",
  4: "4 / 1",
  5: "4 / 2",
  6: "4 / 3",
  7: "4 / 4",
  8: "3 / 4",
  9: "2 / 4",
  10: "1 / 4",
};

const seatNumbers = Array.from({ length: 10 }, (_, index) => index + 1);

export function SeatBoardSection({
  loading,
  boardData,
  errorMessage,
  isAuthenticated,
  activeActionSeat,
  onRegisterSeat,
  onClearSeat,
}: SeatBoardSectionProps) {
  const [viewMode, setViewMode] = React.useState<Record<number, "name" | "time">>({});
  const seatMap = new Map(boardData?.seats.map((seat) => [seat.number, seat]) ?? []);

  return (
    <section style={sectionCardStyle} className="overflow-hidden">
      <div className="border-b border-[#edf0f3] px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[28px] font-[800] tracking-[-0.04em] text-[#212124]">좌석 보드</h2>
            <p className="mt-1 text-sm text-[#6b7280]">배치 구조는 기존 템플릿과 동일하게 유지했습니다.</p>
          </div>
          {errorMessage ? <p className="text-sm font-medium text-[#b42318]">{errorMessage}</p> : null}
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="rounded-[28px] border border-[#eef1f4] bg-[#fbfbfc] px-3 py-5 sm:px-5 sm:py-6">
          <div className="mx-auto grid w-full max-w-[560px] grid-cols-4 gap-3 sm:gap-5">
            <div
              className="col-[2_/_4] row-[1_/_2] flex min-h-[72px] items-center justify-center rounded-[18px] border border-dashed border-[#d7dbe1] bg-white text-sm font-bold text-[#9aa0aa] sm:min-h-[96px]"
            >
              문 (입구)
            </div>

            {seatNumbers.map((seatNumber) => {
              const seat = seatMap.get(seatNumber);
              const currentMode = viewMode[seatNumber] ?? "name";
              const isBusy = activeActionSeat === `register-${seatNumber}` || activeActionSeat === `clear-${seatNumber}`;

              return (
                <div
                  key={seatNumber}
                  className="aspect-square min-h-[84px] sm:min-h-[115px]"
                  style={{ gridArea: seatPositions[seatNumber] }}
                >
                  <SeatCard
                    seat={seat ?? createEmptySeat(seatNumber)}
                    canSelectEmptySeat={Boolean(boardData?.can_select_empty_seat) || !isAuthenticated}
                    currentMode={currentMode}
                    isSuperuser={Boolean(boardData?.is_superuser)}
                    isBusy={isBusy}
                    onToggle={() => {
                      if (!seat?.is_occupied) return;
                      setViewMode((prev) => ({
                        ...prev,
                        [seatNumber]: prev[seatNumber] === "time" ? "name" : "time",
                      }));
                    }}
                    onRegister={() => onRegisterSeat(seatNumber)}
                    onClear={() => onClearSeat(seatNumber)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <LegendItem color="#ffffff" borderColor="#d5d9de" label="빈 좌석" />
          <LegendItem color="#dcff9f" borderColor="#78c43b" label="출석 중" />
          <LegendItem color="#edf7ed" borderColor="#51cf66" label="퇴실 완료" />
          <LegendItem color="#343a40" borderColor="#495057" label="미출석" />
          <LegendItem color="#fff7db" borderColor="#ffb347" label="내 좌석" />
        </div>

        {!loading && boardData?.seats.length === 0 ? (
          <div className="mt-6 rounded-[20px] border border-dashed border-[#d5dae1] bg-[#fafbfc] px-5 py-8 text-center text-sm font-medium text-[#8b919b]">
            등록된 좌석 정보가 없습니다.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SeatCard({
  seat,
  canSelectEmptySeat,
  currentMode,
  isSuperuser,
  isBusy,
  onToggle,
  onRegister,
  onClear,
}: {
  seat: SeatItem;
  canSelectEmptySeat: boolean;
  currentMode: "name" | "time";
  isSuperuser: boolean;
  isBusy: boolean;
  onToggle: () => void;
  onRegister: () => void;
  onClear: () => void;
}) {
  const statusStyle = getSeatStyle(seat);
  const labelList = seat.attendance_labels.length > 0 ? seat.attendance_labels : ["미출첵"];
  const showRegisterAction = !seat.is_occupied && canSelectEmptySeat;

  return (
    <div
      role="button"
      tabIndex={isBusy || (!seat.is_occupied && !showRegisterAction) ? -1 : 0}
      onClick={() => {
        if (seat.is_occupied) {
          onToggle();
          return;
        }
        if (showRegisterAction && !isBusy && window.confirm(`${seat.number}번 좌석으로 이동/등록하시겠습니까?`)) {
          void onRegister();
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (seat.is_occupied) {
          onToggle();
          return;
        }
        if (showRegisterAction && !isBusy && window.confirm(`${seat.number}번 좌석으로 이동/등록하시겠습니까?`)) {
          void onRegister();
        }
      }}
      aria-disabled={isBusy || (!seat.is_occupied && !showRegisterAction)}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[18px] border-[3px] px-2 text-center transition-transform duration-200 hover:-translate-y-1 sm:rounded-[20px]"
      style={{
        ...statusStyle,
        cursor: isBusy || (!seat.is_occupied && !showRegisterAction) ? "default" : "pointer",
        opacity: isBusy ? 0.8 : 1,
      }}
    >
      {!seat.is_occupied ? (
        <>
          <span className="text-[22px] font-[800] leading-none sm:text-[28px]">{seat.number}</span>
        </>
      ) : (
        <>
          <div className="w-full px-1">
            {currentMode === "time" ? (
              <div className="space-y-1 text-[11px] font-bold sm:text-[13px]">
                <div>입실 {seat.entry_time ?? "--"}</div>
                <div>퇴실 {seat.exit_time ?? "--"}</div>
              </div>
            ) : (
              <>
                <div className="text-[12px] font-[700] leading-5 break-keep sm:text-[15px]">{seat.user_name}</div>
                {seat.attendance_status === "absent" ? (
                  <div className="mt-2 flex flex-col items-center gap-1">
                    {labelList.map((label) => (
                      <span
                        key={label}
                        className="rounded-full px-2 py-0.5 text-[10px] font-[800] tracking-[0.01em] sm:text-[11px]"
                        style={{ background: "rgba(255,255,255,0.18)", color: "inherit" }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {isSuperuser ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (isBusy) return;
                if (window.confirm(`${seat.user_name ?? "사용자"}의 좌석을 비우시겠습니까?`)) {
                  void onClear();
                }
              }}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#f04438] text-sm font-[800] text-white shadow-sm"
            >
              ×
            </button>
          ) : null}
        </>
      )}

      {isBusy ? (
        <span className="absolute bottom-1.5 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-[800]">
          처리 중
        </span>
      ) : null}
    </div>
  );
}

function LegendItem({ color, borderColor, label }: { color: string; borderColor: string; label: string }) {
  return (
    <div style={legendItemStyle}>
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: color,
          border: `1px solid ${borderColor}`,
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function createEmptySeat(number: number): SeatItem {
  return {
    number,
    is_occupied: false,
    user_name: null,
    is_mine: false,
    entry_time: null,
    exit_time: null,
    attendance_status: "none",
    attendance_labels: [],
  };
}

function getSeatStyle(seat: SeatItem) {
  if (!seat.is_occupied) {
    return {
      background: "#ffffff",
      borderColor: "#eff1f4",
      color: "#a1a7b0",
      boxShadow: "none",
    };
  }

  if (seat.is_mine) {
    return {
      background: seat.attendance_status === "absent" ? "#343a40" : "#fff7db",
      borderColor: "#ffb347",
      color: seat.attendance_status === "absent" ? "#f8f9fa" : "#8a4b06",
      boxShadow: "0 0 0 4px rgba(255, 179, 71, 0.18)",
    };
  }

  if (seat.attendance_status === "checked_out") {
    return {
      background: "#edf7ed",
      borderColor: "#51cf66",
      color: "#2b8a3e",
      boxShadow: "none",
    };
  }

  if (seat.attendance_status === "present") {
    return {
      background: "#dcff9f",
      borderColor: "#78c43b",
      color: "#356b0f",
      boxShadow: "none",
    };
  }

  return {
    background: "#343a40",
    borderColor: "#495057",
    color: "#f8f9fa",
    boxShadow: "none",
  };
}
