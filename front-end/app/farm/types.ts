export type Rarity = "N" | "R" | "SR" | "SSR";

export interface Stage {
  name: string;
  sprite_url: string;
  exp_to_next: number | null;
}

export interface Species {
  id: number;
  code: string;
  name: string;
  rarity: Rarity;
  description: string;
  stages: Stage[];
}

export interface Animal {
  id: number;
  species: Species;
  current_stage: number;
  exp: number;
  affection: number;
  nickname: string | null;
  acquired_at: string;
  current_sprite_url: string | null;
}

export interface FarmMe {
  dex_no: number;
  level: number;
  display_slots: number;
  coins: number;
  total_exp: number;
  streak_days: number;
  last_attendance_date: string | null;
  pity_normal: number;
  displayed_animals: Animal[];
  daily_remaining: { pet: number; feed: number };
}

export interface FarmEvent {
  type: string;
  [k: string]: unknown;
}
