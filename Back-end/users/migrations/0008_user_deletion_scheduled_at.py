from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_user_grade"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="deletion_scheduled_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="삭제 예정 일시"),
        ),
    ]
