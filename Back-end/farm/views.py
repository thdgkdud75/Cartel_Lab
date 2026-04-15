from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from farm.models import UserFarm, UserAnimal, Species
from farm.serializers import FarmMeSerializer, AnimalSerializer, SpeciesSerializer
from farm.services import (
    draw_egg, feed_animal, pet_animal, set_nickname,
    EggError, NicknameError,
)


def _ensure_farm(user) -> UserFarm:
    farm, _ = UserFarm.objects.get_or_create(
        user=user,
        defaults={"dex_no": (UserFarm.objects.order_by("-dex_no").values_list("dex_no", flat=True).first() or 0) + 1},
    )
    return farm


def _err(code: str, status=400):
    return Response({"code": code}, status=status)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    farm = _ensure_farm(request.user)
    return Response(FarmMeSerializer(farm).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_animals(request):
    farm = _ensure_farm(request.user)
    qs = farm.animals.order_by("-acquired_at")
    return Response(AnimalSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_species(request):
    qs = Species.objects.all()
    res = Response(SpeciesSerializer(qs, many=True).data)
    res["Cache-Control"] = "max-age=86400"
    return res


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def draw(request):
    farm = _ensure_farm(request.user)
    egg_type = (request.data or {}).get("egg_type", "normal")
    try:
        animal = draw_egg(farm, egg_type)
    except EggError as e:
        return _err(e.code)
    events = [{
        "type": "egg_opened",
        "animal_id": animal.id,
        "rarity": animal.species.rarity,
        "species_code": animal.species.code,
    }]
    return Response({"animal": AnimalSerializer(animal).data, "events": events})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pet(request, animal_id):
    farm = _ensure_farm(request.user)
    animal = get_object_or_404(UserAnimal, pk=animal_id)
    if animal.farm_id != farm.id:
        return _err("NOT_OWNER", 403)
    try:
        result = pet_animal(farm, animal)
    except EggError as e:
        return _err(e.code)
    return Response({"events": result.events})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def feed(request, animal_id):
    farm = _ensure_farm(request.user)
    animal = get_object_or_404(UserAnimal, pk=animal_id)
    if animal.farm_id != farm.id:
        return _err("NOT_OWNER", 403)
    try:
        result = feed_animal(farm, animal)
    except EggError as e:
        return _err(e.code)
    return Response({"events": result.events})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_animal(request, animal_id):
    farm = _ensure_farm(request.user)
    animal = get_object_or_404(UserAnimal, pk=animal_id)
    if animal.farm_id != farm.id:
        return _err("NOT_OWNER", 403)
    nickname = (request.data or {}).get("nickname")
    if nickname is not None:
        try:
            set_nickname(animal, nickname)
        except NicknameError:
            return _err("INVALID_NICKNAME")
    return Response(AnimalSerializer(animal).data)
