import math
from datetime import date, timedelta

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Quiz, QuizAttempt

User = get_user_model()

KO_DAYS = ["월", "화", "수", "목", "금", "토", "일"]
MAX_ATTEMPTS = 3


def _check_answer(submitted: str, answer_field: str) -> bool:
    submitted_norm = submitted.strip().lower()
    correct_answers = [a.strip().lower() for a in answer_field.split(",") if a.strip()]
    return submitted_norm in correct_answers


def _check_ai_trap(submitted: str, trap_answer: str) -> bool:
    if not trap_answer.strip():
        return False
    submitted_norm = submitted.strip().lower()
    trap_answers = [a.strip().lower() for a in trap_answer.split(",") if a.strip()]
    return submitted_norm in trap_answers


def _year_date_range():
    today = timezone.localdate()
    raw_start = today - timedelta(days=364)
    pad = raw_start.weekday()
    start = raw_start - timedelta(days=pad)
    dates = [start + timedelta(days=i) for i in range((today - start).days + 1)]
    return start, today, dates


def _month_label_cols(year_dates):
    num_cols = math.ceil(len(year_dates) / 7)
    labels = [""] * num_cols
    seen = set()
    for index, current_date in enumerate(year_dates):
        col = index // 7
        key = (current_date.year, current_date.month)
        if key not in seen:
            seen.add(key)
            labels[col] = f"{current_date.month}월"
    return labels


def _normalize_answers(raw_value: str) -> str:
    return ", ".join(part.strip() for part in raw_value.split(",") if part.strip())



def _resolve_scheduled_date(raw_date: str):
    try:
        scheduled_date = date.fromisoformat(raw_date) if raw_date else timezone.localdate()
    except ValueError:
        scheduled_date = timezone.localdate()

    today = timezone.localdate()
    week_start = today - timedelta(days=today.weekday())
    allowed_end = week_start + timedelta(days=13)
    if not (week_start <= scheduled_date <= allowed_end):
        return today
    return scheduled_date


def _serialize_date(value):
    return value.isoformat() if value else None


def _serialize_datetime(value):
    return timezone.localtime(value).isoformat() if value else None


def _serialize_user(user):
    return {
        "id": user.id,
        "name": user.name,
        "student_id": user.student_id,
        "grade": user.grade,
        "class_group": user.class_group,
    }


def _serialize_quiz(quiz, *, include_answer=False, include_trap=False, expose_ai_code=False):
    payload = {
        "id": quiz.id,
        "title": quiz.title,
        "code_snippet": quiz.code_snippet,
        "question": quiz.question,
        "scheduled_date": _serialize_date(quiz.scheduled_date),
        "created_at": _serialize_datetime(quiz.created_at),
        "created_by": _serialize_user(quiz.created_by),
    }
    if include_answer:
        payload["answer"] = quiz.answer
    if include_trap:
        payload["ai_trap_code"] = quiz.ai_trap_code
        payload["ai_trap_answer"] = quiz.ai_trap_answer
    elif expose_ai_code:
        payload["ai_trap_code"] = quiz.ai_trap_code
    return payload


def _serialize_attempt(attempt, *, include_quiz=False):
    payload = {
        "id": attempt.id,
        "submitted_answer": attempt.submitted_answer,
        "is_correct": attempt.is_correct,
        "is_ai_flagged": attempt.is_ai_flagged,
        "attempted_at": _serialize_datetime(attempt.attempted_at),
        "attempt_number": getattr(attempt, "attempt_number", None),
    }
    if include_quiz:
        payload["quiz"] = {
            "id": attempt.quiz_id,
            "title": attempt.quiz.title,
        }
    return payload


def _build_student_state(user, today):
    today_quiz = (
        Quiz.objects.filter(scheduled_date=today)
        .select_related("created_by")
        .first()
    )
    attempts = []
    if today_quiz:
        attempts = list(
            QuizAttempt.objects.filter(quiz=today_quiz, user=user)
            .select_related("quiz")
            .order_by("attempted_at")
        )
        for index, attempt in enumerate(attempts, start=1):
            attempt.attempt_number = index

    has_correct = any(attempt.is_correct for attempt in attempts)
    return {
        "today_quiz": today_quiz,
        "attempts": attempts,
        "attempt_count": len(attempts),
        "has_correct": has_correct,
        "max_attempts": MAX_ATTEMPTS,
        "today": today,
    }


