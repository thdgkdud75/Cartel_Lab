"use client";

import { badgeStyle, heroCardStyle, neutralBadgeStyle, primaryButtonStyle } from "./_styles";

type SeatHeroSectionProps = {
  showUserStatus: boolean;
  currentUserName: string;
  currentUserSeatNumber: number | null;
  isSuperuser: boolean;
  isTimetableOpen: boolean;
  latestMessage: string;
  onOpenTimetable: () => void;
};

export function SeatHeroSection({
  showUserStatus,
  currentUserName,
  currentUserSeatNumber,
  isSuperuser,
  isTimetableOpen,
  latestMessage,
  onOpenTimetable,
}: SeatHeroSectionProps) {
  return (
    <section style={heroCardStyle}>
      <div className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span style={badgeStyle}>실시간 좌석 현황</span>
            {isSuperuser ? <span style={neutralBadgeStyle}>ADMIN MODE</span> : null}
          </div>
          <h1 className="text-[clamp(32px,5vw,54px)] font-[800] tracking-[-0.05em] text-[#212124]">
            자리 배치를 빠르게 확인하고
            <br className="hidden sm:block" /> 바로 관리하세요.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280] sm:text-[15px]">
            좌석을 클릭하면 이름과 출결 시간을 전환해서 볼 수 있습니다. 빈 좌석은 바로 등록할 수 있고,
            관리자는 현재 사용 중인 좌석도 즉시 초기화할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <button type="button" style={primaryButtonStyle} onClick={onOpenTimetable} aria-pressed={isTimetableOpen}>
            시간표 확인
          </button>
          <p className="text-xs font-medium text-[#8a9099]">반별 시간표를 모달에서 바로 확인할 수 있습니다.</p>
        </div>
      </div>

      {showUserStatus || latestMessage ? (
        <div className="border-t border-[#efe8df] px-6 py-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {showUserStatus ? (
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#f0d6c3] bg-[#fff6f0] px-4 py-3 text-sm font-semibold text-[#9a3412]">
                {currentUserSeatNumber ? (
                  <span className="truncate">
                    <strong>{currentUserName}</strong>님의 배정 좌석: <strong>{currentUserSeatNumber}번</strong>
                  </span>
                ) : (
                  <span>아직 배정된 좌석이 없습니다. 빈 좌석을 클릭해서 등록하세요.</span>
                )}
              </div>
            ) : (
              <div />
            )}
            {latestMessage ? (
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#e8ebef] bg-[#f7f8fa] px-4 py-3 text-sm font-medium text-[#4b5563]">
                <span className="truncate">{latestMessage}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
