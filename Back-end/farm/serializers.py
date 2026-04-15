from rest_framework import serializers
from farm.models import Species, UserFarm, UserAnimal, DailyInteraction
from farm import constants as C
from django.utils import timezone


class SpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Species
        fields = ["id", "code", "name", "rarity", "description", "stages"]


class AnimalSerializer(serializers.ModelSerializer):
    species = SpeciesSerializer(read_only=True)
    current_sprite_url = serializers.SerializerMethodField()

    class Meta:
        model = UserAnimal
        fields = [
            "id", "species", "current_stage", "exp",
            "affection", "nickname", "acquired_at", "current_sprite_url",
        ]

    def get_current_sprite_url(self, obj):
        try:
            return obj.species.stages[obj.current_stage]["sprite_url"]
        except (IndexError, KeyError):
            return None


class FarmMeSerializer(serializers.ModelSerializer):
    displayed_animals = serializers.SerializerMethodField()
    daily_remaining = serializers.SerializerMethodField()

    class Meta:
        model = UserFarm
        fields = [
            "dex_no", "level", "display_slots", "coins", "total_exp",
            "streak_days", "last_attendance_date", "pity_normal",
            "displayed_animals", "daily_remaining",
        ]

    def get_displayed_animals(self, farm):
        qs = farm.animals.order_by("-acquired_at")[: farm.display_slots]
        return AnimalSerializer(qs, many=True).data

    def get_daily_remaining(self, farm):
        today = timezone.localdate()
        di = DailyInteraction.objects.filter(farm=farm, date=today).first()
        used_pet = di.pet_count if di else 0
        used_feed = di.feed_count if di else 0
        return {
            "pet": max(0, C.DAILY_PET_LIMIT - used_pet),
            "feed": max(0, C.DAILY_FEED_LIMIT - used_feed),
        }
