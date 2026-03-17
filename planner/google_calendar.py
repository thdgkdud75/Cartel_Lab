import json
from datetime import datetime, timedelta
from urllib import parse, request
from urllib.error import HTTPError, URLError

from django.conf import settings
from django.urls import reverse
from django.utils import timezone


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events openid email"


class GoogleCalendarError(Exception):
    pass


def is_configured():
    return bool(settings.GOOGLE_CALENDAR_CLIENT_ID and settings.GOOGLE_CALENDAR_CLIENT_SECRET)


def get_redirect_uri(request_obj):
    if settings.GOOGLE_CALENDAR_REDIRECT_URI:
        return settings.GOOGLE_CALENDAR_REDIRECT_URI
    return request_obj.build_absolute_uri(reverse("planner-google-calendar-callback"))


def build_authorization_url(request_obj, state):
    params = {
        "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
        "redirect_uri": get_redirect_uri(request_obj),
        "response_type": "code",
        "scope": GOOGLE_SCOPE,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + parse.urlencode(params)


def _parse_response(response):
    body = response.read().decode("utf-8")
    if not body:
        return {}
    return json.loads(body)


def _post_form(url, payload_dict):
    payload = parse.urlencode(payload_dict).encode("utf-8")
    req = request.Request(url=url, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with request.urlopen(req, timeout=10) as response:
        return _parse_response(response)


def _authorized_request(url, access_token, method="GET", payload_dict=None):
    data = None
    if payload_dict is not None:
        data = json.dumps(payload_dict).encode("utf-8")
    req = request.Request(url=url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {access_token}")
    req.add_header("Content-Type", "application/json")
    with request.urlopen(req, timeout=10) as response:
        return _parse_response(response)


def exchange_code_for_token(request_obj, code):
    try:
        token_data = _post_form(
            GOOGLE_TOKEN_URL,
            {
                "code": code,
                "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
                "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
                "redirect_uri": get_redirect_uri(request_obj),
                "grant_type": "authorization_code",
            },
        )
    except (HTTPError, URLError) as exc:
        raise GoogleCalendarError("구글 토큰 발급에 실패했습니다.") from exc

    if "access_token" not in token_data:
        raise GoogleCalendarError("구글 액세스 토큰 응답이 올바르지 않습니다.")

    return token_data


def refresh_access_token(refresh_token):
    if not refresh_token:
        raise GoogleCalendarError("리프레시 토큰이 없습니다. 다시 연결이 필요합니다.")

    try:
        return _post_form(
            GOOGLE_TOKEN_URL,
            {
                "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
                "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
    except (HTTPError, URLError) as exc:
        raise GoogleCalendarError("구글 액세스 토큰 갱신에 실패했습니다.") from exc


def fetch_google_email(access_token):
    try:
        user_info = _authorized_request(GOOGLE_USERINFO_URL, access_token)
    except (HTTPError, URLError) as exc:
        raise GoogleCalendarError("구글 사용자 정보를 가져오지 못했습니다.") from exc
    return user_info.get("email", "")


def token_expiry_from_seconds(expires_in):
    if not expires_in:
        return None
    return timezone.now() + timedelta(seconds=int(expires_in))


def ensure_valid_access_token(credential):
    expires_at = credential.token_expires_at
    if expires_at and expires_at > timezone.now() + timedelta(seconds=60):
        return credential.access_token

    refreshed = refresh_access_token(credential.refresh_token)
    credential.access_token = refreshed["access_token"]
    credential.token_expires_at = token_expiry_from_seconds(refreshed.get("expires_in"))
    credential.scope = refreshed.get("scope", credential.scope)
    credential.save(update_fields=["access_token", "token_expires_at", "scope", "updated_at"])
    return credential.access_token


def _event_payload(target_date, planned_time, summary, description):
    if planned_time:
        current_tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(datetime.combine(target_date, planned_time), current_tz)
        end_dt = start_dt + timedelta(hours=1)
        return {
            "summary": summary,
            "description": description,
            "start": {"dateTime": start_dt.isoformat(), "timeZone": settings.TIME_ZONE},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": settings.TIME_ZONE},
        }

    end_date = target_date + timedelta(days=1)
    return {
        "summary": summary,
        "description": description,
        "start": {"date": target_date.isoformat()},
        "end": {"date": end_date.isoformat()},
    }


def create_todo_event(credential, todo):
    access_token = ensure_valid_access_token(credential)
    payload = _event_payload(
        todo.target_date,
        todo.planned_time,
        todo.content,
        "Cartel Lab planner todo",
    )
    try:
        event = _authorized_request(
            GOOGLE_CALENDAR_EVENTS_URL,
            access_token,
            method="POST",
            payload_dict=payload,
        )
    except (HTTPError, URLError) as exc:
        raise GoogleCalendarError("구글 캘린더 일정 생성에 실패했습니다.") from exc
    return event.get("id", "")


def create_goal_event(credential, goal, goal_date):
    access_token = ensure_valid_access_token(credential)
    payload = _event_payload(
        goal_date,
        goal.planned_time,
        goal.content,
        "Cartel Lab planner goal",
    )
    try:
        event = _authorized_request(
            GOOGLE_CALENDAR_EVENTS_URL,
            access_token,
            method="POST",
            payload_dict=payload,
        )
    except (HTTPError, URLError) as exc:
        raise GoogleCalendarError("구글 캘린더 목표 일정 생성에 실패했습니다.") from exc
    return event.get("id", "")


def delete_event(credential, event_id):
    if not event_id:
        return

    access_token = ensure_valid_access_token(credential)
    try:
        _authorized_request(
            f"{GOOGLE_CALENDAR_EVENTS_URL}/{parse.quote(event_id, safe='')}",
            access_token,
            method="DELETE",
        )
    except HTTPError as exc:
        if exc.code != 404:
            raise GoogleCalendarError("구글 캘린더 일정 삭제에 실패했습니다.") from exc
    except URLError as exc:
        raise GoogleCalendarError("구글 캘린더 통신 오류로 삭제에 실패했습니다.") from exc


def list_events(credential, time_min, time_max):
    access_token = ensure_valid_access_token(credential)
    params = {
        "timeMin": time_min.isoformat(),
        "timeMax": time_max.isoformat(),
        "singleEvents": "true",
        "orderBy": "startTime",
        "showDeleted": "true",
        "maxResults": "2500",
    }

    events = []
    next_page_token = ""
    try:
        while True:
            current_params = dict(params)
            if next_page_token:
                current_params["pageToken"] = next_page_token

            url = GOOGLE_CALENDAR_EVENTS_URL + "?" + parse.urlencode(current_params)
            payload = _authorized_request(url, access_token, method="GET")
            events.extend(payload.get("items", []))
            next_page_token = payload.get("nextPageToken", "")
            if not next_page_token:
                break
    except (HTTPError, URLError) as exc:
        raise GoogleCalendarError("구글 캘린더 일정 목록 조회에 실패했습니다.") from exc

    return events
