from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import redirect


@login_required
def github_connect(request):
    from django.conf import settings as django_settings
    import urllib.parse
    params = urllib.parse.urlencode({
        "client_id": django_settings.GITHUB_CLIENT_ID,
        "redirect_uri": django_settings.GITHUB_REDIRECT_URI,
        "scope": "read:user",
    })
    return redirect(f"https://github.com/login/oauth/authorize?{params}")


@login_required
def github_callback(request):
    import requests as req
    from requests.exceptions import RequestException
    from django.conf import settings as django_settings

    code = request.GET.get("code")
    if not code:
        messages.error(request, "GitHub 연동에 실패했습니다.")
        return redirect("users-index")

    try:
        # code → access token
        token_resp = req.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": django_settings.GITHUB_CLIENT_ID,
                "client_secret": django_settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": django_settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )
        access_token = token_resp.json().get("access_token")
        if not access_token:
            messages.error(request, "GitHub 인증 코드가 만료되었습니다. 다시 시도해 주세요.")
            return redirect("users-index")

        # username 가져오기
        user_resp = req.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        username = user_resp.json().get("login")
        if not username:
            messages.error(request, "GitHub 사용자 정보를 가져오지 못했습니다.")
            return redirect("users-index")

    except RequestException:
        messages.error(request, "GitHub 서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.")
        return redirect("users-index")

    request.user.github_username = username
    request.user.github_url = f"https://github.com/{username}"
    request.user.mark_github_connected()
    request.user.save()
    messages.success(request, f"GitHub @{username} 연동이 완료되었습니다.")
    return redirect("users-index")


@login_required
def github_disconnect(request):
    request.user.github_username = ""
    request.user.github_url = ""
    request.user.github_connected_at = None
    request.user.github_profile_summary = ""
    request.user.github_top_languages = ""
    request.user.save()
    messages.success(request, "GitHub 연동이 해제되었습니다.")
    return redirect("users-index")


def logout_view(request):
    if request.user.is_authenticated:
        logout(request)
        messages.success(request, "로그아웃되었습니다.")
    return redirect("home")


@csrf_exempt
def api_login(request):
    """앱 전용 토큰 로그인 API"""
    import json
    from django.contrib.auth import authenticate
    from django.http import JsonResponse
    from rest_framework.authtoken.models import Token

    if request.method != "POST":
        return JsonResponse({"error": "POST만 허용됩니다."}, status=405)
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "잘못된 요청입니다."}, status=400)

    student_id = data.get("student_id", "").strip()
    password = data.get("password", "")
    user = authenticate(request, username=student_id, password=password)
    if user is None:
        return JsonResponse({"error": "학번 또는 비밀번호가 올바르지 않습니다."}, status=401)

    token, _ = Token.objects.get_or_create(user=user)
    return JsonResponse({
        "token": token.key,
        "name": user.name,
        "is_staff": user.is_staff,
        "class_group": user.class_group,
    })


@csrf_exempt
def api_members(request):
    """팀원 목록 API (앱용)"""
    from django.http import JsonResponse
    from rest_framework.authtoken.models import Token

    auth_user = None
    if request.user.is_authenticated:
        auth_user = request.user
    else:
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        if auth.startswith('Token '):
            try:
                auth_user = Token.objects.select_related('user').get(key=auth.split(' ')[1]).user
            except Token.DoesNotExist:
                pass

    if not auth_user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    members = User.objects.filter(
        is_staff=False, deletion_scheduled_at__isnull=True
    ).order_by('class_group', 'name')

    data = [
        {
            "name": m.name,
            "class_group": m.class_group,
            "grade": m.grade,
            "github_username": m.github_username,
            "desired_job": m.get_selected_job_direction(),
            "profile_image": request.build_absolute_uri(m.profile_image.url) if m.profile_image else None,
        }
        for m in members
    ]
    return JsonResponse({"members": data})


@csrf_exempt
def api_profile_image(request):
    """프로필 사진 업로드 / 조회 API"""
    from django.http import JsonResponse
    from rest_framework.authtoken.models import Token

    auth_user = None
    if request.user.is_authenticated:
        auth_user = request.user
    else:
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        if auth.startswith('Token '):
            try:
                auth_user = Token.objects.select_related('user').get(key=auth.split(' ')[1]).user
            except Token.DoesNotExist:
                pass

    if not auth_user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    if request.method == 'GET':
        return JsonResponse({
            "profile_image": request.build_absolute_uri(auth_user.profile_image.url) if auth_user.profile_image else None,
        })

    if request.method == 'POST':
        file = request.FILES.get('image')
        if not file:
            return JsonResponse({"error": "이미지 파일이 없습니다."}, status=400)
        if file.size > 5 * 1024 * 1024:
            return JsonResponse({"error": "파일 크기는 5MB 이하여야 합니다."}, status=400)
        if not file.content_type.startswith('image/'):
            return JsonResponse({"error": "이미지 파일만 업로드 가능합니다."}, status=400)

        # 기존 사진 삭제
        if auth_user.profile_image:
            auth_user.profile_image.delete(save=False)

        auth_user.profile_image = file
        auth_user.save(update_fields=['profile_image'])
        return JsonResponse({"profile_image": request.build_absolute_uri(auth_user.profile_image.url)})

    return JsonResponse({"error": "허용되지 않는 메서드입니다."}, status=405)


@csrf_exempt
def api_profile_image_web(request):
    """프로필 사진 업로드 (웹 세션 인증용)"""
    from django.http import JsonResponse

    if not request.user.is_authenticated:
        return JsonResponse({"error": "로그인이 필요합니다."}, status=401)

    if request.method == 'POST':
        file = request.FILES.get('image')
        if not file:
            return JsonResponse({"error": "이미지 파일이 없습니다."}, status=400)
        if file.size > 5 * 1024 * 1024:
            return JsonResponse({"error": "파일 크기는 5MB 이하여야 합니다."}, status=400)
        if not file.content_type.startswith('image/'):
            return JsonResponse({"error": "이미지 파일만 업로드 가능합니다."}, status=400)

        if request.user.profile_image:
            request.user.profile_image.delete(save=False)

        request.user.profile_image = file
        request.user.save(update_fields=['profile_image'])
        return JsonResponse({"profile_image": request.build_absolute_uri(request.user.profile_image.url)})

    return JsonResponse({"error": "허용되지 않는 메서드입니다."}, status=405)
