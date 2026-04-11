import type { CSSProperties } from "react";
import { DASHBOARD_PALETTE } from "@/constants/colors";

export const QUIZ_PALETTE = {
  ...DASHBOARD_PALETTE,
  page: "#f6f6f3",
  sand: "#f3efe8",
  sandLine: "#e5ddd1",
  inkSoft: "#5f6672",
  midnight: "#171717",
  codeBg: "#1f2430",
  codeFg: "#f4f0ea",
  successDeep: "#166534",
  warningDeep: "#b45309",
} as const;

export const pageShellStyle: CSSProperties = {
  minHeight: "100vh",
  background: `linear-gradient(180deg, ${QUIZ_PALETTE.page} 0%, #fcfbf8 28%, #f5f4f0 100%)`,
};

export const shellInnerStyle: CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "20px 16px 56px",
};

export const heroCardStyle: CSSProperties = {
  borderRadius: 28,
  padding: "28px 28px 24px",
  background: `linear-gradient(135deg, ${QUIZ_PALETTE.surface} 0%, ${QUIZ_PALETTE.surfaceTint} 100%)`,
  border: `1px solid ${QUIZ_PALETTE.sandLine}`,
  boxShadow: "0 24px 60px rgba(20, 20, 20, 0.06)",
};

export const sectionCardStyle: CSSProperties = {
  borderRadius: 24,
  background: QUIZ_PALETTE.surface,
  border: `1px solid ${QUIZ_PALETTE.line}`,
  boxShadow: "0 12px 30px rgba(18, 18, 18, 0.04)",
};

export const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(20px, 2.4vw, 30px)",
  fontWeight: 800,
  letterSpacing: "-0.04em",
  color: QUIZ_PALETTE.ink,
};

export const sectionSubtitleStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.6,
  color: QUIZ_PALETTE.inkSoft,
};

export const buttonBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 999,
  padding: "11px 16px",
  fontSize: 14,
  fontWeight: 700,
  transition: "background-color 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 16,
  border: `1px solid ${QUIZ_PALETTE.line}`,
  background: QUIZ_PALETTE.surface,
  color: QUIZ_PALETTE.ink,
  fontSize: 15,
  lineHeight: 1.5,
  padding: "14px 16px",
  outline: "none",
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: "vertical",
};

export const codeBlockStyle: CSSProperties = {
  margin: 0,
  padding: "18px 20px",
  borderRadius: 20,
  background: QUIZ_PALETTE.codeBg,
  color: QUIZ_PALETTE.codeFg,
  fontFamily: "'Courier New', monospace",
  fontSize: 13,
  lineHeight: 1.7,
  overflowX: "auto",
  whiteSpace: "pre",
};

export const markdownClassName = "quiz-markdown";
