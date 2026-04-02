"use client";

import {
  type CertificationItem,
  getCertificationDistinctionInfo,
  getCertificationSourceEntries,
  getCertificationSummaryText,
  getCertificationUrgency,
  getStatusLabel,
} from "@/constants/certifications";
import { emptyStateStyle, modalCardStyle, modalOverlayStyle, subCardStyle } from "./_styles";

type CertificationDetailModalSectionProps = {
  item: CertificationItem | null;
  favorite: boolean;
  open: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
};

export function CertificationDetailModalSection({
  item,
  favorite,
  open,
  onClose,
  onToggleFavorite,
}: CertificationDetailModalSectionProps) {
  if (!open || !item) return null;

  const urgency = getCertificationUrgency(item);
  const distinctionInfo = getCertificationDistinctionInfo(item);
  const sources = getCertificationSourceEntries(item);
  const primaryLink =
    sources[0]?.official_url || sources[0]?.apply_url || item.official_url || item.apply_url || "#";

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#eceef2] bg-[#fffdfb]/95 px-6 py-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-sm font-[700] text-[#c2560c]">자격증 상세</p>
            <h2 className="mt-1 text-[30px] font-[800] tracking-[-0.05em] text-[#212124]">{item.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f4f5f7] px-3 py-1.5 text-[12px] font-[700] text-[#5f6672]">
                {item.source || "공식 사이트"}
              </span>
              <span className="rounded-full bg-[#fff3ea] px-3 py-1.5 text-[12px] font-[700] text-[#b45309]">
                {getCertificationSummaryText(item)}
              </span>
              <span className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-[12px] font-[700] text-[#64748b]">
                {urgency.label || "일정 확인 필요"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={primaryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#dde2e8] bg-white px-4 py-2 text-sm font-[700] text-[#57606a]"
            >
              공식 일정 보기
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dde2e8] bg-white text-lg font-bold text-[#57606a]"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
          <section style={subCardStyle} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="text-sm leading-7 text-[#4b5563]">
                {item.description || "공식 일정과 접수 링크를 빠르게 확인할 수 있습니다."}
              </p>
              {distinctionInfo ? (
                <div className="mt-4 rounded-[20px] border border-[#f3e0d2] bg-[#fff8f2] px-4 py-4">
                  <p className="text-sm font-[800] text-[#b45309]">비슷한 시험과 차이</p>
                  <p className="mt-2 text-sm leading-6 text-[#7b6f67]">{distinctionInfo.detail}</p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 lg:flex-col">
              <button
                type="button"
                onClick={onToggleFavorite}
                className="rounded-full px-4 py-2 text-sm font-[700]"
                style={{
                  background: favorite ? "#fff3f7" : "#f4f5f7",
                  color: favorite ? "#be185d" : "#5f6672",
                }}
              >
                {favorite ? "관심 해제" : "관심 등록"}
              </button>
              {item.apply_url ? (
                <a
                  href={item.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#f0c8ab] bg-[#fff4ea] px-4 py-2 text-sm font-[700] text-[#b45309]"
                >
                  {item.apply_label || "신청하기"}
                </a>
              ) : null}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailStat label="시험 구조" value={(item.exam_structure || []).join(", ") || "공식 사이트 기준"} />
            <DetailStat label="합격률" value={item.pass_rate || "공식 사이트 확인 필요"} />
            <DetailStat label="응시료" value={item.exam_fee || "회차별 확인 필요"} />
            <DetailStat label="난이도" value={item.difficulty_label || "정보 확인 중"} />
            <DetailStat label="가장 가까운 일정" value={urgency.label || "일정 확인 필요"} />
            <DetailStat label="빠른 메모" value={item.quick_tip || "자세한 수치는 공식 공고에서 확인해주세요."} />
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-[22px] font-[800] tracking-[-0.04em] text-[#212124]">출처별 링크</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {sources.map((entry) => {
                const qualifier = entry.qualifier || entry.source || "공식";
                return (
                  <div key={`${item.slug}-${qualifier}`} className="flex flex-wrap gap-2">
                    {entry.official_url ? (
                      <a
                        href={entry.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-[#dde2e8] bg-white px-4 py-2 text-sm font-[700] text-[#57606a]"
                      >
                        {qualifier} 일정
                      </a>
                    ) : null}
                    {entry.apply_url && entry.apply_url !== entry.official_url ? (
                      <a
                        href={entry.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-[#f0c8ab] bg-[#fff4ea] px-4 py-2 text-sm font-[700] text-[#b45309]"
                      >
                        {qualifier} 신청
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-[22px] font-[800] tracking-[-0.04em] text-[#212124]">세부 일정</h3>
            {item.schedules.length ? (
              <div className="space-y-4">
                {item.schedules.map((schedule, index) => (
                  <article key={`${item.slug}-${schedule.round || index}`} style={subCardStyle} className="p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <p className="text-[18px] font-[800] tracking-[-0.03em] text-[#212124]">
                        {schedule.round || "일정"}
                      </p>
                      {schedule.is_today ? (
                        <span className="rounded-full bg-[#fff1e8] px-3 py-1 text-[12px] font-[800] text-[#c2560c]">
                          D-DAY
                        </span>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {renderScheduleRows(schedule).map((row) => (
                        <div key={`${item.slug}-${schedule.round}-${row.label}`} className="rounded-[18px] border border-[#eceff3] bg-white px-4 py-3">
                          <p className="text-[12px] font-[800] tracking-[0.02em] text-[#8b919b]">{row.label}</p>
                          <p className="mt-1 text-sm font-[700] leading-6 text-[#2c3440]">{row.value}</p>
                          {row.status ? (
                            <span className="mt-2 inline-flex rounded-full bg-[#f4f5f7] px-2.5 py-1 text-[11px] font-[800] text-[#5f6672]">
                              {getStatusLabel(row.status)}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div style={emptyStateStyle}>
                {item.error || "아직 연동된 일정이 없어도 공식 사이트로 바로 이동할 수 있게 준비했습니다."}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={subCardStyle} className="rounded-[20px] px-4 py-4">
      <p className="text-[12px] font-[800] tracking-[0.02em] text-[#8b919b]">{label}</p>
      <p className="mt-2 text-sm font-[700] leading-6 text-[#2c3440]">{value}</p>
    </div>
  );
}

function renderScheduleRows(schedule: CertificationItem["schedules"][number]) {
  const rows = [];
  const add = (
    label: string,
    value?: string,
    status?: CertificationItem["schedules"][number]["registration_status"],
  ) => {
    if (!value) return;
    rows.push({ label, value, status });
  };

  add("접수", schedule.registration, schedule.registration_status);
  add("필기 접수", schedule.written_registration, schedule.written_registration_status);
  add("실기 접수", schedule.practical_registration, schedule.practical_registration_status);
  add("시험일", schedule.exam_date, schedule.exam_status);
  add("필기 시험", schedule.written_exam, schedule.written_exam_status);
  add("실기 시험", schedule.practical_exam, schedule.practical_exam_status);
  add("수험표", schedule.ticket_open);
  add("필기 수험표", schedule.written_ticket_open);
  add("실기 수험표", schedule.practical_ticket_open);
  add("가답안/검토", schedule.score_review);
  add("필기 가답안", schedule.written_score_review);
  add("실기 가답안", schedule.practical_score_review);
  add("합격 발표", schedule.result_date);
  add("필기 합격 발표", schedule.written_result);
  add("최종 합격 발표", schedule.final_result);

  return rows;
}
