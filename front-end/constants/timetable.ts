export type TimetableCell = {
  subject: string;
  detail: string;
};

export type TimetableMatrixRow = {
  period: string;
  monday: TimetableCell | null;
  tuesday: TimetableCell | null;
  wednesday: TimetableCell | null;
  thursday: TimetableCell | null;
  friday: TimetableCell | null;
};

export type ClassTimetable = {
  classGroup: "A" | "B";
  modalTitle: string;
  title: string;
  rows: TimetableMatrixRow[];
};

export type DailyTimetableItem = {
  weekday: number;
  weekdayLabel: string;
  period: string;
  subject: string;
  detail: string;
};

export type MergedTimetableCell = {
  value: TimetableCell | null;
  rowSpan: number;
};

export type MergedTimetableRow = {
  period: string;
  monday: MergedTimetableCell | null;
  tuesday: MergedTimetableCell | null;
  wednesday: MergedTimetableCell | null;
  thursday: MergedTimetableCell | null;
  friday: MergedTimetableCell | null;
};

const empty = null;

export const TIMETABLE_BY_CLASS: Record<"A" | "B", ClassTimetable> = {
  A: {
    classGroup: "A",
    modalTitle: "2학년 A반 강의시간표 (2026학년 1학기)",
    title: "A반 시간표",
    rows: [
      { period: "1 (09:00 ~ 09:50)", monday: empty, tuesday: empty, wednesday: empty, thursday: empty, friday: empty },
      {
        period: "2 (10:00 ~ 10:50)",
        monday: { subject: "데이터베이스", detail: "한종진 / 2411" },
        tuesday: { subject: "데이터베이스", detail: "한종진 / 2411" },
        wednesday: { subject: "객체지향프로그래밍", detail: "이훈주 / 2411" },
        thursday: { subject: "AI프롬프트엔지니어링", detail: "최미란 / 2411" },
        friday: { subject: "객체지향프로그래밍", detail: "이훈주 / 2411" },
      },
      {
        period: "3 (11:00 ~ 11:50)",
        monday: { subject: "데이터베이스", detail: "한종진 / 2411" },
        tuesday: { subject: "데이터베이스", detail: "한종진 / 2411" },
        wednesday: { subject: "객체지향프로그래밍", detail: "이훈주 / 2411" },
        thursday: { subject: "AI프롬프트엔지니어링", detail: "최미란 / 2411" },
        friday: { subject: "객체지향프로그래밍", detail: "이훈주 / 2411" },
      },
      {
        period: "4 (12:00 ~ 12:50)",
        monday: empty,
        tuesday: empty,
        wednesday: empty,
        thursday: { subject: "AI프롬프트엔지니어링", detail: "최미란 / 2411" },
        friday: empty,
      },
      {
        period: "5 (13:00 ~ 13:50)",
        monday: { subject: "디지털포렌식", detail: "이성원 / 2408" },
        tuesday: { subject: "해킹 및 침해대응", detail: "이성원 / 2412" },
        wednesday: { subject: "캡스톤디자인", detail: "장진수 / 2412" },
        thursday: empty,
        friday: empty,
      },
      {
        period: "6 (14:00 ~ 14:50)",
        monday: { subject: "디지털포렌식", detail: "이성원 / 2408" },
        tuesday: { subject: "해킹 및 침해대응", detail: "이성원 / 2412" },
        wednesday: { subject: "캡스톤디자인", detail: "장진수 / 2412" },
        thursday: empty,
        friday: empty,
      },
      {
        period: "7 (15:00 ~ 15:50)",
        monday: { subject: "디지털포렌식", detail: "이성원 / 2408" },
        tuesday: { subject: "해킹 및 침해대응", detail: "이성원 / 2412" },
        wednesday: empty,
        thursday: { subject: "취업과창업", detail: "최미란 / 2408" },
        friday: empty,
      },
      {
        period: "8 (16:00 ~ 16:50)",
        monday: empty,
        tuesday: { subject: "함께하는 여행", detail: "박한규 / 2409" },
        wednesday: empty,
        thursday: { subject: "취업과창업", detail: "최미란 / 2408" },
        friday: empty,
      },
    ],
  },
  B: {
    classGroup: "B",
    modalTitle: "2학년 B반 강의시간표 (2026학년 1학기)",
    title: "B반 시간표",
    rows: [
      { period: "1 (09:00 ~ 09:50)", monday: empty, tuesday: empty, wednesday: empty, thursday: empty, friday: empty },
      {
        period: "2 (10:00 ~ 10:50)",
        monday: { subject: "AI프롬프트엔지니어링", detail: "최미란 / 2408" },
        tuesday: { subject: "모바일프로그래밍", detail: "최대림 / 2408" },
        wednesday: { subject: "JAVA프로그래밍 실무", detail: "권숙연 / 2408" },
        thursday: empty,
        friday: { subject: "웹프로그래밍 실무", detail: "김석진 / 2408" },
      },
      {
        period: "3 (11:00 ~ 11:50)",
        monday: { subject: "AI프롬프트엔지니어링", detail: "최미란 / 2408" },
        tuesday: { subject: "모바일프로그래밍", detail: "최대림 / 2408" },
        wednesday: { subject: "JAVA프로그래밍 실무", detail: "권숙연 / 2408" },
        thursday: empty,
        friday: { subject: "웹프로그래밍 실무", detail: "김석진 / 2408" },
      },
      {
        period: "4 (12:00 ~ 12:50)",
        monday: { subject: "AI프롬프트엔지니어링", detail: "최미란 / 2408" },
        tuesday: { subject: "모바일프로그래밍", detail: "최대림 / 2408" },
        wednesday: empty,
        thursday: empty,
        friday: { subject: "웹프로그래밍 실무", detail: "김석진 / 2408" },
      },
      {
        period: "5 (13:00 ~ 13:50)",
        monday: empty,
        tuesday: empty,
        wednesday: { subject: "캡스톤디자인", detail: "권숙연 / 2412" },
        thursday: { subject: "JAVA프로그래밍 실무", detail: "권숙연 / 2408" },
        friday: empty,
      },
      {
        period: "6 (14:00 ~ 14:50)",
        monday: empty,
        tuesday: { subject: "데이터베이스", detail: "한종진 / 2411" },
        wednesday: { subject: "캡스톤디자인", detail: "권숙연 / 2412" },
        thursday: { subject: "JAVA프로그래밍 실무", detail: "권숙연 / 2408" },
        friday: empty,
      },
      {
        period: "7 (15:00 ~ 15:50)",
        monday: { subject: "데이터베이스", detail: "한종진 / 2411" },
        tuesday: { subject: "데이터베이스", detail: "한종진 / 2411" },
        wednesday: empty,
        thursday: { subject: "취업과창업", detail: "최미란 / 2408" },
        friday: empty,
      },
      {
        period: "8 (16:00 ~ 16:50)",
        monday: { subject: "데이터베이스", detail: "한종진 / 2411" },
        tuesday: { subject: "함께하는 여행", detail: "박한규 / 2409" },
        wednesday: empty,
        thursday: { subject: "취업과창업", detail: "최미란 / 2408" },
        friday: empty,
      },
    ],
  },
};

