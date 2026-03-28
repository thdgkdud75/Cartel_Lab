from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_user_expo_push_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_image',
            field=models.ImageField(blank=True, null=True, upload_to='profiles/', verbose_name='프로필 사진'),
        ),
    ]
