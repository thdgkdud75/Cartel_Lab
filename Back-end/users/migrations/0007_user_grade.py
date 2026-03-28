from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_user_class_group'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='grade',
            field=models.CharField(
                verbose_name='학년',
                max_length=1,
                choices=[('1', '1학년'), ('2', '2학년')],
                default='2',
            ),
        ),
    ]
