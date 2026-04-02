"use client";

import {
  CERTIFICATION_CATEGORY_OPTIONS,
  CERTIFICATION_FILTER_OPTIONS,
  type CertificationCategoryValue,
  type CertificationFilterValue,
} from "@/constants/certifications";
import { inputStyle, sectionCardStyle } from "./_styles";

type CertificationsControlsSectionProps = {
  searchTerm: string;
  filter: CertificationFilterValue;
  category: CertificationCategoryValue;
  onSearchTermChange: (value: string) => void;
  onFilterChange: (value: CertificationFilterValue) => void;
  onCategoryChange: (value: CertificationCategoryValue) => void;
};

export function CertificationsControlsSection({
  searchTerm,
  filter,
  category,
  onSearchTermChange,
  onFilterChange,
  onCategoryChange,
}: CertificationsControlsSectionProps) {
  return (
    <section style={sectionCardStyle} className="space-y-6 px-6 py-6 sm:px-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <label htmlFor="cert-search" className="mb-2 block text-sm font-[700] text-[#5f6672]">
            자격증 검색
          </label>
          <input
            id="cert-search"
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="자격증 이름, 약어, 기관명으로 찾기"
            style={inputStyle}
          />
        </div>

        <div className="rounded-[22px] border border-[#eceff3] bg-[#fcfcfd] px-5 py-4">
          <p className="text-[13px] font-[800] tracking-[0.02em] text-[#8b919b]">현재 기능</p>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            관심 등록, 접수중 필터, 일정 변경 알림, 오늘의 계획 추가까지 이 페이지 안에서 이어집니다.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <FilterGroup
          label="필터"
          options={CERTIFICATION_FILTER_OPTIONS}
          value={filter}
          onChange={(nextValue) => onFilterChange(nextValue as CertificationFilterValue)}
        />
        <FilterGroup
          label="카테고리"
          options={CERTIFICATION_CATEGORY_OPTIONS}
          value={category}
          onChange={(nextValue) => onCategoryChange(nextValue as CertificationCategoryValue)}
        />
      </div>
    </section>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-[700] text-[#5f6672]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className="rounded-full px-4 py-2 text-sm font-[800] transition-colors"
              style={{
                background: active ? "#ff6f0f" : "#f4f5f7",
                color: active ? "#ffffff" : "#5f6672",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
