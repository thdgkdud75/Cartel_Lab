import { type CSSProperties } from "react";
import { DASHBOARD_PALETTE } from "@/constants/colors";

export const panelStyle: CSSProperties = {
  background: DASHBOARD_PALETTE.surface,
  border: `1px solid ${DASHBOARD_PALETTE.line}`,
  borderRadius: 24,
  boxShadow: "0 1px 0 rgba(18, 18, 18, 0.02)",
};

export const sectionCardStyle: CSSProperties = {
  ...panelStyle,
  borderRadius: 22,
  overflow: "hidden",
};

export const fieldStyle: CSSProperties = {
  border: `1px solid ${DASHBOARD_PALETTE.line}`,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  color: DASHBOARD_PALETTE.ink,
  background: DASHBOARD_PALETTE.surface,
};

export const secondaryButtonStyle: CSSProperties = {
  border: `1px solid ${DASHBOARD_PALETTE.line}`,
  borderRadius: 999,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 700,
  background: DASHBOARD_PALETTE.surface,
  color: DASHBOARD_PALETTE.body,
  cursor: "pointer",
};

export const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 700,
  background: DASHBOARD_PALETTE.brand,
  color: "#fff",
  cursor: "pointer",
};
