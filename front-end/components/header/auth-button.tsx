"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Routes, Pages } from "@/constants/enums";
import { DEFAULT_PROFILE_IMAGES } from "@/constants/images";
import { Button } from "@/components/ui/button";

export default function AuthButton() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <Button asChild variant="ghost" className="text-[15px] font-semibold text-[#868b94] hover:bg-[#f1f2f4] hover:text-[#212124]">
        <Link href={`/${Pages.LOGIN}`}>로그인</Link>
      </Button>
    );
  }

  const user = session.user;

  return (
    <div className="group relative ml-[6px]">
      {/* 트리거 */}
      <div className="inline-flex cursor-pointer items-center gap-[5px] rounded-lg px-[10px] py-[7px] text-[15px] font-semibold text-[#868b94] transition-colors duration-200 hover:bg-[#f1f2f4] hover:text-[#212124]">
        <img
          src={user.image || DEFAULT_PROFILE_IMAGES[Number(user.id) % DEFAULT_PROFILE_IMAGES.length]}
          className="h-[26px] w-[26px] shrink-0 rounded-lg border-[1.5px] border-[#e2e5e9] object-cover"
        />
        {user?.name}
        <svg
          className="h-[14px] w-[14px] shrink-0 transition-transform duration-[220ms] group-hover:rotate-180"
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* 드롭다운 메뉴 */}
      <div className="invisible absolute right-0 top-[calc(100%+4px)] z-[100] min-w-[180px] origin-top-right rounded-2xl border border-[#e2e5e9] bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.10)] opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
        <Link href={`${Routes.USERS}/${Pages.EDIT}`} className="dropdown-item">
          <EditIcon /> 내 정보 변경
        </Link>
        <Link href={Routes.USERS} className="dropdown-item">
          <ProfileIcon /> 내 프로필
        </Link>
        {user.is_staff && (
          <Link href={Routes.ADMIN} className="dropdown-item">
            <DashboardIcon /> 관리자 대시보드
          </Link>
        )}
        <div className="my-1 h-px bg-[#f0f0f2]" />
        <Button
          variant="ghost"
          onClick={() => signOut()}
          className="dropdown-item w-full text-[#c2410c] hover:bg-[#fff5f0]"
        >
          <LogoutIcon /> 로그아웃
        </Button>
      </div>
    </div>
  );
}

const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ProfileIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const DashboardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
