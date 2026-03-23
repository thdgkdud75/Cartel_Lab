from .settings import *  # noqa

# CI 환경에서 MySQL 없이 SQLite 메모리 DB로 테스트
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# 테스트 중 실제 파일 저장 방지
DEFAULT_FILE_STORAGE = "django.core.files.storage.InMemoryStorage"
