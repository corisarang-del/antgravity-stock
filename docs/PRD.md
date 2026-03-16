# 제품 사양 및 개발 스펙 (PRD)

## 1. 프로젝트 목적

AntGravity는 개미 투자자를 위한 AI 기반 주식 예측·분석 플랫폼이다.
AI 진단 점수, 차트, 재무제표, 뉴스 감성 분석, 애널리스트 목표가를 한 곳에서 제공하여
더 나은 투자 의사결정을 돕는다.

## 2. 사용자 가치

- 종목 검색 → AI 진단 점수(0~100) + 등급(S/A/B/C/D)으로 매수 적합성 즉시 파악
- 차트, 재무제표, 뉴스, 애널리스트 목표가를 탭 하나로 전환
- 다크/라이트 모드 지원
- 포트폴리오 관리 및 섹터별 비중 시각화
- 관심 종목 알림 등록

## 3. 핵심 라우팅

| 경로 | 컴포넌트 | 역할 |
|------|----------|------|
| `/` | `Diagnose.tsx` | AI 종목 진단 랜딩 (검색 → 진단 결과 → 상세 분석 이동) |
| `/home` | `Index.tsx` | 종목 상세 분석 대시보드 (StockDetailPanel 인라인) |
| `/stock/:symbol` | `StockDetail.tsx` | 직접 URL 접근용 상세 페이지 (StockDetailPanel 공유) |
| `/portfolio` | `Portfolio.tsx` | 포트폴리오 관리 |
| `/watchlist` | `Watchlist.tsx` | 관심 종목 |
| `/alerts` | `Alerts.tsx` | 가격 알림 |
| `/diary` | `Diary.tsx` | 개미의 일기 (AI 시황 일기) |
| `/tips` | `Tips.tsx` | 꿀팁 정보 (IPO 캘린더 포함) |
| `/tips/:id` | `TipsDetail.tsx` | 꿀팁 상세 페이지 |
| `/upgrade` | `Upgrade.tsx` | 구독 플랜 (토스페이먼츠 연동) |
| `/pro` | `ProDashboard.tsx` | 프로 유저 전용 대시보드 |
| `/payment/*` | `PaymentSuccess.tsx` / `PaymentFail.tsx` | 결제 성공/실패 콜백 |

## 4. 핵심 기능 스펙

### 4.1. AI 종목 진단 (`/`)

- 종목명 또는 티커 검색 (실시간 드롭다운)
- suggestion chip: NVIDIA, 삼성전자, SK하이닉스 등 8개 기본 제공
- 진단 결과 카드:
  - AI 점수 링(0~100) + 등급(S/A/B/C/D)
  - 매수/매도/보유 신호
  - 요인 분석 (기술적/펀더멘털/거래량/감성/섹터 모멘텀)
  - 핵심 지표 3종 (변동률, AI 점수, 신호)
- "상세 분석 보기" → `/home?state.symbol` 으로 이동

### 4.2. 종목 상세 분석 (`/home`)

- `StockDetailPanel` 공통 컴포넌트로 렌더링
- 종목 히어로: symbol, name, sector, 현재가, 등락률, AI 신호 배지
- 탭 (4종):
  - **차트**: 1M/2M/3M 실제가격 + AI예측선 오버레이
  - **재무제표**: `FinancialSummary`
  - **뉴스**: `NewsFeed` (감성 분석 포함)
  - **목표가**: `AnalystTargets`
- 우측 AI 분석 패널: `PredictionPanel` (Pro 구독 게이팅)

### 4.3. 공통 컴포넌트 구조

```
StockDetailPanel(symbol)
  ├── 종목 히어로 섹션
  ├── 탭 바 (차트/재무/뉴스/목표가)
  │   ├── StockChart
  │   ├── FinancialSummary
  │   ├── NewsFeed
  │   └── AnalystTargets
  └── PredictionPanel (AI 분석)
```

`/home`과 `/stock/:symbol` 모두 `StockDetailPanel`을 공유하여 UI 일관성 유지.

### 4.4. 시장 심리 분석

- **공포 & 탐욕 지수**: 0~100 점수로 시장 심리 표현
- **마켓 티커**: 상단 실시간 시세 흐름 표시 (`MarketTicker`)

