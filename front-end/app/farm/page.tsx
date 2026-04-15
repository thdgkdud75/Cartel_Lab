"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Routes } from "@/constants/enums";
import { farmApi } from "./api";
import type { Animal, FarmMe } from "./types";
import { FarmCanvas } from "./_farm-canvas";
import { TodayCard } from "./_today-card";
import { SideSheet } from "./_side-sheet";
import { EggDialog } from "./_egg-dialog";

export default function FarmPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = session?.user?.access_token;

  const [data, setData] = useState<FarmMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Animal | null>(null);
  const [eggOpen, setEggOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await farmApi.me(token);
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "FAILED");
    }
  }, [token]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(Routes.AUTH);
      return;
    }
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void refresh();
    }
  }, [status, token, refresh, router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (status === "loading" || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
        <p className="text-[#868b94]">불러오는 중…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  const onPet = async () => {
    if (!selected || !token) return;
    try {
      await farmApi.pet(token, selected.id);
      showToast("🤚 쓰다듬기 +1");
      const fresh = await farmApi.me(token);
      setData(fresh);
      const updated = fresh.displayed_animals.find((a) => a.id === selected.id);
      if (updated) setSelected(updated);
    } catch (e) {
      const code = e instanceof Error ? e.message : "ERROR";
      if (code === "DAILY_LIMIT_PET") showToast("오늘은 충분히 쓰다듬어줬어요");
      else showToast("쓰다듬기 실패");
    }
  };

  const onFeed = async () => {
    if (!selected || !token) return;
    try {
      const res = await farmApi.feed(token, selected.id);
      const evolved = res.events.find((e) => e.type === "evolved");
      showToast(evolved ? "✨ 진화했어요!" : "🍪 +5 EXP");
      const fresh = await farmApi.me(token);
      setData(fresh);
      const updated = fresh.displayed_animals.find((a) => a.id === selected.id);
      if (updated) setSelected(updated);
    } catch (e) {
      const code = e instanceof Error ? e.message : "ERROR";
      if (code === "INSUFFICIENT_COINS") showToast("코인이 부족해요");
      else if (code === "DAILY_LIMIT_FEED") showToast("오늘 간식은 다 줬어요");
      else showToast("간식 실패");
    }
  };

  const onRenameSelected = async (nickname: string) => {
    if (!selected || !token) return;
    await farmApi.rename(token, selected.id, nickname);
    const fresh = await farmApi.me(token);
    setData(fresh);
    const updated = fresh.displayed_animals.find((a) => a.id === selected.id);
    if (updated) setSelected(updated);
  };

  const onRenameById = async (id: number, nickname: string) => {
    if (!token) return;
    await farmApi.rename(token, id, nickname);
    refresh();
  };

  const onDraw = async () => {
    if (!token) throw new Error("NO_TOKEN");
    const res = await farmApi.drawEgg(token);
    refresh();
    return res;
  };

  return (
    <main className="min-h-screen bg-[#FAFAF7] py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-baseline justify-between mb-6">
          <div>
            <p className="text-xs text-[#868b94] tracking-wider uppercase">My Stickerbook</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#212124]" style={{ fontFamily: "'Source Serif 4', 'Pretendard', serif" }}>
              내 도감 No. {data.dex_no}
            </h1>
          </div>
          <div className="text-sm text-[#505762]">
            {data.coins} 🪙 · 🔥 {data.streak_days}
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <FarmCanvas animals={data.displayed_animals} onSelect={(a) => setSelected(a)} />
          <TodayCard data={data} onOpenEgg={() => setEggOpen(true)} toast={toast} />
        </div>

        <div className="mt-8 text-xs text-[#a7adb7]">
          농장 슬롯 {data.displayed_animals.length} / {data.display_slots} ·
          오늘 쓰다듬기 {data.daily_remaining.pet}회 · 간식 {data.daily_remaining.feed}회 남음
        </div>
      </div>

      <SideSheet
        animal={selected}
        petRemaining={data.daily_remaining.pet}
        feedRemaining={data.daily_remaining.feed}
        onClose={() => setSelected(null)}
        onPet={onPet}
        onFeed={onFeed}
        onRename={onRenameSelected}
      />

      <EggDialog
        open={eggOpen}
        coins={data.coins}
        onClose={() => setEggOpen(false)}
        onDraw={onDraw}
        onRename={onRenameById}
      />
    </main>
  );
}
