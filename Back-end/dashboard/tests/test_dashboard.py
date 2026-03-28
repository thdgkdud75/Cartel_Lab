from django.test import TestCase

# 대시보드 관련 테스트
# - 비로그인 시 대시보드 접근 차단
# - 일반 유저(is_staff=False) 접근 차단
# - staff 유저 정상 접근
# - 학생별 상세 페이지 접근 권한
