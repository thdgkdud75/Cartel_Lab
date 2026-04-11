from django.db import migrations


def clear_discord_ids(apps, schema_editor):
    """기존 잘못된 discord_id 매핑 일괄 초기화. 이후 봇의 ㄷㄹ 명령으로 self-service 등록."""
    User = apps.get_model('users', 'User')
    updated = User.objects.exclude(discord_id='').update(discord_id='')
    print(f"[migration 0012] discord_id 초기화: {updated}건")


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_user_discord_id'),
    ]

    operations = [
        migrations.RunPython(clear_discord_ids, reverse_noop),
    ]