export const WEEKDAY_LABELS = ["월요일", "화요일", "수요일", "목요일", "금요일"] as const;
export const WEEKDAY_SHORT_LABELS = ["월", "화", "수", "목", "금"] as const;
export const WEEKDAY_FIELD_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
export type WeekdayFieldKey = (typeof WEEKDAY_FIELD_KEYS)[number];

export function getClassTimetable(classGroup?: string | null) {
  if (classGroup === "A" || classGroup === "B") {
    return TIMETABLE_BY_CLASS[classGroup];
  }
  return null;
}

export function getAllTimetables() {
  return [TIMETABLE_BY_CLASS.A, TIMETABLE_BY_CLASS.B] as const;
}

export function getDailyTimetableItems(classGroup: "A" | "B", weekday: number): DailyTimetableItem[] {
  const timetable = TIMETABLE_BY_CLASS[classGroup];
  const key = WEEKDAY_FIELD_KEYS[weekday] ?? WEEKDAY_FIELD_KEYS[0];
  const items: DailyTimetableItem[] = [];

  timetable.rows.forEach((row) => {
    const cell = row[key];
    if (!cell) return;

    const lastItem = items[items.length - 1];
    if (lastItem && isSameTimetableCell(cell, { subject: lastItem.subject, detail: lastItem.detail })) {
      lastItem.period = mergePeriodLabel(lastItem.period, row.period);
      return;
    }

    items.push({
      weekday,
      weekdayLabel: WEEKDAY_LABELS[weekday] ?? WEEKDAY_LABELS[0],
      period: formatSinglePeriodLabel(row.period),
      subject: cell.subject,
      detail: cell.detail,
    });
  });

  return items;
}

