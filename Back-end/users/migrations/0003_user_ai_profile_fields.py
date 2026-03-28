from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_user_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="ai_profile_error",
            field=models.TextField(blank=True, default="", verbose_name="AI 프로필 오류"),
        ),
        migrations.AddField(
            model_name="user",
            name="ai_profile_payload",
            field=models.JSONField(blank=True, default=dict, verbose_name="AI 프로필 구조화 데이터"),
        ),
        migrations.AddField(
            model_name="user",
            name="ai_profile_summary",
            field=models.TextField(blank=True, default="", verbose_name="AI 프로필 요약"),
        ),
    ]
