# GitHub Secrets 등록 가이드

`daily-data-refresh.yml` 워크플로우가 Supabase에 접근하려면 아래 3개 Secrets가 필요해.

---

## 등록 방법

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

---

## 필요한 Secrets

| Secret 이름 | 값 위치 | 설명 |
|------------|--------|------|
| `SUPABASE_URL` | Supabase 대시보드 → Project Settings → API → Project URL | 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 대시보드 → Project Settings → API → `service_role` (secret) | RLS 우회 전용 키 |
| `DART_API_KEY` | https://opendart.fss.or.kr → 인증키 신청 | dartlab이 DART API 호출 시 필요 |

> `SUPABASE_SERVICE_ROLE_KEY`는 절대 프론트엔드에 노출하면 안 됨.
> GitHub Secrets과 서버 `.env`에만 보관.

---

## 수동 실행 테스트

등록 후 GitHub Actions 탭 → **Daily Financial Data Refresh** → **Run workflow** 클릭.

특정 심볼만 테스트하려면 `symbol` 입력란에 `NVDA AAPL` 형식으로 입력.

---

## 실패 알림

워크플로우 실패 시 GitHub에서 등록된 이메일로 자동 알림 전송.
추가 알림(Slack 등)이 필요하면 워크플로우에 `actions/slack-send` 스텝 추가 가능.
