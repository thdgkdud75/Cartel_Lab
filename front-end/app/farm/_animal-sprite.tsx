"use client";

import { useEffect, useRef, useState } from "react";
import type { Animal } from "./types";
import { spriteUrlFor, spriteFor } from "./_sprites";

interface Props {
  animal: Animal;
  onClick: (animal: Animal, x: number, y: number) => void;
}

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

  const svgUrl = spriteUrlFor(animal.species.code, animal.current_stage);
  const emoji = spriteFor(animal.species.code, animal.current_stage);

  const size = 48 + animal.current_stage * 12;

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      aria-label={animal.nickname ?? animal.species.name}
      className="absolute select-none cursor-pointer"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(-50%, -50%) ${popping ? "scale(1.18)" : "scale(1)"}`,
        transition: "left 3s cubic-bezier(0.22, 1, 0.36, 1), top 3s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s ease-out",
        willChange: "transform, left, top",
      }}
    >
      {svgUrl ? (
        <img
          src={svgUrl}
          alt={animal.nickname ?? animal.species.name}
          width={size}
          height={size}
          style={{ imageRendering: "auto", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.15))" }}
        />
      ) : (
        <span className="text-5xl md:text-6xl" aria-hidden>{emoji}</span>
      )}
    </button>
  );
}