export function getMergedTimetableRows(rows: TimetableMatrixRow[]): MergedTimetableRow[] {
  const mergedRows = rows.map((row) => ({
    period: row.period,
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
  })) satisfies MergedTimetableRow[];

  WEEKDAY_FIELD_KEYS.forEach((key) => {
    let anchorIndex = -1;
    let anchorValue: TimetableCell | null = null;

    rows.forEach((row, rowIndex) => {
      const currentValue = row[key];

      if (currentValue && anchorValue && isSameTimetableCell(currentValue, anchorValue) && anchorIndex >= 0) {
        const anchorCell = mergedRows[anchorIndex][key];
        if (anchorCell) {
          anchorCell.rowSpan += 1;
        }
        mergedRows[rowIndex][key] = null;
        return;
      }

      mergedRows[rowIndex][key] = {
        value: currentValue,
        rowSpan: 1,
      };
      anchorIndex = currentValue ? rowIndex : -1;
      anchorValue = currentValue;
    });
  });

  return mergedRows;
}

function isSameTimetableCell(left: TimetableCell | null, right: TimetableCell | null) {
  if (!left || !right) return false;
  return left.subject === right.subject && left.detail === right.detail;
}

function formatSinglePeriodLabel(period: string) {
  const parsed = parsePeriod(period);
  if (!parsed) return period;
  return `${parsed.number}교시 (${parsed.start} ~ ${parsed.end})`;
}

function mergePeriodLabel(anchorPeriod: string, currentPeriod: string) {
  const parsedAnchor = parsePeriod(anchorPeriod);
  const parsedCurrent = parsePeriod(currentPeriod);

  if (!parsedAnchor || !parsedCurrent) {
    return anchorPeriod === currentPeriod ? anchorPeriod : `${anchorPeriod} ~ ${currentPeriod}`;
  }

  if (parsedAnchor.number === parsedCurrent.number) {
    return `${parsedAnchor.number}교시 (${parsedAnchor.start} ~ ${parsedCurrent.end})`;
  }

  return `${parsedAnchor.number}-${parsedCurrent.number}교시 (${parsedAnchor.start} ~ ${parsedCurrent.end})`;
}

function parsePeriod(period: string) {
  const matched = period.match(/^(\d+)(?:-(\d+))?교시\s*\(([^~]+)~([^)]+)\)$/) ?? period.match(/^(\d+)\s*\(([^~]+)~([^)]+)\)$/);

  if (!matched) {
    return null;
  }

  if (matched.length === 5) {
    return {
      number: matched[1],
      endNumber: matched[2] ?? matched[1],
      start: matched[3].trim(),
      end: matched[4].trim(),
    };
  }

  return {
    number: matched[1],
    endNumber: matched[1],
    start: matched[2].trim(),
    end: matched[3].trim(),
  };
}
