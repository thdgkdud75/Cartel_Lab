"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Copy, Send } from "lucide-react";
import { buttonBaseStyle, codeBlockStyle, heroCardStyle, inputStyle, sectionCardStyle, sectionSubtitleStyle, sectionTitleStyle, QUIZ_PALETTE } from "./_styles";

export type StudentQuizAuthor = {
  id: number;
  name: string;
  student_id: string;
  grade: string;
  class_group: string;
};

export type StudentQuizAttempt = {
  id: number;
  submitted_answer: string;
  is_correct: boolean;
  is_ai_flagged: boolean;
  attempted_at: string;
  attempt_number: number | null;
};

export type StudentTodayQuiz = {
  id: number;
  title: string;
  code_snippet: string;
  question: string;
  scheduled_date: string | null;
  created_at: string;
  created_by: StudentQuizAuthor;
  ai_trap_code?: string;
};

export type StudentQuizData = {
  today: string;
  today_quiz: StudentTodayQuiz | null;
  attempts: StudentQuizAttempt[];
  attempt_count: number;
  has_correct: boolean;
  max_attempts: number;
};

type Props = {
  data: StudentQuizData | null;
  loading: boolean;
  error: string | null;
  authFetch: (endpoint: string, options?: RequestInit) => Promise<unknown>;
  onRefresh: () => Promise<void>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StudentSection({ data, loading, error, authFetch, onRefresh }: Props) {
  const [answer, setAnswer] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const codeBlockRef = useRef<HTMLPreElement | null>(null);
  const copyHintTimerRef = useRef<number | null>(null);

  const todayQuiz = data?.today_quiz ?? null;
  const canSubmit = Boolean(todayQuiz) && !data?.has_correct && (data?.attempt_count ?? 0) < (data?.max_attempts ?? 0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!todayQuiz || !answer.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await authFetch(`/quiz/${todayQuiz.id}/submit/`, {
        method: "POST",
        body: JSON.stringify({ answer: answer.trim() }),
      });
      setAnswer("");
      await onRefresh();
    } catch (submitErr) {
      setSubmitError(submitErr instanceof Error ? submitErr.message : "답변을 제출하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!todayQuiz?.ai_trap_code || !codeBlockRef.current) {
      return undefined;
    }

    const trapCopy = (event: ClipboardEvent) => {
      const block = codeBlockRef.current;
      if (!block) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const container = selection.getRangeAt(0).commonAncestorContainer;
      const targetNode = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
      if (!targetNode || !(targetNode instanceof Node)) return;

      const inBlock = block === targetNode || block.contains(targetNode);
      if (!inBlock) return;

      event.preventDefault();
      event.clipboardData?.setData("text/plain", todayQuiz.ai_trap_code ?? "");

      if (copyHintTimerRef.current) {
        window.clearTimeout(copyHintTimerRef.current);
      }
      setCopyHint("복사된 코드가 갱신되었습니다.");
      copyHintTimerRef.current = window.setTimeout(() => {
        setCopyHint(null);
        copyHintTimerRef.current = null;
      }, 1800);
    };

    document.addEventListener("copy", trapCopy, true);
    document.addEventListener("copy", trapCopy, false);

    return () => {
      document.removeEventListener("copy", trapCopy, true);
      document.removeEventListener("copy", trapCopy, false);
      if (copyHintTimerRef.current) {
        window.clearTimeout(copyHintTimerRef.current);
        copyHintTimerRef.current = null;
      }
    };
  }, [todayQuiz?.ai_trap_code]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={heroCardStyle}>
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
              letterSpacing: "0.02em",
            }}>
              <Clock3 size={14} />
              TODAY CODE
            </span>
            <h1 style={{ ...sectionTitleStyle, marginTop: 16 }}>오늘의 문제를 확인하고 바로 답을 제출하세요.</h1>
            <p style={sectionSubtitleStyle}>
              1학년은 하루 한 문제를 확인합니다. 정답을 맞히면 즉시 종료되고, 최대 {data?.max_attempts ?? 3}번까지 시도할 수 있습니다.
            </p>
          </div>
          <div style={{ textAlign: "right", minWidth: 168 }}>
            <div style={{ fontSize: 13, color: QUIZ_PALETTE.muted, fontWeight: 700 }}>오늘 날짜</div>
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: QUIZ_PALETTE.ink }}>
              {data?.today ?? "-"}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section style={{ ...sectionCardStyle, padding: 28 }}>
          <p style={{ margin: 0, color: QUIZ_PALETTE.inkSoft }}>문제를 불러오는 중입니다.</p>
        </section>
      ) : error ? (
        <section style={{ ...sectionCardStyle, padding: 28, borderColor: "#f6c8c8", background: "#fff8f8" }}>
          <p style={{ margin: 0, color: QUIZ_PALETTE.danger, lineHeight: 1.6 }}>문제를 불러오지 못했습니다. {error}</p>
        </section>
      ) : !todayQuiz ? (
        <section style={{ ...sectionCardStyle, padding: 32 }}>
          <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
            <span style={{ fontSize: 32 }}>🎯</span>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: QUIZ_PALETTE.ink }}>
              오늘의 문제가 아직 없습니다.
            </h2>
            <p style={{ margin: 0, color: QUIZ_PALETTE.inkSoft, lineHeight: 1.7 }}>
              2학년이 문제를 등록하면 이 자리에 바로 노출됩니다.
            </p>
          </div>
        </section>
      ) : (
        <section style={{ ...sectionCardStyle, overflow: "hidden" }}>
          <div style={{ padding: "28px 28px 0", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: QUIZ_PALETTE.muted, fontWeight: 700 }}>출제자 {todayQuiz.created_by.name}</p>
                <h2 style={{ margin: "8px 0 0", fontSize: "clamp(26px, 3vw, 34px)", fontWeight: 800, letterSpacing: "-0.05em", color: QUIZ_PALETTE.ink }}>
                  {todayQuiz.title}
                </h2>
              </div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 999,
                background: QUIZ_PALETTE.sand,
                color: QUIZ_PALETTE.inkSoft,
                fontSize: 12,
                fontWeight: 700,
              }}>
                <Copy size={14} />
                코드 복사 방지 로직 포함
              </span>
            </div>
            <p style={{ margin: 0, color: QUIZ_PALETTE.inkSoft, lineHeight: 1.8 }}>
              {todayQuiz.question}
            </p>
          </div>

          {todayQuiz.code_snippet ? (
            <div style={{ padding: 28 }}>
              <pre ref={codeBlockRef} style={codeBlockStyle}>
                {todayQuiz.code_snippet}
              </pre>
              {copyHint ? (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: QUIZ_PALETTE.brandText }}>{copyHint}</p>
              ) : null}
            </div>
          ) : null}

          <div style={{ padding: "0 28px 28px", display: "grid", gap: 16 }}>
            {data?.attempts.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {data.attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    style={{
                      borderRadius: 18,
                      border: `1px solid ${attempt.is_correct ? "#d8eedb" : "#f2ddd2"}`,
                      background: attempt.is_correct ? "#f5fcf5" : "#fffaf6",
                      padding: "14px 16px",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: QUIZ_PALETTE.muted, fontWeight: 800 }}>
                          {attempt.attempt_number ?? 0}차 제출
                        </span>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: attempt.is_correct ? "#e8f5e9" : "#fef2f2",
                          color: attempt.is_correct ? QUIZ_PALETTE.successDeep : QUIZ_PALETTE.danger,
                          fontSize: 12,
                          fontWeight: 800,
                        }}>
                          {attempt.is_correct ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
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
                      <span style={{ fontSize: 12, color: QUIZ_PALETTE.muted }}>{formatDateTime(attempt.attempted_at)}</span>
                    </div>
                    <p style={{ margin: 0, color: QUIZ_PALETTE.inkSoft, lineHeight: 1.6 }}>
                      제출 답안 <strong style={{ color: QUIZ_PALETTE.ink }}>{attempt.submitted_answer}</strong>
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {canSubmit ? (
              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: QUIZ_PALETTE.ink }}>
                    답변 제출
                  </h3>
                  <span style={{ fontSize: 12, color: QUIZ_PALETTE.muted, fontWeight: 700 }}>
                    {data?.attempt_count ?? 0}/{data?.max_attempts ?? 3}회 사용
                  </span>
                </div>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="정답을 입력하세요"
                    style={inputStyle}
                    autoFocus={data?.attempts.length === 0}
                  />
                  <button
                    type="submit"
                    disabled={submitting || !answer.trim()}
                    style={{
                      ...buttonBaseStyle,
                      minWidth: 112,
                      border: "none",
                      background: submitting || !answer.trim() ? QUIZ_PALETTE.brandSoftStrong : QUIZ_PALETTE.brand,
                      color: "#fff",
                      cursor: submitting || !answer.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    <Send size={15} />
                    {submitting ? "제출 중" : "제출"}
                  </button>
                </div>
                {submitError ? (
                  <p style={{ margin: 0, color: QUIZ_PALETTE.danger, fontSize: 13, lineHeight: 1.6 }}>{submitError}</p>
                ) : null}
              </form>
            ) : (
              <div style={{
                borderRadius: 18,
                padding: "16px 18px",
                background: QUIZ_PALETTE.sand,
                color: QUIZ_PALETTE.inkSoft,
                fontSize: 14,
                lineHeight: 1.7,
              }}>
                {data?.has_correct
                  ? "이미 정답을 맞혔습니다. 오늘 문제는 여기까지입니다."
                  : `제출 기회를 모두 사용했습니다. (${data?.max_attempts ?? 3}/${data?.max_attempts ?? 3})`}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
