import urllib.parse
import requests as github_req
from django.contrib.auth import authenticate
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .services import build_profile_analysis
from jobs.services.market_analysis import get_market_role_context, get_or_refresh_market_snapshot


def set_auth_cookies(response, access_token, refresh_token):
    jwt = settings.SIMPLE_JWT
    response.set_cookie(
        key=jwt['AUTH_COOKIE'],
        value=access_token,
        httponly=jwt['AUTH_COOKIE_HTTP_ONLY'],
        secure=jwt['AUTH_COOKIE_SECURE'],
        samesite=jwt['AUTH_COOKIE_SAMESITE'],
        max_age=int(jwt['ACCESS_TOKEN_LIFETIME'].total_seconds()),
    )
    response.set_cookie(
        key=jwt['AUTH_COOKIE_REFRESH'],
        value=refresh_token,
        httponly=jwt['AUTH_COOKIE_HTTP_ONLY'],
        secure=jwt['AUTH_COOKIE_SECURE'],
        samesite=jwt['AUTH_COOKIE_SAMESITE'],
        max_age=int(jwt['REFRESH_TOKEN_LIFETIME'].total_seconds()),
    )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        student_id = request.data.get('student_id', '').strip()
        password = request.data.get('password', '')

        user = authenticate(request, username=student_id, password=password)
        if not user:
            return Response({'error': '학번 또는 비밀번호가 올바르지 않습니다.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        response = Response({
            'id': user.id,
            'name': user.name,
            'image': user.profile_image_url,
            'is_staff': user.is_staff,
            'class_group': user.class_group,
            'access_token': access_token,
            'refresh_token': refresh_token,
        })
        set_auth_cookies(response, access_token, refresh_token)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        jwt = settings.SIMPLE_JWT
        response = Response({'detail': '로그아웃되었습니다.'})
        response.delete_cookie(jwt['AUTH_COOKIE'])
        response.delete_cookie(jwt['AUTH_COOKIE_REFRESH'])
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        jwt = settings.SIMPLE_JWT
        # body로 전달된 refresh 우선, 없으면 쿠키에서 읽기 (서버사이드 갱신 지원)
        refresh_token = request.data.get('refresh') or request.COOKIES.get(jwt['AUTH_COOKIE_REFRESH'])
        if not refresh_token:
            return Response({'error': '리프레시 토큰이 없습니다.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            new_access = str(refresh.access_token)
            response = Response({'detail': '토큰이 갱신되었습니다.', 'access_token': new_access})
            set_auth_cookies(response, new_access, str(refresh))
            return response
        except Exception:
            return Response({'error': '유효하지 않은 토큰입니다.'}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'name': user.name,
            'student_id': user.student_id,
            'is_staff': user.is_staff,
            'class_group': user.class_group,
            'grade': user.grade,
            'profile_image': request.build_absolute_uri(user.profile_image.url) if user.profile_image else None,
        })


class ProfileView(APIView):
    """프로필 전체 조회 (GitHub, 이력서, 분석 결과 포함)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'github_url': user.github_url,
            'github_username': user.github_username,
            'github_profile_summary': user.github_profile_summary,
            'github_top_languages': user.github_top_languages,
            'resume_file': user.resume_file.name.replace('resumes/', '') if user.resume_file else None,
            'desired_job_direction': user.get_selected_job_direction(),
            'profile_analyzed_at': user.profile_analyzed_at,
            'ai_profile_summary': user.ai_profile_summary,
            'ai_profile_payload': user.ai_profile_payload,
            'resume_analysis_summary': user.resume_analysis_summary,
            'analysis_recommendation': user.analysis_recommendation,
            'remaining_analysis_count': user.get_remaining_analysis_count(),
        })


class ProfileGithubView(APIView):
    """GitHub URL 저장"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        github_url = (request.data.get('github_url') or '').strip()
        user = request.user
        user.github_url = github_url
        user.save(update_fields=['github_url'])
        return Response({'github_url': user.github_url})


class ProfileResumeView(APIView):
    """이력서 파일 업로드/삭제"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('resume_file')
        if not file:
            return Response({'error': '파일이 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.endswith(('.pdf', '.txt')):
            return Response({'error': 'PDF 또는 TXT 파일만 업로드 가능합니다.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user.resume_file:
            user.resume_file.delete(save=False)
        user.resume_file = file
        user.save(update_fields=['resume_file'])
        return Response({'resume_file': user.resume_file.name.replace('resumes/', '')})

    def delete(self, request):
        user = request.user
        if user.resume_file:
            user.resume_file.delete(save=False)
            user.resume_file = None
            user.save(update_fields=['resume_file'])
        return Response({'resume_file': None})


class GitHubConnectView(APIView):
    """GitHub OAuth URL 반환"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        frontend_callback = request.query_params.get(
            'redirect_uri',
            'http://localhost:3000/api/github/callback'
        )
        params = urllib.parse.urlencode({
            'client_id': settings.GITHUB_CLIENT_ID,
            'redirect_uri': frontend_callback,
            'scope': 'read:user',
        })
        return Response({'oauth_url': f'https://github.com/login/oauth/authorize?{params}'})


