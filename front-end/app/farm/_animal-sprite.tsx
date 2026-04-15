"use client";

import { useEffect, useRef, useState } from "react";
import type { Animal } from "./types";
import { spriteFor } from "./_sprites";

interface Props {
  animal: Animal;
  onClick: (animal: Animal, x: number, y: number) => void;
}

/**
 * 농장 내 개별 동물. 자체 좌표(x,y) 보유, 2~5초마다 새 목표로 이동.
 * 탭 비활성화 시 자동 일시정지.
 */
export function AnimalSprite({ animal, onClick }: Props) {
  const [pos, setPos] = useState(() => ({
    x: 10 + Math.random() * 80,
    y: 20 + Math.random() * 60,
  }));
  const [popping, setPopping] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const next = () => {
      if (stopped) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(next, 2000);
        return;
      }
      setPos({
        x: 5 + Math.random() * 90,
        y: 15 + Math.random() * 70,
      });
      timer = setTimeout(next, 2000 + Math.random() * 3000);
    };

    timer = setTimeout(next, Math.random() * 1500);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleClick = () => {
    setPopping(true);
    setTimeout(() => setPopping(false), 350);
    const r = ref.current?.getBoundingClientRect();
    onClick(animal, r ? r.left + r.width / 2 : 0, r ? r.top : 0);
  };

  const sprite = spriteFor(animal.species.code, animal.current_stage);

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      aria-label={animal.nickname ?? animal.species.name}
      className="absolute select-none cursor-pointer text-5xl md:text-6xl"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(-50%, -50%) ${popping ? "scale(1.18)" : "scale(1)"}`,
        transition: "left 3s cubic-bezier(0.22, 1, 0.36, 1), top 3s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s ease-out",
        willChange: "transform, left, top",
        textShadow: "0 1px 0 rgba(0,0,0,0.05)",
      }}
    >
      <span aria-hidden>{sprite}</span>
    </button>
  );
}
