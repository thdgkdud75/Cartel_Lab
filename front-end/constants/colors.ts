export const DASHBOARD_PALETTE = {
  page: "#f5f6f8",
  surface: "#ffffff",
  surfaceSubtle: "#f8f9fb",
  surfaceTint: "#fff7f2",
  brand: "#ff6f0f",
  brandHover: "#e5640d",
  brandSoft: "#fff1e8",
  brandSoftStrong: "#ffd3b6",
  brandText: "#c2560c",
  orange: "#f97316",
  orangeSoft: "#fff7ed",
  orangeText: "#c2410c",
  ink: "#212124",
  body: "#505762",
  muted: "#868b94",
  faint: "#a7adb7",
  line: "#eaebee",
  lineSoft: "#f0f2f4",
  neutralSoft: "#f3f4f6",
  neutralStrong: "#cbd5e1",
  neutralText: "#6b7280",
  neutralAltSoft: "#f1f5f9",
  neutralAltText: "#b0b5bd",
  success: "#16a34a",
  successStrong: "#15803d",
  successSoft: "#f0fdf4",
  warning: "#f59e0b",
  warningText: "#a16207",
  warningSoft: "#fff7ed",
  warningAltSoft: "#fef3c7",
  warningAltText: "#92400e",
  danger: "#dc2626",
  dangerStrong: "#ef4444",
  dangerText: "#b91c1c",
  dangerSoft: "#fef2f2",
  dangerAltSoft: "#fef2f2",
  dangerAltText: "#991b1b",
  shadow: "0 18px 48px rgba(18, 18, 18, 0.08)",
  overlay: "rgba(15, 23, 42, 0.42)",
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
  future: { bg: "#f3f4f6", color: DASHBOARD_PALETTE.neutralAltText, label: "─" },
} as const;

export type DashboardQuizDotKey = keyof typeof DASHBOARD_QUIZ_DOT;
