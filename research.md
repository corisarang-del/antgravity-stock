# AntGravity Stock - Research Report
> 최종 업데이트: 2026-03-13

## 1. 프로젝트 개요

**AntGravity** (개미의 일기)는 개미 투자자를 위한 AI 기반 주식 분석 플랫폼이다.
한국 + 미국 주식을 동시 지원하며, AI 종목 진단, 포트폴리오 관리, 시장 심리 분석, 공모주 정보를 제공한다.
Supabase 인증 + Toss Payments 구독(₩4,900/월)으로 Free / Pro 티어를 운영한다.

**현재 상태**: 프로토타입 → 알파 단계. 기능 UI는 완성, 데이터는 전부 Mock.

---

## 2. 기술 스택

| 영역 | 기술 | 버전 |
|---|---|---|
| Framework | React + Vite | 18.3.1 / 5.4.19 |
| 언어 | TypeScript | 5.8.3 |
| 라우팅 | React Router DOM | 6.30.1 |
| 상태관리 | TanStack React Query | 5.83.0 |
| UI 컴포넌트 | shadcn/ui (Radix UI 기반) | - |
| 스타일링 | Tailwind CSS | 3.4.17 |
| 애니메이션 | Framer Motion | 12.35.1 |
| 차트 | Recharts | 2.15.4 |
| 아이콘 | Lucide React | 0.462.0 |
| 폼 검증 | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| 인증/DB | Supabase | - |
| 소셜로그인 | @lovable.dev/cloud-auth-js | - |
| 결제 | Toss Payments SDK | 2.5.0 |
| 테스팅 | Vitest + Testing Library | 3.2.4 |
| 패키지 매니저 | pnpm | - |

---

## 3. 라우팅 구조

```
/              → Diagnose.tsx   (AI 종목 진단 - 기본 진입점)
/home          → Index.tsx      (주식 상세 분석)
/portfolio     → Portfolio.tsx  (포트폴리오 - Pro 전용)
/watchlist     → Watchlist.tsx  (관심종목)
/alerts        → Alerts.tsx     (가격 알림)
/diary         → Diary.tsx      (시장심리 분석)
/tips          → Tips.tsx       (공모주 정보 - DART API 연동 시도)
/tips/:id      → TipsDetail.tsx (공모주 상세)
/upgrade       → Upgrade.tsx    (Pro 구독 페이지)
/payment/success → PaymentSuccess.tsx
/payment/fail    → PaymentFail.tsx
*              → NotFound.tsx
```

---

## 4. 페이지별 기능

### Diagnose.tsx (기본 페이지 `/`)
- 종목 검색 (심볼, 이름, 섹터 필터링)
- AI 종목 점수 (0-100, S~D 등급) + 신호 (STRONG BUY, BUY, HOLD, SELL)
- 5가지 요인 분석: 기술적 분석, 펀더멘털, 거래량 패턴, 감성 분석, 섹터 모멘텀
- 지원 종목: NVDA, AAPL, TSLA, MSFT, GOOGL, AMZN, META, PLTR, HOOD (미국) + 삼성전자, NAVER, SK하이닉스, 효성중공업, 현대모비스 (한국)

### Index.tsx (`/home`)
- 주식 헤더 (심볼, 현재가, 변동률)
- 탭: 차트(1M/2M/3M) | 재무제표 | 뉴스(감성 분석) | 목표가(애널리스트 평가)
- 우측 패널: AI 종합 분석 리포트

### Portfolio.tsx (`/portfolio`) — Pro 전용
- Free: 업그레이드 유도 화면
- Pro: 보유종목 추가/삭제, 섹터별 파이 차트, 수익률 계산, 종목별 바 차트

### Watchlist.tsx (`/watchlist`)
- Free 최대 5개 / Pro 무제한
- 종목 검색, 현재가/변동률 표시, 삭제

### Alerts.tsx (`/alerts`)
- Free 최대 2개 / Pro 무제한
- 이상(↑) / 이하(↓) 알림 유형, 활성/비활성 토글
- ⚠️ DB 저장만 구현됨, 실시간 Push 알림 미구현

### Diary.tsx (`/diary`)
- 공포 & 탐욕 지수 (0-100, 색상 그라데이션)
- 시장 온도계 (냉각 ↔ 과열)
- 종목별 투자자 심리 (강세/중립/약세%)
- AI 시황 일기 (날짜별, 무드 태그)

### Tips.tsx (`/tips`)
- DART API Supabase Edge Function 연동 시도 → 실패 시 Mock 데이터 표시
- 필터: 공모 예정 / 공모 중 / 상장 완료
- 공모주 카드: 회사명, 섹터, 공모가, 주간사

### Upgrade.tsx (`/upgrade`)
- Free vs Pro 비교표
- Pro 요금: ₩4,900/월
- Toss Payments 빌링키 인증 → 결제 → 성공/실패 페이지

---

## 5. 구독 시스템

```typescript
type Plan = "free" | "pro"
type Status = "free" | "active" | "cancelled" | "expired"

// isPro 조건
plan === "pro" && (status === "active" || status === "cancelled")
```

**Free 제한**:
- Watchlist: 최대 5개
- Alerts: 최대 2개
- Portfolio: 접근 불가

**Pro 기능**:
- 위 모든 제한 해제
- 포트폴리오 관리 접근

---

## 6. 데이터 모델 (Supabase Tables)

