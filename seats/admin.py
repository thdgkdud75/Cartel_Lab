from django.contrib import admin
from .models import Seat

@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ('number', 'is_occupied')
    list_editable = ('is_occupied',)
