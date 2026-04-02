"use client";

import { attendanceCardClassName } from "./_styles";

export type CurrentMember = {
  name: string;
  class_group: string;
  check_in_at: string | null;
  is_me: boolean;
};

type Props = {
  members: CurrentMember[];
  count: number;
};

export function MembersSection({ members, count }: Props) {
  return (
    <section className={`${attendanceCardClassName} p-3 sm:p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[18px] font-bold text-[#202124] sm:text-[22px]">다른 인원 출결 현황</h2>
        <div className="w-fit rounded-full bg-[#f3f4f6] px-4 py-2 text-sm font-bold text-[#202124]">{count}명</div>
      </div>

      <div className="mt-5 hidden sm:block">
        <div className="grid grid-cols-[minmax(0,1.4fr)_68px_84px_84px] gap-3 border-b border-[#e6eaf0] px-2 py-3 text-[13px] font-bold text-[#202124]">
          <span>이름</span>
          <span>상태</span>
          <span>체크인</span>
          <span>체크아웃</span>
        </div>

        {members.length ? members.map((member) => (
          <div
            key={`${member.name}-${member.check_in_at}`}
            className="grid grid-cols-[minmax(0,1.4fr)_68px_84px_84px] gap-3 border-b border-[#eef1f4] px-2 py-3 text-[13px] text-[#202124]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f0ff] text-xs font-bold text-[#2563eb]">
                {member.name.slice(0, 1)}
              </div>
              <span className="truncate font-medium">
                {member.name}
                {member.is_me ? <span className="ml-2 text-xs text-[#ff7a18]">나</span> : null}
              </span>
            </div>
            <div className="flex items-center">
              <span className="rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-bold text-[#1f9d63]">출석</span>
            </div>
            <div className="flex items-center">{member.check_in_at ?? "-"}</div>
            <div className="flex items-center">-</div>
          </div>
        )) : (
          <div className="px-2 py-10 text-center text-sm text-[#6b7280]">아직 체크인한 인원이 없습니다.</div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:hidden">
        {members.length ? members.map((member) => (
          <div key={`${member.name}-${member.check_in_at}`} className="rounded-2xl border border-[#eef1f4] bg-[#fafbfc] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f0ff] text-xs font-bold text-[#2563eb]">
                  {member.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#202124]">
                    {member.name}
                    {member.is_me ? <span className="ml-2 text-xs text-[#ff7a18]">나</span> : null}
                  </p>
                  <p className="mt-1 text-xs text-[#7a8594]">{member.class_group || "-"}반</p>
                </div>
              </div>
              <span className="rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-bold text-[#1f9d63]">출석</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[#8b949e]">체크인</p>
                <p className="mt-1 font-bold text-[#202124]">{member.check_in_at ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-[#8b949e]">체크아웃</p>
                <p className="mt-1 font-bold text-[#202124]">-</p>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-[#d7dbe2] px-4 py-10 text-center text-sm text-[#6b7280]">
            아직 체크인한 인원이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
