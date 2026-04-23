from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

DAILY_ANALYSIS_LIMIT = 3


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, student_id, password, **extra_fields):
        if not student_id:
            raise ValueError("The given student_id must be set")

        user = self.model(student_id=student_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, student_id, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(student_id, password, **extra_fields)

    def create_superuser(self, student_id, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(student_id, password, **extra_fields)


class User(AbstractUser):
    CLASS_CHOICES = [
        ("A", "A반"),
        ("B", "B반"),
    ]
    GRADE_CHOICES = [
        ("1", "1학년"),
        ("2", "2학년"),
    ]

    username = None
    student_id = models.CharField("학번", max_length=20, unique=True)
    name = models.CharField("이름", max_length=50)
    class_group = models.CharField("반", max_length=1, choices=CLASS_CHOICES, blank=True, default="")
    grade = models.CharField("학년", max_length=1, choices=GRADE_CHOICES, default="2")
    github_url = models.URLField("GitHub 링크", blank=True, default="")
    desired_job_direction = models.CharField("희망 방향", max_length=120, blank=True, default="")
    desired_job_direction_other = models.CharField("기타 희망 방향", max_length=120, blank=True, default="")
    github_username = models.CharField("GitHub 아이디", max_length=100, blank=True, default="")
    github_profile_summary = models.TextField("GitHub 분석 요약", blank=True, default="")
    github_top_languages = models.TextField("GitHub 주요 언어", blank=True, default="")
    github_connected_at = models.DateTimeField("GitHub 연동 일시", null=True, blank=True)
    resume_file = models.FileField("이력서 파일", upload_to="resumes/", blank=True, null=True)
    resume_extracted_text = models.TextField("이력서 추출 텍스트", blank=True, default="")
    resume_analysis_summary = models.TextField("이력서 분석 요약", blank=True, default="")
    analysis_recommendation = models.TextField("학습 추천", blank=True, default="")
    profile_analyzed_at = models.DateTimeField("분석 일시", null=True, blank=True)
    ai_profile_summary = models.TextField("AI 프로필 요약", blank=True, default="")
    ai_profile_payload = models.JSONField("AI 프로필 구조화 데이터", blank=True, default=dict)
    ai_profile_error = models.TextField("AI 프로필 오류", blank=True, default="")
    daily_analysis_count = models.PositiveSmallIntegerField("일일 분석 횟수", default=0)
    daily_analysis_date = models.DateField("분석 횟수 기준일", null=True, blank=True)
    deletion_scheduled_at = models.DateTimeField("삭제 예정 일시", null=True, blank=True)
    expo_push_token = models.CharField("Expo 푸시 토큰", max_length=200, blank=True, default="")
    discord_id = models.CharField("디스코드 ID", max_length=20, blank=True, default="")
    profile_image = models.ImageField("프로필 사진", upload_to="profiles/", blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = "student_id"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return f"{self.student_id} {self.name}"

    def get_selected_job_direction(self):
        return self.desired_job_direction_other or self.desired_job_direction

    def mark_github_connected(self):
        self.github_connected_at = timezone.now()

    def mark_profile_analyzed(self):
        self.profile_analyzed_at = timezone.now()

    def get_today_analysis_count(self):
        today = timezone.localdate()
        if self.daily_analysis_date != today:
            return 0
        return self.daily_analysis_count

    def get_remaining_analysis_count(self):
        return max(0, DAILY_ANALYSIS_LIMIT - self.get_today_analysis_count())

    @property
    def profile_image_url(self):
        if self.profile_image:
            return self.profile_image.url
        return None

    def can_run_profile_analysis(self):
        return self.get_remaining_analysis_count() > 0

    def consume_profile_analysis(self):
        today = timezone.localdate()
        if self.daily_analysis_date != today:
            self.daily_analysis_date = today
            self.daily_analysis_count = 0
        self.daily_analysis_count += 1
