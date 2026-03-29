"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Routes, Pages } from "@/constants/enums";

export default function AuthButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-lg px-[10px] py-[7px] text-[15px] font-semibold text-[#868b94] transition-colors duration-200 hover:bg-[#f1f2f4] hover:text-[#212124]"
      >
        로그인
      </Link>
    );
  }

  const user = session.user;
  const initial = user.name?.slice(0, 1) ?? "?";

  return (
    <div ref={ref} className="relative ml-[6px]">
      {/* 트리거 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-[5px] rounded-lg border-none bg-transparent px-[10px] py-[7px] text-[15px] font-semibold text-[#868b94] transition-colors duration-200 hover:bg-[#f1f2f4] hover:text-[#212124]"
      >
        {user.image ? (
          <img
            src={user.image}
            className="h-[26px] w-[26px] shrink-0 rounded-full border-[1.5px] border-[#e2e5e9] object-cover"
          />
        ) : (
          <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {initial}
          </span>
        )}
        {user?.name}
        <svg
          className={`h-[14px] w-[14px] shrink-0 transition-transform duration-[220ms] ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[100] min-w-[180px] origin-top-right rounded-2xl border border-[#e2e5e9] bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.10)]">
          <Link
            href={`${Routes.USERS}/${Pages.EDIT}`}
            onClick={() => setOpen(false)}
            className="dropdown-item"
          >
            <EditIcon /> 내 정보 변경
          </Link>
          <Link
            href={Routes.USERS}
            onClick={() => setOpen(false)}
            className="dropdown-item"
          >
            <ProfileIcon /> 내 정보 및 이력서 분석
          </Link>
          <div className="my-1 h-px bg-[#f0f0f2]" />
          <button
            onClick={() => signOut()}
            className="dropdown-item w-full text-[#c2410c] hover:bg-[#fff5f0]"
          >
            <LogoutIcon /> 로그아웃
          </button>
        </div>
      )}
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

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
