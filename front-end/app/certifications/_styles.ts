import type { CSSProperties } from "react";

export const pageShellStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #f8f6f2 0%, #f5f6f8 16%, #f6f7f9 100%)",
  color: "#212124",
};

export const pageContainerStyle: CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: "32px 24px 80px",
};

export const heroCardStyle: CSSProperties = {
  borderRadius: 32,
  border: "1px solid #ece6de",
  background:
    "radial-gradient(circle at top right, rgba(255,111,15,0.12), transparent 34%), linear-gradient(180deg, #fffaf5 0%, #fff 100%)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.06)",
};

export const sectionCardStyle: CSSProperties = {
  borderRadius: 28,
  border: "1px solid #e7eaee",
  background: "#ffffff",
  boxShadow: "0 20px 48px rgba(15, 23, 42, 0.045)",
};

export const subCardStyle: CSSProperties = {
  borderRadius: 24,
  border: "1px solid #eceff3",
  background: "#fcfcfd",
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

export const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 18,
  border: "1px solid #dfe4ea",
  background: "#ffffff",
  padding: "14px 16px",
  fontSize: 14,
  color: "#212124",
  outline: "none",
};

export const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(15, 23, 42, 0.48)",
  backdropFilter: "blur(10px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

export const modalCardStyle: CSSProperties = {
  width: "min(960px, 100%)",
  maxHeight: "min(88vh, 920px)",
  overflow: "auto",
  borderRadius: 30,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "#fffdfb",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.2)",
};

export const chipBaseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "-0.01em",
};

export const emptyStateStyle: CSSProperties = {
  borderRadius: 24,
  border: "1px dashed #d9dfe7",
  background: "#fafbfc",
  padding: "36px 20px",
  textAlign: "center",
  color: "#8a9099",
  fontSize: 14,
  fontWeight: 600,
};
