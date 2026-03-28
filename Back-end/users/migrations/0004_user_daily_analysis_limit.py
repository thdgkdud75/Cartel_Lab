from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_user_ai_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="daily_analysis_count",
            field=models.PositiveSmallIntegerField(default=0, verbose_name="일일 분석 횟수"),
        ),
        migrations.AddField(
            model_name="user",
            name="daily_analysis_date",
            field=models.DateField(blank=True, null=True, verbose_name="분석 횟수 기준일"),
        ),
    ]
