from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Timetable",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("class_group", models.CharField(choices=[("A", "A반"), ("B", "B반")], max_length=1, verbose_name="반")),
                ("weekday", models.PositiveSmallIntegerField(choices=[(0, "월"), (1, "화"), (2, "수"), (3, "목"), (4, "금")], verbose_name="요일")),
                ("subject", models.CharField(max_length=100, verbose_name="수업명")),
                ("start_time", models.TimeField(verbose_name="시작시간")),
                ("end_time", models.TimeField(verbose_name="종료시간")),
            ],
            options={"ordering": ["class_group", "weekday", "start_time"]},
        ),
    ]
