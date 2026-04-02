/** User 스키마 타입 정의 */

// Django MeView 응답 기준 전체 유저 정보
export interface User {
  id: number;
  name: string;
  student_id: string;
  is_staff: boolean;
  class_group: string;
  grade: number;
  profile_image: string | null;
}

// 로그인 응답 (LoginView) - 세션에 저장되는 최소 정보
export interface LoginResponse {
  id: number;
  name: string;
  image: string | null;
  is_staff: boolean;
  class_group: string;
  access_token: string;
  refresh_token: string;
}

// NextAuth authorize 반환 타입
export interface AuthUser {
  id: string;
  name: string;
  is_staff: boolean;
  class_group: string;
}

// 프로필 API 응답 (ProfileView)
export interface Profile {
  github_url: string;
  github_username: string;
  github_profile_summary: string;
  github_top_languages: string;
  resume_file: string | null;
  desired_job_direction: string;
  profile_analyzed_at: string | null;
  ai_profile_summary: string;
  ai_profile_payload: Record<string, unknown>;
  resume_analysis_summary: string;
  analysis_recommendation: string;
  remaining_analysis_count: number;
}

export type UserProfileSummary = Pick<User, "name" | "student_id" | "class_group" | "grade"> &
  Pick<Profile, "github_username" | "profile_analyzed_at"> & {
    has_resume: boolean;
  };

// 로그인 요청 바디
export interface LoginBody {
  student_id: string;
  password: string;
}
