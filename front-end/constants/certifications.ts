export type CertificationStatus = {
  code: string;
  label?: string;
  is_today?: boolean;
  days_left?: number;
};

export type CertificationSchedule = {
  round?: string;
  registration?: string;
  written_registration?: string;
  practical_registration?: string;
  exam_date?: string;
  written_exam?: string;
  practical_exam?: string;
  ticket_open?: string;
  written_ticket_open?: string;
  practical_ticket_open?: string;
  score_review?: string;
  written_score_review?: string;
  practical_score_review?: string;
  result_date?: string;
  written_result?: string;
  final_result?: string;
  registration_status?: CertificationStatus;
  written_registration_status?: CertificationStatus;
  practical_registration_status?: CertificationStatus;
  exam_status?: CertificationStatus;
  written_exam_status?: CertificationStatus;
  practical_exam_status?: CertificationStatus;
  is_today?: boolean;
};

export type CertificationSourceEntry = {
  source: string;
  qualifier?: string;
  official_url?: string;
  apply_url?: string;
  apply_label?: string;
};

export type CertificationItem = {
  slug: string;
  name: string;
  short_name: string;
  source: string;
  official_url?: string;
  apply_url?: string;
  apply_label?: string;
  description?: string;
  exam_structure?: string[];
  pass_rate?: string;
  exam_fee?: string;
  difficulty_label?: string;
  difficulty_score?: number;
  quick_tip?: string;
  schedules: CertificationSchedule[];
  error?: string;
  source_entries?: CertificationSourceEntry[];
  merged_slugs?: string[];
};

export type CertificationAlert = {
  name: string;
  round: string;
  part: string;
};

export type CertificationsPayload = {
  generated_at: string;
  today: string;
  today_alerts: CertificationAlert[];
  items: CertificationItem[];
};

export type CertificationFilterValue = "all" | "favorites" | "open" | "urgent";
export type CertificationCategoryValue = "all" | "development" | "db" | "design" | "security";

export type CalendarCandidate = {
  date: string;
  label: string;
  display: string;
  priority: number;
};

type SearchIndex = {
  normalized: string;
  compact: string;
  choseong: string;
};

type DistinctionInfo = {
  short: string;
  detail: string;
};

const HANGUL_SYLLABLE_BASE = 44032;
const HANGUL_SYLLABLE_END = 55203;
const CHOSEONG_LIST = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

export const CERTIFICATION_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "favorites", label: "관심" },
  { value: "open", label: "접수중" },
  { value: "urgent", label: "임박" },
] as const;

export const CERTIFICATION_CATEGORY_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "development", label: "개발" },
  { value: "db", label: "DB" },
  { value: "design", label: "디자인" },
  { value: "security", label: "보안" },
] as const;

export const PINNED_CERTIFICATION_SLUGS = [
  "information-processing-industrial",
  "information-processing-industrial-engineer",
  "sqld",
] as const;

const HIDDEN_CERTIFICATION_SLUGS = ["sqlp"] as const;

const SEARCH_ALIASES_BY_SLUG: Record<string, string[]> = {
  "information-processing-industrial": ["정보 처리 산업 기사", "정보 처리 산업기사", "정처산기"],
  "bigdata-analysis-engineer": ["빅 데이터 분석 기사", "빅데이터 분석 기사", "빅분기"],
  "bigdata-dataq": ["빅 데이터 분석 기사", "빅데이터 분석 기사", "빅분기"],
  adp: ["데이터 분석 전문가", "데이터분석전문가", "데분전"],
  adsp: ["데이터 분석 준전문가", "데이터분석준전문가", "데분준"],
  sqld: ["sql 개발자", "sql 개발 자격"],
  sqlp: ["sql 전문가", "sql 전문 자격"],
  dap: ["데이터 아키텍처 전문가", "데이터아키텍처전문가", "데아전"],
  dasp: ["데이터 아키텍처 준전문가", "데이터아키텍처준전문가", "데아준"],
  "ai-literacy": ["ai 활용 능력", "인공지능 활용 능력"],
  "prompt-engineer": ["프롬프트 엔지니어", "ai 프롬프트", "프롬프트 자격증"],
  "linux-master": ["리눅스 마스터", "리눅마"],
  "information-security-engineer": ["정보 보안 기사", "정보보안 기사"],
  "web-design-craftsman": ["웹 디자인 기능사", "웹디자인 기능사"],
  "computer-specialist": ["컴퓨터 활용 능력", "컴퓨터활용능력", "컴활"],
  "digital-forensics": ["디지털 포렌식 전문가", "디지털포렌식전문가", "디포전"],
  "ai-pot": ["ai pot", "aipot", "ai 프롬프트 활용 능력", "ai프롬프트활용능력"],
  aibt: ["ai 비즈니스 활용 능력", "ai비즈니스활용능력"],
  "gtq-ai": ["gtq ai", "gtqai"],
  "sw-coding": ["sw 코딩 자격", "sw코딩 자격"],
  dsac: ["데이터 사이언티스트 능력 인증 자격", "데이터사이언티스트능력인증자격"],
  deq: ["데이터 윤리 자격", "데이터윤리자격"],
  itq: ["정보 기술 자격", "정보기술자격"],
};

