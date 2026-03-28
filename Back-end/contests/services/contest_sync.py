import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from datetime import datetime, timedelta
from django.utils import timezone
from contests.models import Contest

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

class WevityScraper:
    BASE_URL = "https://www.wevity.com/"
    LIST_URL_TEMPLATE = "https://www.wevity.com/?c=find&s=1&gub=1&cidx=21&page={page}"

    def fetch(self, max_pages=3) -> list:
        headers = {"User-Agent": USER_AGENT}
        contest_list = []
        today = timezone.now().date()
        
        for page in range(1, max_pages + 1):
            url = self.LIST_URL_TEMPLATE.format(page=page)
            try:
                response = requests.get(url, headers=headers, timeout=15)
                response.raise_for_status()
            except Exception as e:
                print(f"Error fetching page {page}: {e}")
                break
            
            soup = BeautifulSoup(response.text, 'html.parser')
            rows = soup.select('ul.list > li')
            if not rows: break

            for row in rows:
                title_tag = row.select_one('.tit a')
                if not title_tag: continue
                
                title = title_tag.get_text(strip=True)
                relative_link = title_tag.get('href', '')
                
                # URL 절대 경로 보장
                if relative_link.startswith('http'):
                    external_url = relative_link
                else:
                    path = relative_link if relative_link.startswith('/') else '/' + relative_link
                    external_url = "https://www.wevity.com" + path
                
                # ID 추출
                external_id_match = re.search(r'(?:ix|id)=(\d+)', relative_link)
                external_id = external_id_match.group(1) if external_id_match else relative_link
                
                host = row.select_one('.organ').get_text(strip=True) if row.select_one('.organ') else "주최사 정보 없음"
                
                # 마감일 처리 및 활성 상태 판별 강화
                day_tag = row.select_one('.day')
                deadline_str = day_tag.get_text(strip=True) if day_tag else ""
                deadline_at = None
                is_active = True
                
                # 강력한 마감 감지 로직
                if any(k in deadline_str for k in ['D+', '마감', '종료', '종료된']) or '[마감]' in title:
                    is_active = False
                
                # 날짜 추출 및 과거 날짜 체크
                date_match = re.search(r'(\d{4}-\d{2}-\d{2})', deadline_str)
                if date_match:
                    try:
                        deadline_at = datetime.strptime(date_match.group(1), '%Y-%m-%d').date()
                        if deadline_at < today:
                            is_active = False
                    except ValueError:
                        pass
                else:
                    d_day_match = re.search(r'D-(\d+)', deadline_str)
                    if d_day_match:
                        days_left = int(d_day_match.group(1))
                        deadline_at = today + timedelta(days=days_left)
                    elif '오늘마감' in deadline_str or 'D-0' in deadline_str:
                        deadline_at = today
                
                # 카테고리 분류
                title_lower = title.lower()
                ai_keywords = ['생성형', 'ai', '인공지능', 'llm', 'gpt', '딥러닝', '머신러닝', '데이터', '빅데이터']
                dev_keywords = ['개발', '해커톤', 'sw', '소프트웨어', '알고리즘', '코딩', '웹', '앱', '프로그래밍', '백엔드', '프론트엔드']
                
                category = "기타 IT"
                if any(k in title_lower for k in ai_keywords):
                    category = "생성형 AI"
                elif any(k in title_lower for k in dev_keywords):
                    category = "SW 개발"
                
                contest_list.append({
                    'source': 'wevity',
                    'external_id': external_id,
                    'external_url': external_url,
                    'title': title,
                    'host': host,
                    'category': category,
                    'deadline_at': deadline_at,
                    'is_active': is_active
                })
        return contest_list

def sync_contests():
    scraper = WevityScraper()
    contests = scraper.fetch(max_pages=3)
    
    # 1. 수집을 시작하기 전, 위비티 소스의 모든 기존 공모전을 임시로 비활성화하지 않고
    # 수집된 최신 상태(마감 여부 포함)로 덮어씌웁니다.
    
    created_count = 0
    updated_count = 0
    
    for data in contests:
        obj, created = Contest.objects.update_or_create(
            source=data['source'],
            external_id=data['external_id'],
            defaults={
                'title': data['title'],
                'host': data['host'],
                'category': data['category'],
                'external_url': data['external_url'],
                'deadline_at': data['deadline_at'],
                'is_active': data['is_active'], # 여기서 False로 들어가면 목록에서 사라짐
            }
        )
        if created: created_count += 1
        else: updated_count += 1
            
    return {"created": created_count, "updated": updated_count}
