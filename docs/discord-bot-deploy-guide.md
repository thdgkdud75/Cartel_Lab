# 디스코드 출결 봇 — 실서버 배포 가이드

## 1. 코드 push

현재 master 브랜치에 디스코드 봇 코드가 모두 포함되어 있음. Railway에 연결된 repo에 push.

```bash
git push origin master
```

## 2. Railway 환경변수 추가

Railway 대시보드 → 기존 web 서비스 → Variables에 추가:

```
DISCORD_BOT_TOKEN=<디스코드 봇 토큰>
DISCORD_CHANNEL_ID=<출결 채널 ID>
```

환경변수가 설정되면 entrypoint.sh에서 자동으로 봇을 백그라운드로 실행함.
별도 서비스 추가 불필요 — web 서비스와 같이 돌아감.

## 3. DB 마이그레이션

deploy 시 entrypoint.sh에서 자동으로 migrate 실행됨.
수동으로 하려면:

```bash
railway run python manage.py migrate users
```

## 4. 유저 매핑

Django Admin 페이지에서 각 유저의 discord_id 필드에 디스코드 ID 입력.

또는 shell에서:

```bash
railway run python manage.py shell -c "
from users.models import User
u = User.objects.get(name='홍길동')
u.discord_id = '디스코드ID숫자'
u.save(update_fields=['discord_id'])
print(f'{u.name} 매핑 완료')
"
```

## 5. 디스코드 봇 설정 확인

- Developer Portal → **봇** 탭 → **"Requires OAuth2 Code Grant"** OFF
- 봇이 해당 서버에 초대되어 있어야 함
- 봇에 **Message Content Intent** 권한 ON (Developer Portal → 봇 → Privileged Gateway Intents)

## 6. 확인사항

- [ ] 코드 push 완료
- [ ] Railway 환경변수 (DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID) 설정 완료
- [ ] 유저별 discord_id 매핑 완료
- [ ] 디스코드 채널에서 `ㅊㅅ` 테스트 → ✅ 리액션 확인
- [ ] 10:00 / 10:30 / 20:00 알림 정상 동작 확인