const DISTINCTION_NOTES_BY_SLUG: Record<string, DistinctionInfo> = {
  sqld: {
    short: "SQLP와 다른 시험 · SQL 기본과 개발 실무 기초 중심",
    detail: "SQLP와 다른 시험입니다. SQLD는 SQL 기본 문법과 개발 실무 기초를 확인하는 입문 성격의 시험입니다.",
  },
  sqlp: {
    short: "SQLD와 다른 시험 · 설계와 성능 튜닝까지 보는 상위 단계",
    detail: "SQLD와 다른 시험입니다. SQLP는 SQL 설계, 데이터 모델 이해, 성능 튜닝까지 보는 상위 전문가 시험입니다.",
  },
  adsp: {
    short: "ADP와 다른 시험 · 데이터 분석 입문과 기초 실무 중심",
    detail: "ADP와 다른 시험입니다. ADsP는 데이터 분석 기본 개념, 통계 기초, 분석 실무 이해를 보는 준전문가 단계 시험입니다.",
  },
  adp: {
    short: "ADsP와 다른 시험 · 분석 설계와 실무 역량을 더 깊게 확인",
    detail: "ADsP와 다른 시험입니다. ADP는 데이터 분석 설계, 통계 적용, 모델링과 해석까지 더 깊게 보는 전문가 단계 시험입니다.",
  },
  dasp: {
    short: "DAP와 다른 시험 · 데이터 아키텍처 기초와 모델링 기본 중심",
    detail: "DAP와 다른 시험입니다. DAsP는 데이터 아키텍처 기본 개념, 표준화, 모델링 기초를 확인하는 준전문가 단계 시험입니다.",
  },
  dap: {
    short: "DAsP와 다른 시험 · 설계와 거버넌스까지 보는 상위 단계",
    detail: "DAsP와 다른 시험입니다. DAP는 데이터 구조 설계, 품질 관리, 거버넌스까지 더 넓게 다루는 전문가 단계 시험입니다.",
  },
  "information-processing-industrial": {
    short: "정보처리기사와 다른 시험 · 산업기사 단계의 실무형 자격",
    detail: "정보처리기사와 다른 시험입니다. 정보처리산업기사는 산업기사 단계 자격으로, 기사 대비 범위와 난이도, 응시 기준이 다를 수 있습니다.",
  },
  "information-processing-industrial-engineer": {
    short: "정보처리산업기사와 다른 시험 · 기사 단계의 상위 자격",
    detail: "정보처리산업기사와 다른 시험입니다. 정보처리기사는 기사 단계 자격으로, 산업기사 대비 이론 범위와 난이도가 더 높은 편입니다.",
  },
};

const CATEGORY_LABEL_BY_KEY: Record<Exclude<CertificationCategoryValue, "all">, string> = {
  development: "개발",
  db: "DB",
  design: "디자인",
  security: "보안",
};

