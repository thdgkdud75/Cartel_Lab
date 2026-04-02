"use client";

import {
  type CertificationItem,
  displayCertificationShortName,
  getCertificationUrgency,
  hasOpenRegistration,
} from "@/constants/certifications";
import { badgeStyle, heroCardStyle, neutralBadgeStyle, subCardStyle } from "./_styles";

type CertificationsHeroSectionProps = {
  alerts: string[];
  items: CertificationItem[];
};

export function CertificationsHeroSection({
  alerts,
  items,
}: CertificationsHeroSectionProps) {
  const openCount = items.filter(hasOpenRegistration).length;
  const urgentCount = items.filter((item) =>
    ["today", "urgent", "soon"].includes(getCertificationUrgency(item).code),
  ).length;
  const nearest = items.find((item) =>
    ["today", "urgent", "soon", "upcoming"].includes(getCertificationUrgency(item).code),
  );

  return (
    <section style={heroCardStyle}>
      <div className="grid gap-6 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:px-10">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span style={badgeStyle}>자격증 정보</span>
            <span style={neutralBadgeStyle}>공식 일정 연동</span>
          </div>
          <h1 className="text-[clamp(34px,5vw,56px)] font-[800] tracking-[-0.05em] text-[#212124]">
            중요한 일정만 먼저 걸러서
            <br className="hidden sm:block" /> 빠르게 판단할 수 있게 정리합니다.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280] sm:text-[15px]">
            자주 확인하는 자격증 일정을 한곳에서 보고, 접수 상태와 시험 임박 여부를 바로 파악할 수 있게
            구성했습니다. 관심 등록, 상세 확인, 오늘의 계획 추가까지 이 페이지 안에서 이어집니다.
          </p>

          {alerts.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {alerts.slice(0, 6).map((alert) => (
                <span
                  key={alert}
                  className="rounded-full border border-[#f2d7c4] bg-[#fff6ef] px-3 py-2 text-[12px] font-[700] text-[#b45309]"
                >
                  {alert}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <SummaryCard
            label="전체 자격증"
            value={String(items.length)}
            helper="중복 출처는 하나로 묶고, 숨김 대상은 제외한 기준입니다."
          />
          <SummaryCard
            label="접수 진행 중"
            value={String(openCount)}
            helper="지금 바로 신청 가능한 일정만 먼저 모아서 볼 수 있습니다."
          />
          <SummaryCard
            label="가장 가까운 시험"
            value={nearest ? displayCertificationShortName(nearest) : "-"}
            helper={
              nearest
                ? getCertificationUrgency(nearest).label || "일정 확인 가능"
                : "가까운 시험 일정이 아직 없습니다."
            }
          />
          <SummaryCard
            label="시험 임박"
            value={String(urgentCount)}
            helper="D-30 안에 들어온 시험을 빠르게 추려볼 수 있습니다."
          />
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div style={subCardStyle} className="rounded-[22px] p-5">
      <p className="text-[13px] font-[800] tracking-[0.02em] text-[#8b919b]">{label}</p>
      <p className="mt-2 text-[30px] font-[800] tracking-[-0.05em] text-[#212124]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#6b7280]">{helper}</p>
    </div>
  );
}
