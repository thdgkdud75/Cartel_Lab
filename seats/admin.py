from django.contrib import admin
from .models import Seat

@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ('number', 'user', 'is_occupied', 'entry_time', 'exit_time')
    list_editable = ('is_occupied',)

    def has_add_permission(self, request):
        # 10자리 고정이므로 추가 불가
        return False

    def has_delete_permission(self, request, obj=None):
        # 10자리 고정이므로 삭제 불가
        return False
