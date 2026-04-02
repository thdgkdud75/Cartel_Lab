import type { CSSProperties } from "react";

export const pageShellStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #f7f4ef 0%, #f6f7f9 18%, #f6f7f9 100%)",
  color: "#212124",
};

export const pageContainerStyle: CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  padding: "32px 24px 64px",
};

export const heroCardStyle: CSSProperties = {
  borderRadius: 32,
  border: "1px solid #ebe6df",
  background:
    "radial-gradient(circle at top right, rgba(255,111,15,0.12), transparent 28%), linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.06)",
};

export const sectionCardStyle: CSSProperties = {
  borderRadius: 28,
  border: "1px solid #e7eaee",
  background: "#ffffff",
  boxShadow: "0 20px 48px rgba(15, 23, 42, 0.05)",
};

export const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 999,
  background: "#fff0e7",
  color: "#c2560c",
  fontSize: 13,
  fontWeight: 700,
};

export const neutralBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 999,
  background: "#f4f5f7",
  color: "#5f6672",
  fontSize: 13,
  fontWeight: 700,
};

export const actionButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid #dadde2",
  background: "#ffffff",
  color: "#212124",
  fontSize: 14,
  fontWeight: 700,
};

export const primaryButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  border: "1px solid #ff6f0f",
  background: "#ff6f0f",
  color: "#ffffff",
};

export const legendItemStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 600,
};

export const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(15, 23, 42, 0.38)",
  backdropFilter: "blur(10px)",
  padding: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const modalCardStyle: CSSProperties = {
  width: "min(1080px, 100%)",
  maxHeight: "calc(100vh - 40px)",
  overflow: "auto",
  borderRadius: 28,
  border: "1px solid rgba(255,255,255,0.45)",
  background: "#ffffff",
  boxShadow: "0 28px 80px rgba(15, 23, 42, 0.2)",
};

export const timetableTableStyle: CSSProperties = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  background: "#ffffff",
};
