"use client";

type Props = {
  onToggle: () => void;
};

export default function MobileMenuToggle({ onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="메뉴 열기"
      className="flex h-[44px] w-[44px] flex-col items-center justify-center gap-[6px] border-none bg-transparent xl:hidden"
    >
      <span className="block h-[2.5px] w-6 rounded-sm bg-[#3a3a3c]" />
      <span className="block h-[2.5px] w-6 rounded-sm bg-[#3a3a3c]" />
      <span className="block h-[2.5px] w-6 rounded-sm bg-[#3a3a3c]" />
    </button>
  );
}
