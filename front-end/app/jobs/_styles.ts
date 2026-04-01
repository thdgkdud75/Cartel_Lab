import { type CSSProperties } from "react";
import { DASHBOARD_PALETTE } from "@/constants/colors";

const PALETTE = DASHBOARD_PALETTE;

export const pagePanelStyle: CSSProperties = {
  background: PALETTE.surface,
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 28,
  boxShadow: "0 10px 30px rgba(18, 18, 18, 0.04)",
};

export const sectionCardStyle: CSSProperties = {
  ...pagePanelStyle,
  borderRadius: 24,
  overflow: "hidden",
};

export const heroCardStyle: CSSProperties = {
  ...sectionCardStyle,
  background:
    "linear-gradient(180deg, rgba(255,247,242,0.98) 0%, rgba(255,255,255,1) 72%), radial-gradient(circle at top right, rgba(255,111,15,0.12), transparent 34%)",
};

export const ghostButtonStyle: CSSProperties = {
  border: `1px solid ${PALETTE.line}`,
  borderRadius: 999,
  background: PALETTE.surface,
  color: PALETTE.body,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 999,
  background: PALETTE.brand,
  color: "#fff",
  padding: "11px 18px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

export const filterChipStyle: CSSProperties = {
  borderRadius: 999,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const modalCardStyle: CSSProperties = {
  background: PALETTE.surface,
  borderRadius: 28,
  border: `1px solid ${PALETTE.line}`,
  boxShadow: PALETTE.shadow,
};

export const metricTileStyle: CSSProperties = {
  borderRadius: 20,
  background: PALETTE.surface,
  border: `1px solid ${PALETTE.line}`,
  padding: 18,
};

export const subtleBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  border: `1px solid ${PALETTE.line}`,
  background: PALETTE.surfaceSubtle,
  color: PALETTE.body,
  padding: "7px 11px",
  fontSize: 12,
  fontWeight: 700,
};

export const listRowStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
};
