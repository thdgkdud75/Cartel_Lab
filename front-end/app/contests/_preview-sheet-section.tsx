import type { ContestItem } from "./_contest-list-section";

export type ContestPreview = {
  contest_id: number;
  title: string;
  external_url: string;
  summary: string;
  highlights: string[];
  detail_sections: Array<{
    label: string;
    items: string[];
  }>;
  action_hint: string;
  generated_by: string;
};

type PreviewSheetSectionProps = {
  contest: ContestItem | null;
  preview: ContestPreview | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function PreviewSheetSection({
  contest,
  preview,
  loading,
  error,
  onClose,
}: PreviewSheetSectionProps) {
  if (!contest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/28 px-4 py-4 md:items-center">
      <button
        type="button"
        aria-label="요약 닫기"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section className="relative z-10 flex max-h-[min(88vh,920px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[28px] border border-[#ebeef2] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#f0f2f5] px-6 py-5">
          <div className="space-y-1">
            <p className="text-[12px] font-semibold tracking-[-0.01em] text-[#8a9098]">이미지 미리보기 요약</p>
            <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-[#212124]">{contest.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7eb] text-[18px] text-[#69707a]"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-5 w-24 animate-pulse rounded-full bg-[#f0f2f5]" />
              <div className="h-4 w-full animate-pulse rounded-full bg-[#f0f2f5]" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-[#f0f2f5]" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#f0f2f5]" />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-[20px] border border-[#f4d3c2] bg-[#fff7f2] px-5 py-4">
              <p className="text-[14px] font-medium text-[#8a4216]">{error}</p>
            </div>
          ) : null}

          {!loading && !error && preview ? (
            <>
              <div className="rounded-[22px] border border-[#eceef2] bg-[#fafbfc] px-5 py-4">
                <p className="text-[15px] leading-7 text-[#39414a]">{preview.summary}</p>
              </div>

              {preview.highlights.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#8a9098]">핵심 포인트</p>
                  <div className="grid gap-2">
                    {preview.highlights.map((item) => (
                      <div
                        key={item}
                        className="rounded-[18px] border border-[#eceef2] px-4 py-3 text-[14px] leading-6 text-[#4d5560]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {preview.detail_sections.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#8a9098]">세부 정보</p>
                  <div className="grid gap-3">
                    {preview.detail_sections.map((section) => (
                      <div key={section.label} className="rounded-[20px] border border-[#eceef2] px-4 py-4">
                        <p className="text-[13px] font-semibold text-[#8a9098]">{section.label}</p>
                        <div className="mt-2 grid gap-2">
                          {section.items.map((item) => (
                            <p key={item} className="text-[14px] leading-6 text-[#4d5560]">
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[18px] bg-[#fff1e8] px-4 py-3 text-[13px] leading-6 text-[#8a4216]">
                {preview.action_hint}
              </div>
            </>
          ) : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#f0f2f5] px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-[#e5e7eb] px-4 py-3 text-[14px] font-semibold text-[#4b5563]"
          >
            닫기
          </button>
          <a
            href={preview?.external_url ?? contest.external_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-[#212124] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#ff6f0f]"
          >
            상세보기
          </a>
        </div>
      </section>
    </div>
  );
}
