from django.test import TestCase

# 체크인 관련 테스트
# - 체크인 성공
# - 범위 밖 체크인 실패
# - 비로그인 체크인 차단
# - 중복 체크인 방지
# - 지각 처리 (기준 시간 초과)
