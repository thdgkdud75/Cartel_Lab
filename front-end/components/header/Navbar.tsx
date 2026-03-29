"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NAV_LINKS } from "@/constants/navigation";
import { Pages, Routes } from "@/constants/enums";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Navbar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* 모바일 풀스크린 오버레이 */}
      <nav
        className={`
          fixed inset-0 z-[55] flex flex-col bg-white
          transition-transform duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          xl:static xl:inset-auto xl:flex-row xl:items-center xl:gap-[30px]
          xl:bg-transparent xl:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          xl:!transform-none
        `}
      >
        {/* 모바일 전용 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 xl:hidden">
          <div className="flex items-center gap-2">
            <Image src="/images/teamlab-logo.png" alt="Jvision Lab" width={48} height={48} className="object-contain" />
            <span className="text-[17px] font-extrabold text-[#1a1a1a] tracking-[-0.01em]">Jvision Lab</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-[#3a3a3c]"
            aria-label="메뉴 닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 모바일 전용 유저 메뉴 */}
        {session && (
          <div className="xl:hidden mx-6 mt-4 rounded-2xl bg-[#f7f8fa] px-4">
            <Link href={Routes.USERS} onClick={onClose} className={`flex items-center py-3 text-[15px] font-semibold border-b border-[#eaebee] ${pathname === Routes.USERS ? "text-brand" : "text-[#1a1a1a]"}`}>
              내 프로필
            </Link>
            <Link href={`${Routes.USERS}/${Pages.EDIT}`} onClick={onClose} className={`flex items-center py-3 text-[15px] font-semibold border-b border-[#eaebee] ${pathname === `${Routes.USERS}/${Pages.EDIT}` ? "text-brand" : "text-[#1a1a1a]"}`}>
              내 정보 변경
            </Link>
            {session.user.is_staff && (
              <Link href={Routes.ADMIN} onClick={onClose} className={`flex items-center py-3 text-[15px] font-semibold ${pathname.startsWith(Routes.ADMIN) ? "text-brand" : "text-[#1a1a1a]"}`}>
                관리자 대시보드
              </Link>
            )}
          </div>
        )}

        {/* 네비게이션 링크 */}
        <div className="flex flex-col gap-1 px-6 pt-4 xl:flex-row xl:items-center xl:gap-[30px] xl:p-0">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`
                  rounded-lg px-[10px] py-[7px] text-[15px] font-semibold
                  transition-[color,background-color] duration-200
                  ${active ? "bg-[#fff1e8] text-brand" : "text-[#868b94] hover:bg-[#f1f2f4] hover:text-[#212124]"}
                  max-xl:rounded-none max-xl:bg-transparent max-xl:px-0 max-xl:py-4
                  max-xl:text-[22px] max-xl:font-bold
                  max-xl:border-b max-xl:border-[#eaebee]
                  ${active ? "max-xl:text-brand" : "max-xl:text-[#1a1a1a]"}
                `}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* 모바일 전용 로그인/로그아웃 */}
        <div className="xl:hidden mt-auto px-6 pb-10">
          {session ? (
            <button
              onClick={() => { signOut(); onClose(); }}
              className="w-full rounded-xl bg-brand py-4 text-[16px] font-bold text-white"
            >
              로그아웃
            </button>
          ) : (
            <Link
              href={`/${Pages.LOGIN}`}
              onClick={onClose}
              className="block w-full rounded-xl bg-brand py-4 text-center text-[16px] font-bold text-white"
            >
              로그인
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
