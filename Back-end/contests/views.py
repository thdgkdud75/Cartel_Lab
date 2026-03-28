from django.shortcuts import render
from django.db.models import F, Q
from django.utils import timezone
from .models import Contest

def contest_list(request):
    category = request.GET.get('category', '')
    today = timezone.now().date()
    
    # 1. 활성화 상태이고 2. 마감일이 오늘 이후이거나 없는(상시) 공고만 필터링
    contests = Contest.objects.filter(
        is_active=True
    ).filter(
        Q(deadline_at__gte=today) | Q(deadline_at__isnull=True)
    ).order_by(
        F('deadline_at').asc(nulls_last=True), 
        '-created_at'
    )
    
    if category:
        contests = contests.filter(category=category)
        
    context = {
        'contests': contests,
        'current_category': category,
    }
    return render(request, 'contests/list.html', context)
