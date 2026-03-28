from datetime import timedelta

from django.db import migrations, models
from django.utils import timezone


def fill_labwidegoal_week_start(apps, schema_editor):
    LabWideGoal = apps.get_model("planner", "LabWideGoal")
    for goal in LabWideGoal.objects.all().iterator():
        created_local = timezone.localtime(goal.created_at) if goal.created_at else timezone.now()
        created_date = created_local.date()
        week_start = created_date - timedelta(days=created_date.weekday())
        goal.week_start = week_start
        goal.save(update_fields=["week_start"])


class Migration(migrations.Migration):

    dependencies = [
        ("planner", "0018_alter_dailytodo_color_alter_weeklygoal_color"),
    ]

    operations = [
        migrations.AddField(
            model_name="labwidegoal",
            name="week_start",
            field=models.DateField(blank=True, help_text="Week start date (Monday)", null=True),
        ),
        migrations.RunPython(fill_labwidegoal_week_start, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="labwidegoal",
            name="week_start",
            field=models.DateField(db_index=True, help_text="Week start date (Monday)"),
        ),
    ]
