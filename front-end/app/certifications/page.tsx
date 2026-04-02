"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { dbFetch } from "@/lib/api-client";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { Pages } from "@/constants/enums";
import {
  buildCertificationLiveAlerts,
  displayCertificationName,
  getCertificationCategoryKey,
  isPinnedCertification,
  matchesCertificationSearch,
  normalizeCertificationItems,
  sortByUpcomingCertification,
  type CertificationCategoryValue,
  type CertificationFilterValue,
  type CertificationItem,
  type CertificationsPayload,
} from "@/constants/certifications";
import { CertificationsHeroSection } from "./_hero-section";
import { CertificationsControlsSection } from "./_controls-section";
import { CertificationsSelectorSection } from "./_selector-section";
import { CertificationDetailModalSection } from "./_detail-modal-section";
import { CertificationCalendarModalSection } from "./_calendar-modal-section";
import { emptyStateStyle, pageContainerStyle, pageShellStyle } from "./_styles";

const FAVORITES_STORAGE_KEY = "certifications-favorites-v1";
const SELECTED_STORAGE_KEY = "certifications-selected-slug";
const KNOWN_SCHEDULE_STORAGE_KEY = "certifications-known-schedules-v1";

export default function CertificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const authFetch = useAuthFetch();

  const [items, setItems] = useState<CertificationItem[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<CertificationFilterValue>("all");
  const [category, setCategory] = useState<CertificationCategoryValue>("all");
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [calendarSlug, setCalendarSlug] = useState("");
  const [calendarFeedback, setCalendarFeedback] = useState("");
  const [calendarSubmitting, setCalendarSubmitting] = useState(false);

  const fetchCertifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = (await dbFetch("/certifications/important/")) as CertificationsPayload;
      const normalizedItems = normalizeCertificationItems(Array.isArray(result.items) ? result.items : []);
      const knownScheduleMap = readRecordStorage(KNOWN_SCHEDULE_STORAGE_KEY);
      const liveAlertResult = buildCertificationLiveAlerts(normalizedItems, result, knownScheduleMap);

      writeRecordStorage(KNOWN_SCHEDULE_STORAGE_KEY, liveAlertResult.knownScheduleMap);
      setItems(normalizedItems);
      setAlerts(liveAlertResult.alerts);
    } catch {
      setItems([]);
      setAlerts([]);
      setError("자격증 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setFavoriteSlugs(readListStorage(FAVORITES_STORAGE_KEY));
    setSelectedSlug(readTextStorage(SELECTED_STORAGE_KEY));
  }, []);

  useEffect(() => {
    fetchCertifications();
  }, [fetchCertifications]);

  const visibleItems = sortByUpcomingCertification(
    items.filter((item) => {
      if (filter === "favorites" && !favoriteSlugs.includes(item.slug)) return false;
      if (filter === "open" && !item.schedules.some((schedule) => schedule.registration_status?.code === "open" || schedule.written_registration_status?.code === "open" || schedule.practical_registration_status?.code === "open")) {
        return false;
      }
      if (
        filter === "urgent" &&
        !item.schedules.some((schedule) =>
          [schedule.exam_status, schedule.written_exam_status, schedule.practical_exam_status].some((status) =>
            ["today", "urgent", "soon"].includes(status?.code || ""),
          ),
        )
      ) {
        return false;
      }
      if (category !== "all" && category !== getCertificationCategoryKey(item)) return false;
      if (!matchesCertificationSearch(item, searchTerm)) return false;
      return true;
    }),
  );

  const pinnedItems = visibleItems.filter(isPinnedCertification);
  const selectorItems = visibleItems.filter((item) => !isPinnedCertification(item));
  const selectedItem = visibleItems.find((item) => item.slug === selectedSlug) ?? visibleItems[0] ?? null;
  const calendarItem = items.find((item) => item.slug === calendarSlug) ?? null;

  useEffect(() => {
    if (!visibleItems.length) {
      setSelectedSlug("");
      writeTextStorage(SELECTED_STORAGE_KEY, "");
      return;
    }

    if (!visibleItems.some((item) => item.slug === selectedSlug)) {
      const nextSlug = visibleItems[0].slug;
      setSelectedSlug(nextSlug);
      writeTextStorage(SELECTED_STORAGE_KEY, nextSlug);
    }
  }, [selectedSlug, visibleItems]);

  useEffect(() => {
    writeListStorage(FAVORITES_STORAGE_KEY, favoriteSlugs);
  }, [favoriteSlugs]);

  const handleSelectItem = (slug: string) => {
    setSelectedSlug(slug);
    writeTextStorage(SELECTED_STORAGE_KEY, slug);
    setDetailOpen(true);
  };

  const handleToggleFavorite = () => {
    if (!selectedItem) return;
    setFavoriteSlugs((current) =>
      current.includes(selectedItem.slug)
        ? current.filter((value) => value !== selectedItem.slug)
        : [...current, selectedItem.slug],
    );
  };

  const handleOpenCalendar = (slug: string) => {
    setSelectedSlug(slug);
    writeTextStorage(SELECTED_STORAGE_KEY, slug);
    setCalendarSlug(slug);
    setCalendarFeedback("");
  };

  const handleSubmitCalendar = async ({
    targetDate,
    scheduleLabel,
  }: {
    targetDate: string;
    scheduleLabel: string;
  }) => {
    if (!calendarItem || !targetDate) {
      setCalendarFeedback("일정 날짜를 먼저 선택해주세요.");
      return;
    }

    if (status !== "authenticated") {
      router.replace(`/${Pages.LOGIN}`);
      return;
    }

    setCalendarSubmitting(true);
    setCalendarFeedback("오늘의 계획에 추가하는 중입니다.");

    try {
      const response = await authFetch("/planner/goals/add-from-certification/", {
        method: "POST",
        body: JSON.stringify({
          target_date: targetDate,
          certification_name: displayCertificationName(calendarItem),
          schedule_label: scheduleLabel,
          color: "yellow",
        }),
      });

      setCalendarFeedback(
        `${response.message || "오늘의 계획에 추가되었습니다."} 계획/목표에서 ${targetDate} 날짜를 확인해보세요.`,
      );
      window.setTimeout(() => {
        setCalendarSlug("");
        setCalendarFeedback("");
      }, 900);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "플래너 추가에 실패했습니다.";
      setCalendarFeedback(message);
    } finally {
      setCalendarSubmitting(false);
    }
  };

  return (
    <div style={pageShellStyle}>
      <div style={pageContainerStyle} className="space-y-6 sm:space-y-7">
        <CertificationsHeroSection alerts={alerts} items={items} />
        <CertificationsControlsSection
          searchTerm={searchTerm}
          filter={filter}
          category={category}
          onSearchTermChange={setSearchTerm}
          onFilterChange={setFilter}
          onCategoryChange={setCategory}
        />

        {loading ? (
          <div style={emptyStateStyle}>공식 자격증 일정을 불러오는 중입니다.</div>
        ) : error ? (
          <div style={emptyStateStyle}>{error}</div>
        ) : (
          <CertificationsSelectorSection
            pinnedItems={pinnedItems}
            items={selectorItems}
            selectedSlug={selectedSlug}
            favoriteSlugs={favoriteSlugs}
            pinnedExpanded={pinnedExpanded}
            onPinnedExpandedChange={setPinnedExpanded}
            onSelectItem={handleSelectItem}
            onOpenCalendar={handleOpenCalendar}
          />
        )}

        <CertificationDetailModalSection
          item={selectedItem}
          favorite={selectedItem ? favoriteSlugs.includes(selectedItem.slug) : false}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onToggleFavorite={handleToggleFavorite}
        />
        <CertificationCalendarModalSection
          item={calendarItem}
          open={Boolean(calendarSlug)}
          submitting={calendarSubmitting}
          feedback={calendarFeedback}
          onClose={() => {
            setCalendarSlug("");
            setCalendarFeedback("");
          }}
          onSubmit={handleSubmitCalendar}
        />
      </div>
    </div>
  );
}

function readListStorage(key: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeListStorage(key: string, values: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {}
}

function readRecordStorage(key: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || "{}");
    return stored && typeof stored === "object" ? (stored as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeRecordStorage(key: string, values: Record<string, string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {}
}

function readTextStorage(key: string) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeTextStorage(key: string, value: string) {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
      return;
    }
    window.localStorage.removeItem(key);
  } catch {}
}
