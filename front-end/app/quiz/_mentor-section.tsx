"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { buttonBaseStyle, codeBlockStyle, heroCardStyle, inputStyle, sectionCardStyle, sectionSubtitleStyle, sectionTitleStyle, textareaStyle, QUIZ_PALETTE, markdownClassName } from "./_styles";
import "./_markdown.css";

export type MentorQuizAuthor = {
  id: number;
  name: string;
  student_id: string;
  grade: string;
  class_group: string;
};

export type MentorQuiz = {
  id: number;
  title: string;
  code_snippet: string;
  question: string;
  answer: string;
  scheduled_date: string | null;
  created_at: string;
  created_by: MentorQuizAuthor;
  ai_trap_code: string;
  ai_trap_answer: string;
  source: "manual" | "github";
};

export type MentorWeekDay = {
  date: string;
  day_ko: string;
  quiz: MentorQuiz | null;
};

export type QuizListItem = {
  quiz: MentorQuiz;
  total: number;
  correct: number;
  ai_flagged: number;
  is_mine: boolean;
};

export type AdminAttempt = {
  id: number;
  submitted_answer: string;
  is_correct: boolean;
  is_ai_flagged: boolean;
  attempted_at: string;
  attempt_number: number | null;
  quiz: {
    id: number;
    title: string;
  };
};

export type AdminWeekCell = {
  date: string;
  status: "correct" | "wrong" | "ai" | "none" | "future";
  attempt_count: number;
};

export type AdminYearCell = {
  date: string;
  status: "correct" | "wrong" | "ai" | "none" | "future";
  count: number;
};

export type AdminDayGroup = {
  date: string;
  day_ko: string;
  attempts: AdminAttempt[];
};

export type FreshmanAdminRow = {
  user: MentorQuizAuthor;
  week_cells: AdminWeekCell[];
  year_cells: AdminYearCell[];
  week_attempts: AdminAttempt[];
  week_attempts_by_day: AdminDayGroup[];
  week_solved: number;
  week_correct: number;
};

export type QuizAdminData = {
  today: string;
  week_dates: { date: string; day_ko: string }[];
  year_dates: string[];
  month_labels: string[];
  freshman_data: FreshmanAdminRow[];
};

export type MentorQuizData = {
  today: string;
  week_start: string;
  week_end: string;
  week_offset: number;
  show_next_arrow: boolean;
  week_days: MentorWeekDay[];
  quiz_stats: QuizListItem[];
  admin_data: QuizAdminData;
};

type Props = {
  data: MentorQuizData | null;
  loading: boolean;
  error: string | null;
  weekOffset: number;
  onWeekOffsetChange: (nextOffset: number) => void;
  authFetch: (endpoint: string, options?: RequestInit) => Promise<unknown>;
  onRefresh: () => Promise<void>;
};

type FormState = {
  title: string;
  code_snippet: string;
  question: string;
  answer: string;
  ai_trap_code: string;
  ai_trap_answer: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  code_snippet: "",
  question: "",
  answer: "",
  ai_trap_code: "",
  ai_trap_answer: "",
};

const CODE_TEXTAREA_STYLE = {
  ...textareaStyle,
  minHeight: 112,
  resize: "none" as const,
  overflow: "hidden",
  background: "#1e1e2e",
  color: "#cdd6f4",
  borderColor: "#2a2a3a",
  fontFamily: "'Courier New', monospace",
  fontSize: 13,
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: AdminWeekCell["status"] | AdminYearCell["status"]) {
  switch (status) {
    case "correct":
      return { bg: "#e8f5e9", fg: QUIZ_PALETTE.successDeep, label: "정답" };
    case "wrong":
      return { bg: "#fff1ec", fg: "#c2410c", label: "오답" };
    case "ai":
      return { bg: QUIZ_PALETTE.warningSoft, fg: QUIZ_PALETTE.warningDeep, label: "AI 의심" };
    case "future":
      return { bg: "#f3f4f6", fg: QUIZ_PALETTE.muted, label: "예정" };
    default:
      return { bg: "#f3f4f6", fg: QUIZ_PALETTE.muted, label: "미제출" };
  }
}

