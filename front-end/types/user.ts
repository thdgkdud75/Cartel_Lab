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
  is_staff: boolean;
  class_group: string;
}

// NextAuth authorize 반환 타입
export interface AuthUser {
  id: string;
  name: string;
  is_staff: boolean;
  class_group: string;
}

// 로그인 요청 바디
export interface LoginBody {
  student_id: string;
  password: string;
}
