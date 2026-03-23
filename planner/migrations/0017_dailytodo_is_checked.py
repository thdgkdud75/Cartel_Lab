from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0016_alter_jobmarketsnapshot_analysis_key_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailytodo",
            name="is_checked",
            field=models.BooleanField(default=False),
        ),
    ]
