from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0002_quiz_ai_trap'),
    ]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='scheduled_date',
            field=models.DateField(
                verbose_name='출제 날짜',
                null=True,
                blank=True,
                help_text='1학년에게 공개할 날짜. 비워두면 저장 시 오늘 날짜로 설정됩니다.',
            ),
        ),
    ]
