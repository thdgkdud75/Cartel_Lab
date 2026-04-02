"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { UserCircle2, Settings, LayoutDashboard } from "lucide-react";
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
      {/* 딤 배경 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[54] bg-black/40 xl:hidden"
          onClick={onClose}
        />
      )}

      {/* 드로어 */}
      <nav
        className={`
          fixed top-0 right-0 z-[55] h-full w-[75%] max-w-[340px] flex flex-col bg-white
          transition-transform duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          xl:static xl:h-auto xl:w-auto xl:max-w-none xl:flex-row xl:items-center xl:gap-[30px]
          xl:bg-transparent xl:translate-x-0
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          xl:!transform-none
        `}
      >
        {/* 모바일 전용 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 xl:hidden">
          <div className="flex items-center gap-2">
            <Image src="/images/teamlab-logo.png" alt="Jvision Lab" width={40} height={40} className="object-contain" style={{ width: 40, height: "auto" }} />
            <span className="text-[16px] font-extrabold text-[#1a1a1a] tracking-[-0.01em]">Jvision Lab</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-[#3a3a3c]"
            aria-label="메뉴 닫기"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 네비게이션 링크 */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:gap-[30px] xl:p-0 max-xl:overflow-y-auto max-xl:flex-1">
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
                  max-xl:rounded-none max-xl:bg-transparent max-xl:px-6 max-xl:py-4
                  max-xl:text-[22px] max-xl:font-bold
                  ${active ? "max-xl:text-brand" : "max-xl:text-[#4a4a4a]"}
                `}
              >
                {label}
              </Link>
            );
          })}

        </div>

        {/* 모바일 전용 유저 메뉴 - 하단 고정 */}
        {session && (
          <div className="xl:hidden mt-auto px-8 pt-4 pb-2 flex flex-col items-end gap-0 border-t border-[#f0f0f2] shrink-0">
            <Link href={Routes.USERS} onClick={onClose} className={`w-full flex items-center justify-end gap-2 py-3 text-[15px] font-medium ${pathname === Routes.USERS ? "text-brand" : "text-[#868b94]"}`}>
              내 프로필
              {session.user.image ? (
                <Image src={session.user.image} alt="프로필" width={36} height={36} className="rounded-full object-cover" style={{ width: 36, height: "auto" }} />
              ) : (
                <UserCircle2 size={36} />
              )}
            </Link>
            <Link href={`${Routes.USERS}/${Pages.EDIT}`} onClick={onClose} className={`w-full flex items-center justify-end gap-2 py-3 text-[15px] font-medium ${pathname === `${Routes.USERS}/${Pages.EDIT}` ? "text-brand" : "text-[#868b94]"}`}>
              내 정보 변경
              <Settings size={18} />
            </Link>
            {session.user.is_staff && (
              <Link href={Routes.ADMIN} onClick={onClose} className={`w-full flex items-center justify-end gap-2 py-3 text-[15px] font-medium ${pathname.startsWith(Routes.ADMIN) ? "text-brand" : "text-[#868b94]"}`}>
                관리자 대시보드
                <LayoutDashboard size={18} />
              </Link>
            )}
          </div>
        )}

        {/* 모바일 전용 로그인/로그아웃 */}
        <div className="xl:hidden px-6 pb-10 shrink-0" style={{ marginTop: session ? '0' : 'auto' }}>
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
