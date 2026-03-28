/** 예시 액션 파일  */
import { dbFetch } from "@/lib/api-client";
import { Methods } from "@/constants/enums";

export async function getMenu() {
  try {
    // 1. 공통 도구(dbFetch)를 사용하여 Django의 /api/menu/ 엔드포인트 호출
    const data = await dbFetch("/menu", {
      method: Methods.GET,
      // 캐시 설정: 1시간 동안 데이터를 캐싱하여 성능 최적화 (선택 사항)
      next: { revalidate: 3600 }, 
    });
    return data;
  } catch (error) {
    console.error("메뉴 데이터를 가져오는 중 오류 발생:", error);
    throw error; 
  }
}