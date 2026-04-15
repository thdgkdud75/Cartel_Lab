from django.conf import settings
from django.db import models


class Species(models.Model):
    RARITY_CHOICES = [("N", "N"), ("R", "R"), ("SR", "SR"), ("SSR", "SSR")]

    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=64)
    rarity = models.CharField(max_length=4, choices=RARITY_CHOICES)
    description = models.TextField(blank=True)
    stages = models.JSONField(default=list)  # [{name, sprite_url, exp_to_next}, ...]

    def __str__(self):
        return f"{self.name} ({self.rarity})"


class UserFarm(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="farm",
    )
    dex_no = models.PositiveIntegerField(unique=True)
    level = models.PositiveSmallIntegerField(default=1)
    display_slots = models.PositiveSmallIntegerField(default=5)
    coins = models.PositiveIntegerField(default=0)
    total_exp = models.PositiveIntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    last_attendance_date = models.DateField(null=True, blank=True)
    pity_normal = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"farm#{self.dex_no}({self.user})"


class UserAnimal(models.Model):
    farm = models.ForeignKey(UserFarm, on_delete=models.CASCADE, related_name="animals")
    species = models.ForeignKey(Species, on_delete=models.PROTECT)
    current_stage = models.PositiveSmallIntegerField(default=0)
    exp = models.PositiveIntegerField(default=0)
    affection = models.PositiveIntegerField(default=0)
    nickname = models.CharField(max_length=12, null=True, blank=True)
    acquired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["farm", "-acquired_at"])]


class DailyInteraction(models.Model):
    farm = models.ForeignKey(UserFarm, on_delete=models.CASCADE, related_name="daily")
    date = models.DateField()
    pet_count = models.PositiveIntegerField(default=0)
    feed_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("farm", "date")
