from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_user_desired_job_direction_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='class_group',
            field=models.CharField(blank=True, choices=[('A', 'A반'), ('B', 'B반')], default='', max_length=1, verbose_name='반'),
        ),
    ]
