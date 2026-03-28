import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Quiz',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='제목')),
                ('code_snippet', models.TextField(blank=True, default='', verbose_name='코드')),
                ('question', models.TextField(verbose_name='문제 설명')),
                ('answer', models.CharField(max_length=500, verbose_name='정답')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='출제일시')),
                ('created_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='created_quizzes',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='출제자',
                )),
            ],
            options={
                'verbose_name': '퀴즈',
                'verbose_name_plural': '퀴즈 목록',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='QuizAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('submitted_answer', models.CharField(max_length=500, verbose_name='제출 답변')),
                ('is_correct', models.BooleanField(verbose_name='정답 여부')),
                ('attempted_at', models.DateTimeField(auto_now_add=True, verbose_name='응시일시')),
                ('quiz', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='attempts',
                    to='quiz.quiz',
                    verbose_name='퀴즈',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='quiz_attempts',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='응시자',
                )),
            ],
            options={
                'verbose_name': '퀴즈 응시',
                'verbose_name_plural': '퀴즈 응시 목록',
                'ordering': ['-attempted_at'],
            },
        ),
    ]
