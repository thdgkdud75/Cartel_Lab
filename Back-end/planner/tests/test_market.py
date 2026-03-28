from django.test import TestCase

# 시장 분석 스냅샷 관련 테스트
# - 스냅샷 없을 때 동기 생성 확인
# - 12시 이전 접근 시 갱신 안 함
# - 12시 이후 접근 시 백그라운드 갱신 트리거 확인
