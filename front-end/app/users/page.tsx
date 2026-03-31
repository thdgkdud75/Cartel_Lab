"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { UserCircle2, GitBranch, FileText, Cpu } from "lucide-react";
import { dbFetch } from "@/lib/api-client";
import { Routes, ApiPaths } from "@/constants/enums";
import type { User } from "@/types/user";

export default function MyPage() {
  const { data: session } = useSession();
  const [me, setMe] = useState<User | null>(null);

  useEffect(() => {
    dbFetch(`${Routes.AUTH}${ApiPaths.ME}`)
      .then(setMe)
      .catch(() => null);
  }, []);

  const profileImage = me?.profile_image ?? session?.user?.image ?? null;
  const name = me?.name ?? session?.user?.name ?? "";

  return (
    <main className="min-h-screen bg-[#f8f9fb] px-4 py-10">
      <div className="mx-auto max-w-4xl flex flex-col gap-5">

        {/* 히어로 */}
        <section
          className="rounded-3xl border border-[#ebecef] p-7"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(255,111,15,0.14), transparent 26%), linear-gradient(180deg,#fff7f2 0%,#ffffff 100%)",
          }}
        >
          <div className="flex items-center gap-5">
            {/* 프로필 이미지 */}
            <button
              className="relative w-20 h-20 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center cursor-pointer ring-2 ring-orange-200"
              title="프로필 이미지 변경"
            >
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="프로필"
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <UserCircle2 size={48} className="text-orange-400" />
              )}
            </button>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#1a1d23]">
                {name}님의 프로필
              </h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {me?.student_id && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#f6f7f9] text-[#5f6672] text-sm font-bold">
                    학번 {me.student_id}
                  </span>
                )}
                {me?.class_group && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#f6f7f9] text-[#5f6672] text-sm font-bold">
                    {me.class_group}
                  </span>
                )}
                {me?.grade && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#f6f7f9] text-[#5f6672] text-sm font-bold">
                    {me.grade}학년
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 패널 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* GitHub 연동 */}
          <section className="rounded-[22px] border border-[#ebecef] bg-white p-6">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={20} className="text-[#1a1d23]" />
              <h2 className="text-xl font-bold tracking-tight">GitHub 연동</h2>
            </div>
            <p className="text-sm text-[#6b7280] leading-relaxed mb-4">
              GitHub 프로필을 연동하면 AI 분석에 활용됩니다.
            </p>
            <button className="px-4 py-2 rounded-xl bg-[#1a1d23] text-white text-sm font-semibold hover:bg-[#2d3139] transition-colors">
              GitHub 연동하기
            </button>
          </section>

          {/* 이력서 등록 */}
          <section className="rounded-[22px] border border-[#ebecef] bg-white p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={20} className="text-[#1a1d23]" />
              <h2 className="text-xl font-bold tracking-tight">이력서 등록</h2>
            </div>
            <p className="text-sm text-[#6b7280] leading-relaxed mb-4">
              PDF 또는 텍스트 파일을 업로드하면 AI가 분석해드립니다.
            </p>
            <button className="px-4 py-2 rounded-xl border border-[#dfe3ea] text-sm font-semibold hover:bg-[#f6f7f9] transition-colors">
              파일 업로드
            </button>
          </section>
        </div>

        {/* AI 분석 결과 플레이스홀더 */}
        <section className="rounded-[22px] border border-[#ebecef] bg-white p-6">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={20} className="text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight">AI 분석 결과</h2>
          </div>
          <p className="text-sm text-[#6b7280] leading-relaxed">
            GitHub 또는 이력서를 등록하면 AI 분석 결과가 여기에 표시됩니다.
          </p>
        </section>

      </div>
    </main>
  );
}
