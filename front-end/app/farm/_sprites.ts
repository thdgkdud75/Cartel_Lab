/** 어몽어스 스타일 SVG 스프라이트 */

const SPECIES_SPRITES: Record<string, string[]> = {
  chick:  ["/sprites/chick_1.svg",  "/sprites/chick_2.svg",  "/sprites/chick_3.svg",  "/sprites/chick_4.svg"],
  rabbit: ["/sprites/rabbit_1.svg", "/sprites/rabbit_2.svg", "/sprites/rabbit_3.svg", "/sprites/rabbit_4.svg"],
  fox:    ["/sprites/fox_1.svg",    "/sprites/fox_2.svg",    "/sprites/fox_3.svg",    "/sprites/fox_4.svg"],
  cat:    ["/sprites/cat_1.svg",    "/sprites/cat_2.svg",    "/sprites/cat_3.svg",    "/sprites/cat_4.svg"],
  dragon: ["/sprites/dragon_1.svg", "/sprites/dragon_2.svg", "/sprites/dragon_3.svg", "/sprites/dragon_4.svg"],
};

/** 이모지 폴백 (SVG 로드 실패 시) */
export const SPECIES_EMOJI: Record<string, string[]> = {
  chick: ["🥚", "🐣", "🐤", "🐔"],
  rabbit: ["🥚", "🐰", "🐇", "🐰"],
  fox: ["🥚", "🦊", "🦊", "🦊"],
  cat: ["🥚", "🐱", "🐈", "🐈‍⬛"],
  dragon: ["🥚", "🦎", "🐲", "🐉"],
};

export function spriteUrlFor(speciesCode: string, stage: number): string | null {
  const set = SPECIES_SPRITES[speciesCode];
  if (!set) return null;
  return set[Math.min(stage, set.length - 1)] ?? null;
}

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
