# 개발 중 의문 & 답변 정리

1. Q. 요즘은 JWT보다 HttpOnly Cookie 아닌가? 둘의 차이가 뭔가?
   A. JWT는 프론트가 직접 토큰을 들고 다니는 방식, HttpOnly Cookie는 브라우저가 자동으로 관리해서 JS에서 접근 불가 → XSS 공격에 안전함

2. Q. NextAuth + JWT vs Django HttpOnly Cookie, 어떤 방식을 써야 하나?
   A. NextAuth가 세션을 관리하고, Django는 HttpOnly Cookie로 JWT를 내려주는 방식을 조합 → 프론트는 NextAuth로 세션 상태 관리, 백엔드 API 호출 시엔 쿠키가 자동으로 붙음

