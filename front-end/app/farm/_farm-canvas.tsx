"use client";

import type { Animal } from "./types";
import { AnimalSprite } from "./_animal-sprite";

interface Props {
  animals: Animal[];
  onSelect: (animal: Animal, x: number, y: number) => void;
}

export function FarmCanvas({ animals, onSelect }: Props) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-[#eaebee]"
      style={{
        aspectRatio: "16 / 9",
        background:
          "linear-gradient(180deg, #fef9f1 0%, #f4f1e8 70%, #e9e3d2 100%)",
      }}
      role="region"
      aria-label="농장"
    >
      {/* 배경 장식 — 절제된 손그림 톤 */}
      <div className="absolute left-[8%] top-[12%] text-3xl opacity-70" aria-hidden>🌳</div>
      <div className="absolute right-[12%] top-[20%] text-2xl opacity-70" aria-hidden>🌿</div>
      <div className="absolute left-[20%] bottom-[15%] text-2xl opacity-60" aria-hidden>🪨</div>
      <div className="absolute right-[18%] bottom-[18%] text-2xl opacity-70" aria-hidden>🌾</div>

      {animals.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[#868b94] text-sm">아직 만난 친구가 없어요. 봉투를 열어보세요.</p>
        </div>
      )}

      {animals.map((a) => (
        <AnimalSprite key={a.id} animal={a} onClick={onSelect} />
      ))}
    </div>
  );
}
