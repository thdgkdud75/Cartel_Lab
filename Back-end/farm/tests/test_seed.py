import pytest
from farm.models import Species


@pytest.mark.django_db
def test_seeded_species_count():
    codes = set(Species.objects.values_list("code", flat=True))
    expected = {"chick", "rabbit", "fox", "cat", "dragon"}
    assert codes == expected, f"missing: {expected - codes}"


@pytest.mark.django_db
def test_seeded_species_have_4_stages():
    for sp in Species.objects.all():
        assert len(sp.stages) == 4, f"{sp.code} has {len(sp.stages)} stages"
        assert sp.stages[3]["exp_to_next"] is None
        for s in sp.stages[:3]:
            assert s["exp_to_next"] in (50, 200, 600)
