"use client";

import { useState } from "react";
import type { Animal } from "./types";
import { spriteFor, spriteUrlFor, RARITY_STARS, RARITY_COLOR } from "./_sprites";

interface Props {
  animal: Animal | null;
  petRemaining: number;
  feedRemaining: number;
  onClose: () => void;
  onPet: () => Promise<void>;
  onFeed: () => Promise<void>;
  onRename: (nickname: string) => Promise<void>;
}

export function SideSheet({ animal, petRemaining, feedRemaining, onClose, onPet, onFeed, onRename }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState<"pet" | "feed" | "rename" | null>(null);

  if (!animal) return null;

  const svgUrl = spriteUrlFor(animal.species.code, animal.current_stage);
  const emoji = spriteFor(animal.species.code, animal.current_stage);
  const stage = animal.species.stages[animal.current_stage];
  const expToNext = stage?.exp_to_next ?? null;

  const guarded = async (kind: "pet" | "feed", fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const submitName = async () => {
    if (!nickname.trim()) {
      setEditingName(false);
      return;
    }
    setBusy("rename");
    try {
      await onRename(nickname.trim());
      setEditingName(false);
    } catch {
      alert("이름을 바꾸지 못했어요");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/20 z-40"
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 h-full w-[88vw] max-w-[360px] bg-white z-50 shadow-xl border-l border-[#eaebee] flex flex-col"
        style={{ transform: "translateX(0)" }}
        role="dialog"
        aria-label="동물 정보"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#f0f2f4]">
          <span className="text-sm text-[#868b94]">스티커 카드</span>
          <button onClick={onClose} className="text-[#505762] hover:text-[#212124] text-sm">닫기</button>
        </header>

        <div className="px-6 py-6 flex flex-col items-center gap-4 border-b border-[#f0f2f4]">
          {svgUrl ? (
            <img src={svgUrl} alt={animal.nickname ?? animal.species.name} width={96} height={96} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
          ) : (
            <div className="text-7xl" aria-hidden>{emoji}</div>
          )}
          <div className="flex items-center gap-2">
            {editingName ? (
              <>
                <input
                  autoFocus
                  defaultValue={animal.nickname ?? ""}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={12}
                  className="border border-[#eaebee] rounded px-2 py-1 text-base w-32"
                />
                <button
                  onClick={submitName}
                  disabled={busy === "rename"}
                  className="text-sm text-[#FF6B35] font-medium"
                >
                  저장
                </button>
              </>
            ) : (
              <>
                <span className="text-xl font-semibold text-[#212124]">
                  {animal.nickname ?? animal.species.name}
                </span>
                <button
                  onClick={() => {
                    setNickname(animal.nickname ?? "");
                    setEditingName(true);
                  }}
                  aria-label="이름 변경"
                  className="text-[#868b94] hover:text-[#212124]"
                >
                  ✏️
                </button>
              </>
            )}
            <span style={{ color: RARITY_COLOR[animal.species.rarity] }} className="text-sm">
              {RARITY_STARS[animal.species.rarity]}
            </span>
          </div>
          <div className="text-sm text-[#505762] font-medium">
            Lv {animal.current_stage + 1} · {stage?.name ?? "—"}
          </div>
          {expToNext !== null && (
            <div className="w-full">
              <div className="flex justify-between text-xs text-[#868b94] mb-1">
                <span>EXP</span>
                <span>{animal.exp} / {expToNext}</span>
              </div>
              <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7BC47F] transition-all"
                  style={{ width: `${Math.min(100, (animal.exp / expToNext) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {expToNext === null && (
            <div className="text-xs text-[#FF6B35] font-medium">최종 진화 완료</div>
          )}
        </div>

        <div className="px-6 py-5 flex flex-col gap-3">
          <button
            onClick={() => guarded("pet", onPet)}
            disabled={petRemaining <= 0 || busy !== null}
            className="w-full py-3 rounded-xl bg-[#FFB5C5] text-[#212124] font-medium hover:bg-[#ffa3b8] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            🤚 쓰다듬기 <span className="text-xs font-normal">({petRemaining}회 남음)</span>
          </button>
          <button
            onClick={() => guarded("feed", onFeed)}
            disabled={feedRemaining <= 0 || busy !== null}
            className="w-full py-3 rounded-xl bg-[#FFD166] text-[#212124] font-medium hover:bg-[#ffc846] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            🍪 간식 주기 <span className="text-xs font-normal">({feedRemaining}회 / 코인 -2)</span>
          </button>
        </div>
      </aside>
    </>
  );
}