def _build_mentor_state(user, today, week_offset):
    this_week_start = today - timedelta(days=today.weekday())
    week_start = this_week_start + timedelta(weeks=week_offset)
    week_dates = [week_start + timedelta(days=i) for i in range(7)]
    existing = {
        quiz.scheduled_date: quiz
        for quiz in Quiz.objects.filter(
            scheduled_date__gte=week_start,
            scheduled_date__lte=week_start + timedelta(days=6),
        ).select_related("created_by")
    }

    week_days = [
        {
            "date": current_date,
            "quiz": existing.get(current_date),
            "day_ko": KO_DAYS[current_date.weekday()],
        }
        for current_date in week_dates
    ]

    quizzes = (
        Quiz.objects.all()
        .select_related("created_by")
        .prefetch_related("attempts")
        .order_by("-scheduled_date", "-created_at")
    )

    quiz_stats = []
    for quiz in quizzes:
        attempts = list(quiz.attempts.all())
        correct = sum(1 for attempt in attempts if attempt.is_correct and not attempt.is_ai_flagged)
        ai_flagged = sum(1 for attempt in attempts if attempt.is_ai_flagged)
        quiz_stats.append({
            "quiz": quiz,
            "total": len(attempts),
            "correct": correct,
            "ai_flagged": ai_flagged,
            "is_mine": quiz.created_by_id == user.id,
        })

    return {
        "quiz_stats": quiz_stats,
        "today": today,
        "week_start": week_start,
        "week_end": week_start + timedelta(days=6),
        "week_days": week_days,
        "week_offset": week_offset,
        "show_next_arrow": today.weekday() >= 4,
    }


def _build_admin_state(today):
    week_start = today - timedelta(days=today.weekday())
    week_dates = [week_start + timedelta(days=i) for i in range(7)]

    year_start, year_end, year_dates = _year_date_range()
    month_labels = _month_label_cols(year_dates)

    freshmen = User.objects.filter(
        grade="1",
        deletion_scheduled_at__isnull=True,
    ).order_by("name")

    week_attempts = list(
        QuizAttempt.objects.filter(
            user__grade="1",
            attempted_at__date__gte=week_start,
            attempted_at__date__lte=week_start + timedelta(days=6),
        )
        .select_related("user", "quiz")
        .order_by("attempted_at")
    )
    year_attempts = list(
        QuizAttempt.objects.filter(
            user__grade="1",
            attempted_at__date__gte=year_start,
            attempted_at__date__lte=year_end,
        )
        .select_related("user", "quiz")
        .order_by("attempted_at")
    )

    def build_date_map(attempts):
        mapping = {}
        for attempt in attempts:
            attempt_date = timezone.localtime(attempt.attempted_at).date()
            mapping.setdefault(attempt.user_id, {}).setdefault(attempt_date, []).append(attempt)
        return mapping

    week_map = build_date_map(week_attempts)
    year_map = build_date_map(year_attempts)

    freshman_data = []
    for user in freshmen:
        week_cells = []
        for current_date in week_dates:
            day_attempts = week_map.get(user.pk, {}).get(current_date, [])
            if day_attempts:
                if any(attempt.is_ai_flagged for attempt in day_attempts):
                    status_key = "ai"
                elif any(attempt.is_correct for attempt in day_attempts):
                    status_key = "correct"
                else:
                    status_key = "wrong"
            else:
                status_key = "none"
            week_cells.append({
                "date": current_date,
                "status": status_key,
                "attempts": day_attempts,
            })

        year_cells = []
        for current_date in year_dates:
            day_attempts = year_map.get(user.pk, {}).get(current_date, [])
            if current_date > today:
                status_key = "future"
            elif day_attempts:
                if any(attempt.is_ai_flagged for attempt in day_attempts):
                    status_key = "ai"
                elif any(attempt.is_correct for attempt in day_attempts):
                    status_key = "correct"
                else:
                    status_key = "wrong"
            else:
                status_key = "none"
            year_cells.append({
                "date": current_date,
                "status": status_key,
                "count": len(day_attempts),
            })

        raw_user_week = [attempt for attempt in week_attempts if attempt.user_id == user.pk]
        quiz_counter = {}
        user_week_attempts = []
        for attempt in raw_user_week:
            quiz_counter[attempt.quiz_id] = quiz_counter.get(attempt.quiz_id, 0) + 1
            attempt.attempt_number = quiz_counter[attempt.quiz_id]
            user_week_attempts.append(attempt)

        attempts_by_date = {}
        for attempt in user_week_attempts:
            attempt_date = timezone.localtime(attempt.attempted_at).date()
            attempts_by_date.setdefault(attempt_date, []).append(attempt)

        week_attempts_by_day = [
            {
                "date": current_date,
                "day_ko": KO_DAYS[current_date.weekday()],
                "attempts": attempts_by_date[current_date],
            }
            for current_date in week_dates
            if current_date in attempts_by_date
        ]

        freshman_data.append({
            "user": user,
            "week_cells": week_cells,
            "year_cells": year_cells,
            "week_attempts": user_week_attempts,
            "week_attempts_by_day": week_attempts_by_day,
            "week_solved": sum(1 for cell in week_cells if cell["status"] != "none"),
            "week_correct": sum(1 for cell in week_cells if cell["status"] == "correct"),
        })

    return {
        "freshman_data": freshman_data,
        "week_dates": week_dates,
        "year_dates": year_dates,
        "month_labels": month_labels,
        "today": today,
    }


