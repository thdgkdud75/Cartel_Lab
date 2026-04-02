"use client";

import { Methods, Routes } from "@/constants/enums";
import { attendanceCardClassName } from "./_styles";

export type CheckoutRequestItem = {
  id: number;
  name: string;
  requested_time: string;
  attendance_date: string;
};

type Props = {
  requests: CheckoutRequestItem[];
  authFetch: (endpoint: string, options?: RequestInit) => Promise<unknown>;
  onRefresh: () => Promise<void>;
};

export function RequestsSection({ requests, authFetch, onRefresh }: Props) {
  if (!requests.length) {
    return null;
  }

  async function handleRequestAction(requestId: number, action: "approve" | "reject") {
    await authFetch(`${Routes.ATTENDANCE}/checkout-request/${requestId}/${action}/`, {
      method: Methods.POST,
    });
    await onRefresh();
  }

  return (
    <section className={`${attendanceCardClassName} rounded-[18px] p-5`}>
      <h2 className="text-[1.05rem] font-bold tracking-[-0.02em] text-[#111111]">🚪 퇴실 확인 요청</h2>

      <div className="mt-4 grid gap-3">
        {requests.map((request) => (
          <div key={request.id} className="flex flex-col gap-3 rounded-2xl border border-[#eceef2] bg-[#fafafb] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-[#202124]">{request.name}</p>
              <p className="mt-1 text-sm text-[#6b7280]">{request.attendance_date} · {request.requested_time}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                onClick={() => void handleRequestAction(request.id, "approve")}
                className="rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white"
              >
                승인
              </button>
              <button
                onClick={() => void handleRequestAction(request.id, "reject")}
                className="rounded-full border border-[#d7dbe2] px-4 py-2 text-sm font-semibold text-[#5f6368]"
              >
                반려
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
