from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_user_deletion_scheduled_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='expo_push_token',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name='Expo 푸시 토큰'),
        ),
    ]