def _serialize_student_state(state):
    return {
        "today": _serialize_date(state["today"]),
        "today_quiz": (
            _serialize_quiz(state["today_quiz"], expose_ai_code=True)
            if state["today_quiz"]
            else None
        ),
        "attempts": [_serialize_attempt(attempt) for attempt in state["attempts"]],
        "attempt_count": state["attempt_count"],
        "has_correct": state["has_correct"],
        "max_attempts": state["max_attempts"],
    }


def _serialize_mentor_state(state):
    return {
        "today": _serialize_date(state["today"]),
        "week_start": _serialize_date(state["week_start"]),
        "week_end": _serialize_date(state["week_end"]),
        "week_offset": state["week_offset"],
        "show_next_arrow": state["show_next_arrow"],
        "week_days": [
            {
                "date": _serialize_date(item["date"]),
                "day_ko": item["day_ko"],
                "quiz": (
                    _serialize_quiz(item["quiz"], include_answer=True, include_trap=True)
                    if item["quiz"]
                    else None
                ),
            }
            for item in state["week_days"]
        ],
        "quiz_stats": [
            {
                "quiz": _serialize_quiz(item["quiz"], include_answer=True, include_trap=True),
                "total": item["total"],
                "correct": item["correct"],
                "ai_flagged": item["ai_flagged"],
                "is_mine": item["is_mine"],
            }
            for item in state["quiz_stats"]
        ],
    }


def _serialize_admin_state(state):
    return {
        "today": _serialize_date(state["today"]),
        "week_dates": [
            {
                "date": _serialize_date(current_date),
                "day_ko": KO_DAYS[current_date.weekday()],
            }
            for current_date in state["week_dates"]
        ],
        "year_dates": [_serialize_date(current_date) for current_date in state["year_dates"]],
        "month_labels": state["month_labels"],
        "freshman_data": [
            {
                "user": _serialize_user(item["user"]),
                "week_cells": [
                    {
                        "date": _serialize_date(cell["date"]),
                        "status": cell["status"],
                        "attempt_count": len(cell["attempts"]),
                    }
                    for cell in item["week_cells"]
                ],
                "year_cells": [
                    {
                        "date": _serialize_date(cell["date"]),
                        "status": cell["status"],
                        "count": cell["count"],
                    }
                    for cell in item["year_cells"]
                ],
                "week_attempts": [
                    _serialize_attempt(attempt, include_quiz=True)
                    for attempt in item["week_attempts"]
                ],
                "week_attempts_by_day": [
                    {
                        "date": _serialize_date(day_group["date"]),
                        "day_ko": day_group["day_ko"],
                        "attempts": [
                            _serialize_attempt(attempt, include_quiz=True)
                            for attempt in day_group["attempts"]
                        ],
                    }
                    for day_group in item["week_attempts_by_day"]
                ],
                "week_solved": item["week_solved"],
                "week_correct": item["week_correct"],
            }
            for item in state["freshman_data"]
        ],
    }


