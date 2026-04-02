"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTEST_CATEGORY_OPTIONS } from "@/constants/contests";
import { dbFetch } from "@/lib/api-client";
import type { ContestCategoryOption } from "./_filter-section";
import type { ContestItem } from "./_contest-list-section";
import { PreviewSheetSection } from "./_preview-sheet-section";
import type { ContestPreview } from "./_preview-sheet-section";
import { pageShellStyle } from "./_styles";
import { HeroSection } from "./_hero-section";
import { FilterSection } from "./_filter-section";
import { ContestListSection } from "./_contest-list-section";

type ContestPageData = {
  generated_at: string;
  current_category: string;
  categories: Array<{
    label: string;
    value: string;
  }>;
  items: ContestItem[];
};

export default function ContestsPage() {
  const [data, setData] = useState<ContestPageData | null>(null);
  const [currentCategory, setCurrentCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedContest, setSelectedContest] = useState<ContestItem | null>(null);
  const [previewMap, setPreviewMap] = useState<Record<number, ContestPreview>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("contest-favorites");
      if (stored) {
        setFavoriteIds(JSON.parse(stored));
      }
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("contest-favorites", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await dbFetch("/contests/");
      setData(response);
      setCurrentCategory(response.current_category ?? "");
    } catch (fetchError) {
      console.error(fetchError);
      setError("공모전 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const items = data?.items ?? [];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (currentCategory && item.category !== currentCategory) return false;
    if (favoritesOnly && !favoriteIds.includes(item.external_id)) return false;
    if (!normalizedSearch) return true;

    const haystack = [
      item.title,
      item.host,
      item.category,
      item.source_label,
      item.content_summary,
      item.tags,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const categories: ContestCategoryOption[] = (data?.categories ?? CONTEST_CATEGORY_OPTIONS).map((category) => ({
    ...category,
    count: category.value ? items.filter((item) => item.category === category.value).length : items.length,
  }));

  const urgentCount = filteredItems.filter((item) => item.d_day !== null && item.d_day <= 7).length;
  const alwaysOpenCount = filteredItems.filter((item) => item.d_day === null).length;
  const earliestItem = filteredItems.find((item) => item.d_day !== null) ?? filteredItems[0] ?? null;
  const earliestDeadlineLabel = earliestItem
    ? earliestItem.d_day_label === "상시"
      ? "상시 모집"
      : earliestItem.d_day_label
    : "-";
  const activeCategoryLabel =
    categories.find((category) => category.value === currentCategory)?.label ?? "전체";

  function toggleFavorite(contestId: string) {
    setFavoriteIds((current) =>
      current.includes(contestId) ? current.filter((item) => item !== contestId) : [...current, contestId]
    );
  }

  async function openPreview(contest: ContestItem) {
    setSelectedContest(contest);
    setPreviewError(null);

    if (previewMap[contest.id]) return;

    setPreviewLoading(true);
    try {
      const preview = await dbFetch(`/contests/${contest.id}/preview/`);
      setPreviewMap((current) => ({
        ...current,
        [contest.id]: preview,
      }));
    } catch (previewFetchError) {
      console.error(previewFetchError);
      setPreviewError("요약 정보를 불러오지 못했습니다.");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div style={pageShellStyle}>
      <HeroSection
        categoryLabel={activeCategoryLabel}
        totalCount={filteredItems.length}
        urgentCount={urgentCount}
        earliestDeadlineLabel={earliestDeadlineLabel}
        alwaysOpenCount={alwaysOpenCount}
        generatedAt={data?.generated_at ?? null}
      />
      <FilterSection
        categories={categories}
        currentCategory={currentCategory}
        searchQuery={searchQuery}
        favoritesOnly={favoritesOnly}
        favoriteCount={favoriteIds.length}
        onSelectCategory={setCurrentCategory}
        onSearchChange={setSearchQuery}
        onToggleFavoritesOnly={() => setFavoritesOnly((current) => !current)}
      />
      <ContestListSection
        items={filteredItems}
        loading={loading}
        error={error}
        activeCategoryLabel={activeCategoryLabel}
        favoriteIds={favoriteIds}
        onOpenPreview={openPreview}
        onRetry={fetchData}
        onToggleFavorite={toggleFavorite}
      />
      <PreviewSheetSection
        contest={selectedContest}
        preview={selectedContest ? previewMap[selectedContest.id] ?? null : null}
        loading={previewLoading}
        error={previewError}
        onClose={() => {
          setSelectedContest(null);
          setPreviewError(null);
          setPreviewLoading(false);
        }}
      />
    </div>
  );
}
