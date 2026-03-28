from django.http import JsonResponse
from django.shortcuts import render

from certifications.services.certification_feed import get_important_certification_feed


def index(request):
    return render(request, "certifications/index.html")


def important_certifications_api(request):
    return JsonResponse(
        get_important_certification_feed(),
        json_dumps_params={"ensure_ascii": False},
    )
