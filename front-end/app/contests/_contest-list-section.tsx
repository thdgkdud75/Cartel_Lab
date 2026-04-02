import { getContestCategoryMeta, getContestDdayMeta } from "@/constants/contests";
import { contestCardStyle, sectionCardStyle } from "./_styles";

export type ContestItem = {
  id: number;
  source: string;
  source_label: string;
  external_id: string;
  external_url: string;
  title: string;
  host: string;
  category: string;
  reward: string;
  image_url: string;
  content_summary: string;
  tags: string;
  posted_at: string | null;
  deadline_at: string | null;
  deadline_label: string;
  d_day: number | null;
  d_day_label: string;
  d_day_tone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ContestListSectionProps = {
  items: ContestItem[];
  loading: boolean;
  error: string | null;
  activeCategoryLabel: string;
  favoriteIds: string[];
  onOpenPreview: (contest: ContestItem) => void;
  onRetry: () => void;
  onToggleFavorite: (contestId: string) => void;
};

export function ContestListSection({
  items,
  loading,
  error,
  activeCategoryLabel,
  favoriteIds,
  onOpenPreview,
  onRetry,
  onToggleFavorite,
}: ContestListSectionProps) {
  return (
    <section className="px-6 pb-10 pt-5">
      <div className="mx-auto max-w-[1380px] px-5 py-5 md:px-6" style={sectionCardStyle}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-[#212124]">{activeCategoryLabel} 공모전 목록</h2>
            <p className="text-[14px] text-[#6e7681]">카드를 누르면 원본 공모전 상세 페이지로 이동합니다.</p>
          </div>
          <p className="text-[13px] text-[#8a9098]">{items.length}건 표시 중</p>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-[168px] animate-pulse rounded-[24px] border border-[#eceef2] bg-[#f8f9fb]"
              />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mt-6 rounded-[24px] border border-[#f4d3c2] bg-[#fff7f2] px-6 py-8 text-center">
            <p className="text-[16px] font-semibold text-[#8a4216]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center rounded-full bg-[#ff6f0f] px-4 py-2 text-[14px] font-semibold text-white"
            >
              다시 불러오기
            </button>
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#d9dde3] bg-[#fafbfc] px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[28px] shadow-sm">
              🗂️
            </div>
            <p className="mt-4 text-[18px] font-bold tracking-[-0.02em] text-[#212124]">등록된 공모전이 없습니다.</p>
            <p className="mt-2 text-[14px] text-[#6e7681]">현재 선택한 카테고리에 노출 가능한 공모전이 없습니다.</p>
          </div>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((contest) => (
              <ContestCard
                key={contest.id}
                contest={contest}
                isFavorite={favoriteIds.includes(contest.external_id)}
                onOpenPreview={onOpenPreview}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ContestCard({
  contest,
  isFavorite,
  onOpenPreview,
  onToggleFavorite,
}: {
  contest: ContestItem;
  isFavorite: boolean;
  onOpenPreview: (contest: ContestItem) => void;
  onToggleFavorite: (contestId: string) => void;
}) {
  const categoryMeta = getContestCategoryMeta(contest.category);
  const ddayMeta = getContestDdayMeta(contest.d_day_tone);

  return (
    <article
      className="flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1"
      style={contestCardStyle}
    >
      <div className="relative">
        <span
          className="absolute right-4 top-4 z-10 inline-flex rounded-full px-3 py-1.5 text-[13px] font-bold tracking-[-0.02em]"
          style={{
            background: ddayMeta.background,
            color: ddayMeta.color,
          }}
        >
          {contest.d_day_label}
        </span>

        <button
          type="button"
          onClick={() => onToggleFavorite(contest.external_id)}
          aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          className="absolute left-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/92 text-[18px] text-[#69707a] shadow-sm transition-colors hover:text-[#ff6f0f]"
        >
          {isFavorite ? "★" : "☆"}
        </button>

        <div className="border-b border-[#ebeef2] bg-[#f7f8fa] p-4">
          {contest.image_url ? (
            <button
              type="button"
              onClick={() => onOpenPreview(contest)}
              className="flex h-[200px] w-full items-center justify-center overflow-hidden rounded-[18px] bg-[#f1f3f5] text-left"
            >
              <img
                src={contest.image_url}
                alt={contest.title}
                className="h-full w-full object-contain"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenPreview(contest)}
              className="flex h-[200px] w-full items-center justify-center rounded-[18px] text-[42px] font-bold"
              style={{
                background: categoryMeta.placeholderBackground,
                color: categoryMeta.placeholderColor,
              }}
            >
              {categoryMeta.emoji}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex rounded-full px-3 py-1 text-[12px] font-bold tracking-[-0.01em]"
            style={{
              background: categoryMeta.badgeBackground,
              color: categoryMeta.badgeColor,
            }}
          >
            {contest.category}
          </span>
          <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[12px] font-medium text-[#66707a]">
            {contest.source_label}
          </span>
        </div>

        <div className="mt-3 min-h-[96px] space-y-2">
          <p className="text-[13px] font-medium text-[#6e7681]">{contest.host}</p>
          <h3 className="line-clamp-3 text-[22px] font-extrabold tracking-[-0.03em] text-[#212124]">
            {contest.title}
          </h3>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-[#6e7681]">
          <InfoChip label={`마감 ${contest.deadline_label}`} />
          {contest.reward ? <InfoChip label={`시상 ${contest.reward}`} /> : null}
        </div>

        {contest.content_summary ? (
          <p
            className="mt-4 text-[14px] leading-6 text-[#5f6672]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {contest.content_summary}
          </p>
        ) : (
          <p className="mt-4 text-[14px] leading-6 text-[#8a9098]">
            마감일과 카테고리를 빠르게 확인하고 원본 상세 페이지로 이동할 수 있습니다.
          </p>
        )}

        <div className="mt-auto pt-5">
          <a
            href={contest.external_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-full items-center justify-center rounded-full bg-[#212124] px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#ff6f0f]"
          >
            상세보기
          </a>
        </div>
      </div>
    </article>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#f8f9fb] px-3 py-1.5 text-[13px] font-medium text-[#5f6672]">
      {label}
    </span>
  );
}
