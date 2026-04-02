from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from certifications.services.certification_feed import get_important_certification_feed


class ImportantCertificationsApiView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(get_important_certification_feed())
