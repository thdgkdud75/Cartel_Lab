from django.conf import settings
from django.db import models


class Quiz(models.Model):
    title = models.CharField("제목", max_length=200)
    code_snippet = models.TextField("코드", blank=True, default="")
    question = models.TextField("문제 설명")
    answer = models.CharField("정답", max_length=500)
    scheduled_date = models.DateField(
        "출제 날짜", null=True, blank=True,
        help_text="1학년에게 공개할 날짜. 비워두면 저장 시 오늘 날짜로 설정됩니다.",
    )
    ai_trap_code = models.TextField(
        "AI 함정 코드 (숨김)", blank=True, default="",
        help_text="화면에 보이지 않지만 AI가 읽는 숨긴 코드. 정답이 달라지는 줄을 입력하세요.",
    )
    ai_trap_answer = models.CharField(
        "AI 함정 정답", max_length=500, blank=True, default="",
        help_text="AI가 숨긴 코드까지 읽었을 때 나오는 답. 제출 시 이 값과 일치하면 AI 사용 의심.",
    )
    SOURCE_MANUAL = "manual"
    SOURCE_GITHUB = "github"
    SOURCE_CHOICES = [
        (SOURCE_MANUAL, "기존 방식"),
        (SOURCE_GITHUB, "MD 파일"),
    ]
    source = models.CharField(
        "출제 방식", max_length=10, choices=SOURCE_CHOICES, default=SOURCE_MANUAL,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_quizzes",
        verbose_name="출제자",
    )
    created_at = models.DateTimeField("출제일시", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "퀴즈"
        verbose_name_plural = "퀴즈 목록"

    def __str__(self):
        return self.title


class QuizAttempt(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="attempts",
        verbose_name="퀴즈",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
        verbose_name="응시자",
    )
    submitted_answer = models.CharField("제출 답변", max_length=500)
    is_correct = models.BooleanField("정답 여부")
    is_ai_flagged = models.BooleanField("AI 사용 의심", default=False)
    attempted_at = models.DateTimeField("응시일시", auto_now_add=True)

    class Meta:
        ordering = ["-attempted_at"]
        verbose_name = "퀴즈 응시"
        verbose_name_plural = "퀴즈 응시 목록"

    def __str__(self):
        return f"{self.user} - {self.quiz} ({'정답' if self.is_correct else '오답'})"
