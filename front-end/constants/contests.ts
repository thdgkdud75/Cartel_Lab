export const CONTEST_CATEGORY_OPTIONS = [
  { label: "전체", value: "" },
  { label: "생성형 AI", value: "생성형 AI" },
  { label: "SW 개발", value: "SW 개발" },
  { label: "영상/UCC", value: "영상/UCC" },
  { label: "기타 IT", value: "기타 IT" },
] as const;

export const CONTEST_CATEGORY_META: Record<
  string,
  {
    emoji: string;
    badgeBackground: string;
    badgeColor: string;
    placeholderBackground: string;
    placeholderColor: string;
  }
> = {
  "생성형 AI": {
    emoji: "🤖",
    badgeBackground: "#eef4ff",
    badgeColor: "#2857c5",
    placeholderBackground: "#eef4ff",
    placeholderColor: "#2857c5",
  },
  "SW 개발": {
    emoji: "💻",
    badgeBackground: "#eefaf2",
    badgeColor: "#1f8a4c",
    placeholderBackground: "#eefaf2",
    placeholderColor: "#1f8a4c",
  },
  "영상/UCC": {
    emoji: "🎬",
    badgeBackground: "#fff0f0",
    badgeColor: "#cb4e4e",
    placeholderBackground: "#fff0f0",
    placeholderColor: "#cb4e4e",
  },
  "기타 IT": {
    emoji: "🏆",
    badgeBackground: "#f3f4f6",
    badgeColor: "#636b75",
    placeholderBackground: "#f3f4f6",
    placeholderColor: "#636b75",
  },
};

export function getContestCategoryMeta(category: string) {
  return CONTEST_CATEGORY_META[category] ?? CONTEST_CATEGORY_META["기타 IT"];
}

export function getContestDdayMeta(tone: string) {
  if (tone === "today") {
    return {
      background: "#d92d20",
      color: "#ffffff",
    };
  }

  if (tone === "urgent") {
    return {
      background: "#fff1eb",
      color: "#c24d0c",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#66707a",
  };
}
