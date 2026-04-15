/** v1 임시 스프라이트 — 실제 일러스트 적용 전까지 이모지 사용. */
export const SPECIES_EMOJI: Record<string, string[]> = {
  chick: ["🥚", "🐣", "🐤", "🐔"],
  rabbit: ["🥚", "🐰", "🐇", "🐰"],
  fox: ["🥚", "🦊", "🦊", "🦊"],
  cat: ["🥚", "🐱", "🐈", "🐈‍⬛"],
  dragon: ["🥚", "🦎", "🐲", "🐉"],
};

export function spriteFor(speciesCode: string, stage: number): string {
  const set = SPECIES_EMOJI[speciesCode] ?? ["❓"];
  return set[Math.min(stage, set.length - 1)] ?? "❓";
}

export const RARITY_STARS: Record<string, string> = {
  N: "⭐",
  R: "⭐⭐",
  SR: "⭐⭐⭐",
  SSR: "⭐⭐⭐⭐",
};

export const RARITY_COLOR: Record<string, string> = {
  N: "#9CA3AF",
  R: "#7BC47F",
  SR: "#FFD166",
  SSR: "#FF6B35",
};
