from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("planner", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="jobposting",
            name="detail_benefits",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="jobposting",
            name="detail_main_tasks",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="jobposting",
            name="detail_overview",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="jobposting",
            name="detail_preferred_points",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="jobposting",
            name="detail_required_skills",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="jobposting",
            name="detail_requirements",
            field=models.TextField(blank=True, default=""),
        ),
    ]