export function normalizeCertificationItems(items: CertificationItem[]) {
  const seen = new Set<string>();
  const grouped = new Map<string, CertificationItem>();
  const orderedKeys: string[] = [];

  items
    .map(normalizeItem)
    .filter((item) => {
      if (!item || HIDDEN_CERTIFICATION_SLUGS.includes(item.slug as never)) return false;
      const key = [item.slug, item.name, item.source].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .forEach((item) => {
      const mergeKey = item.name || item.short_name || item.slug;
      const sourceEntry = getFallbackSourceEntry(item);
      const existing = grouped.get(mergeKey);

      if (!existing) {
        grouped.set(mergeKey, {
          ...item,
          source_entries: [sourceEntry],
          merged_slugs: [item.slug],
        });
        orderedKeys.push(mergeKey);
        return;
      }

      existing.merged_slugs = [...(existing.merged_slugs ?? []), item.slug];

      if (!(existing.source_entries ?? []).some((entry) => sourceEntryKey(entry) === sourceEntryKey(sourceEntry))) {
        existing.source_entries = [...(existing.source_entries ?? []), sourceEntry].sort(
          (left, right) => sourceRank(left.source) - sourceRank(right.source),
        );
      }

      const scheduleSeen = new Set<string>();
      existing.schedules = [...(existing.schedules ?? []), ...(item.schedules ?? [])].filter((schedule) => {
        const fingerprint = scheduleFingerprint(schedule);
        if (scheduleSeen.has(fingerprint)) return false;
        scheduleSeen.add(fingerprint);
        return true;
      });

      if (sourceRank(item.source) < sourceRank(existing.source)) {
        existing.slug = item.slug;
        existing.official_url = item.official_url;
        existing.apply_url = item.apply_url;
        existing.apply_label = item.apply_label;
        existing.source = item.source;
      }

      if (!existing.description && item.description) existing.description = item.description;
      if ((!existing.error || existing.schedules.length) && item.error && !item.schedules.length) {
        existing.error = item.error;
      }
    });

  return orderedKeys.map((key) => {
    const item = grouped.get(key)!;
    const qualifiers = (item.source_entries ?? [])
      .map((entry) => entry.qualifier || entry.source)
      .filter(Boolean);

    return {
      ...item,
      source: qualifiers.join(" · ") || item.source,
    };
  });
}

export function displayCertificationName(item: CertificationItem | null) {
  if (!item) return "";
  return item.name || item.short_name || "";
}

export function displayCertificationShortName(item: CertificationItem | null) {
  return displayCertificationName(item);
}

export function isPinnedCertification(item: CertificationItem) {
  return PINNED_CERTIFICATION_SLUGS.includes(item.slug as (typeof PINNED_CERTIFICATION_SLUGS)[number]);
}

export function getCertificationCategoryKey(item: CertificationItem): Exclude<CertificationCategoryValue, "all"> {
  const slug = item.slug;

  if (
    [
      "information-processing-industrial",
      "information-processing-industrial-engineer",
      "ai-literacy",
      "prompt-engineer",
      "linux-master",
      "ai-pot",
      "aibt",
      "sw-coding",
      "itq",
    ].includes(slug)
  ) {
    return "development";
  }

  if (
    [
      "sqld",
      "sqlp",
      "adsp",
      "adp",
      "dap",
      "dasp",
      "bigdata-analysis-engineer",
      "bigdata-dataq",
      "dsac",
    ].includes(slug)
  ) {
    return "db";
  }

  if (["web-design-craftsman", "gtq-ai", "computer-specialist"].includes(slug)) {
    return "design";
  }

  if (["information-security-engineer", "digital-forensics", "deq"].includes(slug)) {
    return "security";
  }

  return "development";
}

export function getCertificationCategoryLabel(item: CertificationItem) {
  return CATEGORY_LABEL_BY_KEY[getCertificationCategoryKey(item)];
}

export function getCertificationSourceEntries(item: CertificationItem) {
  if (item.source_entries?.length) return item.source_entries;
  return [getFallbackSourceEntry(item)];
}

export function getCertificationDistinctionInfo(item: CertificationItem | null) {
  if (!item) return null;
  const slugs = [item.slug, ...(item.merged_slugs ?? [])];
  return slugs.map((slug) => DISTINCTION_NOTES_BY_SLUG[slug]).find(Boolean) ?? null;
}

export function hasOpenRegistration(item: CertificationItem) {
  return item.schedules.some((schedule) =>
    [schedule.registration_status, schedule.written_registration_status, schedule.practical_registration_status].some(
      (status) => status?.code === "open",
    ),
  );
}

export function getStatusLabel(status?: CertificationStatus | null) {
  if (!status?.code) return "상태 확인 필요";
  if (status.code === "today") return "D-DAY";
  if (["urgent", "soon", "upcoming"].includes(status.code) && typeof status.days_left === "number") {
    return `D-${status.days_left}`;
  }
  if (status.code === "open") return "접수 진행 중";
  if (status.code === "closed") return "접수 마감";
  if (status.code === "passed") return "시험 종료";
  return status.label || "상태 확인 필요";
}

export function getCertificationUrgency(item: CertificationItem) {
  const priority: Record<string, number> = { today: 4, urgent: 3, soon: 2, upcoming: 1, passed: 0, unknown: 0 };
  let best: CertificationStatus = { code: "unknown", label: "일정 확인 필요" };

  item.schedules.forEach((schedule) => {
    [schedule.exam_status, schedule.written_exam_status, schedule.practical_exam_status].forEach((status) => {
      if (!status?.code) return;
      if ((priority[status.code] || 0) > (priority[best.code] || 0)) {
        best = { ...status, label: getStatusLabel(status) };
      }
    });
  });

  return { ...best, label: getStatusLabel(best) };
}

export function getCertificationNearestDays(item: CertificationItem) {
  let nearest: number | null = null;

  item.schedules.forEach((schedule) => {
    [schedule.exam_status, schedule.written_exam_status, schedule.practical_exam_status].forEach((status) => {
      if (typeof status?.days_left !== "number") return;
      nearest = nearest === null ? status.days_left : Math.min(nearest, status.days_left);
    });
  });

  return nearest;
}

export function sortByUpcomingCertification(items: CertificationItem[]) {
  const urgencyPriority: Record<string, number> = {
    today: 0,
    urgent: 1,
    soon: 2,
    upcoming: 3,
    open: 4,
    closed: 5,
    passed: 6,
    unknown: 7,
  };

  return [...items].sort((left, right) => {
    const leftUrgency = getCertificationUrgency(left);
    const rightUrgency = getCertificationUrgency(right);
    const leftPriority = urgencyPriority[leftUrgency.code] ?? 99;
    const rightPriority = urgencyPriority[rightUrgency.code] ?? 99;

    if (leftPriority !== rightPriority) return leftPriority - rightPriority;

    const leftDays = getCertificationNearestDays(left);
    const rightDays = getCertificationNearestDays(right);
    if (leftDays === null && rightDays !== null) return 1;
    if (leftDays !== null && rightDays === null) return -1;
    if (leftDays !== null && rightDays !== null && leftDays !== rightDays) return leftDays - rightDays;

    return displayCertificationShortName(left).localeCompare(displayCertificationShortName(right), "ko");
  });
}

export function getCertificationSummaryText(item: CertificationItem) {
  if (item.error) return "공식 일정 확인 필요";
  if (!item.schedules.length) return "공식 사이트에서 일정 확인";
  if (hasOpenRegistration(item)) return "접수 진행 중";

  const urgency = getCertificationUrgency(item);
  if (urgency.code === "today") return "오늘 시험";
  if (urgency.code === "urgent" || urgency.code === "soon") return "시험 임박";
  return "일정 확인 가능";
}

export function formatPrimarySchedule(item: CertificationItem) {
  const primaryEntry = getPrimaryScheduleEntry(item);
  if (!primaryEntry) return "공식 일정 확인 필요";
  return `${primaryEntry.label} ${primaryEntry.rawValue}`;
}

export function buildCertificationSearchIndex(item: CertificationItem): SearchIndex {
  const text = [item.name, item.short_name, item.source, item.description, ...(SEARCH_ALIASES_BY_SLUG[item.slug] ?? [])].join(" ");
  return {
    normalized: normalizeSearchText(text),
    compact: compactSearchText(text),
    choseong: extractChoseong(text),
  };
}

export function matchesCertificationSearch(item: CertificationItem, keyword: string) {
  const normalizedKeyword = normalizeSearchText(keyword);
  if (!normalizedKeyword) return true;

  const index = buildCertificationSearchIndex(item);
  const compactKeyword = compactSearchText(normalizedKeyword);
  const choseongKeyword = extractChoseong(normalizedKeyword);

  return (
    index.normalized.includes(normalizedKeyword) ||
    (compactKeyword ? index.compact.includes(compactKeyword) : false) ||
    (choseongKeyword ? index.choseong.includes(choseongKeyword) : false)
  );
}

export function getCertificationCalendarCandidates(item: CertificationItem): CalendarCandidate[] {
  const candidates: CalendarCandidate[] = [];
  const seen = new Set<string>();
  const todayIso = getTodayIsoDate();
  const fieldMeta = [
    { key: "registration", label: "접수", priority: 0 },
    { key: "written_registration", label: "필기 접수", priority: 1 },
    { key: "practical_registration", label: "실기 접수", priority: 2 },
    { key: "exam_date", label: "시험", priority: 10 },
    { key: "written_exam", label: "필기 시험", priority: 11 },
    { key: "practical_exam", label: "실기 시험", priority: 12 },
  ] as const;

  item.schedules.forEach((schedule, scheduleIndex) => {
    fieldMeta.forEach((field) => {
      const rawValue = schedule[field.key];
      const isoDate = extractDateValue(rawValue);
      if (!isoDate || isoDate < todayIso) return;

      const roundLabel = schedule.round || `일정 ${scheduleIndex + 1}`;
      const label = `${roundLabel} ${field.label}`;
      const dedupeKey = `${isoDate}|${label}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      candidates.push({
        date: isoDate,
        label,
        display: rawValue!,
        priority: field.priority,
      });
    });
  });

  return candidates.sort((left, right) => {
    if (left.date !== right.date) return left.date.localeCompare(right.date);
    return left.priority - right.priority;
  });
}

export function buildCertificationLiveAlerts(
  items: CertificationItem[],
  payload: CertificationsPayload,
  knownScheduleMap: Record<string, string>,
) {
  const alerts: string[] = [];
  const nextKnownMap: Record<string, string> = {};

  items.forEach((item) => {
    const fingerprint = buildScheduleFingerprint(item);
    nextKnownMap[item.slug] = fingerprint;
    if (fingerprint && knownScheduleMap[item.slug] && knownScheduleMap[item.slug] !== fingerprint) {
      alerts.push(`${displayCertificationName(item)} 일정이 새로 업데이트되었습니다.`);
    }
  });

  (payload.today_alerts ?? []).forEach((alert) => {
    alerts.push(`${alert.name} ${alert.round} ${alert.part} 시험일입니다.`);
  });

  return { alerts, knownScheduleMap: nextKnownMap };
}

function normalizeItem(item: CertificationItem) {
  const normalized = { ...item };
  const infoProcessingAliases = ["information-processing-engineer", "industrial-information-processing"];
  const infoProcessingNames = ["정보처리기능사", "정보처리기사", "정보처리산업기사"];

  if (
    infoProcessingAliases.includes(normalized.slug) ||
    infoProcessingNames.includes(normalized.name) ||
    infoProcessingNames.includes(normalized.short_name)
  ) {
    normalized.slug = "information-processing-industrial";
    normalized.name = "정보처리산업기사";
    normalized.short_name = "정보처리산업기사";
  }

  return normalized;
}

function getFallbackSourceEntry(item: CertificationItem): CertificationSourceEntry {
  return {
    source: item.source || "",
    qualifier: getSourceQualifier(item.source),
    official_url: item.official_url || "",
    apply_url: item.apply_url || "",
    apply_label: item.apply_label || "",
  };
}

function getSourceQualifier(source: string) {
  if (source === "KDATA DataQ") return "DataQ";
  if (source === "한국생산성본부") return "KPC";
  return source;
}

function sourceRank(source: string) {
  if (source === "Q-Net") return 0;
  if (source === "KDATA DataQ") return 1;
  if (source === "KAIT") return 2;
  if (source === "한국생산성본부") return 3;
  return 9;
}

function sourceEntryKey(entry: CertificationSourceEntry) {
  return [entry.source, entry.official_url, entry.apply_url, entry.apply_label].join("|");
}

function scheduleFingerprint(schedule: CertificationSchedule) {
  return [
    schedule.round,
    schedule.registration,
    schedule.exam_date,
    schedule.written_registration,
    schedule.written_exam,
    schedule.practical_registration,
    schedule.practical_exam,
    schedule.result_date,
    schedule.written_result,
    schedule.final_result,
  ].join("|");
}

function buildScheduleFingerprint(item: CertificationItem) {
  return item.schedules
    .map((schedule) =>
      [
        schedule.round,
        schedule.registration,
        schedule.exam_date,
        schedule.written_registration,
        schedule.written_exam,
        schedule.practical_registration,
        schedule.practical_exam,
        schedule.result_date,
        schedule.written_result,
        schedule.final_result,
      ].join("|"),
    )
    .join("||");
}

function normalizeSearchText(value: string) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function compactSearchText(value: string) {
  return normalizeSearchText(value).replace(/[\s\-_/()[\]{}.,:+]+/g, "");
}

function extractChoseong(value: string) {
  const normalized = normalizeSearchText(value);
  let result = "";

  for (const char of normalized) {
    const code = char.charCodeAt(0);

    if (code >= HANGUL_SYLLABLE_BASE && code <= HANGUL_SYLLABLE_END) {
      result += CHOSEONG_LIST[Math.floor((code - HANGUL_SYLLABLE_BASE) / 588)];
      continue;
    }

    if (/[ㄱ-ㅎa-z0-9]/.test(char)) {
      result += char;
    }
  }

  return result;
}

function getTodayIsoDate() {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return [year, month, day].join("-");
}

function extractDateValue(rawValue?: string) {
  if (!rawValue) return "";
  const normalized = String(rawValue).replace(/\s+/g, " ");
  const match = normalized.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!match) return "";

  const year = match[1];
  const month = String(match[2]).padStart(2, "0");
  const day = String(match[3]).padStart(2, "0");
  return [year, month, day].join("-");
}

function getPrimaryScheduleEntry(item: CertificationItem) {
  const todayIso = getTodayIsoDate();
  const registrationFields = [
    { key: "registration", label: "접수", priority: 0 },
    { key: "written_registration", label: "필기 접수", priority: 1 },
    { key: "practical_registration", label: "실기 접수", priority: 2 },
  ] as const;
  const examFields = [
    { key: "exam_date", label: "시험", priority: 10 },
    { key: "written_exam", label: "필기 시험", priority: 11 },
    { key: "practical_exam", label: "실기 시험", priority: 12 },
  ] as const;

  const futureRegistrationEntries: Array<{ date: string; rawValue: string; label: string; priority: number }> = [];
  const futureExamEntries: Array<{ date: string; rawValue: string; label: string; priority: number }> = [];
  let fallbackRegistrationEntry: { date: string; rawValue: string; label: string; priority: number } | null = null;
  let fallbackExamEntry: { date: string; rawValue: string; label: string; priority: number } | null = null;

  const updateFallback = (
    currentEntry: { date: string; rawValue: string; label: string; priority: number } | null,
    nextEntry: { date: string; rawValue: string; label: string; priority: number },
  ) => {
    if (!currentEntry) return nextEntry;
    if (nextEntry.date < currentEntry.date) return nextEntry;
    if (nextEntry.date === currentEntry.date && nextEntry.priority < currentEntry.priority) return nextEntry;
    return currentEntry;
  };

  const collectEntries = (
    schedule: CertificationSchedule,
    fields: ReadonlyArray<{ key: keyof CertificationSchedule; label: string; priority: number }>,
    futureEntries: Array<{ date: string; rawValue: string; label: string; priority: number }>,
    fallbackType: "registration" | "exam",
  ) => {
    fields.forEach((field) => {
      const rawValue = schedule[field.key];
      const isoDate = extractDateValue(typeof rawValue === "string" ? rawValue : "");
      if (!rawValue || !isoDate) return;

      const entry = {
        date: isoDate,
        rawValue,
        label: field.label,
        priority: field.priority,
      };

      if (isoDate >= todayIso) {
        futureEntries.push(entry);
      }

      if (fallbackType === "registration") {
        fallbackRegistrationEntry = updateFallback(fallbackRegistrationEntry, entry);
      } else {
        fallbackExamEntry = updateFallback(fallbackExamEntry, entry);
      }
    });
  };

  item.schedules.forEach((schedule) => {
    collectEntries(schedule, registrationFields, futureRegistrationEntries, "registration");
    collectEntries(schedule, examFields, futureExamEntries, "exam");
  });

  const pickEarliest = (entries: Array<{ date: string; rawValue: string; label: string; priority: number }>) =>
    [...entries].sort((left, right) => {
      if (left.date !== right.date) return left.date.localeCompare(right.date);
      return left.priority - right.priority;
    })[0];

  return (
    (futureRegistrationEntries.length ? pickEarliest(futureRegistrationEntries) : null) ||
    (futureExamEntries.length ? pickEarliest(futureExamEntries) : null) ||
    fallbackRegistrationEntry ||
    fallbackExamEntry
  );
}
