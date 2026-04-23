"use client";

import Link from "next/link";

const FEATURES = [
  {
    href: "/attendance",
    icon: "✅",
    title: "출결 관리",
    desc: "출석·지각·결석을 한눈에 확인하고 이력을 추적합니다.",
    accent: "#ff6f0f",
    bg: "#fff7f2",
  },
  {
    href: "/seats",
    icon: "🪑",
    title: "좌석 현황",
    desc: "랩실 좌석 배치와 실시간 이용 현황을 확인합니다.",
    accent: "#10b981",
    bg: "#f0fdf4",
  },
  {
    href: "/planner",
    icon: "📋",
    title: "계획 / 목표",
    desc: "개인 목표를 세우고 달성률을 시각적으로 확인합니다.",
    accent: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    href: "/contests",
    icon: "🏆",
    title: "공모전 정보",
    desc: "진행 중인 공모전 일정과 상세 정보를 모아봅니다.",
    accent: "#ec4899",
    bg: "#fdf2f8",
  },
  {
    href: "/certifications",
    icon: "🏅",
    title: "자격증 정보",
    desc: "접수·시험 일정을 필터링해 놓치지 않게 관리합니다.",
    accent: "#0ea5e9",
    bg: "#f0f9ff",
  },
  {
    href: "/blog",
    icon: "✍️",
    title: "기술 블로그",
    desc: "팀원들의 기술 아티클과 학습 기록을 공유합니다.",
    accent: "#14b8a6",
    bg: "#f0fdfa",
  },
  {
    href: "/quiz",
    icon: "💡",
    title: "Today Code",
    desc: "매일 출제되는 코딩 퀴즈로 실력을 점검합니다.",
    accent: "#6366f1",
    bg: "#eef2ff",
  },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
        overflowX: "hidden",
      }}
    >
      {/* ── Hero ── */}
      <section
        style={{
          position: "relative",
          padding: "100px 24px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Blob 배경 */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-80px",
              left: "50%",
              transform: "translateX(-60%)",
              width: "700px",
              height: "700px",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(255,111,15,0.13) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "60px",
              right: "-120px",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(99,102,241,0.10) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-40px",
              left: "-80px",
              width: "360px",
              height: "360px",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(16,185,129,0.09) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </div>

        {/* Badge */}
        <span
          style={{
            position: "relative",
            zIndex: 1,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 14px",
            borderRadius: "999px",
            background: "#fff1e8",
            border: "1px solid #ffd3b6",
            fontSize: "12px",
            fontWeight: 700,
            color: "#c2560c",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#ff6f0f",
            }}
          />
          Jvision Lab · 내부 관리 시스템
        </span>

        {/* 메인 타이틀 */}
        <h1
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: "clamp(36px, 6vw, 68px)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#212124",
            marginBottom: "20px",
            maxWidth: "820px",
          }}
        >
          랩실 생활,
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #ff6f0f 0%, #f97316 50%, #fb923c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            한 곳에서 관리
          </span>
        </h1>

        <p
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: "clamp(15px, 1.8vw, 18px)",
            color: "#505762",
            lineHeight: 1.7,
            maxWidth: "500px",
            marginBottom: "40px",
          }}
        >
          출결 확인부터 자격증 일정, 채용 공고, 코딩 퀴즈까지
          <br />
          Jvision Lab 팀원을 위한 통합 관리 플랫폼입니다.
        </p>

        {/* CTA */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 32px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #ff6f0f, #e5640d)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "15px",
              textDecoration: "none",
              boxShadow: "0 8px 32px rgba(255,111,15,0.35)",
              letterSpacing: "-0.01em",
            }}
          >
            대시보드 보기
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/attendance"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "14px 32px",
              borderRadius: "999px",
              background: "#fff",
              color: "#212124",
              fontWeight: 700,
              fontSize: "15px",
              textDecoration: "none",
              border: "1.5px solid #eaebee",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              letterSpacing: "-0.01em",
            }}
          >
            출결 확인
          </Link>
        </div>
      </section>

      {/* ── Feature Grid ── */}
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px 100px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {FEATURES.map(({ href, icon, title, desc, accent, bg }) => (
            <Link
              key={href}
              href={href}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "20px",
                  padding: "28px",
                  border: "1.5px solid #eaebee",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                  cursor: "pointer",
                  height: "100%",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(-4px)";
                  el.style.boxShadow = `0 16px 40px rgba(0,0,0,0.08)`;
                  el.style.borderColor = accent;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                  el.style.borderColor = "#eaebee";
                }}
              >
                {/* 아이콘 */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#212124",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {title}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#868b94",
                      lineHeight: 1.6,
                    }}
                  >
                    {desc}
                  </span>
                </div>

                {/* 화살표 */}
                <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: accent,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    바로가기
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
