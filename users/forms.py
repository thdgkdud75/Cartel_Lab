from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import UserCreationForm

from .models import User


class SignupForm(UserCreationForm):
    class Meta:
        model = User
        fields = ["student_id", "name", "password1", "password2"]
        labels = {
            "student_id": "학번",
            "name": "이름",
            "password1": "비밀번호",
            "password2": "비밀번호 확인",
        }


class LoginForm(forms.Form):
    student_id = forms.CharField(label="학번", max_length=20)
    password = forms.CharField(label="비밀번호", widget=forms.PasswordInput)

    error_messages = {
        "invalid_login": "학번 또는 비밀번호가 올바르지 않습니다.",
    }

    def __init__(self, request=None, *args, **kwargs):
        self.request = request
        self.user_cache = None
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()
        student_id = cleaned_data.get("student_id")
        password = cleaned_data.get("password")

        if student_id and password:
            self.user_cache = authenticate(
                self.request,
                student_id=student_id,
                password=password,
            )
            if self.user_cache is None:
                raise forms.ValidationError(
                    self.error_messages["invalid_login"],
                    code="invalid_login",
                )

        return cleaned_data

    def get_user(self):
        return self.user_cache
