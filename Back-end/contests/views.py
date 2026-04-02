from django.db.models import F, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Contest
from .services.preview import get_contest_preview

CONTEST_CATEGORIES = [
    {"label": "전체", "value": ""},
    {"label": "생성형 AI", "value": "생성형 AI"},
    {"label": "SW 개발", "value": "SW 개발"},
    {"label": "영상/UCC", "value": "영상/UCC"},
    {"label": "기타 IT", "value": "기타 IT"},
]


def _build_contest_queryset(category=""):
    today = timezone.now().date()

    contests = Contest.objects.filter(
        is_active=True
    ).filter(
        Q(deadline_at__gte=today) | Q(deadline_at__isnull=True)
    ).order_by(
        F("deadline_at").asc(nulls_last=True),
        "-created_at",
    )

    if category:
        contests = contests.filter(category=category)

    return contests


def _serialize_contest(contest):
    d_day = contest.d_day

    if d_day is None:
        d_day_label = "상시"
        d_day_tone = "always"
    elif d_day == 0:
        d_day_label = "D-Day"
        d_day_tone = "today"
    elif d_day <= 7:
        d_day_label = f"D-{d_day}"
        d_day_tone = "urgent"
    else:
        d_day_label = f"D-{d_day}"
        d_day_tone = "normal"

    return {
        "id": contest.id,
        "source": contest.source,
        "source_label": contest.get_source_display(),
        "external_id": contest.external_id,
        "external_url": contest.external_url,
        "title": contest.title,
        "host": contest.host,
        "category": contest.category,
        "reward": contest.reward,
        "image_url": contest.image_url,
        "content_summary": contest.content_summary,
        "tags": contest.tags,
        "posted_at": contest.posted_at.isoformat() if contest.posted_at else None,
        "deadline_at": contest.deadline_at.isoformat() if contest.deadline_at else None,
        "deadline_label": contest.deadline_at.strftime("%Y.%m.%d") if contest.deadline_at else "상시",
        "d_day": d_day,
        "d_day_label": d_day_label,
        "d_day_tone": d_day_tone,
        "is_active": contest.is_active,
        "created_at": contest.created_at.isoformat(),
        "updated_at": contest.updated_at.isoformat(),
    }


def contest_list(request):
    category = request.GET.get("category", "").strip()
    contests = _build_contest_queryset(category)

    items = [_serialize_contest(contest) for contest in contests]

    return JsonResponse(
        {
            "generated_at": timezone.now().isoformat(),
            "current_category": category,
            "categories": CONTEST_CATEGORIES,
            "items": items,
        },
        json_dumps_params={"ensure_ascii": False},
    )


def contest_preview(request, contest_id):
    contest = get_object_or_404(Contest, pk=contest_id, is_active=True)
    payload = get_contest_preview(contest)
    return JsonResponse(payload, json_dumps_params={"ensure_ascii": False})
