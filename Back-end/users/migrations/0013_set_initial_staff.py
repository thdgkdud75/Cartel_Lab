from django.db import migrations


def make_initial_staff(apps, schema_editor):
    """초기 운영진 한 명에게 is_staff=True 부여. is_superuser 는 손대지 않음."""
    User = apps.get_model('users', 'User')
    target_discord_id = '374749253366448138'  # 박형석
    try:
        u = User.objects.get(discord_id=target_discord_id)
        if not u.is_staff:
            u.is_staff = True
            u.save(update_fields=['is_staff'])
            print(f'[migration 0013] discord_id {target_discord_id} -> is_staff=True')
        else:
            print(f'[migration 0013] discord_id {target_discord_id} 이미 staff')
    except User.DoesNotExist:
        print(f'[migration 0013] discord_id {target_discord_id} 못 찾음, 건너뜀')


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_clear_discord_ids'),
    ]

    operations = [
        migrations.RunPython(make_initial_staff, reverse_noop),
    ]
