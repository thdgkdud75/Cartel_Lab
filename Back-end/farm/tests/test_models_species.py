import pytest
from farm.models import Species


@pytest.mark.django_db
def test_species_creation_with_stages():
    species = Species.objects.create(
        code="_test_chick",
        name="병아리",
        rarity="N",
        description="흔한 병아리",
        stages=[
            {"name": "병아리", "sprite_url": "/s/c1.png", "exp_to_next": 50},
            {"name": "큰 병아리", "sprite_url": "/s/c2.png", "exp_to_next": 200},
            {"name": "닭", "sprite_url": "/s/c3.png", "exp_to_next": 600},
            {"name": "수탉", "sprite_url": "/s/c4.png", "exp_to_next": None},
        ],
    )
    assert species.code == "_test_chick"
    assert species.rarity == "N"
    assert len(species.stages) == 4
    assert species.stages[3]["exp_to_next"] is None


@pytest.mark.django_db
def test_species_code_unique():
    Species.objects.create(code="_test_chick", name="병아리", rarity="N", description="", stages=[])
    with pytest.raises(Exception):
        Species.objects.create(code="_test_chick", name="다른병아리", rarity="R", description="", stages=[])
