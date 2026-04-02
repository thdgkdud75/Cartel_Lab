from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from seats.models import Seat


class SeatsApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            student_id="20240001",
            password="testpass123",
            name="일반 사용자",
            grade="2",
            class_group="A",
        )
        self.admin = user_model.objects.create_superuser(
            student_id="20249999",
            password="testpass123",
            name="관리자",
        )

    def test_status_api_returns_ten_default_seats_for_anonymous_user(self):
        response = self.client.get(reverse("seat-status-api"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["seats"]), 10)
        self.assertEqual(Seat.objects.count(), 10)
        self.assertFalse(response.data["is_superuser"])
        self.assertFalse(response.data["can_select_empty_seat"])

    def test_status_api_marks_authenticated_user_capabilities(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("seat-status-api"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["can_select_empty_seat"])

    def test_register_seat_assigns_user(self):
        Seat.objects.bulk_create([Seat(number=index) for index in range(1, 11)])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(reverse("seat-register-api", kwargs={"seat_number": 3}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        seat = Seat.objects.get(number=3)
        self.assertEqual(seat.user, self.user)
        self.assertTrue(seat.is_occupied)

    def test_general_user_cannot_register_second_seat(self):
        Seat.objects.bulk_create([Seat(number=index) for index in range(1, 11)])
        first_seat = Seat.objects.get(number=2)
        first_seat.user = self.user
        first_seat.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("seat-register-api", kwargs={"seat_number": 5}))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("이미 배정된 좌석", response.data["error"])
        self.assertEqual(Seat.objects.get(number=5).user, None)

    def test_admin_can_clear_any_seat(self):
        Seat.objects.bulk_create([Seat(number=index) for index in range(1, 11)])
        occupied_seat = Seat.objects.get(number=4)
        occupied_seat.user = self.user
        occupied_seat.save()

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("seat-admin-clear-api", kwargs={"seat_number": 4}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        occupied_seat.refresh_from_db()
        self.assertIsNone(occupied_seat.user)
        self.assertFalse(occupied_seat.is_occupied)

    def test_general_user_cannot_clear_seat(self):
        Seat.objects.bulk_create([Seat(number=index) for index in range(1, 11)])
        occupied_seat = Seat.objects.get(number=6)
        occupied_seat.user = self.admin
        occupied_seat.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("seat-admin-clear-api", kwargs={"seat_number": 6}))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        occupied_seat.refresh_from_db()
        self.assertEqual(occupied_seat.user, self.admin)
