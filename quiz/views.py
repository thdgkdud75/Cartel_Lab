import math
from datetime import date, timedelta

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from .models import Quiz, QuizAttempt

User = get_user_model()


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
    """오늘 기준 1년치 날짜 목록 (월요일 정렬)."""
    today = timezone.localdate()
    raw_start = today - timedelta(days=364)
    pad = raw_start.weekday()          # 0=월 … 6=일
    start = raw_start - timedelta(days=pad)
    dates = [start + timedelta(days=i) for i in range((today - start).days + 1)]
    return start, today, dates


def _month_label_cols(year_dates):
    """주(column) 인덱스별 월 레이블 리스트."""
    num_cols = math.ceil(len(year_dates) / 7)
    labels = [""] * num_cols
    seen = set()
    for i, d in enumerate(year_dates):
        col = i // 7
        key = (d.year, d.month)
        if key not in seen:
            seen.add(key)
            labels[col] = f"{d.month}월"
    return labels


@login_required
def index(request):
    today = timezone.localdate()

    if request.user.grade == "1":
        # 오늘의 퀴즈 1개만 — 날짜 기준 캐시 (자정까지 유지)
        quiz_cache_key = f"quiz_today_{today}"
        today_quiz = cache.get(quiz_cache_key)
        if today_quiz is None:
            today_quiz = (
                Quiz.objects.filter(scheduled_date=today)
                .select_related("created_by")
                .first()
            )
            # 자정까지 남은 초 계산
            now = timezone.localtime()
            seconds_until_midnight = (
                (24 - now.hour) * 3600 - now.minute * 60 - now.second
            )
            cache.set(quiz_cache_key, today_quiz or False, seconds_until_midnight)
        if today_quiz is False:
            today_quiz = None
        attempt = None
        if today_quiz:
            attempt = QuizAttempt.objects.filter(
                quiz=today_quiz, user=request.user
            ).first()
        return render(request, "quiz/index.html", {
            "today_quiz": today_quiz,
            "attempt": attempt,
            "today": today,
        })

    # 2학년: 주간 오프셋 (0=이번 주, 1=다음 주)
    try:
        w = max(0, min(1, int(request.GET.get("w", 0))))
    except (ValueError, TypeError):
        w = 0

    this_week_start = today - timedelta(days=today.weekday())
    week_start = this_week_start + timedelta(weeks=w)
    week_dates = [week_start + timedelta(days=i) for i in range(7)]
    existing = {
        q.scheduled_date: q
        for q in Quiz.objects.filter(
            scheduled_date__gte=week_start,
            scheduled_date__lte=week_start + timedelta(days=6),
        )
    }
    KO_DAYS = ["월", "화", "수", "목", "금", "토", "일"]
    week_days = [
        {"date": d, "quiz": existing.get(d), "day_ko": KO_DAYS[d.weekday()]}
        for d in week_dates
    ]

    # 2학년: 전체 퀴즈 목록 + 통계
    quizzes = (
        Quiz.objects.filter(created_by=request.user)
        .prefetch_related("attempts")
        .order_by("-scheduled_date", "-created_at")
    )
    quiz_stats = []
    for q in quizzes:
        attempts = list(q.attempts.all())
        correct = sum(1 for a in attempts if a.is_correct and not a.is_ai_flagged)
        ai_flagged = sum(1 for a in attempts if a.is_ai_flagged)
        quiz_stats.append({
            "quiz": q,
            "total": len(attempts),
            "correct": correct,
            "ai_flagged": ai_flagged,
        })

    # 금/토/일이면 다음 주 화살표 표시
    show_next_arrow = (today.weekday() >= 4)

    return render(request, "quiz/index.html", {
        "quiz_stats": quiz_stats,
        "today": today,
        "week_start": week_start,
        "week_end": week_start + timedelta(days=6),
        "week_days": week_days,
        "week_offset": w,
        "show_next_arrow": show_next_arrow,
    })


@login_required
def admin_dashboard(request):
    if request.user.grade != "2":
        messages.error(request, "접근 권한이 없습니다.")
        return redirect("quiz-index")

    today = timezone.localdate()
    week_start = today - timedelta(days=today.weekday())
    week_dates = [week_start + timedelta(days=i) for i in range(7)]

    year_start, year_end, year_dates = _year_date_range()
    month_labels = _month_label_cols(year_dates)

    freshmen = User.objects.filter(grade="1").order_by("name")

    week_attempts = (
        QuizAttempt.objects.filter(
            user__grade="1",
            attempted_at__date__gte=week_start,
            attempted_at__date__lte=week_start + timedelta(days=6),
        )
        .select_related("user", "quiz")
        .order_by("attempted_at")
    )
    year_attempts = (
        QuizAttempt.objects.filter(
            user__grade="1",
            attempted_at__date__gte=year_start,
            attempted_at__date__lte=year_end,
        )
        .select_related("user", "quiz")
        .order_by("attempted_at")
    )

    def build_date_map(attempts_qs):
        mapping = {}
        for a in attempts_qs:
            d = timezone.localtime(a.attempted_at).date()
            mapping.setdefault(a.user_id, {}).setdefault(d, []).append(a)
        return mapping

    week_map = build_date_map(week_attempts)
    year_map = build_date_map(year_attempts)

    freshman_data = []
    for user in freshmen:
        week_cells = []
        for d in week_dates:
            day_attempts = week_map.get(user.pk, {}).get(d, [])
            if day_attempts:
                if any(a.is_ai_flagged for a in day_attempts):
                    status = "ai"
                elif any(a.is_correct for a in day_attempts):
                    status = "correct"
                else:
                    status = "wrong"
            else:
                status = "none"
            week_cells.append({"date": d, "status": status, "attempts": day_attempts})

        year_cells = []
        for d in year_dates:
            day_attempts = year_map.get(user.pk, {}).get(d, [])
            if d > today:
                status = "future"
            elif day_attempts:
                if any(a.is_ai_flagged for a in day_attempts):
                    status = "ai"
                elif any(a.is_correct for a in day_attempts):
                    status = "correct"
                else:
                    status = "wrong"
            else:
                status = "none"
            year_cells.append({"date": d, "status": status, "count": len(day_attempts)})

        user_week_attempts = [a for a in week_attempts if a.user_id == user.pk]
        week_solved = sum(1 for c in week_cells if c["status"] != "none")
        week_correct = sum(1 for c in week_cells if c["status"] == "correct")

        freshman_data.append({
            "user": user,
            "week_cells": week_cells,
            "year_cells": year_cells,
            "week_attempts": user_week_attempts,
            "week_solved": week_solved,
            "week_correct": week_correct,
        })

    return render(request, "quiz/admin.html", {
        "freshman_data": freshman_data,
        "week_dates": week_dates,
        "year_dates": year_dates,
        "month_labels": month_labels,
        "today": today,
    })


