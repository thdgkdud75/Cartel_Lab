"use client";

import React, { useState } from "react";
import {
  DASHBOARD_PALETTE,
  DASHBOARD_STATUS_COLOR,
} from "@/constants/colors";
import { ATTENDANCE_STATUS_OPTIONS, Routes } from "@/constants/enums";
import type { AttendanceWeekCell } from "@/types/attendance";
import type { User } from "@/types/user";

export type DashboardStudent = Pick<User, "name" | "student_id" | "class_group" | "grade"> & {
  week: AttendanceWeekCell[];
  todo_total: number;
  todo_done: number;
};
import { fieldStyle, primaryButtonStyle, secondaryButtonStyle, sectionCardStyle } from "./_styles";
import {
  normalizeStudentDetail,
  StudentDetailSheet,
  type RawStudentDetail,
  type StudentDetail,
} from "./_student-sheet";

const PALETTE = DASHBOARD_PALETTE;
const COLOR = DASHBOARD_STATUS_COLOR;

type AuthFetch = (url: string, options?: RequestInit) => Promise<any>;

export type EditableAttendanceCell = AttendanceWeekCell & { studentName: string };

type WeeklyAttendanceSectionProps = {
  loading: boolean;
  showAttendance: boolean;
  studentCount: number;
  today: string;
  weekStart: string;
  weekEnd: string;
  todayWeekday: number;
  students: DashboardStudent[];
  authFetch: AuthFetch;
  onRefresh: () => void;
  onDeleteAction: (action: "schedule" | "cancel" | "confirm", studentId: string, name?: string) => void;
};

function AttBadge({ cell, showTimes }: { cell: AttendanceWeekCell; showTimes: boolean }) {
  const c = COLOR[cell.color] ?? COLOR.gray;
  const hasTime = cell.check_in || cell.check_out;
  const badgeWidth = 88;
  const badgeHeight = 40;
  const isMuted = cell.color === "gray";

  const faceStyle: React.CSSProperties = {
    gridArea: "stack",
    display: "grid",
    placeItems: "center",
    padding: "6px 8px",
    borderRadius: 14,
    background: c.bg,
    border: `1px solid ${isMuted ? PALETTE.line : `${c.dot}3d`}`,
    boxShadow: isMuted ? "none" : "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
    letterSpacing: "-0.02em",
    color: c.text,
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
  };

  return (
    <span
      className={`attendance-badge ${showTimes ? "is-showing-times" : ""}`}
      style={{
        display: "inline-grid",
        gridTemplateAreas: "'stack'",
        borderRadius: 14,
        width: badgeWidth,
        height: badgeHeight,
      }}
    >
      <span
        className="attendance-badge-face attendance-badge-label"
        style={{ ...faceStyle, fontSize: 13, fontWeight: 800 }}
      >
        {cell.label}
      </span>
      <span
        className="attendance-badge-face attendance-badge-times"
        style={{
          ...faceStyle,
          fontSize: hasTime ? 10 : 13,
          fontWeight: hasTime ? 700 : 800,
          lineHeight: hasTime ? 1.15 : 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {hasTime ? (
          <span
            style={{
              display: "grid",
              gap: 2,
              justifyItems: "center",
              width: "100%",
            }}
          >
            <span>{`입 ${cell.check_in ?? "--:--"}`}</span>
            <span>{`퇴 ${cell.check_out ?? "--:--"}`}</span>
          </span>
        ) : (
          cell.label
        )}
      </span>
    </span>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total <= 0) {
    return <span style={{ fontSize: 13, color: PALETTE.faint }}>없음</span>;
  }

  const width = Math.round((done / total) * 100);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 7,
          minWidth: 70,
          borderRadius: 999,
          background: PALETTE.line,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: 999,
            background: PALETTE.success,
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: PALETTE.muted, whiteSpace: "nowrap" }}>
        {done}/{total}
      </span>
    </div>
  );
}

function StudentNameBadge({ name, classGroup }: { name: string; classGroup?: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 800, color: PALETTE.ink }}>{name}</span>
      {classGroup && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            background: PALETTE.brandSoft,
            color: PALETTE.brandText,
            padding: "4px 9px",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {classGroup}반
        </span>
      )}
    </div>
  );
}

function DetailLinkButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 8,
        border: "none",
        background: "transparent",
        padding: 0,
        fontSize: 12,
        fontWeight: 800,
        color: PALETTE.brandText,
        cursor: "pointer",
      }}
    >
      자세히 보기
    </button>
  );
}

function StudentActionButtons({
  onDetail,
  onDelete,
}: {
  onDetail: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={onDetail}
        style={{ ...secondaryButtonStyle, borderRadius: 10, padding: "8px 10px", fontSize: 12 }}
      >
        상세
      </button>
      <button
        onClick={onDelete}
        style={{
          borderRadius: 10,
          border: "1px solid #fca5a5",
          background: PALETTE.surface,
          color: PALETTE.danger,
          fontSize: 12,
          fontWeight: 800,
          padding: "8px 10px",
          cursor: "pointer",
        }}
      >
        삭제
      </button>
    </div>
  );
}

export function EditAttendanceModal({
  cell,
  onClose,
  onSave,
  onCancel,
}: {
  cell: EditableAttendanceCell;
  onClose: () => void;
  onSave: (date: string, status: string, ci: string, co: string) => void;
  onCancel?: (date: string) => void;
}) {
  const [status, setStatus] = useState(
    cell.status === "future" || cell.status === "none" ? "present" : cell.status,
  );
  const [ci, setCi] = useState(cell.check_in ?? "");
  const [co, setCo] = useState(cell.check_out ?? "");


  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(15, 23, 42, 0.32)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: PALETTE.surface,
          borderRadius: 22,
          border: `1px solid ${PALETTE.line}`,
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.brandText, marginBottom: 6 }}>
              출결 수정
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.03em", color: PALETTE.ink }}>
              {cell.studentName} · {cell.day}요일
            </div>
            <div style={{ fontSize: 13, color: PALETTE.muted, marginTop: 4 }}>{cell.date_str}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 20,
              color: PALETTE.muted,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: PALETTE.body }}>상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={fieldStyle}>
              {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: PALETTE.body }}>입실 시간</label>
            <input type="time" value={ci} onChange={(e) => setCi(e.target.value)} style={fieldStyle} />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: PALETTE.body }}>퇴실 시간</label>
            <input type="time" value={co} onChange={(e) => setCo(e.target.value)} style={fieldStyle} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              ...secondaryButtonStyle,
              flex: 1,
              borderRadius: 12,
              padding: "11px 14px",
            }}
          >
            닫기
          </button>
          {onCancel && cell.rec_id != null && (
            <button
              onClick={() => onCancel(cell.date_str)}
              style={{
                flex: 1,
                borderRadius: 12,
                padding: "11px 14px",
                border: "1px solid #fca5a5",
                background: PALETTE.surface,
                color: PALETTE.danger,
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              출결 취소
            </button>
          )}
          <button
            onClick={() => onSave(cell.date_str, status, ci, co)}
            style={{
              ...primaryButtonStyle,
              flex: 1,
              borderRadius: 12,
              padding: "11px 14px",
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export function WeeklyAttendanceSection({
  loading,
  showAttendance,
  studentCount,
  today,
  weekStart,
  weekEnd,
  todayWeekday,
  students,
  authFetch,
  onRefresh,
  onDeleteAction,
}: WeeklyAttendanceSectionProps) {
  const [showTimes, setShowTimes] = useState(false);
  const [editTarget, setEditTarget] = useState<EditableAttendanceCell | null>(null);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);

  async function handleOpenStudentDetail(studentId: string) {
    setDetailStudentId(studentId);
    setStudentDetailLoading(true);
    if (studentDetail?.student.student_id !== studentId) setStudentDetail(null);
    const detail = await authFetch(`${Routes.ADMIN}/api/student/${studentId}/detail/`).catch(() => null);
    setStudentDetail(detail ? normalizeStudentDetail(detail as RawStudentDetail) : null);
    setStudentDetailLoading(false);
  }

  function handleCloseStudentDetail() {
    setDetailStudentId(null);
    setStudentDetail(null);
    setStudentDetailLoading(false);
  }

  async function handleEditSave(dateStr: string, nextStatus: string, ci: string, co: string) {
    if (!editTarget) return;
    await authFetch(`${Routes.ADMIN}/api/edit-attendance/`, {
      method: "POST",
      body: JSON.stringify({
        name: editTarget.studentName,
        date: dateStr,
        status: nextStatus,
        check_in: ci,
        check_out: co,
      }),
    }).catch(() => null);
    setEditTarget(null);
    onRefresh();
  }

  async function handleCancelAttendance(dateStr: string) {
    if (!editTarget) return;
    if (!confirm(`${editTarget.studentName}의 ${dateStr} 출결을 취소하시겠습니까?`)) return;
    await authFetch(`${Routes.ADMIN}/api/cancel-attendance/`, {
      method: "POST",
      body: JSON.stringify({
        name: editTarget.studentName,
        date: dateStr,
      }),
    }).catch(() => null);
    setEditTarget(null);
    onRefresh();
  }

  async function handlePasswordChange(studentId: string, newPassword: string, newPasswordConfirm: string) {
    const result = await authFetch(`${Routes.ADMIN}/api/student/${studentId}/change-password/`, {
      method: "POST",
      body: JSON.stringify({
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    });
    return typeof result?.message === "string" && result.message.trim()
      ? result.message
      : "비밀번호를 변경했습니다.";
  }

  const weekCells = students[0]?.week ?? [];
  const tableColSpan = 4 + (showAttendance ? weekCells.length : 0);

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.brandText, marginBottom: 6 }}>
            MAIN TABLE
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: PALETTE.ink,
            }}
          >
            {showAttendance ? "주간 출결 현황" : "이번 주 운영 현황"}
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: PALETTE.muted }}>
            총 {studentCount}명 · 기준일 {today} · 주간 범위 {weekStart} - {weekEnd}
          </p>
        </div>

        {showAttendance && (
          <button
            onClick={() => setShowTimes((prev) => !prev)}
            style={{
              ...secondaryButtonStyle,
              background: showTimes ? PALETTE.ink : PALETTE.surface,
              borderColor: showTimes ? PALETTE.ink : PALETTE.line,
              color: showTimes ? "#fff" : PALETTE.body,
            }}
          >
            {showTimes ? "출결 시간 숨기기" : "출결 시간 보기"}
          </button>
        )}
      </div>

      <div style={{ ...sectionCardStyle, padding: 18 }}>
        <div className="hidden md:block">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: showAttendance ? 940 : 620, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "14px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      color: PALETTE.muted,
                      borderBottom: `1px solid ${PALETTE.line}`,
                      background: PALETTE.surfaceSubtle,
                      whiteSpace: "nowrap",
                    }}
                  >
                    이름
                  </th>
                  <th
                    style={{
                      padding: "14px 12px",
                      textAlign: "left",
                      fontSize: 12,
                      color: PALETTE.muted,
                      borderBottom: `1px solid ${PALETTE.line}`,
                      background: PALETTE.surfaceSubtle,
                      whiteSpace: "nowrap",
                    }}
                  >
                    학번
                  </th>
                  {showAttendance &&
                    weekCells.map((cell, index) => (
                      <th
                        key={cell.day}
                        style={{
                          padding: "14px 10px",
                          textAlign: "center",
                          fontSize: 12,
                          color: index === todayWeekday ? PALETTE.brandText : PALETTE.muted,
                          borderBottom: `1px solid ${PALETTE.line}`,
                          background: index === todayWeekday ? PALETTE.brandSoft : PALETTE.surfaceSubtle,
                          minWidth: 102,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cell.day}
                      </th>
                    ))}
                  <th
                    style={{
                      padding: "14px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      color: PALETTE.muted,
                      borderBottom: `1px solid ${PALETTE.line}`,
                      background: PALETTE.surfaceSubtle,
                    }}
                  >
                    오늘 할 일
                  </th>
                  <th
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${PALETTE.line}`,
                      background: PALETTE.surfaceSubtle,
                    }}
                  />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      style={{ padding: 40, textAlign: "center", color: PALETTE.muted }}
                    >
                      불러오는 중...
                    </td>
                  </tr>
                ) : studentCount === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      style={{ padding: 40, textAlign: "center", color: PALETTE.muted }}
                    >
                      학생 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.student_id} style={{ borderBottom: `1px solid ${PALETTE.lineSoft}` }}>
                      <td style={{ padding: "16px", verticalAlign: "middle" }}>
                        <StudentNameBadge name={student.name} classGroup={student.class_group} />
                        <DetailLinkButton onClick={() => handleOpenStudentDetail(student.student_id)} />
                      </td>
                      <td style={{ padding: "16px 12px", color: PALETTE.muted, fontSize: 13 }}>
                        {student.student_id}
                      </td>
                      {showAttendance &&
                        student.week.map((cell, index) => (
                          <td
                            key={`${student.student_id}-${cell.day}`}
                            style={{
                              padding: "16px 10px",
                              textAlign: "center",
                              background: index === todayWeekday ? "#fff9f5" : undefined,
                            }}
                          >
                            <span
                              onClick={cell.editable ? () => setEditTarget({ ...cell, studentName: student.name }) : undefined}
                              style={{ cursor: cell.editable ? "pointer" : "default" }}
                              title={cell.editable ? "클릭하여 수정" : undefined}
                            >
                              <AttBadge cell={cell} showTimes={showTimes} />
                            </span>
                          </td>
                        ))}
                      <td style={{ padding: "16px", minWidth: 160 }}>
                        <ProgressBar done={student.todo_done} total={student.todo_total} />
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        <StudentActionButtons
                          onDetail={() => handleOpenStudentDetail(student.student_id)}
                          onDelete={() => onDeleteAction("schedule", student.student_id, student.name)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: PALETTE.muted }}>불러오는 중...</div>
          ) : studentCount === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: PALETTE.muted }}>학생 데이터가 없습니다.</div>
          ) : (
            students.map((student) => (
              <article
                key={student.student_id}
                style={{
                  borderRadius: 18,
                  border: `1px solid ${PALETTE.line}`,
                  background: PALETTE.surface,
                  padding: 16,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <StudentNameBadge name={student.name} classGroup={student.class_group} />
                    <div style={{ marginTop: 4, fontSize: 13, color: PALETTE.muted }}>{student.student_id}</div>
                    <DetailLinkButton onClick={() => handleOpenStudentDetail(student.student_id)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <StudentActionButtons
                      onDetail={() => handleOpenStudentDetail(student.student_id)}
                      onDelete={() => onDeleteAction("schedule", student.student_id, student.name)}
                    />
                  </div>
                </div>

                {showAttendance && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {student.week.map((cell) => (
                      <div
                        key={`${student.student_id}-${cell.day}-mobile`}
                        style={{
                          minWidth: "calc(20% - 7px)",
                          flex: "1 1 calc(20% - 7px)",
                          borderRadius: 14,
                          background: PALETTE.surfaceSubtle,
                          padding: "10px 8px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, marginBottom: 8 }}>
                          {cell.day}
                        </div>
                        <span
                          onClick={cell.editable ? () => setEditTarget({ ...cell, studentName: student.name }) : undefined}
                          style={{ cursor: cell.editable ? "pointer" : "default" }}
                        >
                          <AttBadge cell={cell} showTimes={showTimes} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: `1px solid ${PALETTE.lineSoft}`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.muted, marginBottom: 8 }}>
                    오늘 할 일
                  </div>
                  <ProgressBar done={student.todo_done} total={student.todo_total} />
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {detailStudentId && (
        <StudentDetailSheet
          detail={studentDetail}
          loading={studentDetailLoading}
          onClose={handleCloseStudentDetail}
          onPasswordChange={handlePasswordChange}
          authFetch={authFetch}
        />
      )}

      {editTarget && (
        <EditAttendanceModal
          cell={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
          onCancel={handleCancelAttendance}
        />
      )}
    </section>
  );
}
