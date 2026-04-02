export const ATTENDANCE_STATUS_META = {
  present: { label: "출석", badgeClassName: "bg-emerald-100 text-emerald-700" },
  late: { label: "지각", badgeClassName: "bg-amber-100 text-amber-700" },
  leave: { label: "조퇴", badgeClassName: "bg-violet-100 text-violet-700" },
  absent: { label: "결석", badgeClassName: "bg-slate-200 text-slate-700" },
} as const;

export const HEATMAP_COLOR_BY_STATUS = {
  absent: "bg-[#eef1f4]",
  late: "bg-[#f6c453]",
  leave: "bg-[#ab8bff]",
  present: "bg-[#34c759]",
  none: "bg-[#eef1f4]",
} as const;
