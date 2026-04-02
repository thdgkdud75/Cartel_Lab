import { heroPanelStyle } from "./_styles";

type HeroSectionProps = {
  categoryLabel: string;
  totalCount: number;
  urgentCount: number;
  earliestDeadlineLabel: string;
  alwaysOpenCount: number;
  generatedAt: string | null;
};

export function HeroSection({
  categoryLabel,
  totalCount,
  urgentCount,
  earliestDeadlineLabel,
  alwaysOpenCount,
  generatedAt,
}: HeroSectionProps) {
  const generatedLabel = generatedAt
    ? new Date(generatedAt).toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <section className="px-6 pt-8">
      <div className="mx-auto max-w-[1380px]" style={heroPanelStyle}>
        <div className="grid gap-8 px-7 py-8 md:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] md:px-9 md:py-9">
          <div className="space-y-4">
            <span className="inline-flex items-center rounded-full bg-[#fff1e8] px-3 py-1 text-[12px] font-bold tracking-[-0.01em] text-[#c2560c]">
              Opportunity Board
            </span>
            <div className="space-y-3">
              <h1 className="text-[clamp(32px,5vw,54px)] font-extrabold tracking-[-0.05em] text-[#212124]">
                최신 공모전
              </h1>
              <p className="max-w-[680px] text-[15px] leading-7 text-[#5f6672] md:text-[16px]">
                실시간으로 수집한 공모전 정보를 한곳에서 확인하세요. 이미지, 카테고리, 마감일과 D-Day를
                빠르게 훑고 바로 상세 페이지로 이동할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <MetricCard label="현재 보기" value={categoryLabel} />
            <MetricCard label="전체 공고" value={`${totalCount}건`} helper="현재 필터 기준" />
            <MetricCard
              label="마감 요약"
              value={urgentCount > 0 ? `${urgentCount}건 임박` : earliestDeadlineLabel}
              helper={
                urgentCount > 0
                  ? `${earliestDeadlineLabel}부터 순차 마감`
                  : alwaysOpenCount > 0
                    ? `상시 모집 ${alwaysOpenCount}건 포함`
                    : "임박 공고 없음"
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0e8e2] px-7 py-4 text-[13px] text-[#6e7681] md:px-9">
          <span>마감일 기준으로 정렬되며 오늘 이후 공고만 노출됩니다.</span>
          <span>{generatedLabel ? `${generatedLabel} 기준 갱신` : "최근 동기화 기준"}</span>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#ece7e2] bg-white/88 px-5 py-4">
      <p className="text-[12px] font-semibold tracking-[-0.01em] text-[#8a9098]">{label}</p>
      <p className="mt-2 text-[24px] font-extrabold tracking-[-0.04em] text-[#212124]">{value}</p>
      {helper ? <p className="mt-1 text-[12px] text-[#8a9098]">{helper}</p> : null}
    </div>
  );
}
