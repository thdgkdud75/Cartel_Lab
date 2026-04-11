from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0003_checkoutrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancetimesetting',
            name='alarms_enabled',
            field=models.BooleanField(default=True, verbose_name='디스코드 봇 자동 알림 활성'),
        ),
    ]