### 4.5. 개미의 일기 (`/diary`)

- AI 기반 시황 일기 열람
- 날짜별 시장 무드(강세/약세/중립) 표시

### 4.6. 포트폴리오 관리 (`/portfolio`)

- 보유 종목 추가/수정/삭제
- 평균 단가 대비 수익률 계산
- 섹터별 자산 비중 파이 차트

### 4.7. 결제 및 구독 (Pro)

- 토스페이먼츠 연동 월간 구독 (₩4,900/월, 언제든 취소)
- Pro 사용자: AI 예측 분석 패널 잠금 해제
- `ProGate` 컴포넌트: blur 모드(블러 처리) / block 모드(완전 차단)
- `PricingModal`: 인라인 결제 유도 모달
- `useSubscription` 훅: 구독 상태 관리 (isPro, confirmPayment, cancelSubscription)
- `PaymentSuccess` / `PaymentFail`: 토스 콜백 처리 페이지

### 4.8. 프로 유저 전용 대시보드 (`/pro`)

- 결제 완료된 Pro 유저만 접근 가능 (비인증/Free 유저 → `/upgrade` 리다이렉트)
- 주요 기능:
  - AI 포트폴리오 추천 위젯
  - 실시간 AI 종목 스크리닝 (조건 필터링)
  - 고급 예측 차트 (3개월 이상 예측선)
  - 시장 심리 상세 분석 (Fear & Greed 트렌드)
  - Pro 전용 뉴스레터/시황 리포트

## 5. 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18 + TypeScript + Vite |
| 스타일 | Tailwind CSS + shadcn/ui |
| 애니메이션 | Framer Motion |
| 라우팅 | React Router v6 |
| 상태 | TanStack Query |
| 인증 | Supabase Auth (Google OAuth, 이메일) |
| DB | Supabase |
| 다크모드 | next-themes (class 전략, CSS 변수) |
| 폰트 | Space Grotesk (본문), JetBrains Mono (수치), Playfair Display italic (로고) |

## 6. 디자인 시스템

- 기본 배경: `hsl(220, 20%, 9%)` (다크) / `hsl(220, 20%, 97%)` (라이트)
- Primary: `hsl(185, 100%, 50%)` (사이언 계열)
- Gain: `hsl(145, 65%, 42%)` / Loss: `hsl(350, 68%, 52%)`
- glass 효과: `backdrop-blur + bg-card/60`

## 7. 품질 게이트 (DoD)

- `pnpm lint` 통과
- `tsc --noEmit` 통과 (typecheck)
- `pnpm build` 성공
- 핵심 로직 Vitest 단위 테스트 (목표)

## 8. 구현 현황

| 기능 | 상태 |
|------|------|
| AI 종목 진단 랜딩 | ✅ 완료 |
| 종목 상세 (StockDetailPanel) | ✅ 완료 |
| 다크/라이트 모드 | ✅ 완료 |
| 마켓 티커 | ✅ 완료 |
| 포트폴리오 | ✅ UI 완료 (Mock 데이터) |
| 관심 종목 / 알림 | ✅ UI 완료 (Mock 데이터) |
| 개미의 일기 | ✅ UI 완료 (Mock 데이터) |
| 실제 주가 API 연동 | ✅ 완료 (FastAPI + yfinance + LSTM) |
| DART IPO 캘린더 | ✅ 완료 (24h 캐시) |
| 토스페이먼츠 결제 | ✅ 완료 (월간 구독) |
| Pro 게이팅 (ProGate) | ✅ 완료 |
| 프로 유저 전용 대시보드 | ✅ 완료 (Phase 1~9: 재무인프라, 스크리너, 섹터히트맵, 전체종목 KR/US) |
| Push 알림 | ❌ 미구현 |
| Vitest 테스트 | ❌ 미작성 |

## 9. 백엔드 아키텍처

- FastAPI + uvicorn (`backend/`)
- yfinance: 실제 OHLCV 데이터 수집
- AntLSTM: LSTM 기반 주가 예측 모델
- Gemini API: 뉴스 감성 분석
- DART API: IPO 캘린더 데이터
- Supabase: 인증 + DB (구독 상태, 포트폴리오)
- Vite 프록시: `/api` → `localhost:8000` (CORS 우회)
