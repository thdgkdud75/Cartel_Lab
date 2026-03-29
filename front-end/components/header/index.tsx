"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "./Navbar";
import MobileMenuToggle from "./MobileMenuToggle";
import AuthButton from "./auth-button";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#eaebee] bg-white">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 px-6 py-3">
          {/* 로고 */}
          <Link href="/" className="inline-flex items-center gap-2.5 text-[15px] font-extrabold tracking-[-0.01em] text-[#212124]">
            <img
              src="/images/teamlab-logo.png"
              alt="Team Lab Logo"
              className="h-[44px] w-[44px] object-contain"
            />
            Jvision Lab
          </Link>

          <Navbar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

          <MobileMenuToggle onToggle={() => setMenuOpen((v) => !v)} />

          <div className="hidden xl:block">
            <AuthButton />
          </div>
        </div>
      </header>
    </>
  );
}