| 테이블 | 설명 |
|---|---|
| `profiles` | 사용자 기본 프로필 |
| `portfolio_holdings` | 보유 종목, 수량, 평균 단가 |
| `watchlist` | 관심 종목 리스트 |
| `price_alerts` | 목표가 알림 조건 |
| `subscriptions` | 구독 상태 및 결제 정보 |

---

## 7. 데이터 소스

**현재 상태: 모든 데이터 Mock**

`src/data/stockData.ts`:
- STOCKS: 14개 종목 (미국 9개, 한국 5개) - 심볼, 현재가, AI 예측 점수
- STOCK_FINANCIALS: 매출, 순이익, EPS, PER, PBR, ROE, 시가총액
- STOCK_NEWS: 종목별 뉴스 + 감성도
- ANALYST_TARGETS: 애널리스트 목표가 및 평가
- INDICES: S&P 500, NASDAQ, KOSPI, KOSDAQ, DOW, NIKKEI, 상해종합, CSI 300, VIX

`src/data/ipoData.ts`:
- IPO_DATA: 5-10개 공모주 정보 (Mock)

**유일한 실 API 시도**: Tips.tsx의 DART API (Supabase Edge Function `/dart-ipo`) → 현재 실패 시 폴백

---

## 8. 한국 / 미국 주식 구분

| 구분 | 심볼 형식 | 통화 |
|---|---|---|
| 미국 | 영문 코드 (`AAPL`, `NVDA`) | USD ($) |
| 한국 | 6자리 숫자 (`005930`, `000660`) | KRW (₩) |

---

## 9. 인증

- **방식**: Supabase Auth
- **소셜**: Google OAuth, Kakao OAuth (`@lovable.dev/cloud-auth-js`)
- **이메일**: Email/Password
- **세션**: `onAuthStateChange` 자동 감지

---

## 10. 스타일 시스템

| 요소 | 값 |
|---|---|
| 브랜드 색상 | 시안-청록 `hsl(180, 100%, 39%)` |
| 배경 | 크림색 `hsl(45, 45%, 96%)` |
| 상승(게인) | 녹색-테일 `hsl(162, 52%, 38%)` |
| 하락(손실) | 빨강 `hsl(350, 72%, 54%)` |
| 경고 | 황금색 `hsl(47, 100%, 50%)` |
| 본문 폰트 | Space Grotesk |
| 모노 폰트 | JetBrains Mono |
| 로고 폰트 | Playfair Display (이탤릭) |

**테마**: 90년대 애니메이션 감성 + 현대적 인터페이스
**다크모드**: `next-themes` ThemeProvider, CSS 변수 기반 (`class` 전략)

---

## 11. 구현 현황

### ✅ 완성
- AI 종목 진단 UI (검색, 점수, 요인 분석) — `/` 기본 진입점
- 주식 상세 분석 (차트, 재무제표, 뉴스, 목표가) — `/home`
- 포트폴리오 관리 (파이 차트, 수익률 계산)
- 관심종목 (Free/Pro 제한 적용)
- 가격 알림 (DB 저장, 토글)
- 시장심리 분석 (공포탐욕지수, 온도계, AI 일기)
- 인증 (Google/Kakao/Email)
- 결제 (Toss Payments 빌링키)
- 반응형 UI (모바일 하단 탭바)
- 다크모드 (next-themes, CSS 변수 기반)
- Diagnose → Home 심볼 전달 플로우 (location.state)

### ⚠️ 부분 구현
- 공모주 정보 (DART API 연동 시도, 현재 폴백)
- 실시간 알림 (저장만, Push 미구현)

### ❌ 미구현
- 실시간 주가 데이터 (WebSocket / 실제 API)
- Push 알림 / 이메일 알림
- 외부 API 완전 연동 (전부 Mock)
- 테스트 코드 (환경만 준비)

---

## 12. 파일 구조

```
src/
├── pages/          # 11개 페이지 컴포넌트
├── components/     # 재사용 UI 컴포넌트 (~25개)
│   └── ui/         # shadcn/ui 원본 컴포넌트
├── contexts/       # AuthContext.tsx
├── hooks/          # useAuth, useSubscription, usePortfolio, useWatchlist, useAlerts
├── data/           # stockData.ts, ipoData.ts (Mock)
├── integrations/
│   ├── supabase/   # client.ts, types.ts
│   └── lovable/    # 소셜 OAuth 통합
├── config/         # toss.ts (결제 설정)
├── lib/            # utils.ts (cn() 유틸)
└── App.tsx         # 라우팅 정의
docs/
├── PRD.md          # 제품 사양서
├── prompt/         # 개발 프롬프트 기록
└── 개발일지/        # 일자별 개발 일지
```

---

## 13. 주요 명령어

```bash
pnpm run dev       # 개발 서버 실행
pnpm lint          # ESLint 검사
pnpm typecheck     # TypeScript 타입 검사
pnpm test          # Vitest 테스트 실행
```

---

## 14. 향후 과제

1. **실제 주가 API 연동** (한국투자증권 API, Yahoo Finance 등)
2. **Push 알림 시스템** (Web Push API 또는 이메일)
3. **DART API 완전 연동** (공모주 실시간 데이터)
4. **테스트 코드 작성** (Vitest 환경 기반)
5. **성능 최적화** (React.lazy, 코드 스플리팅)
