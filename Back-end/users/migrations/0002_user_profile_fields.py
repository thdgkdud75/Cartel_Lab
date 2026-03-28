from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="analysis_recommendation",
            field=models.TextField(blank=True, default="", verbose_name="학습 추천"),
        ),
        migrations.AddField(
            model_name="user",
            name="github_connected_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="GitHub 연동 일시"),
        ),
        migrations.AddField(
            model_name="user",
            name="github_profile_summary",
            field=models.TextField(blank=True, default="", verbose_name="GitHub 분석 요약"),
        ),
        migrations.AddField(
            model_name="user",
            name="github_top_languages",
            field=models.TextField(blank=True, default="", verbose_name="GitHub 주요 언어"),
        ),
        migrations.AddField(
            model_name="user",
            name="github_url",
            field=models.URLField(blank=True, default="", verbose_name="GitHub 링크"),
        ),
        migrations.AddField(
            model_name="user",
            name="github_username",
            field=models.CharField(blank=True, default="", max_length=100, verbose_name="GitHub 아이디"),
        ),
        migrations.AddField(
            model_name="user",
            name="profile_analyzed_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="분석 일시"),
        ),
        migrations.AddField(
            model_name="user",
            name="resume_analysis_summary",
            field=models.TextField(blank=True, default="", verbose_name="이력서 분석 요약"),
        ),
        migrations.AddField(
            model_name="user",
            name="resume_extracted_text",
            field=models.TextField(blank=True, default="", verbose_name="이력서 추출 텍스트"),
        ),
        migrations.AddField(
            model_name="user",
            name="resume_file",
            field=models.FileField(blank=True, null=True, upload_to="resumes/", verbose_name="이력서 파일"),
        ),
    ]
