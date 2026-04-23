"use client";

import { useState } from "react";
import type { Animal, FarmEvent } from "./types";
import { spriteFor, spriteUrlFor, RARITY_STARS, RARITY_COLOR } from "./_sprites";

interface Props {
  open: boolean;
  coins: number;
  onClose: () => void;
  onDraw: () => Promise<{ animal: Animal; events: FarmEvent[] }>;
  onRename: (id: number, nickname: string) => Promise<void>;
}

type Phase = "idle" | "opening" | "revealed";

export function EggDialog({ open, coins, onClose, onDraw, onRename }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Animal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");

  if (!open) return null;

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setError(null);
    setNickname("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const draw = async () => {
    setError(null);
    setPhase("opening");
    try {
      const res = await onDraw();
      setTimeout(() => {
        setResult(res.animal);
        setPhase("revealed");
      }, 900);
    } catch (e: unknown) {
      setPhase("idle");
      const code = e instanceof Error ? e.message : "ERROR";
      if (code === "INSUFFICIENT_COINS") setError("코인이 부족해요 (30코인 필요)");
      else setError("봉투를 열지 못했어요");
    }
  };

  const saveName = async () => {
    if (!result || !nickname.trim()) return;
    try {
      await onRename(result.id, nickname.trim());
    } catch {
      alert("이름을 저장하지 못했어요");
      return;
    }
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={phase === "idle" ? close : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAFAF7] rounded-2xl w-[90vw] max-w-[380px] p-8 shadow-2xl border border-[#eaebee]"
      >
        {phase === "idle" && (
          <>
            <h2 className="text-xl font-semibold text-[#212124] mb-1">🥚 봉투 열기</h2>
            <p className="text-sm text-[#505762] mb-6">
              30 코인을 사용해 새 친구를 만나보세요. 보유: <b>{coins}</b> 🪙
            </p>
            {error && (
              <div className="text-sm text-red-600 mb-3">{error}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={close}
                className="flex-1 py-3 rounded-xl bg-[#f3f4f6] text-[#505762] hover:bg-[#eaebee]"
              >
                취소
              </button>
              <button
                onClick={draw}
                disabled={coins < 30}
                className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white font-medium hover:bg-[#e8541f] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                열기
              </button>
            </div>
          </>
        )}

        {phase === "opening" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-7xl animate-bounce" aria-hidden>🥚</div>
            <p className="text-sm text-[#868b94]">봉투를 열고 있어요…</p>
          </div>
        )}

        {phase === "revealed" && result && (
          <div className="flex flex-col items-center gap-4">
            {spriteUrlFor(result.species.code, 0) ? (
              <img src={spriteUrlFor(result.species.code, 0)!} alt={result.species.name} width={96} height={96} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }} />
            ) : (
              <div className="text-8xl" aria-hidden>{spriteFor(result.species.code, 0)}</div>
            )}
            <div className="text-center">
              <div className="text-xs text-[#868b94] mb-1" style={{ color: RARITY_COLOR[result.species.rarity] }}>
                {RARITY_STARS[result.species.rarity]} {result.species.rarity}
              </div>
              <div className="text-xl font-semibold text-[#212124]">{result.species.name}</div>
              <p className="text-sm text-[#505762] mt-1">{result.species.description}</p>
            </div>
            <div className="w-full">
              <label className="text-xs text-[#868b94] mb-1 block">이름 지어주기 (선택)</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                placeholder="예: 뭉치"
                className="w-full border border-[#eaebee] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={close}
                className="flex-1 py-3 rounded-xl bg-[#f3f4f6] text-[#505762] hover:bg-[#eaebee]"
              >
                나중에
              </button>
              <button
                onClick={saveName}
                disabled={!nickname.trim()}
                className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white font-medium hover:bg-[#e8541f] disabled:opacity-40"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
