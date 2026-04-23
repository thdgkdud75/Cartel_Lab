from django.db import migrations


SEED = [
    ("chick", "병아리", "N", "마당의 흔한 병아리.", "chick"),
    ("rabbit", "토끼", "R", "한가로이 풀을 뜯는 토끼.", "rabbit"),
    ("fox", "여우", "SR", "꼬리가 풍성한 여우.", "fox"),
    ("cat", "고양이", "R", "낮잠을 즐기는 고양이.", "cat"),
    ("dragon", "꼬마용", "SSR", "전설 속 작은 용.", "dragon"),
]


def forwards(apps, schema_editor):
    Species = apps.get_model("farm", "Species")
    for code, name, rarity, desc, prefix in SEED:
        Species.objects.update_or_create(
            code=code,
            defaults={
                "name": name,
                "rarity": rarity,
                "description": desc,
                "stages": [
                    {"name": f"{name} 1단계", "sprite_url": f"/sprites/{prefix}_1.svg", "exp_to_next": 50},
                    {"name": f"{name} 2단계", "sprite_url": f"/sprites/{prefix}_2.svg", "exp_to_next": 200},
                    {"name": f"{name} 3단계", "sprite_url": f"/sprites/{prefix}_3.svg", "exp_to_next": 600},
                    {"name": f"{name} 4단계", "sprite_url": f"/sprites/{prefix}_4.svg", "exp_to_next": None},
                ],
            },
        )


def backwards(apps, schema_editor):
    Species = apps.get_model("farm", "Species")
    Species.objects.filter(code__in=[c for c, *_ in SEED]).delete()


class Migration(migrations.Migration):
    dependencies = [("farm", "0002_userfarm_useranimal_dailyinteraction")]
    operations = [migrations.RunPython(forwards, backwards)]
