export interface PlannerDailyTodoItem {
  id: number;
  content: string;
  planned_time: string | null;
  is_completed: boolean;
  color: string;
}

export interface PlannerCompletionSummary {
  total: number;
  completed: number;
  rate: number;
}

export type PlannerTodayTodoSummary = PlannerCompletionSummary;

export interface PlannerWeeklyGoalItem {
  id: number;
  weekday: number;
  weekday_label: string;
  content: string;
  planned_time: string | null;
  is_completed: boolean;
  color: string;
}

export type PlannerWeeklyGoalSummary = PlannerCompletionSummary;

export interface PlannerDailyGoalItem {
  date: string;
  weekday: string;
  content: string | null;
  has_goal: boolean;
  is_achieved: boolean;
}

export interface PlannerDailyGoalWeekSummary {
  week_start: string;
  week_end: string;
  total: number;
  achieved: number;
  rate: number;
  days: PlannerDailyGoalItem[];
}

export interface PlannerLabWideGoal {
  id: number;
  week_start: string;
  content: string;
  created_at: string;
  created_by_name: string;
}

export interface PlannerTodaySnapshot {
  date: string;
  todos: PlannerDailyTodoItem[];
  todo_summary: PlannerTodayTodoSummary;
}

export interface PlannerWeeklySnapshot {
  goals: PlannerWeeklyGoalItem[];
  goal_summary: PlannerWeeklyGoalSummary;
  daily_goals: PlannerDailyGoalWeekSummary;
  lab_wide_goals: PlannerLabWideGoal[];
}

export interface PlannerStudentSnapshot {
  today: PlannerTodaySnapshot;
  weekly: PlannerWeeklySnapshot;
}
