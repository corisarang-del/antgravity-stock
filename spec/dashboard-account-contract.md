# dashboard account contract

> 최종 업데이트: 2026-03-28 22:40 KST
> 이 문서는 `Watchlist`, `Alerts`, `Portfolio` 3개 계정형 기능의 현재 read/write 계약과 전환 상태를 고정한다.

## 1. 범위

- `src/hooks/useWatchlist.ts`
- `src/hooks/useAlerts.ts`
- `src/hooks/usePortfolio.ts`
- `src/lib/apiClient.ts`
- `backend/routers/dashboard.py`
- `backend/services/dashboard_supabase_service.py`
- `backend/repositories/dashboard_supabase.py`

이 문서는 `subscriptions`나 Toss 결제 흐름은 다루지 않는다.

## 2. 현재 전환 상태표

| 영역 | 읽기 계약 | 쓰기 계약 | 프론트 현재 동작 |
|------|-----------|-----------|------------------|
| Watchlist | `GET /api/dashboard/watchlist` | `POST /api/dashboard/watchlist`, `DELETE /api/dashboard/watchlist/{item_id}` | API 먼저 호출 후 실패 시 Supabase `watchlist` 직접 폴백 |
| Alerts | `GET /api/dashboard/alerts` | `POST /api/dashboard/alerts`, `PATCH /api/dashboard/alerts/{alert_id}`, `DELETE /api/dashboard/alerts/{alert_id}` | API 먼저 호출 후 실패 시 Supabase `price_alerts` 직접 폴백 |
| Portfolio | `GET /api/dashboard/portfolio/holdings`, `GET /api/dashboard/portfolio/summary` | `POST /api/dashboard/portfolio/holdings`, `DELETE /api/dashboard/portfolio/holdings/{holding_id}` | API 먼저 호출 후 실패 시 Supabase `portfolio_holdings` 직접 폴백 |

## 3. read 계약

### 3.1. Watchlist

- 엔드포인트: `GET /api/dashboard/watchlist`
- 응답:

```json
{
  "items": [
    {
      "id": "string",
      "symbol": "string",
      "name": "string",
      "sector": "string",
      "addedAt": "ISO-8601"
    }
  ]
}
```

### 3.2. Alerts

- 엔드포인트: `GET /api/dashboard/alerts`
- 응답:

```json
{
  "items": [
    {
      "id": "string",
      "symbol": "string",
      "name": "string",
      "alertType": "above | below",
      "targetPrice": 0,
      "isActive": true,
      "createdAt": "ISO-8601"
    }
  ],
  "triggered": [
    {
      "title": "string",
      "message": "string",
      "status": "triggered"
    }
  ]
}
```

### 3.3. Portfolio

- 엔드포인트:
  - `GET /api/dashboard/portfolio/holdings`
  - `GET /api/dashboard/portfolio/summary`
- 응답:

```json
{
  "items": [
    {
      "id": "string",
      "symbol": "string",
      "name": "string",
      "quantity": 0,
      "avgPrice": 0,
      "currentPrice": 0,
      "sector": "string"
    }
  ]
}
```

```json
{
  "total_cost_basis": 0,
  "total_market_value": 0,
  "total_profit_loss": 0,
  "total_return_rate": 0,
  "calculated_at": "ISO-8601"
}
```

## 4. write 계약

### 4.1. Watchlist

- 생성:

```json
POST /api/dashboard/watchlist
{
  "symbol": "NVDA",
  "name": "NVIDIA Corp.",
  "sector": "Tech"
}
```

- 삭제:
  - `DELETE /api/dashboard/watchlist/{item_id}`

### 4.2. Alerts

- 생성:

```json
POST /api/dashboard/alerts
{
  "symbol": "NVDA",
  "name": "NVIDIA Corp.",
  "condition_type": "above",
  "target_price": 1000,
  "delivery_channels": ["toast"]
}
```

- 수정:

```json
PATCH /api/dashboard/alerts/{alert_id}
{
  "status": "active | paused",
  "target_price": 950
}
```

- 삭제:
  - `DELETE /api/dashboard/alerts/{alert_id}`

### 4.3. Portfolio

- 생성:

```json
POST /api/dashboard/portfolio/holdings
{
  "symbol": "NVDA",
  "name": "NVIDIA Corp.",
  "sector": "Tech",
  "quantity": 3,
  "buy_price": 850,
  "current_price": 875
}
```

- 삭제:
  - `DELETE /api/dashboard/portfolio/holdings/{holding_id}`

- 참고:
  - `PATCH /api/dashboard/portfolio/holdings/{holding_id}`는 백엔드에 있으나 현재 프론트 UX에서는 직접 사용하지 않는다

## 5. 현재 결정

- 프론트 Supabase 직접 폴백은 즉시 제거하지 않는다
- 정책: 인증된 read/write smoke test 완료 전까지 한시 유지

### 5.1. 제거 조건

1. 로컬에서 로그인 후 `watchlist`, `alerts`, `portfolio` read/write 검증 완료
2. 운영 배포에서 같은 흐름 검증 완료
3. API 오류 응답과 Pro 게이팅 동작이 화면에서 정상 확인됨
4. React Query 기준의 최종 데이터 흐름으로 훅 리팩터링 범위 확정
