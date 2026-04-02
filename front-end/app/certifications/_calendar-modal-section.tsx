"use client";

import { useEffect, useState } from "react";
import {
  getCertificationCalendarCandidates,
  type CertificationItem,
} from "@/constants/certifications";
import { inputStyle, modalCardStyle, modalOverlayStyle } from "./_styles";

type CertificationCalendarModalSectionProps = {
  item: CertificationItem | null;
  open: boolean;
  submitting: boolean;
  feedback: string;
  onClose: () => void;
  onSubmit: (payload: { targetDate: string; scheduleLabel: string }) => Promise<void>;
};

export function CertificationCalendarModalSection({
  item,
  open,
  submitting,
  feedback,
  onClose,
  onSubmit,
}: CertificationCalendarModalSectionProps) {
  const candidates = item ? getCertificationCalendarCandidates(item) : [];
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");

  useEffect(() => {
    if (!open || !candidates.length) {
      setSelectedDate("");
      setSelectedLabel("");
      return;
    }
    setSelectedDate(candidates[0].date);
    setSelectedLabel(candidates[0].label);
  }, [open, candidates]);

  if (!open || !item) return null;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div
        style={{ ...modalCardStyle, width: "min(640px, 100%)", maxHeight: "none" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#eceef2] px-6 py-5">
          <div>
            <p className="text-sm font-[700] text-[#c2560c]">오늘의 계획 추가</p>
            <h2 className="mt-1 text-[28px] font-[800] tracking-[-0.05em] text-[#212124]">{item.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dde2e8] bg-white text-lg font-bold text-[#57606a]"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <p className="text-sm leading-6 text-[#6b7280]">
            선택한 접수 시작일이나 시험일을 오늘의 계획에 바로 추가할 수 있습니다.
          </p>

          <label className="block text-sm font-[700] text-[#5f6672]">
            접수/시험 일정 선택
            <select
              value={selectedDate}
              onChange={(event) => {
                const option = candidates.find((candidate) => candidate.date === event.target.value);
                setSelectedDate(event.target.value);
                setSelectedLabel(option?.label || "");
              }}
              style={{ ...inputStyle, marginTop: 8 }}
              disabled={!candidates.length || submitting}
            >
              {candidates.map((candidate) => (
                <option key={`${candidate.date}-${candidate.label}`} value={candidate.date}>
                  {candidate.label} - {candidate.display}
                </option>
              ))}
            </select>
          </label>

          <p
            className="min-h-6 text-sm font-[700]"
            style={{
              color: feedback
                ? feedback.includes("실패") || feedback.includes("먼저")
                  ? "#dc2626"
                  : feedback.includes("추가")
                    ? "#166534"
                    : "#b45309"
                : "#6b7280",
            }}
          >
            {feedback || (!candidates.length ? "오늘 이후에 추가할 수 있는 접수/시험 일정이 없습니다." : "")}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#dde2e8] bg-white px-4 py-2 text-sm font-[700] text-[#57606a]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => onSubmit({ targetDate: selectedDate, scheduleLabel: selectedLabel })}
              disabled={!selectedDate || !candidates.length || submitting}
              className="rounded-full px-4 py-2 text-sm font-[700] text-white disabled:cursor-not-allowed disabled:bg-[#d6d9dd]"
              style={{ background: !selectedDate || !candidates.length || submitting ? "#d6d9dd" : "#ff6f0f" }}
            >
              {submitting ? "추가 중..." : "오늘의 계획에 추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
