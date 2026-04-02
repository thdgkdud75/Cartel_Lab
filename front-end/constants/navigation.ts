import { Routes } from "./enums";

export const NAV_LINKS = [
  { href: Routes.ATTENDANCE, label: "출결관리" },
  { href: Routes.CERTIFICATIONS, label: "자격증 정보" },
  { href: Routes.PLANNER, label: "계획/목표" },
  { href: Routes.TIMETABLE, label: "시간표" },
  { href: Routes.SEATS, label: "좌석현황" },
  { href: Routes.JOBS, label: "최신일자리" },
  { href: Routes.CONTESTS, label: "공모전 정보" },
  { href: Routes.QUIZ, label: "Today Code" },
  { href: Routes.BLOG, label: "기술블로그" },
] as const;
