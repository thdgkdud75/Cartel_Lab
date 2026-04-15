"use client";

import type { FarmMe } from "./types";

interface Props {
  data: FarmMe;
  onOpenEgg: () => void;
  toast?: string | null;
}

export function TodayCard({ data, onOpenEgg, toast }: Props) {
  const slotsText = `Lv${data.level} 농장 · 슬롯 ${data.display_slots}`;
  const farmLevels = [
    { req: 0, slots: 5 },
    { req: 600, slots: 10 },
    { req: 2000, slots: 15 },
  ];
  const next = farmLevels.find((lv) => lv.req > data.total_exp);
  const progress = next
    ? Math.round(((data.total_exp - (farmLevels[data.level - 1]?.req ?? 0)) /
        (next.req - (farmLevels[data.level - 1]?.req ?? 0))) * 100)
    : 100;

  return (
    <div className="rounded-2xl border border-dashed border-[#eaebee] bg-white p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#868b94]">오늘의 기록</span>
        <span className="text-xs text-[#a7adb7]">No. {data.dex_no}</span>
      </div>

      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-2xl font-semibold text-[#212124]">
            {data.coins}
            <span className="text-sm text-[#868b94] ml-1">🪙</span>
          </div>
          <div className="text-xs text-[#868b94]">코인</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-[#212124]">
            {data.streak_days}
            <span className="text-sm text-[#FF6B35] ml-1">🔥</span>
          </div>
          <div className="text-xs text-[#868b94]">연속 출석</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-[#868b94] mb-1">
          <span>{slotsText}</span>
          {next && <span>{data.total_exp} / {next.req} EXP</span>}
        </div>
        <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FF6B35]"
            style={{ width: `${progress}%`, transition: "width 0.6s ease-out" }}
          />
        </div>
      </div>

      {toast && (
        <div className="rounded-lg bg-[#fff7ed] border border-[#FFD166] px-3 py-2 text-sm text-[#c2410c]">
          {toast}
        </div>
      )}

      <button
        onClick={onOpenEgg}
        disabled={data.coins < 30}
        className="w-full py-3 rounded-xl bg-[#FF6B35] text-white font-medium hover:bg-[#e8541f] disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        🥚 봉투 열기 <span className="text-xs font-normal">(30 🪙)</span>
      </button>
    </div>
  );
}