export function MentorSection({
  data,
  loading,
  error,
  weekOffset,
  onWeekOffsetChange,
  authFetch,
  onRefresh,
}: Props) {
  const [activeTab, setActiveTab] = useState<"list" | "admin">("list");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "github">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openStudentId, setOpenStudentId] = useState<number | null>(null);
  const [trapOpen, setTrapOpen] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const codeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const trapCodeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const backdropMouseDownRef = useRef(false);

  const autoResize = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const resizeCodeTextareas = () => {
    window.requestAnimationFrame(() => {
      autoResize(codeTextareaRef.current);
      autoResize(trapCodeTextareaRef.current);
    });
  };

  const handleCodeTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${textarea.value.slice(0, start)}    ${textarea.value.slice(end)}`;

    handleFormChange(
      textarea.name as "code_snippet" | "ai_trap_code",
      nextValue,
    );

    window.requestAnimationFrame(() => {
      const target = textarea.name === "code_snippet" ? codeTextareaRef.current : trapCodeTextareaRef.current;
      if (!target) return;
      target.selectionStart = start + 4;
      target.selectionEnd = start + 4;
      resizeCodeTextareas();
    });
  };

  useEffect(() => {
    if (!data?.week_days.length) return;
    const hasSelected = selectedDate && data.week_days.some((day) => day.date === selectedDate);
    if (!hasSelected && selectedDate) {
      setSelectedDate(null);
    }
  }, [data, selectedDate]);

  useEffect(() => {
    if (modalOpen) return;
    setSelectedDate(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormMessage(null);
    setTrapOpen(false);
  }, [modalOpen]);

  const selectedDay = data?.week_days.find((day) => day.date === selectedDate) ?? null;
  const selectedListItem = selectedDay?.quiz
    ? data?.quiz_stats.find((item) => item.quiz.id === selectedDay.quiz?.id) ?? null
    : null;
  const selectedIsPast = selectedDay ? selectedDay.date < (data?.today ?? "") : false;
  const selectedEditable = Boolean(selectedDay) && Boolean(selectedDay?.quiz) && !selectedIsPast && Boolean(selectedListItem?.is_mine);
  const canCreate = Boolean(selectedDay) && !selectedDay?.quiz && !selectedIsPast;

  const fieldLabelStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: QUIZ_PALETTE.ink,
  } as const;

  const fieldHintStyle = {
    fontSize: 12,
    fontWeight: 500,
    color: QUIZ_PALETTE.muted,
  } as const;

  const listCodeBlockStyle = {
    ...codeBlockStyle,
    padding: "14px 16px",
    borderRadius: 16,
    fontSize: 12,
    lineHeight: 1.6,
  } as const;

  useEffect(() => {
    setFormError(null);
    setFormMessage(null);
    setTrapOpen(false);
    if (!selectedDay?.quiz) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      title: selectedDay.quiz.title,
      code_snippet: selectedDay.quiz.code_snippet,
      question: selectedDay.quiz.question,
      answer: selectedDay.quiz.answer,
      ai_trap_code: selectedDay.quiz.ai_trap_code,
      ai_trap_answer: selectedDay.quiz.ai_trap_answer,
    });
  }, [selectedDay?.date, selectedDay?.quiz?.id]);

  useEffect(() => {
    resizeCodeTextareas();
  }, [form.code_snippet, form.ai_trap_code, selectedDay?.date]);

  useEffect(() => {
    if (!modalOpen || !selectedDay || !detailPanelRef.current) return;

    gsap.fromTo(
      detailPanelRef.current,
      { opacity: 0, y: 18, scale: 0.985 },
      { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "power2.out" },
    );
  }, [modalOpen, selectedDay?.date]);

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDay) return;

    setSaving(true);
    setFormError(null);
    setFormMessage(null);

    try {
      const body = {
        ...form,
        scheduled_date: selectedDay.date,
      };
      if (selectedDay.quiz && selectedEditable) {
        await authFetch(`/quiz/${selectedDay.quiz.id}/edit/`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        setFormMessage("문제를 수정했습니다.");
      } else {
        await authFetch("/quiz/create/", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setFormMessage("문제를 등록했습니다.");
      }
      await onRefresh();
      setModalOpen(false);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "문제를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDay?.quiz || !selectedEditable || !window.confirm("이 문제를 삭제할까요?")) return;

    setDeleting(true);
    setFormError(null);
    setFormMessage(null);

    try {
      await authFetch(`/quiz/${selectedDay.quiz.id}/delete/`, { method: "POST" });
      setSelectedDate(selectedDay.date);
      setForm(EMPTY_FORM);
      setFormMessage("문제를 삭제했습니다.");
      await onRefresh();
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : "문제를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Hero 섹션 */}
      <section style={heroCardStyle}>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                background: QUIZ_PALETTE.brandSoft,
                color: QUIZ_PALETTE.brandText,
                fontSize: 12,
                fontWeight: 800,
              }}>
                <CalendarDays size={14} />
                TODAY CODE
              </span>
              <h1 style={{ ...sectionTitleStyle, marginTop: 16 }}>출제자 모드 — 날짜별 문제를 관리합니다.</h1>
              <p style={sectionSubtitleStyle}>
                2학년은 문제를 출제·수정·삭제할 수 있습니다.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowAnswers((current) => !current)}
                style={{
                  ...buttonBaseStyle,
                  border: `1px solid ${showAnswers ? QUIZ_PALETTE.brandSoftStrong : QUIZ_PALETTE.line}`,
                  background: showAnswers ? QUIZ_PALETTE.brandSoft : QUIZ_PALETTE.surface,
                  color: showAnswers ? QUIZ_PALETTE.brandText : QUIZ_PALETTE.inkSoft,
                  cursor: "pointer",
                }}
              >
                {showAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
                {showAnswers ? "답 숨기기" : "답 보기"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                style={{
                  ...buttonBaseStyle,
                  border: "none",
                  background: QUIZ_PALETTE.brand,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <Plus size={16} />
                새 문제 출제
              </button>
            </div>
          </div>

          {/* 탭 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              style={{
                ...buttonBaseStyle,
                border: "none",
                background: activeTab === "list" ? QUIZ_PALETTE.brand : QUIZ_PALETTE.surface,
                color: activeTab === "list" ? "#fff" : QUIZ_PALETTE.inkSoft,
              }}
            >
              문제 목록
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              style={{
                ...buttonBaseStyle,
                border: `1px solid ${activeTab === "admin" ? QUIZ_PALETTE.brandSoftStrong : QUIZ_PALETTE.line}`,
                background: activeTab === "admin" ? QUIZ_PALETTE.brandSoft : QUIZ_PALETTE.surface,
                color: activeTab === "admin" ? QUIZ_PALETTE.brandText : QUIZ_PALETTE.inkSoft,
              }}
            >
              관리자 현황
            </button>
          </div>
        </div>
      </section>

      {/* 로딩 / 에러 */}
      {loading ? (
        <section style={{ ...sectionCardStyle, padding: 28 }}>
          <p style={{ margin: 0, color: QUIZ_PALETTE.inkSoft }}>퀴즈 데이터를 불러오는 중입니다.</p>
        </section>
      ) : error ? (
        <section style={{ ...sectionCardStyle, padding: 28, borderColor: "#f6c8c8", background: "#fff8f8" }}>
          <p style={{ margin: 0, color: QUIZ_PALETTE.danger, lineHeight: 1.6 }}>퀴즈 데이터를 불러오지 못했습니다. {error}</p>
        </section>
      ) : activeTab === "list" ? (
        /* ── 문제 목록 탭 ── */
        <section style={{ ...sectionCardStyle, padding: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: QUIZ_PALETTE.ink }}>
              전체 문제 목록
            </h2>
            <p style={{ margin: "8px 0 0", color: QUIZ_PALETTE.inkSoft, fontSize: 14 }}>
              출제된 문제 목록입니다. 상세 관리는 "새 문제 출제" 버튼을 눌러 날짜를 선택하세요.
            </p>
          </div>

          {/* 출제 방식 필터 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["all", "manual", "github"] as const).map((f) => {
              const label = f === "all" ? "전체" : f === "manual" ? "기존 방식" : "MD 파일";
              const active = sourceFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setSourceFilter(f)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    border: `1px solid ${active ? QUIZ_PALETTE.brand : QUIZ_PALETTE.line}`,
                    background: active ? QUIZ_PALETTE.brand : QUIZ_PALETTE.surface,
                    color: active ? "#fff" : QUIZ_PALETTE.inkSoft,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {!data?.quiz_stats.length ? (
            <div style={{
              borderRadius: 18,
              padding: "28px 20px",
              background: QUIZ_PALETTE.sand,
              color: QUIZ_PALETTE.inkSoft,
              fontSize: 14,
              lineHeight: 1.7,
              textAlign: "center",
            }}>
              아직 출제한 문제가 없습니다. "새 문제 출제" 버튼을 눌러 첫 문제를 등록해보세요.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.quiz_stats.filter((item) => sourceFilter === "all" || item.quiz.source === sourceFilter).map((item) => (
                <article
                  key={item.quiz.id}
                  style={{
                    borderRadius: 20,
                    border: `1px solid ${item.quiz.scheduled_date === data.today ? QUIZ_PALETTE.brandSoftStrong : QUIZ_PALETTE.line}`,
                    background: item.quiz.scheduled_date === data.today ? "#fff8f1" : QUIZ_PALETTE.surface,
                    padding: 16,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", color: QUIZ_PALETTE.ink }}>
                          {item.quiz.title}
                        </h3>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          background: item.quiz.source === "github" ? "#e8f5e9" : QUIZ_PALETTE.brandSoft,
                          color: item.quiz.source === "github" ? "#2e7d32" : QUIZ_PALETTE.brandText,
                          border: `1px solid ${item.quiz.source === "github" ? "#c8e6c9" : QUIZ_PALETTE.brandSoftStrong}`,
                        }}>
                          {item.quiz.source === "github" ? "MD 파일" : "기존 방식"}
                        </span>
                      </div>
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: QUIZ_PALETTE.inkSoft }}>
                        {item.quiz.created_at ? formatDateTime(item.quiz.created_at) : "-"} · {item.quiz.created_by.name}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 22,
                        padding: "0 7px",
                        borderRadius: 9,
                        border: `1px solid ${item.quiz.scheduled_date === data.today ? "#ffd7bf" : "#f0d7c3"}`,
                        background: item.quiz.scheduled_date === data.today ? "#fff1e8" : "#fff7f1",
                        color: item.quiz.scheduled_date === data.today ? QUIZ_PALETTE.brandText : "#c76a1a",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}>
                        {item.quiz.scheduled_date === data.today
                          ? "오늘"
                          : item.quiz.scheduled_date && item.quiz.scheduled_date > data.today
                            ? `${formatDate(item.quiz.scheduled_date)} 예정`
                            : item.quiz.scheduled_date
                              ? formatDate(item.quiz.scheduled_date)
                              : "날짜 없음"}
                      </span>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 22,
                        padding: "0 7px",
                        borderRadius: 9,
                        border: "1px solid #f0d7c3",
                        background: "#fff7f1",
                        color: "#c76a1a",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}>
                        응시 {item.total} / 정답 {item.correct}
                      </span>
                      {item.ai_flagged ? (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 22,
                          padding: "0 7px",
                          borderRadius: 9,
                          border: "1px solid #f3d6b3",
                          background: "#fff3e6",
                          color: QUIZ_PALETTE.warningDeep,
                          fontSize: 11,
                          fontWeight: 700,
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                        }}>
                          AI {item.ai_flagged}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {item.quiz.code_snippet ? <pre style={listCodeBlockStyle}>{item.quiz.code_snippet}</pre> : null}
                  {item.quiz.source === "github" ? (
                    <div className={markdownClassName}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.quiz.question}</ReactMarkdown>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: QUIZ_PALETTE.inkSoft, lineHeight: 1.65 }}>{item.quiz.question}</p>
                  )}
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontSize: 12, color: QUIZ_PALETTE.brandText, fontWeight: 800 }}>정답</div>
                    {showAnswers ? (
                      <>
                        <div style={{ fontSize: 15, fontWeight: 700, color: QUIZ_PALETTE.ink }}>{item.quiz.answer}</div>
                        {item.quiz.ai_trap_code ? (
                          <div style={{ fontSize: 13, color: QUIZ_PALETTE.inkSoft, lineHeight: 1.6 }}>
                            AI 함정 정답 <strong style={{ color: QUIZ_PALETTE.ink }}>{item.quiz.ai_trap_answer}</strong>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: QUIZ_PALETTE.muted, lineHeight: 1.5 }}>
                        답 보기를 눌러 정답을 확인할 수 있습니다.
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        /* ── 관리자 현황 탭 ── */
        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ ...sectionCardStyle, padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: QUIZ_PALETTE.ink }}>
                이번 주 참여 현황
              </h2>
              <p style={{ margin: "8px 0 0", color: QUIZ_PALETTE.inkSoft, fontSize: 14 }}>
                1학년 학생들의 이번 주 퀴즈 제출 현황입니다.
              </p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0 0 14px", fontSize: 12, color: QUIZ_PALETTE.muted }}>학생</th>
                    {data?.admin_data.week_dates.map((weekDate) => (
                      <th key={weekDate.date} style={{ padding: "0 0 14px", fontSize: 12, color: QUIZ_PALETTE.muted }}>
                        {weekDate.day_ko}
                        <div style={{ marginTop: 4, fontWeight: 400 }}>{formatDate(weekDate.date)}</div>
                      </th>
                    ))}
                    <th style={{ padding: "0 0 14px", fontSize: 12, color: QUIZ_PALETTE.muted }}>이번 주</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.admin_data.freshman_data.map((student) => (
                    <tr key={student.user.id}>
                      <td style={{ padding: "12px 0", borderTop: `1px solid ${QUIZ_PALETTE.lineSoft}` }}>
                        <div style={{ fontWeight: 700, color: QUIZ_PALETTE.ink }}>{student.user.name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: QUIZ_PALETTE.muted }}>{student.user.student_id}</div>
                      </td>
                      {student.week_cells.map((cell) => {
                        const tone = statusTone(cell.status);
                        return (
                          <td key={cell.date} style={{ padding: "12px 0", borderTop: `1px solid ${QUIZ_PALETTE.lineSoft}`, textAlign: "center" }}>
                            <span
                              title={`${formatDate(cell.date)} ${tone.label}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 28,
                                height: 28,
                                borderRadius: 999,
                                background: tone.bg,
                                color: tone.fg,
                                fontSize: 13,
                                fontWeight: 800,
                              }}
                            >
                              {cell.status === "none" || cell.status === "future" ? "─" : cell.status === "wrong" ? "△" : "○"}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: "12px 0", borderTop: `1px solid ${QUIZ_PALETTE.lineSoft}`, textAlign: "center", color: QUIZ_PALETTE.inkSoft, fontWeight: 700 }}>
                        {student.week_solved}/7
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ ...sectionCardStyle, padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: QUIZ_PALETTE.ink }}>
                학생별 제출 내역
              </h2>
              <p style={{ margin: "8px 0 0", color: QUIZ_PALETTE.inkSoft, fontSize: 14 }}>
                학생별 이번 주 제출 기록을 확인할 수 있습니다.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {data?.admin_data.freshman_data.map((student) => {
                const isOpen = openStudentId === student.user.id;
                return (
                  <article
                    key={student.user.id}
                    style={{
                      borderRadius: 22,
                      border: `1px solid ${QUIZ_PALETTE.line}`,
                      background: QUIZ_PALETTE.surface,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenStudentId((current) => (current === student.user.id ? null : student.user.id))}
                      style={{
                        width: "100%",
                        padding: "18px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        background: isOpen ? QUIZ_PALETTE.surfaceTint : QUIZ_PALETTE.surface,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: QUIZ_PALETTE.ink }}>{student.user.name}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: QUIZ_PALETTE.inkSoft }}>
                          {student.user.student_id} · 이번 주 {student.week_solved}일 참여 / {student.week_correct}일 정답
                        </div>
                      </div>
                      <span style={{
                        color: QUIZ_PALETTE.muted,
                        fontSize: 18,
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 160ms ease",
                        display: "inline-block",
                      }}>
                        ▾
                      </span>
                    </button>

                    {isOpen ? (
                      <div style={{ padding: 20, display: "grid", gap: 18, borderTop: `1px solid ${QUIZ_PALETTE.lineSoft}` }}>
                        <div style={{ overflowX: "auto" }}>
                          <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: 17, gap: 0, marginBottom: 6 }}>
                            {data.admin_data.month_labels.map((label, index) => (
                              <div key={`${student.user.id}-${index}`} style={{ fontSize: 10, color: QUIZ_PALETTE.muted }}>
                                {label}
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "grid", gridTemplateRows: "repeat(7, 14px)", gridAutoFlow: "column", gridAutoColumns: 14, gap: 3 }}>
                            {student.year_cells.map((cell) => {
                              const tone = statusTone(cell.status);
                              return (
                                <div
                                  key={cell.date}
                                  title={`${cell.date} ${tone.label}${cell.count ? ` ${cell.count}회` : ""}`}
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: 3,
                                    background: tone.bg,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: 10 }}>
                          {student.week_attempts_by_day.length ? (
                            student.week_attempts_by_day.map((dayGroup) => (
                              <div
                                key={`${student.user.id}-${dayGroup.date}`}
                                style={{
                                  borderRadius: 18,
                                  border: `1px solid ${dayGroup.date === data.admin_data.today ? QUIZ_PALETTE.brandSoftStrong : QUIZ_PALETTE.line}`,
                                  overflow: "hidden",
                                }}
                              >
                                <div style={{
                                  padding: "10px 14px",
                                  background: dayGroup.date === data.admin_data.today ? QUIZ_PALETTE.surfaceTint : "#fafafa",
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: dayGroup.date === data.admin_data.today ? QUIZ_PALETTE.brandText : QUIZ_PALETTE.ink,
                                }}>
                                  {dayGroup.day_ko}요일 {formatDate(dayGroup.date)} · {dayGroup.attempts.length}회
                                </div>
                                <div style={{ padding: 14, display: "grid", gap: 8 }}>
                                  {dayGroup.attempts.map((attempt) => (
                                    <div
                                      key={attempt.id}
                                      style={{
                                        borderRadius: 16,
                                        background: "#fafafa",
                                        border: `1px solid ${QUIZ_PALETTE.lineSoft}`,
                                        padding: "12px 14px",
                                        display: "grid",
                                        gap: 8,
                                      }}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: QUIZ_PALETTE.ink }}>
                                          {attempt.quiz.title}
                                        </div>
                                        <div style={{ fontSize: 12, color: QUIZ_PALETTE.muted }}>
                                          {attempt.attempt_number}차 · {formatDateTime(attempt.attempted_at)}
                                        </div>
                                      </div>
                                      <div style={{ fontSize: 13, color: QUIZ_PALETTE.inkSoft }}>
                                        제출 답안 <strong style={{ color: QUIZ_PALETTE.ink }}>{attempt.submitted_answer}</strong>
                                      </div>
                                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          padding: "6px 10px",
                                          borderRadius: 999,
                                          background: attempt.is_correct ? "#e8f5e9" : "#fff1ec",
                                          color: attempt.is_correct ? QUIZ_PALETTE.successDeep : "#c2410c",
                                          fontSize: 12,
                                          fontWeight: 800,
                                        }}>
                                          {attempt.is_correct ? "정답" : "오답"}
                                        </span>
                                        {attempt.is_ai_flagged ? (
                                          <span style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            padding: "6px 10px",
                                            borderRadius: 999,
                                            background: QUIZ_PALETTE.warningSoft,
                                            color: QUIZ_PALETTE.warningDeep,
                                            fontSize: 12,
                                            fontWeight: 800,
                                          }}>
                                            AI 의심
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{
                              borderRadius: 16,
                              padding: "16px 18px",
                              background: QUIZ_PALETTE.sand,
                              color: QUIZ_PALETTE.inkSoft,
                              fontSize: 14,
                            }}>
                              이번 주 제출한 답변이 없습니다.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ── 문제 관리 모달 ── */}
      {modalOpen && (
        <div
          onMouseDown={(e) => {
            backdropMouseDownRef.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (backdropMouseDownRef.current && e.target === e.currentTarget) {
              setModalOpen(false);
            }
            backdropMouseDownRef.current = false;
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 200,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 20px",
            overflowY: "auto",
          }}
        >
          <div style={{
            background: "#fff",
            borderRadius: 20,
            width: "100%",
            maxWidth: 760,
            padding: 32,
            margin: "auto",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
            {/* 모달 헤더 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", color: QUIZ_PALETTE.ink }}>
                문제 관리{" "}
                <span style={{ fontSize: 14, fontWeight: 500, color: QUIZ_PALETTE.inkSoft }}>
                  {data?.week_start} – {data?.week_end}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: QUIZ_PALETTE.muted,
                  lineHeight: 1,
                  padding: "0 4px",
                }}
              >
                ✕
              </button>
            </div>

            {/* 주간 네비게이션 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => onWeekOffsetChange(0)}
                disabled={loading || weekOffset === 0}
                style={{
                  ...buttonBaseStyle,
                  border: `1px solid ${weekOffset === 0 ? QUIZ_PALETTE.brandSoftStrong : QUIZ_PALETTE.line}`,
                  background: weekOffset === 0 ? QUIZ_PALETTE.brandSoft : QUIZ_PALETTE.surface,
                  color: weekOffset === 0 ? QUIZ_PALETTE.brandText : QUIZ_PALETTE.inkSoft,
                  cursor: loading || weekOffset === 0 ? "default" : "pointer",
                }}
              >
                <ChevronLeft size={16} />
                이번 주
              </button>
              <button
                type="button"
                onClick={() => onWeekOffsetChange(1)}
                disabled={loading || !data?.show_next_arrow || weekOffset === 1}
                style={{
                  ...buttonBaseStyle,
                  border: `1px solid ${weekOffset === 1 ? QUIZ_PALETTE.brandSoftStrong : QUIZ_PALETTE.line}`,
                  background: weekOffset === 1 ? QUIZ_PALETTE.brandSoft : QUIZ_PALETTE.surface,
                  color: weekOffset === 1 ? QUIZ_PALETTE.brandText : QUIZ_PALETTE.inkSoft,
                  cursor: loading || !data?.show_next_arrow || weekOffset === 1 ? "default" : "pointer",
                }}
              >
                다음 주
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 7일 카드 그리드 */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))",
              gap: 10,
              marginBottom: 24,
            }}>
              {data?.week_days.map((day) => {
                const isSelected = day.date === selectedDate;
                const isPast = day.date < (data.today ?? "");
                const isFutureEmpty = !day.quiz && !isPast;
                const isToday = day.date === data.today;

                let cardBorder = `1px solid ${QUIZ_PALETTE.line}`;
                let cardBg: string = QUIZ_PALETTE.surface;
                let cardOpacity: number | undefined = undefined;
                let cardPointerEvents: "none" | undefined = undefined;
                let cardCursor: string = "pointer";
                let cardBoxShadow: string | undefined = undefined;

                if (isPast && !day.quiz) {
                  cardOpacity = 0.45;
                  cardPointerEvents = "none";
                  cardCursor = "default";
                } else if (day.quiz) {
                  cardBg = "#f0fdf4";
                  cardBorder = "1px solid #86efac";
                } else if (isFutureEmpty) {
                  cardBorder = `1px solid ${QUIZ_PALETTE.line}`;
                }

                if (isSelected) {
                  cardBorder = `2px solid ${QUIZ_PALETTE.brand}`;
                }

                if (isToday) {
                  cardBoxShadow = `0 0 0 2px ${QUIZ_PALETTE.brand}`;
                }

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    style={{
                      border: cardBorder,
                      borderRadius: 12,
                      padding: "10px 6px",
                      textAlign: "center",
                      minHeight: 84,
                      cursor: cardCursor,
                      background: cardBg,
                      opacity: cardOpacity,
                      pointerEvents: cardPointerEvents,
                      boxShadow: cardBoxShadow,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, color: isSelected ? QUIZ_PALETTE.brandText : QUIZ_PALETTE.muted }}>
                      {day.day_ko}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: QUIZ_PALETTE.ink }}>
                      {formatDate(day.date)}
                    </div>
                    {day.quiz ? (
                      <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, marginTop: 2 }}>
                        문제 있음
                      </div>
                    ) : !isPast ? (
                      <div style={{ fontSize: 11, color: QUIZ_PALETTE.muted, marginTop: 2 }}>
                        비어있음
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* 선택된 날짜 폼 */}
            {!selectedDay ? (
              <p style={{ margin: 0, color: QUIZ_PALETTE.inkSoft }}>날짜를 선택하세요.</p>
            ) : (
              <div
                ref={detailPanelRef}
                style={{
                border: `2px solid ${QUIZ_PALETTE.brand}`,
                borderRadius: 16,
                padding: 24,
                display: "grid",
                gap: 20,
              }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em", color: QUIZ_PALETTE.ink }}>
                      {selectedDay.day_ko}요일 {formatDate(selectedDay.date)}
                    </h3>
                    <p style={{ margin: "6px 0 0", color: QUIZ_PALETTE.inkSoft, fontSize: 13 }}>
                      {selectedDay.quiz
                        ? selectedEditable
                          ? "현재 문제를 수정할 수 있습니다."
                          : "이 문제는 읽기 전용으로 확인됩니다."
                        : canCreate
                          ? "이 날짜에 새 문제를 등록합니다."
                          : "지난 날짜에는 새 문제를 추가할 수 없습니다."}
                    </p>
                  </div>
                  {selectedDay.quiz ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {selectedListItem?.ai_flagged ? (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "7px 10px",
                          borderRadius: 999,
                          background: QUIZ_PALETTE.warningSoft,
                          color: QUIZ_PALETTE.warningDeep,
                          fontSize: 12,
                          fontWeight: 800,
                        }}>
                          <ShieldAlert size={14} />
                          AI 의심 {selectedListItem.ai_flagged}
                        </span>
                      ) : null}
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: QUIZ_PALETTE.sand,
                        color: QUIZ_PALETTE.inkSoft,
                        fontSize: 12,
                        fontWeight: 800,
                      }}>
                        작성자 {selectedDay.quiz.created_by.name}
                      </span>
                    </div>
                  ) : null}
                </div>

                {selectedDay.quiz && !selectedEditable ? (
                  /* 읽기 전용 */
                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: QUIZ_PALETTE.sand,
                      color: QUIZ_PALETTE.inkSoft,
                      fontSize: 12,
                      fontWeight: 800,
                      width: "fit-content",
                    }}>
                      <Eye size={14} />
                      읽기 전용
                    </div>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: QUIZ_PALETTE.ink }}>
                        {selectedDay.quiz.title}
                      </div>
                      {selectedDay.quiz.code_snippet ? <pre style={codeBlockStyle}>{selectedDay.quiz.code_snippet}</pre> : null}
                      <p style={{ margin: 0, color: QUIZ_PALETTE.inkSoft, lineHeight: 1.8 }}>{selectedDay.quiz.question}</p>
                      <div style={{
                        borderRadius: 18,
                        background: QUIZ_PALETTE.surfaceTint,
                        border: `1px solid ${QUIZ_PALETTE.brandSoftStrong}`,
                        padding: "16px 18px",
                        display: "grid",
                        gap: 10,
                      }}>
                        <div style={{ fontSize: 12, color: QUIZ_PALETTE.brandText, fontWeight: 800 }}>정답</div>
                        {showAnswers ? (
                          <>
                            <div style={{ fontSize: 16, fontWeight: 700, color: QUIZ_PALETTE.ink }}>{selectedDay.quiz.answer}</div>
                            {selectedDay.quiz.ai_trap_code ? (
                              <div style={{ fontSize: 13, lineHeight: 1.7, color: QUIZ_PALETTE.inkSoft }}>
                                AI 함정 정답: <strong style={{ color: QUIZ_PALETTE.ink }}>{selectedDay.quiz.ai_trap_answer}</strong>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div style={{ fontSize: 13, color: QUIZ_PALETTE.muted, lineHeight: 1.7 }}>
                            상단의 답 보기 버튼을 눌러 정답을 확인할 수 있습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : canCreate || selectedEditable ? (
                  /* 등록 / 수정 폼 */
                  <form onSubmit={handleSave} style={{ display: "grid", gap: 16 }}>
                    <div style={{ display: "grid", gap: 14 }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <label style={fieldLabelStyle}>문제 제목</label>
                        <input
                          value={form.title}
                          onChange={(event) => handleFormChange("title", event.target.value)}
                          placeholder="예) range(5) 합계 구하기"
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <label style={fieldLabelStyle}>
                          화면에 보여줄 코드 <span style={fieldHintStyle}>(선택)</span>
                        </label>
                        <textarea
                          ref={codeTextareaRef}
                          name="code_snippet"
                          value={form.code_snippet}
                          onChange={(event) => {
                            handleFormChange("code_snippet", event.target.value);
                            resizeCodeTextareas();
                          }}
                          onKeyDown={handleCodeTextareaKeyDown}
                          placeholder={"sum = 0\nfor i in range(5):\n    sum += i\nprint(sum)"}
                          style={CODE_TEXTAREA_STYLE}
                        />
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <label style={fieldLabelStyle}>문제 설명</label>
                        <textarea
                          value={form.question}
                          onChange={(event) => handleFormChange("question", event.target.value)}
                          placeholder="출력 결과는?"
                          style={{ ...textareaStyle, minHeight: 132 }}
                        />
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <label style={fieldLabelStyle}>
                          정답 <span style={fieldHintStyle}>(복수는 쉼표 구분)</span>
                        </label>
                        <input
                          value={form.answer}
                          onChange={(event) => handleFormChange("answer", event.target.value)}
                          placeholder="10, 십"
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <details
                      open={trapOpen}
                      onToggle={(event) => setTrapOpen(event.currentTarget.open)}
                      style={{
                        border: "1px dashed #e2a96b",
                        borderRadius: 12,
                        padding: 14,
                        background: "#fff8f3",
                      }}
                    >
                      <summary style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: QUIZ_PALETTE.brand,
                        cursor: "pointer",
                        listStyle: "auto",
                      }}>
                        AI 감지 함정 설정 (선택)
                      </summary>
                      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: QUIZ_PALETTE.inkSoft }}>
                          복붙 시 AI가 받는 전체 코드를 따로 작성합니다. 화면엔 안 보이지만 복사하면 이 코드가 클립보드에 담깁니다.
                        </p>
                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={fieldLabelStyle}>
                            복붙 시 AI가 받는 코드 <span style={fieldHintStyle}>(전체 코드 작성)</span>
                          </label>
                          <textarea
                            ref={trapCodeTextareaRef}
                            name="ai_trap_code"
                            value={form.ai_trap_code}
                            onChange={(event) => {
                              handleFormChange("ai_trap_code", event.target.value);
                              resizeCodeTextareas();
                            }}
                            onKeyDown={handleCodeTextareaKeyDown}
                            placeholder={"sum = 0\nsum = 100\nfor i in range(5):\n    sum += i\nprint(sum)"}
                            style={CODE_TEXTAREA_STYLE}
                          />
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={fieldLabelStyle}>
                            AI가 낼 오답 <span style={fieldHintStyle}>(쉼표로 복수 가능)</span>
                          </label>
                          <input
                            value={form.ai_trap_answer}
                            onChange={(event) => handleFormChange("ai_trap_answer", event.target.value)}
                            placeholder="110, 백십"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </details>

                    {formError ? (
                      <p style={{ margin: 0, color: QUIZ_PALETTE.danger, fontSize: 13, lineHeight: 1.6 }}>{formError}</p>
                    ) : null}
                    {formMessage ? (
                      <p style={{ margin: 0, color: QUIZ_PALETTE.successDeep, fontSize: 13, lineHeight: 1.6 }}>{formMessage}</p>
                    ) : null}

                    <div style={{ display: "grid", gap: 10 }}>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          ...buttonBaseStyle,
                          width: "100%",
                          border: "none",
                          background: QUIZ_PALETTE.brand,
                          color: "#fff",
                          cursor: saving ? "default" : "pointer",
                        }}
                      >
                        {selectedEditable ? <Save size={16} /> : <Plus size={16} />}
                        {saving ? "저장 중" : selectedEditable ? "문제 저장하기" : "문제 등록하기"}
                      </button>
                      {selectedEditable ? (
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deleting}
                          style={{
                            ...buttonBaseStyle,
                            width: "100%",
                            border: `1px solid #f2c4c4`,
                            background: "#fff6f6",
                            color: QUIZ_PALETTE.danger,
                            cursor: deleting ? "default" : "pointer",
                          }}
                        >
                          <Trash2 size={16} />
                          {deleting ? "삭제 중" : "삭제"}
                        </button>
                      ) : null}
                    </div>
                  </form>
                ) : (
                  <div style={{
                    borderRadius: 18,
                    padding: "18px 20px",
                    background: QUIZ_PALETTE.sand,
                    color: QUIZ_PALETTE.inkSoft,
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}>
                    지난 날짜의 빈 슬롯은 새로 등록할 수 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
