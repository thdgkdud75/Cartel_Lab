"use client";

import { DASHBOARD_PALETTE } from "@/constants/colors";
import type { User } from "@/types/user";
import { secondaryButtonStyle, sectionCardStyle } from "./_styles";

export type PendingUser = Pick<User, "name" | "student_id" | "class_group"> & {
  scheduled_at: string;
};

const PALETTE = DASHBOARD_PALETTE;

function getDday(scheduledAt: string) {
  const scheduled = new Date(`${scheduledAt}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((scheduled.getTime() - today.getTime()) / 86400000);

  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return "기한 초과";
}

export function PendingDeletionSection({
  users,
  onDeleteAction,
}: {
  users: PendingUser[];
  onDeleteAction: (action: "schedule" | "cancel" | "confirm", studentId: string, name?: string) => void;
}) {
  if (users.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4">
        <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.danger, marginBottom: 6 }}>
          PENDING DELETION
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
          삭제 예정 인원
        </h2>
      </div>

      <div
        style={{
          ...sectionCardStyle,
          borderColor: "#fecaca",
          background: PALETTE.dangerSoft,
          padding: 18,
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["이름", "학번", "반", "삭제 예정일", "D-day", ""].map((header) => (
                  <th
                    key={header || "actions"}
                    style={{
                      padding: "12px 14px",
                      textAlign: "left",
                      fontSize: 12,
                      color: "#991b1b",
                      borderBottom: "1px solid #fecaca",
                      background: "#fee2e2",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.student_id} style={{ borderBottom: "1px solid #fecaca" }}>
                  <td style={{ padding: "14px", fontWeight: 800, color: PALETTE.ink }}>{user.name}</td>
                  <td style={{ padding: "14px", color: PALETTE.body }}>{user.student_id}</td>
                  <td style={{ padding: "14px" }}>
                    {user.class_group ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          background: PALETTE.surface,
                          color: PALETTE.brandText,
                          padding: "4px 9px",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {user.class_group}반
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ padding: "14px", color: PALETTE.body }}>{user.scheduled_at}</td>
                  <td style={{ padding: "14px", color: PALETTE.danger, fontSize: 12, fontWeight: 800 }}>
                    {getDday(user.scheduled_at)}
                  </td>
                  <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => onDeleteAction("cancel", user.student_id)}
                      style={{
                        ...secondaryButtonStyle,
                        padding: "8px 10px",
                        borderRadius: 10,
                        marginRight: 6,
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={() => onDeleteAction("confirm", user.student_id, user.name)}
                      style={{
                        border: "none",
                        borderRadius: 10,
                        padding: "9px 11px",
                        fontSize: 12,
                        fontWeight: 800,
                        background: PALETTE.danger,
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      즉시 삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