def _parse_week_offset(raw_value):
    try:
        return max(0, min(1, int(raw_value or 0)))
    except (TypeError, ValueError):
        return 0


def _parse_quiz_payload(payload, *, include_date):
    title = str(payload.get("title", "")).strip()
    code_snippet = str(payload.get("code_snippet", "")).strip()
    question = str(payload.get("question", "")).strip()
    answer = _normalize_answers(str(payload.get("answer", "")).strip())
    ai_trap_code = str(payload.get("ai_trap_code", "")).strip()
    ai_trap_answer = _normalize_answers(str(payload.get("ai_trap_answer", "")).strip())

    if not title or not question or not answer:
        return None, "제목, 문제 설명, 정답은 필수 입력입니다."

    data = {
        "title": title,
        "code_snippet": code_snippet,
        "question": question,
        "answer": answer,
        "ai_trap_code": ai_trap_code,
        "ai_trap_answer": ai_trap_answer,
    }
    if include_date:
        raw_date = str(payload.get("scheduled_date", "")).strip()
        data["scheduled_date"] = _resolve_scheduled_date(raw_date)
    return data, None


def _submit_attempt(user, quiz, submitted_answer):
    if not submitted_answer.strip():
        return None, "답변을 입력하세요."

    existing_attempts = QuizAttempt.objects.filter(quiz=quiz, user=user)
    attempt_count = existing_attempts.count()

    if attempt_count >= MAX_ATTEMPTS:
        return None, f"최대 {MAX_ATTEMPTS}번까지 제출할 수 있습니다."

    if existing_attempts.filter(is_correct=True).exists():
        return None, "이미 정답을 맞혔습니다."

    is_ai_flagged = _check_ai_trap(submitted_answer, quiz.ai_trap_answer)
    is_correct = is_ai_flagged or _check_answer(submitted_answer, quiz.answer)
    attempt = QuizAttempt.objects.create(
        quiz=quiz,
        user=user,
        submitted_answer=submitted_answer,
        is_correct=is_correct,
        is_ai_flagged=is_ai_flagged,
    )
    attempt.attempt_number = attempt_count + 1
    return attempt, None


@login_required
def index(request):
    today = timezone.localdate()
    if request.user.grade == "1":
        return render(request, "quiz/index.html", _build_student_state(request.user, today))

    week_offset = _parse_week_offset(request.GET.get("w"))
    return render(request, "quiz/index.html", _build_mentor_state(request.user, today, week_offset))


@login_required
def admin_dashboard(request):
    if request.user.grade != "2":
        messages.error(request, "접근 권한이 없습니다.")
        return redirect("quiz-index")
    return render(request, "quiz/admin.html", _build_admin_state(timezone.localdate()))


@login_required
def create_quiz(request):
    if request.user.grade != "2":
        messages.error(request, "2학년만 문제를 출제할 수 있습니다.")
        return redirect("quiz-index")

    if request.method == "POST":
        data, error_message = _parse_quiz_payload(request.POST, include_date=True)
        if error_message:
            messages.error(request, error_message)
            return redirect("quiz-index")

        scheduled_date = data["scheduled_date"]
        if Quiz.objects.filter(scheduled_date=scheduled_date).exists():
            messages.warning(request, f"{scheduled_date} 에 이미 문제가 등록되어 있습니다. 그래도 추가했습니다.")

        Quiz.objects.create(created_by=request.user, **data)
        messages.success(request, f"문제가 {scheduled_date} 로 등록되었습니다.")
    return redirect("quiz-index")


@login_required
def edit_quiz(request, quiz_id):
    if request.user.grade != "2":
        messages.error(request, "2학년만 문제를 수정할 수 있습니다.")
        return redirect("quiz-index")

    quiz = get_object_or_404(Quiz, pk=quiz_id, created_by=request.user)
    if request.method == "POST":
        data, error_message = _parse_quiz_payload(request.POST, include_date=False)
        if error_message:
            messages.error(request, error_message)
            return redirect("quiz-index")

        for field_name, value in data.items():
            setattr(quiz, field_name, value)
        quiz.save()
        messages.success(request, "문제가 수정되었습니다.")
    return redirect("quiz-index")


