"""
1학년 더미 유저 + 퀴즈 응시 데이터 생성
Usage:
    python manage.py seed_quiz_data
"""
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from quiz.models import Quiz, QuizAttempt

User = get_user_model()

FRESHMAN_NAMES = ["김민준", "이서연", "박지훈", "최예린", "정도윤", "강하은"]

SAMPLE_QUIZZES = [
    {
        "title": "range(5) 합계 구하기",
        "code_snippet": "sum = 0\nfor i in range(5):\n    sum += i\nprint(sum)",
        "question": "위 코드의 출력 결과는?",
        "answer": "10",
    },
    {
        "title": "리스트 길이",
        "code_snippet": "a = [1, 2, 3, 4, 5]\nprint(len(a))",
        "question": "출력 결과는?",
        "answer": "5",
    },
    {
        "title": "문자열 반복",
        "code_snippet": "print('ab' * 3)",
        "question": "출력 결과는?",
        "answer": "ababab",
    },
    {
        "title": "조건문 결과",
        "code_snippet": "x = 10\nif x > 5:\n    print('크다')\nelse:\n    print('작다')",
        "question": "출력 결과는?",
        "answer": "크다",
    },
    {
        "title": "정수 나눗셈",
        "code_snippet": "print(7 // 2)",
        "question": "출력 결과는?",
        "answer": "3",
    },
]


class Command(BaseCommand):
    help = "1학년 더미 데이터 + 퀴즈 응시 기록을 생성합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="기존 더미 데이터(2026으로 시작하는 학번)를 먼저 삭제합니다.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = User.objects.filter(student_id__startswith="2026").delete()
            self.stdout.write(self.style.WARNING(f"기존 더미 유저 {deleted}명 삭제 완료"))

        # 2학년 유저 1명 확보 (퀴즈 출제용)
        senior = User.objects.filter(grade="2").first()
        if not senior:
            self.stdout.write(self.style.ERROR("2학년 유저가 없어 퀴즈를 출제할 수 없습니다. 먼저 2학년 계정을 만드세요."))
            return

        # 샘플 퀴즈 생성 (없으면)
        quizzes = []
        for q in SAMPLE_QUIZZES:
            obj, created = Quiz.objects.get_or_create(
                title=q["title"],
                defaults={
                    "code_snippet": q["code_snippet"],
                    "question": q["question"],
                    "answer": q["answer"],
                    "created_by": senior,
                },
            )
            quizzes.append(obj)
            if created:
                self.stdout.write(f"  퀴즈 생성: {obj.title}")

        # 1학년 더미 유저 생성
        freshmen = []
        for idx, name in enumerate(FRESHMAN_NAMES, start=1):
            student_id = f"2026{idx:03d}"
            user, created = User.objects.get_or_create(
                student_id=student_id,
                defaults={
                    "name": name,
                    "grade": "1",
                    "class_group": random.choice(["A", "B"]),
                },
            )
            if created:
                user.set_password("test1234!")
                user.save()
                self.stdout.write(f"  유저 생성: {student_id} {name}")
            freshmen.append(user)

        # 최근 14일 랜덤 응시 기록 생성
        today = timezone.localdate()
        attempt_count = 0

        for user in freshmen:
            # 각 1학년은 최근 14일 중 랜덤 7~12일에 응시
            active_days = random.sample(range(14), k=random.randint(6, 12))
            for day_offset in active_days:
                target_date = today - timedelta(days=day_offset)
                quiz = random.choice(quizzes)

                # 이미 응시한 경우 스킵
                if QuizAttempt.objects.filter(user=user, quiz=quiz,
                                              attempted_at__date=target_date).exists():
                    continue

                is_correct = random.random() > 0.35  # 65% 정답률
                submitted = quiz.answer.split(",")[0].strip() if is_correct else "모르겠음"

                attempt = QuizAttempt.objects.create(
                    user=user,
                    quiz=quiz,
                    submitted_answer=submitted,
                    is_correct=is_correct,
                )
                # auto_now_add 우회: create 후 update로 날짜 덮어쓰기
                attempt_dt = timezone.make_aware(
                    timezone.datetime(
                        target_date.year, target_date.month, target_date.day,
                        random.randint(9, 21), random.randint(0, 59),
                    )
                )
                QuizAttempt.objects.filter(pk=attempt.pk).update(attempted_at=attempt_dt)
                attempt_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n완료: 1학년 {len(freshmen)}명 생성, 응시 기록 {attempt_count}건 생성"
        ))
        self.stdout.write("  테스트 비밀번호: test1234!")
        self.stdout.write("  학번: 2026001 ~ 2026006")