class GitHubCallbackView(APIView):
    """GitHub code → username 저장"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri', 'http://localhost:3000/api/github/callback')
        if not code:
            return Response({'error': 'code가 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token_resp = github_req.post(
                'https://github.com/login/oauth/access_token',
                json={
                    'client_id': settings.GITHUB_CLIENT_ID,
                    'client_secret': settings.GITHUB_CLIENT_SECRET,
                    'code': code,
                    'redirect_uri': redirect_uri,
                },
                headers={'Accept': 'application/json'},
                timeout=15,
            )
            access_token = token_resp.json().get('access_token')
            if not access_token:
                return Response({'error': 'GitHub 인증 코드가 만료되었습니다.'}, status=status.HTTP_400_BAD_REQUEST)

            user_resp = github_req.get(
                'https://api.github.com/user',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=15,
            )
            username = user_resp.json().get('login')
            if not username:
                return Response({'error': 'GitHub 사용자 정보를 가져오지 못했습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            return Response({'error': 'GitHub 서버와 연결할 수 없습니다.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user = request.user
        user.github_username = username
        user.github_url = f'https://github.com/{username}'
        user.mark_github_connected()
        user.save()
        return Response({'github_username': username, 'github_url': user.github_url})


class ProfileAnalyzeView(APIView):
    """AI 분석 실행"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.can_run_profile_analysis():
            return Response({'error': '오늘 분석 횟수를 모두 사용했습니다.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        if not user.github_url and not user.resume_file:
            return Response({'error': 'GitHub URL 또는 이력서를 먼저 등록해주세요.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            market_snapshot = get_or_refresh_market_snapshot()
            analysis = build_profile_analysis(
                user.github_url,
                user.resume_file,
                desired_direction=user.get_selected_job_direction(),
                market_role_context=get_market_role_context(
                    market_snapshot,
                    user.get_selected_job_direction(),
                ),
            )
            user.github_username = analysis['github_username']
            user.github_profile_summary = analysis['github_profile_summary']
            user.github_top_languages = analysis['github_top_languages']
            user.resume_extracted_text = analysis['resume_extracted_text']
            user.resume_analysis_summary = analysis['resume_analysis_summary']
            user.analysis_recommendation = analysis['analysis_recommendation']
            user.ai_profile_summary = analysis.get('ai_profile_summary', '')
            user.ai_profile_payload = analysis.get('ai_profile_payload', {})
            user.ai_profile_error = analysis.get('ai_profile_error', '')
            if user.github_url:
                user.mark_github_connected()
            user.mark_profile_analyzed()
            user.consume_profile_analysis()
            user.save()
            return Response({
                'github_username': user.github_username,
                'github_profile_summary': user.github_profile_summary,
                'github_top_languages': user.github_top_languages,
                'resume_analysis_summary': user.resume_analysis_summary,
                'analysis_recommendation': user.analysis_recommendation,
                'ai_profile_summary': user.ai_profile_summary,
                'ai_profile_payload': user.ai_profile_payload,
                'profile_analyzed_at': user.profile_analyzed_at,
                'remaining_analysis_count': user.get_remaining_analysis_count(),
            })
        except Exception as exc:
            return Response({'error': f'분석 중 오류가 발생했습니다: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
