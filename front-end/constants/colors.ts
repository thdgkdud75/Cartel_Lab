export const DASHBOARD_PALETTE = {
  brand: "#ff6f0f",
  brandSoft: "#fff1e8",
  brandSoftStrong: "#ffe5d1",
  brandText: "#c45b0d",
  orange: "#f97316",
  orangeSoft: "#fff7ed",
  orangeText: "#c2410c",
  ink: "#212124",
  body: "#44474e",
  muted: "#868b94",
  faint: "#b3b8c1",
  line: "#e6e8eb",
  lineSoft: "#f0f1f3",
  surface: "#ffffff",
  surfaceSubtle: "#f7f8fa",
  page: "#f5f6f8",
  neutralSoft: "#f3f4f6",
  neutralStrong: "#cbd5e1",
  neutralText: "#6b7280",
  neutralAltSoft: "#f1f5f9",
  neutralAltText: "#b0b5bd",
  success: "#16a34a",
  successStrong: "#15803d",
  successSoft: "#f0fdf4",
  warning: "#eab308",
  warningText: "#a16207",
  warningSoft: "#fefce8",
  warningAltSoft: "#fef3c7",
  warningAltText: "#92400e",
  danger: "#dc2626",
  dangerStrong: "#ef4444",
  dangerText: "#b91c1c",
  dangerSoft: "#fff5f5",
  dangerAltSoft: "#fef2f2",
  dangerAltText: "#991b1b",
} as const;

export const DASHBOARD_STATUS_COLOR = {
  green: {
    bg: DASHBOARD_PALETTE.successSoft,
    dot: DASHBOARD_PALETTE.success,
    text: DASHBOARD_PALETTE.successStrong,
  },
  yellow: {
    bg: DASHBOARD_PALETTE.warningSoft,
    dot: DASHBOARD_PALETTE.warning,
    text: DASHBOARD_PALETTE.warningText,
  },
  red: {
    bg: DASHBOARD_PALETTE.dangerAltSoft,
    dot: DASHBOARD_PALETTE.dangerStrong,
    text: DASHBOARD_PALETTE.dangerText,
  },
  orange: {
    bg: DASHBOARD_PALETTE.orangeSoft,
    dot: DASHBOARD_PALETTE.orange,
    text: DASHBOARD_PALETTE.orangeText,
  },
  gray: {
    bg: DASHBOARD_PALETTE.neutralSoft,
    dot: DASHBOARD_PALETTE.neutralStrong,
    text: DASHBOARD_PALETTE.neutralText,
  },
} as const;

export type DashboardStatusColorKey = keyof typeof DASHBOARD_STATUS_COLOR;

export const DASHBOARD_QUIZ_DOT = {
  correct: { bg: DASHBOARD_PALETTE.successSoft, color: DASHBOARD_PALETTE.successStrong, label: "○" },
  ai: { bg: DASHBOARD_PALETTE.warningAltSoft, color: DASHBOARD_PALETTE.warningAltText, label: "○" },
  wrong: { bg: DASHBOARD_PALETTE.dangerAltSoft, color: DASHBOARD_PALETTE.orangeText, label: "△" },
  none: { bg: DASHBOARD_PALETTE.neutralAltSoft, color: DASHBOARD_PALETTE.neutralAltText, label: "─" },
} as const;

export type DashboardQuizDotKey = keyof typeof DASHBOARD_QUIZ_DOT;