@login_required
def create_quiz(request):
    if request.user.grade != "2":
        messages.error(request, "2학년만 문제를 출제할 수 있습니다.")
        return redirect("quiz-index")

    if request.method == "POST":
        title = request.POST.get("title", "").strip()
        code_snippet = request.POST.get("code_snippet", "").strip()
        question = request.POST.get("question", "").strip()
        raw_answer = request.POST.get("answer", "").strip()
        answer = ", ".join(a.strip() for a in raw_answer.split(",") if a.strip())
        ai_trap_code = request.POST.get("ai_trap_code", "").strip()
        raw_trap = request.POST.get("ai_trap_answer", "").strip()
        ai_trap_answer = ", ".join(a.strip() for a in raw_trap.split(",") if a.strip())
        raw_date = request.POST.get("scheduled_date", "").strip()

        if not title or not question or not answer:
            messages.error(request, "제목, 문제 설명, 정답은 필수 입력입니다.")
            return redirect("quiz-index")

        try:
            scheduled_date = date.fromisoformat(raw_date) if raw_date else timezone.localdate()
        except ValueError:
            scheduled_date = timezone.localdate()

        # 이번 주 또는 다음 주 범위 벗어나면 오늘로 고정
        _today = timezone.localdate()
        _week_start = _today - timedelta(days=_today.weekday())
        _allowed_end = _week_start + timedelta(days=13)  # 다음 주 일요일까지
        if not (_week_start <= scheduled_date <= _allowed_end):
            scheduled_date = _today

        # 같은 날 이미 문제가 있으면 경고
        if Quiz.objects.filter(scheduled_date=scheduled_date).exists():
            messages.warning(request, f"{scheduled_date} 에 이미 문제가 등록되어 있습니다. 그래도 추가했습니다.")

        Quiz.objects.create(
            title=title,
            code_snippet=code_snippet,
            question=question,
            answer=answer,
            ai_trap_code=ai_trap_code,
            ai_trap_answer=ai_trap_answer,
            scheduled_date=scheduled_date,
            created_by=request.user,
        )
        messages.success(request, f"문제가 {scheduled_date} 로 등록되었습니다.")
    return redirect("quiz-index")


@login_required
def edit_quiz(request, quiz_id):
    if request.user.grade != "2":
        messages.error(request, "2학년만 문제를 수정할 수 있습니다.")
        return redirect("quiz-index")

    quiz = get_object_or_404(Quiz, pk=quiz_id, created_by=request.user)

    if request.method == "POST":
        title = request.POST.get("title", "").strip()
        code_snippet = request.POST.get("code_snippet", "").strip()
        question = request.POST.get("question", "").strip()
        raw_answer = request.POST.get("answer", "").strip()
        answer = ", ".join(a.strip() for a in raw_answer.split(",") if a.strip())
        ai_trap_code = request.POST.get("ai_trap_code", "").strip()
        raw_trap = request.POST.get("ai_trap_answer", "").strip()
        ai_trap_answer = ", ".join(a.strip() for a in raw_trap.split(",") if a.strip())

        if not title or not question or not answer:
            messages.error(request, "제목, 문제 설명, 정답은 필수 입력입니다.")
            return redirect("quiz-index")

        quiz.title = title
        quiz.code_snippet = code_snippet
        quiz.question = question
        quiz.answer = answer
        quiz.ai_trap_code = ai_trap_code
        quiz.ai_trap_answer = ai_trap_answer
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

    quiz = get_object_or_404(Quiz, pk=quiz_id)

    if QuizAttempt.objects.filter(quiz=quiz, user=request.user).exists():
        messages.warning(request, "이미 응시한 문제입니다.")
        return redirect("quiz-index")

    if request.method == "POST":
        submitted = request.POST.get("answer", "").strip()
        is_ai_flagged = _check_ai_trap(submitted, quiz.ai_trap_answer)
        is_correct = is_ai_flagged or _check_answer(submitted, quiz.answer)
        QuizAttempt.objects.create(
            quiz=quiz,
            user=request.user,
            submitted_answer=submitted,
            is_correct=is_correct,
            is_ai_flagged=is_ai_flagged,
        )
        if is_correct:
            messages.success(request, "정답입니다!")
        else:
            messages.error(request, f"오답입니다. 제출한 답: {submitted}")
    return redirect("quiz-index")
