import type { CSSProperties } from "react";

export const pageShellStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #f8f6f2 0%, #f6f7f9 20%, #f6f7f9 100%)",
  color: "#212124",
};

export const pageContainerStyle: CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "32px 24px 72px",
};

export const heroCardStyle: CSSProperties = {
  borderRadius: 32,
  border: "1px solid #ece7df",
  background:
    "radial-gradient(circle at top right, rgba(255,111,15,0.12), transparent 30%), linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)",
  boxShadow: "0 22px 56px rgba(15, 23, 42, 0.06)",
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

export const subCardStyle: CSSProperties = {
  borderRadius: 22,
  border: "1px solid #eef1f4",
  background: "#fbfbfc",
};

export const mutedTextStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: 14,
  lineHeight: 1.6,
};
