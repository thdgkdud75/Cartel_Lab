"""모든 농장 수치 상수. 운영 튜닝은 이 파일에서만."""

# 출석 보상
ATTENDANCE_BASE_EXP = 10
STAY_EXP_PER_30MIN = 1
STAY_EXP_CAP = 16  # 8시간
STREAK_MULTIPLIER_STEP = 0.02
STREAK_MULTIPLIER_CAP_DAYS = 30  # 최대 ×1.6

# 봉투
EGG_NORMAL_PRICE = 30
EGG_NORMAL_PROBS = {"N": 0.70, "R": 0.25, "SR": 0.045, "SSR": 0.005}
EGG_NORMAL_PITY_THRESHOLD = 50  # 50회 연속 N/R 후 SR 확정

# 일일 한도 (농장 단위)
DAILY_FEED_LIMIT = 30
DAILY_PET_LIMIT = 20

# 간식
FEED_COIN_COST = 2
FEED_EXP_GAIN = 5

# 쓰다듬기
PET_AFFECTION_GAIN = 1

# 농장 레벨 → display_slots (Lv는 인덱스+1)
FARM_LEVELS = [
    {"required_total_exp": 0, "display_slots": 5},
    {"required_total_exp": 600, "display_slots": 10},
    {"required_total_exp": 2000, "display_slots": 15},
]

# 닉네임
NICKNAME_MIN_LEN = 1
NICKNAME_MAX_LEN = 12
