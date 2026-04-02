/** 상수 정의 */

// 애플리케이션의 페이지 경로를 정의
export enum Routes {
ROOT = "/",
    ATTENDANCE = "/attendance",
    CERTIFICATIONS = "/certifications",
    PLANNER = "/planner",
    TIMETABLE = "/timetable",
    SEATS = "/seats",
    JOBS = "/jobs",
    CONTESTS = "/contests",
    QUIZ = "/quiz",
    BLOG = "/blog",
    USERS = "/users",
    MYPAGE = "/mypage",
    ADMIN = "/dashboard",
    AUTH = "/auth",
}

/*  애플리케이션의 페이지 이름을 정의 
    Routes.ADMIN + / + Pages.USERS → /admin/users
*/
export enum Pages {
    LOGIN = "login",
    REGISTER = "signup",
    EDIT = "edit",
    NEW = "new",
}

// 입력 필드의 유형을 정의
export enum InputTypes {
    TEXT = "text",
    EMAIL = "email",
    PASSWORD = "password",
    NUMBER = "number",
    DATE = "date",
    TIME = "time",
    DATE_TIME_LOCAL = "datetime-local",
    CHECKBOX = "checkbox",
    RADIO = "radio",
    SELECT = "select",
    TEXTAREA = "textarea",
    FILE = "file",
    IMAGE = "image",
    COLOR = "color",
    RANGE = "range",
    TEL = "tel",
    URL = "url",
    SEARCH = "search",
    MONTH = "month",
    WEEK = "week",
    HIDDEN = "hidden",
    MULTI_SELECT = "multi select",
}

// 인증 관련 메시지 정의
export enum AuthMessages {
    LOGIN_SUCCESS = "Login successfully",
    LOGIN_FAILED = "학번 또는 비밀번호가 올바르지 않습니다.",
    LOGOUT_SUCCESS = "Logout successfully",
    REGISTER_SUCCESS = "Register successfully",
    FORGET_PASSWORD_SUCCESS = "Forget password successfully",
    RESET_PASSWORD_SUCCESS = "Reset password successfully",
}

// 애플리케이션의 환경을 정의
export enum Environments {
    PROD = "production",
    DEV = "development",
}

// 사용자 역할을 정의
export enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN",
}

// API 서브 경로를 정의 (Routes와 조합하여 사용)
export enum ApiPaths {
    LOGIN = "/login/",
    LOGOUT = "/logout/",
    REFRESH = "/refresh/",
    ME = "/me/",
    PROFILE = "/profile/",
    PROFILE_GITHUB = "/profile/github/",
    PROFILE_RESUME = "/profile/resume/",
    GITHUB_CONNECT = "/profile/github/connect/",
    GITHUB_CALLBACK = "/profile/github/callback/",
    PROFILE_ANALYZE = "/profile/analyze/",
}

// API 메서드를 정의
export enum Methods{
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}

/* API 응답에 따른 상태를 정의 
    - 알림에 따른 디자인 틀 조건부 처리 편해짐
*/
export enum Responses {
    SUCCESS = "success",
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
}

// 출결 상태 옵션
export const ATTENDANCE_STATUS_OPTIONS = [
  { value: "present", label: "출석" },
  { value: "late",    label: "지각" },
  { value: "absent",  label: "결석" },
  { value: "leave",   label: "조퇴" },
] as const;
