"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "./Navbar";
import MobileMenuToggle from "./MobileMenuToggle";
import AuthButton from "./auth-button";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-[#eaebee] bg-white/94 backdrop-blur-[8px]">
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

        <MobileMenuToggle isOpen={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />

        <Navbar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <AuthButton />
      </div>
    </header>
  );
}
