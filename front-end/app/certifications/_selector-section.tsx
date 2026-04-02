"use client";

import {
  type CertificationItem,
  displayCertificationShortName,
  formatPrimarySchedule,
  getCertificationCategoryLabel,
  getCertificationDistinctionInfo,
  getCertificationSummaryText,
  getCertificationUrgency,
  hasOpenRegistration,
} from "@/constants/certifications";
import { emptyStateStyle, sectionCardStyle, subCardStyle } from "./_styles";

type CertificationsSelectorSectionProps = {
  pinnedItems: CertificationItem[];
  items: CertificationItem[];
  selectedSlug: string;
  favoriteSlugs: string[];
  pinnedExpanded: boolean;
  onPinnedExpandedChange: (nextValue: boolean) => void;
  onSelectItem: (slug: string) => void;
  onOpenCalendar: (slug: string) => void;
};

export function CertificationsSelectorSection({
  pinnedItems,
  items,
  selectedSlug,
  favoriteSlugs,
  pinnedExpanded,
  onPinnedExpandedChange,
  onSelectItem,
  onOpenCalendar,
}: CertificationsSelectorSectionProps) {
  return (
    <div className="space-y-6">
      <section style={sectionCardStyle} className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#eef1f4] px-6 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div>
            <h2 className="text-[24px] font-[800] tracking-[-0.04em] text-[#212124]">
              비전대학교 컴정과 필수 자격증
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              정보처리산업기사와 SQLD를 가장 먼저 확인할 수 있게 위로 고정했습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onPinnedExpandedChange(!pinnedExpanded)}
            className="rounded-full border border-[#dde2e8] bg-white px-4 py-2 text-sm font-[700] text-[#57606a]"
          >
            {pinnedExpanded ? "접기" : "열기"}
          </button>
        </div>

        {pinnedExpanded ? (
          <div className="px-4 py-5 sm:px-6">
            <div className="grid gap-4 md:grid-cols-2">
              {pinnedItems.length ? (
                pinnedItems.map((item) => (
                  <CertificationSelectorCard
                    key={item.slug}
                    item={item}
                    selected={selectedSlug === item.slug}
                    favorite={favoriteSlugs.includes(item.slug)}
                    onSelect={() => onSelectItem(item.slug)}
                    onOpenCalendar={() => onOpenCalendar(item.slug)}
                  />
                ))
              ) : (
                <div style={emptyStateStyle} className="md:col-span-2">
                  검색 조건에 맞는 필수 자격증이 없습니다.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <section style={sectionCardStyle} className="overflow-hidden">
        <div className="border-b border-[#eef1f4] px-6 py-5 sm:px-8">
          <h2 className="text-[24px] font-[800] tracking-[-0.04em] text-[#212124]">자격증 빠른 선택</h2>
          <p className="mt-1 text-sm leading-6 text-[#6b7280]">
            같은 자격증은 출처를 묶어 한 카드로 보여주고, 상세에서 일정과 신청 링크를 구분해 확인할 수
            있습니다.
          </p>
        </div>

        <div className="px-4 py-5 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {items.length ? (
              items.map((item) => (
                <CertificationSelectorCard
                  key={item.slug}
                  item={item}
                  selected={selectedSlug === item.slug}
                  favorite={favoriteSlugs.includes(item.slug)}
                  onSelect={() => onSelectItem(item.slug)}
                  onOpenCalendar={() => onOpenCalendar(item.slug)}
                />
              ))
            ) : (
              <div style={emptyStateStyle} className="lg:col-span-2">
                조건에 맞는 자격증이 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CertificationSelectorCard({
  item,
  selected,
  favorite,
  onSelect,
  onOpenCalendar,
}: {
  item: CertificationItem;
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onOpenCalendar: () => void;
}) {
  const urgency = getCertificationUrgency(item);
  const distinctionInfo = getCertificationDistinctionInfo(item);
  const badges = [
    favorite ? { label: "관심", tone: "favorite" } : null,
    hasOpenRegistration(item) ? { label: "접수중", tone: "open" } : null,
    urgency.label ? { label: urgency.label, tone: urgency.code } : null,
    { label: getCertificationCategoryLabel(item), tone: "category" },
  ].filter((value): value is { label: string; tone: string } => value !== null);

  return (
    <article
      style={{
        ...subCardStyle,
        borderColor: selected ? "#f3c7a8" : subCardStyle.border,
        background: selected ? "#fffaf6" : "#fcfcfd",
      }}
      className="flex h-full flex-col gap-4 p-5"
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[22px] font-[800] tracking-[-0.04em] text-[#212124]">
              {displayCertificationShortName(item)}
            </h3>
            <p className="mt-1 text-sm font-[700] text-[#c2560c]">{getCertificationSummaryText(item)}</p>
          </div>
          <span className="rounded-full bg-[#f4f5f7] px-3 py-1.5 text-[12px] font-[700] text-[#5f6672]">
            {formatPrimarySchedule(item)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={`${item.slug}-${badge.label}`}
              className="rounded-full px-3 py-1.5 text-[12px] font-[800]"
              style={badgeStyleByTone(badge.tone)}
            >
              {badge.label}
            </span>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <GlanceItem label="합격률" value={item.pass_rate || "확인 필요"} />
          <GlanceItem label="응시료" value={item.exam_fee || "확인 필요"} />
        </div>

        {distinctionInfo ? (
          <p className="mt-4 text-sm leading-6 text-[#7b6f67]">{distinctionInfo.short}</p>
        ) : null}

        <p className="mt-4 text-sm leading-6 text-[#6b7280]">
          {item.quick_tip || "클릭해서 공식 일정과 세부 정보를 확인할 수 있습니다."}
        </p>
      </button>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f4] pt-4">
        <span className="text-xs font-[700] text-[#8a9099]">{item.source || "공식 사이트"}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenCalendar}
            className="rounded-full border border-[#f0c8ab] bg-[#fff4ea] px-4 py-2 text-sm font-[700] text-[#b45309]"
          >
            캘린더 추가
          </button>
          <button
            type="button"
            onClick={onSelect}
            className="rounded-full border border-[#dde2e8] bg-white px-4 py-2 text-sm font-[700] text-[#57606a]"
          >
            자세히 보기
          </button>
        </div>
      </div>
    </article>
  );
}

function GlanceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#eceff3] bg-white px-4 py-3">
      <p className="text-[12px] font-[800] tracking-[0.02em] text-[#8b919b]">{label}</p>
      <p className="mt-1 text-sm font-[700] leading-6 text-[#2c3440]">{value}</p>
    </div>
  );
}

function badgeStyleByTone(tone: string) {
  if (tone === "favorite") return { background: "#fff3f7", color: "#be185d" };
  if (tone === "open") return { background: "#effaf5", color: "#166534" };
  if (tone === "today") return { background: "#fff1e8", color: "#c2560c" };
  if (tone === "urgent") return { background: "#fff1e8", color: "#b45309" };
  if (tone === "soon") return { background: "#fff8eb", color: "#a16207" };
  if (tone === "upcoming") return { background: "#f4f5f7", color: "#4b5563" };
  return { background: "#f4f5f7", color: "#5f6672" };
}
