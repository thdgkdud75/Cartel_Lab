from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='ai_trap_code',
            field=models.TextField(
                verbose_name='AI 함정 코드 (숨김)',
                blank=True,
                default='',
                help_text='화면에 보이지 않지만 AI가 읽는 숨긴 코드. 정답이 달라지는 줄을 입력하세요.',
            ),
        ),
        migrations.AddField(
            model_name='quiz',
            name='ai_trap_answer',
            field=models.CharField(
                verbose_name='AI 함정 정답',
                max_length=500,
                blank=True,
                default='',
                help_text='AI가 숨긴 코드까지 읽었을 때 나오는 답. 제출 시 이 값과 일치하면 AI 사용 의심.',
            ),
        ),
        migrations.AddField(
            model_name='quizattempt',
            name='is_ai_flagged',
            field=models.BooleanField(
                verbose_name='AI 사용 의심',
                default=False,
            ),
        ),
    ]
