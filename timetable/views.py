from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
from .models import Timetable


def _get_user(request):
    if request.user.is_authenticated:
        return request.user
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.startswith('Token '):
        try:
            return Token.objects.select_related('user').get(key=auth.split(' ')[1]).user
        except Token.DoesNotExist:
            pass
    return None


@csrf_exempt
@require_GET
def timetable_api(request):
    """내 반(class_group) 기준 시간표 조회"""
    user = _get_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    class_group = user.class_group
    if not class_group:
        return JsonResponse({"error": "반 정보가 없습니다. 프로필을 확인해주세요."}, status=400)

    entries = Timetable.objects.filter(class_group=class_group)
    data = [
        {
            "id": e.id,
            "weekday": e.weekday,
            "subject": e.subject,
            "start_time": e.start_time.strftime("%H:%M"),
            "end_time": e.end_time.strftime("%H:%M"),
        }
        for e in entries
    ]
    return JsonResponse({"class_group": class_group, "timetable": data})