@login_required
def delete_quiz(request, quiz_id):
    if request.user.grade != "2":
        messages.error(request, "2학년만 문제를 삭제할 수 있습니다.")
        return redirect("quiz-index")

    quiz = get_object_or_404(Quiz, pk=quiz_id, created_by=request.user)
    if request.method == "POST":
        quiz.delete()
        messages.success(request, "문제가 삭제되었습니다.")
    return redirect("quiz-index")


@login_required
def submit_answer(request, quiz_id):
    if request.user.grade != "1":
        messages.error(request, "1학년만 답변을 제출할 수 있습니다.")
        return redirect("quiz-index")

    quiz = get_object_or_404(Quiz.objects.select_related("created_by"), pk=quiz_id)
    if request.method == "POST":
        submitted = request.POST.get("answer", "").strip()
        attempt, error_message = _submit_attempt(request.user, quiz, submitted)
        if error_message:
            messages.warning(request, error_message)
            return redirect("quiz-index")

        if attempt.is_correct:
            messages.success(request, "정답입니다!")
        else:
            messages.error(request, f"오답입니다. 제출한 답: {submitted}")
    return redirect("quiz-index")


class QuizPageApiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        if request.user.grade == "1":
            return Response({
                "grade": request.user.grade,
                **_serialize_student_state(_build_student_state(request.user, today)),
            })

        week_offset = _parse_week_offset(request.query_params.get("w"))
        return Response({
            "grade": request.user.grade,
            **_serialize_mentor_state(_build_mentor_state(request.user, today, week_offset)),
            "admin_data": _serialize_admin_state(_build_admin_state(today)),
        })


class QuizAdminApiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.grade != "2":
            return Response({"error": "접근 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        return Response(_serialize_admin_state(_build_admin_state(timezone.localdate())))


class QuizCreateApiView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.grade != "2":
            return Response({"error": "2학년만 문제를 출제할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        data, error_message = _parse_quiz_payload(request.data, include_date=True)
        if error_message:
            return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)

        scheduled_date = data["scheduled_date"]
        warning_message = None
        if Quiz.objects.filter(scheduled_date=scheduled_date).exists():
            warning_message = f"{scheduled_date} 에 이미 문제가 등록되어 있습니다. 그래도 추가했습니다."

        quiz = Quiz.objects.create(created_by=request.user, **data)
        return Response({
            "message": f"문제가 {scheduled_date} 로 등록되었습니다.",
            "warning": warning_message,
            "quiz": _serialize_quiz(quiz, include_answer=True, include_trap=True),
        }, status=status.HTTP_201_CREATED)


class QuizEditApiView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, quiz_id):
        if request.user.grade != "2":
            return Response({"error": "2학년만 문제를 수정할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        quiz = get_object_or_404(Quiz.objects.select_related("created_by"), pk=quiz_id, created_by=request.user)
        data, error_message = _parse_quiz_payload(request.data, include_date=False)
        if error_message:
            return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)

        for field_name, value in data.items():
            setattr(quiz, field_name, value)
        quiz.save()
        return Response({
            "message": "문제가 수정되었습니다.",
            "quiz": _serialize_quiz(quiz, include_answer=True, include_trap=True),
        })


class QuizDeleteApiView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, quiz_id):
        return self._delete(request, quiz_id)

    def delete(self, request, quiz_id):
        return self._delete(request, quiz_id)

    def _delete(self, request, quiz_id):
        if request.user.grade != "2":
            return Response({"error": "2학년만 문제를 삭제할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        quiz = get_object_or_404(Quiz, pk=quiz_id, created_by=request.user)
        quiz.delete()
        return Response({"message": "문제가 삭제되었습니다."})


class QuizSubmitApiView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, quiz_id):
        if request.user.grade != "1":
            return Response({"error": "1학년만 답변을 제출할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        quiz = get_object_or_404(Quiz.objects.select_related("created_by"), pk=quiz_id)
        submitted = str(request.data.get("answer", "")).strip()
        if not submitted:
            return Response({"error": "답변을 입력하세요."}, status=status.HTTP_400_BAD_REQUEST)

        attempt, error_message = _submit_attempt(request.user, quiz, submitted)
        if error_message:
            return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "정답입니다!" if attempt.is_correct else f"오답입니다. 제출한 답: {submitted}",
            "attempt": _serialize_attempt(attempt),
            "attempt_count": attempt.attempt_number,
            "has_correct": attempt.is_correct,
        }, status=status.HTTP_201_CREATED)


class GithubNextAvailableDateView(APIView):
    """특정 날짜부터 시작해서 퀴즈가 없는 첫 번째 날짜 반환"""
    permission_classes = [AllowAny]

    def get(self, request):
        if not _verify_github_token(request):
            return Response({"error": "인증 실패"}, status=status.HTTP_403_FORBIDDEN)

        from_date_raw = request.query_params.get("from", "")
        try:
            from_date = date.fromisoformat(from_date_raw) if from_date_raw else timezone.localdate()
        except ValueError:
            from_date = timezone.localdate()

        candidate = from_date
        for _ in range(365):
            if not Quiz.objects.filter(scheduled_date=candidate).exists():
                return Response({"available_date": candidate.isoformat()})
            candidate = candidate + timedelta(days=1)

        return Response({"error": "1년 내에 빈 날짜가 없습니다."}, status=status.HTTP_409_CONFLICT)


def _verify_github_token(request):
    token = request.headers.get("X-GitHub-Token", "")
    expected = getattr(settings, "GITHUB_WEBHOOK_SECRET", "")
    if not expected or token != expected:
        return False
    return True


class GithubRegisterQuizView(APIView):
    """GitHub Actions에서 문제 md 머지 시 퀴즈 자동 등록"""
    permission_classes = [AllowAny]

    def post(self, request):
        if not _verify_github_token(request):
            return Response({"error": "인증 실패"}, status=status.HTTP_403_FORBIDDEN)

        # 등록할 사용자: github_username으로 2학년 봇 계정 조회
        github_username = request.data.get("created_by_github")
        creator = User.objects.filter(github_username=github_username, grade="2").first()
        if not creator:
            return Response({"error": f"GitHub 계정 '{github_username}'에 연동된 2학년 유저를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        data, error_message = _parse_quiz_payload(request.data, include_date=True)
        if error_message:
            return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)

        scheduled_date = data["scheduled_date"]
        warning_message = None
        if Quiz.objects.filter(scheduled_date=scheduled_date).exists():
            warning_message = f"{scheduled_date} 에 이미 문제가 등록되어 있습니다. 그래도 추가했습니다."

        quiz = Quiz.objects.create(created_by=creator, **data)
        return Response({
            "message": f"문제가 {scheduled_date} 로 등록되었습니다.",
            "warning": warning_message,
            "quiz": _serialize_quiz(quiz, include_answer=True, include_trap=True),
        }, status=status.HTTP_201_CREATED)


class GithubMarkCorrectView(APIView):
    """GitHub Actions에서 학생 PR 머지 시 정답 처리"""
    permission_classes = [AllowAny]

    def post(self, request):
        if not _verify_github_token(request):
            return Response({"error": "인증 실패"}, status=status.HTTP_403_FORBIDDEN)

        github_username = request.data.get("github_username")
        quiz_id = request.data.get("quiz_id")

        student = User.objects.filter(github_username=github_username, grade="1").first()
        if not student:
            return Response({"error": f"GitHub 계정 '{github_username}'에 연동된 1학년 유저를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        quiz = get_object_or_404(Quiz, pk=quiz_id)

        # 이미 정답 처리된 경우 스킵
        if QuizAttempt.objects.filter(quiz=quiz, user=student, is_correct=True).exists():
            return Response({"message": "이미 정답 처리되어 있습니다."})

        attempt_count = QuizAttempt.objects.filter(quiz=quiz, user=student).count()
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=student,
            submitted_answer="[GitHub PR 머지]",
            is_correct=True,
            is_ai_flagged=False,
        )
        attempt.attempt_number = attempt_count + 1

        return Response({
            "message": f"{student.name}({github_username}) 정답 처리 완료",
            "attempt": _serialize_attempt(attempt),
        }, status=status.HTTP_201_CREATED)
