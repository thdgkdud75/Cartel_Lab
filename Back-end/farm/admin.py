from django.contrib import admin
from farm.models import Species, UserFarm, UserAnimal, DailyInteraction


@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "rarity")
    list_filter = ("rarity",)
    search_fields = ("code", "name")


@admin.register(UserFarm)
class UserFarmAdmin(admin.ModelAdmin):
    list_display = ("dex_no", "user", "level", "coins", "total_exp", "streak_days")
    search_fields = ("user__student_id", "user__name")


@admin.register(UserAnimal)
class UserAnimalAdmin(admin.ModelAdmin):
    list_display = ("id", "farm", "species", "current_stage", "exp", "nickname")
    list_filter = ("species__rarity",)


@admin.register(DailyInteraction)
class DailyInteractionAdmin(admin.ModelAdmin):
    list_display = ("farm", "date", "pet_count", "feed_count")
    list_filter = ("date",)
