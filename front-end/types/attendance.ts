import type { DashboardStatusColorKey } from "@/constants/colors";

export interface AttendanceStatusBase {
  label: string;
  color: DashboardStatusColorKey;
  check_in: string | null;
  check_out: string | null;
}

export interface AttendanceWeekCell extends AttendanceStatusBase {
  day: string;
  date_str: string;
  status: string;
  editable: boolean;
  rec_id: number | null;
}

export interface DetailAttendanceRow extends AttendanceStatusBase {
  date: string;
  date_label: string;
  weekday_label: string;
}
