from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import UserCreationForm

from .models import User


class SignupForm(UserCreationForm):
    class Meta:
        model = User
        fields = ["student_id", "name", "class_group", "password1", "password2"]
        labels = {
            "student_id": "학번",
            "name": "이름",
            "class_group": "반",
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


class BasicInfoForm(forms.ModelForm):
    new_password1 = forms.CharField(label="새 비밀번호", widget=forms.PasswordInput, required=False)
    new_password2 = forms.CharField(label="새 비밀번호 확인", widget=forms.PasswordInput, required=False)

    class Meta:
        model = User
        fields = ["name", "class_group"]
        labels = {
            "name": "이름",
            "class_group": "반",
        }

    def clean(self):
        cleaned_data = super().clean()
        pw1 = cleaned_data.get("new_password1")
        pw2 = cleaned_data.get("new_password2")
        if pw1 or pw2:
            if pw1 != pw2:
                self.add_error("new_password2", "비밀번호가 일치하지 않습니다.")
        return cleaned_data


class ProfileUpdateForm(forms.ModelForm):
    resume_file = forms.FileField(label="이력서 파일", required=False)
    job_direction_choice = forms.ChoiceField(
        label="희망 방향",
        required=False,
        widget=forms.RadioSelect,
    )
    desired_job_direction_other = forms.CharField(label="기타 희망 방향", required=False, max_length=120)

    class Meta:
        model = User
        fields = ["github_url", "resume_file", "desired_job_direction_other"]
        labels = {
            "github_url": "GitHub 링크",
            "resume_file": "이력서 파일",
            "desired_job_direction_other": "기타 희망 방향",
        }

    def __init__(self, *args, role_choices=None, **kwargs):
        super().__init__(*args, **kwargs)
        choices = [("", "아직 선택하지 않음")]
        choices.extend(role_choices or [])
        choices.append(("__other__", "기타"))
        self.fields["job_direction_choice"].choices = choices

        initial_direction = ""
        initial_other = self.instance.desired_job_direction_other if self.instance.pk else ""
        if initial_other:
            initial_direction = "__other__"
        elif self.instance.pk and self.instance.desired_job_direction:
            current_value = self.instance.desired_job_direction
            choice_values = {value for value, _label in choices}
            initial_direction = current_value if current_value in choice_values else "__other__"
            if initial_direction == "__other__" and not initial_other:
                initial_other = current_value

        self.fields["job_direction_choice"].initial = initial_direction
        self.fields["desired_job_direction_other"].initial = initial_other

    def clean_github_url(self):
        value = (self.cleaned_data.get("github_url") or "").strip()
        if value and "github.com" not in value:
            raise forms.ValidationError("GitHub 프로필 링크를 입력해 주세요.")
        return value

    def clean_resume_file(self):
        uploaded = self.cleaned_data.get("resume_file")
        if not uploaded:
            return uploaded

        name = uploaded.name.lower()
        if not (name.endswith(".pdf") or name.endswith(".txt")):
            raise forms.ValidationError("이력서는 PDF 또는 TXT 파일만 업로드할 수 있습니다.")
        return uploaded

    def clean(self):
        cleaned_data = super().clean()
        choice = cleaned_data.get("job_direction_choice", "")
        other = (cleaned_data.get("desired_job_direction_other") or "").strip()

        if choice == "__other__" and not other:
            self.add_error("desired_job_direction_other", "기타 방향을 직접 입력해 주세요.")

        if choice != "__other__":
            cleaned_data["desired_job_direction_other"] = ""
        return cleaned_data
