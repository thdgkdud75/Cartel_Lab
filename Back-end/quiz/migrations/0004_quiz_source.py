from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0003_quiz_scheduled_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="quiz",
            name="source",
            field=models.CharField(
                choices=[("manual", "기존 방식"), ("github", "MD 파일")],
                default="manual",
                max_length=10,
                verbose_name="출제 방식",
            ),
        ),
    ]
