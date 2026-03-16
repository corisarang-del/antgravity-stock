# 레퍼런스 사이트 분석: stock-v2-0.vercel.app

> 분석 일시: 2026-03-15
> 목적: AntGravity Pro 대시보드 설계를 위한 벤치마킹

---

## 1. 사이트 개요

| 항목 | 내용 |
|------|------|
| URL | https://stock-v2-0.vercel.app/ |
| 타이틀 | Stock Screener — 미국·한국 주식 스크리너 |
| 커버 종목 | 813개 (KR 309 + US 504) |
| 주요 기능 | Dashboard / Screener / Heatmap / Dividend Calendar / Community |
| 기술 스택 추정 | Next.js + TradingView Lightweight Charts |

---

## 2. 페이지별 분석

### 2-1. Dashboard (`/`)

**레이아웃 구조:**
```
Header (검색바 + 네비)
─────────────────────────────────
Market Overview (h1)
총 813개 종목 · KR 309 · US 504   [최종 업데이트 시각]
─────────────────────────────────
[Screener] [Heatmap] [Dividend] [Community]  ← 4-grid 빠른 진입 카드
─────────────────────────────────
[상승 Top 5]          [하락 Top 5]
[투자 점수 Top 5]     [배당수익률 Top 5]
```

**4대 순위 섹션 상세:**

| 섹션 | 색상 지시자 | 표시 데이터 |
|------|------------|------------|
| 상승 Top 5 | 초록 점 | 종목명 + 티커 + 등락률(+%) |
| 하락 Top 5 | 빨간 점 | 종목명 + 티커 + 등락률(-%) |
| 투자 점수 Top 5 | 주황 점 | 종목명 + 티커 + 점수(0~100) |
| 배당수익률 Top 5 | 주황 점 | 종목명 + 티커 + 수익률(%) |

**UX 포인트:**
- 카드 내부 리스트 5개 고정, 깔끔한 좌우 배치
- 티커는 작은 폰트로 종목명 옆에 표시 (시각 계층)
- 섹션별 색상 dot으로 의미 즉시 전달

---

### 2-2. Screener (`/screener`)

**전체 구조:**
```
Stock Screener (h1)  [813개 종목 로딩됨]    [전체|미국|한국]
────────────────────────────────────────────────────────
전략 조합: [AND] [OR]  (하나 이상 충족 / 모두 충족)
────────────────────────────────────────────────────────
전략 카드 그리드 (5열 × 3행)
  Warren Buffett   Benjamin Graham  Peter Lynch  ...
  [토글 스위치]    [토글 스위치]    [토글 스위치] ...
  (선택 시 파라미터 인라인 노출)
────────────────────────────────────────────────────────
[스크리닝 (N개 전략)]  [초기화]  [CSV 내보내기]
                                      N개 종목 발견
────────────────────────────────────────────────────────
결과 테이블 (정렬 가능)
```

**11개 투자 전략:**

| 전략명 | 설명 | 핵심 조건 |
|--------|------|----------|
| Warren Buffett | Quality + Value + Long-term | ROE≥15%, ROIC≥12%, D/E≤1, EPS Growth≥8%, PER≤20, FCF Margin≥10% |
| Benjamin Graham | Deep Value + Margin of Safety | - |
| Peter Lynch | Growth at Reasonable Price (GARP) | - |
| Joel Greenblatt | Magic Formula (ROC + Earnings Yield) | - |
| Charlie Munger | Great Business + Long Runway | - |
| Terry Smith | ROCE-centric Quality Growth | - |
| Howard Marks | Cycle-based Deep Value | - |
| Monish Pabrai | Simplified Buffett + Deep Discount | - |
| 저평가 스크리닝 | ROIC·성장·저PER·저PEG 복합 저평가 발굴 | - |
| 간단 적정가 평가 | 업종·5년 평균 PER 기반 적정가 vs 현재가 | - |
| 김종봉 필터 | 장대양봉 + 거래대금 기반 거래량 스크리닝 | - |

**전략 토글 UX:**
- 기본 상태: 카드에 전략명 + 설명만 표시, 토글 OFF
- 토글 ON 시: 카드 내 파라미터 인라인 노출 (spinbutton으로 수치 조정 가능)
- 선택된 전략 수가 버튼에 실시간 반영: "스크리닝 (1개 전략)"

**결과 테이블 컬럼:**
`Score | Symbol | Name | Mkt | Cap | ROE | ROIC | D/E | PER | PEG | ROC | EY | Exp.Ret | PER/업종 | 적정가괴리 | 장대양봉 | 거래대금`

- Score: 원형 배지 (초록/주황/빨간 색상 분기, 0~100)
- Symbol: 클릭 → `/stock/:symbol` 이동
- CSV 내보내기 버튼 제공

---

### 2-3. Heatmap (`/heatmap`)

**레이아웃:**
```
업종별 히트맵 (h1)
전일 대비 등락률 기준 · 섹터별 시가총액 비례 크기
                              [전체|US|KR]  N개 종목 / 평균 X.XX%
──────────────────────────────────────────────────────────────
범례: [-3%] ██████ ░░░░░░ [+3%]
──────────────────────────────────────────────────────────────
트리맵 (섹터 레이블 + 종목 셀)
  - 셀 크기 = 시가총액 비례
  - 셀 색상 = 등락률 (빨강 ~0~ 초록)
  - 셀 내용 = 종목명 + 티커 + 등락률%
──────────────────────────────────────────────────────────────
섹터별 요약 테이블
섹터 | 종목 수 | 시가총액 | 평균 등락률 | 비중
```

**섹터 구성 (KR+US 전체 기준):**
Technology(119), Industrials(136), Financial Services(100), Consumer Cyclical(74),
Healthcare(97), Communication Services(39), N/A(39), Basic Materials(37),
Consumer Defensive(50), Energy(25), Utilities(33), Real Estate(31)

---

### 2-4. Stock Detail (`/stock/:symbol`)

**가장 중요한 페이지 — Pro 대시보드 참조 핵심**

**헤더 영역:**
```
Screener > NVDA  (브레드크럼)

NVIDIA Corporation [US 배지]          $180.25
Technology · Semiconductors            -1.59%
                              [가격 갱신] [오전 10:12:57]
```

**차트 + Investment Score 2단 레이아웃:**
```
[차트 영역 (70%)]                    [Score 패널 (30%)]
1MO | 3MO | 6MO | 1Y | 2Y | 5Y      Investment Score
                                      ┌──────────┐
TradingView 캔들차트                  │   83     │  매우 우수
                                      └──────────┘
                                      Quality    25/25 ████
                                      Growth     20/20 ████
                                      Strength   15/15 ████
                                      Cash       15/15 ████
                                      Valuation   8/25 ██░░

                                      Expected Return
                                      131.5%
```

**지표 섹션 구조 (h2 + 카드 그리드):**

#### Quality (수익성)
`ROE | ROIC | ROCE | Gross Margin | Op Margin | Greenblatt ROC`

#### Growth (성장성)
`Rev Growth | EPS Growth | Profit Years`

#### Financial Strength (재무건전성)
`Debt/Equity | Interest Cov | NetDebt/EBITDA | Current Ratio | Debt/EBITDA`

#### Cash Generation (현금창출력)
`FCF Margin | FCF Yield | FCF Conversion | CapEx Ratio | FCF+ Years`

#### Valuation (가치평가)
`PER | PBR | PEG | EV/EBITDA | Earnings Yield | PER×PBR`

#### Graham Analysis
`Intrinsic Value | Graham Number | Discount to IV`

#### 간단 적정가 평가
`업종 평균 PER | 5년 평균 PER | 적정 PER | EPS | 적정 주가 | PER/업종평균 | 적정가 대비`
- 하단 산출식 설명: "적정 주가 = EPS(X) × 적정 PER(Y) = $Z (현재가: $W)"

#### Overview
`Market Cap | Dividend Yield | Exp. Return | 52W High | 52W Low | 52W Range 바`

#### Historical (5-Year) 테이블
| Year | Revenue | Net Income | EPS | ROE | D/E | Gross M | Op M | FCF | FCF M |
|------|---------|------------|-----|-----|-----|---------|------|-----|-------|

#### 토론
- 투자 의견: 투표 (매수/중립/매도)
- 한줄 의견: 로그인 후 코멘트

#### 뉴스·공시
- 뉴스 탭 (Yahoo Finance 링크)

#### About
- 회사 설명 + 공식 사이트 링크

---

## 3. 디자인 시스템 분석

### 3-1. 컬러 팔레트
| 용도 | 레퍼런스 사이트 | AntGravity (유지) |
|------|---------------|-------------------|
| 배경 | 밝은 베이지/흰색 (#fafaf8) | dark: hsl(220,20%,9%) / light: hsl(220,20%,97%) |
| Primary | 주황-빨강 (#d4522a) | cyan hsl(185,100%,50%) |
| 상승 | 초록 | gain: hsl(145,65%,42%) |
| 하락 | 빨강 | loss: hsl(350,68%,52%) |
| 텍스트 | 다크 그레이 | 기존 유지 |
| 카드 | 흰색 + 라운드 + 섀도 | glass + backdrop-blur |

### 3-2. 타이포그래피
- 레퍼런스: 시스템 폰트 (sans-serif)
- AntGravity 유지: Space Grotesk(본문) / JetBrains Mono(수치) / Playfair Display italic(로고)

### 3-3. 레이아웃 패턴
- 전체 max-width: ~1080px 중앙 정렬
- 카드: 흰 배경 + `border-radius: 12px` + 은은한 그림자
- 지표 카드 그리드: `grid-cols-3` ~ `grid-cols-6` 반응형
- 상단 헤더: 로고 + 검색 + 네비 + CTA 1줄

### 3-4. 인터랙션 패턴
- 차트 기간 버튼: pill형 toggle (선택 시 primary 배경)
- 전략 토글: iOS 스타일 스위치
- 테이블 정렬: 컬럼 헤더 클릭
- 툴팁: 각 지표 옆 `(i)` 아이콘

---

## 4. AntGravity Pro 대시보드 적용 전략

### 4-1. 차용할 구조 (응용)

**메인 레이아웃: 3-패널 대시보드**
```
[AI 스크리너 패널]    [히트맵 미니]    [TOP 순위판]
  전략 필터 카드       섹터 트리맵      상승/하락/AI점수
  결과 테이블
```

**상세 뷰: 종목 심층 분석 (레퍼런스 Stock Detail 응용)**
- AntGravity 기존 탭(차트/재무/뉴스/목표가) 유지
- 레퍼런스의 Investment Score → AntGravity AI 점수(S/A/B/C/D 등급)로 대체
- 레퍼런스의 지표 섹션(Quality/Growth/Valuation 등) → Pro 전용 섹션으로 추가

### 4-2. Pro 전용 신규 기능 (레퍼런스에서 착안)

| 기능 | 레퍼런스 원본 | AntGravity Pro 버전 |
|------|--------------|---------------------|
| 종목 스크리너 | 11개 유명 투자자 전략 | 동일 전략 + AI 점수 필터 추가 |
| 히트맵 | 섹터 트리맵 | 섹터 트리맵 + AI 신호 색상 오버레이 |
| 심층 재무 | Quality/Growth/Valuation 카드 그리드 | 동일 구조 + LSTM 예측값 병기 |
| 역사 테이블 | 5개년 재무 테이블 | 5개년 + AI 예측 익년도 행 추가 |
| 투자 점수 | 100점 만점 (Q/G/S/C/V 가중합) | AntGravity AI 점수 (S/A/B/C/D) |
| 적정가 평가 | PER 기반 간단 평가 | LSTM 예측가 + PER 기반 적정가 병기 |

### 4-3. Pro 페이지 라우팅 설계

```
/pro  (ProDashboard.tsx)
  ├── 헤더: "Pro 대시보드" + Pro 배지
  ├── 섹션1: 오늘의 AI Top 종목 (상승/AI점수/배당)
  ├── 섹션2: AI 스크리너 (전략 카드 + 결과 테이블)
  ├── 섹션3: 섹터 히트맵 (미니)
  └── 섹션4: 심층 분석 뷰 (종목 클릭 시 인라인)
```

### 4-4. 절대 바꾸지 말 것 (AntGravity 원칙)
- 다크/라이트 모드 유지
- Primary 색상: cyan `hsl(185,100%,50%)` (레퍼런스의 주황 절대 사용 금지)
- glass 카드 효과 (`backdrop-blur + bg-card/60`)
- Space Grotesk + JetBrains Mono 폰트
- Gain: 초록 / Loss: 빨강 의미 체계
- 모바일 반응형 (기존 AppShell 레이아웃 그대로)

---

## 5. 스크리너 결과 테이블 컬럼 분석

레퍼런스 사이트의 스크리너 테이블 컬럼 정의 (Pro 대시보드 구현 참조):

| 컬럼 | 설명 | 표시 예시 |
|------|------|----------|
| Score | 전략 조건 충족 종합 점수 0~100 | `100` (원형 배지) |
| Symbol | 티커 심볼 (클릭→상세) | `259960.KS` |
| Name | 회사명 | `KRAFTON, Inc.` |
| Mkt | 마켓 구분 | `KR` / `US` (배지) |
| Cap | 시가총액 | `11.6T` / `15.0B` |
| ROE | 자기자본이익률 | `21.1%` |
| ROIC | 투하자본이익률 | `20.3%` |
| D/E | 부채비율 | `0.18` |
| PER | 주가수익비율 | `11.5` |
| PEG | 성장 대비 PER | `0.19` |
| ROC | 자본수익률 (Greenblatt) | `26.7%` |
| EY | Earnings Yield | `16.4%` |
| Exp.Ret | 기대수익률 | `70.1%` (primary 색상 강조) |
| PER/업종 | 업종 평균 PER 대비 | `0.49x` |
| 적정가괴리 | 현재가 vs 적정가 괴리율 | `-4.1%` |
| 장대양봉 | 장대양봉 발생 여부 | `+8.5%` |
| 거래대금 | 최근 거래대금 | `691억` |

---

## 6. Investment Score 구조 분석 (Pro 심층 분석 참조)

레퍼런스의 Investment Score는 5개 카테고리 가중합:

| 카테고리 | 만점 | NVDA 예시 | 핵심 지표 |
|---------|------|----------|----------|
| Quality | 25 | 25 | ROE, ROIC, ROCE, Gross/Op Margin |
| Growth | 20 | 20 | Rev Growth, EPS Growth, Profit Years |
| Strength | 15 | 15 | D/E, Interest Coverage, Current Ratio |
| Cash | 15 | 15 | FCF Margin, FCF Yield, FCF Conversion |
| Valuation | 25 | 8 | PER, PBR, PEG, EV/EBITDA |
| **합계** | **100** | **83** | |

→ AntGravity: 기존 AI 진단 점수(0~100 + S/A/B/C/D 등급)를 이 구조로 세분화하여 표시

---

## 7. 핵심 차별화 포인트 (AntGravity Pro가 우위에 있는 것)

| 항목 | 레퍼런스 | AntGravity Pro |
|------|---------|---------------|
| 예측 | 없음 | LSTM 기반 주가 예측선 |
| AI 신호 | 없음 | 매수/매도/보유 신호 |
| 감성 분석 | 없음 | Gemini 기반 뉴스 감성 |
| 한국어 지원 | 부분 | 완전 한국어 |
| 다크모드 | 없음 | 완전 지원 |
| 결제 | 없음 | 토스페이먼츠 Pro 구독 |

---

## 8. 데이터 소스 확정 (2026-03-15 기준)

| 데이터 종류 | 소스 | 비고 |
|-----------|------|------|
| KR 재무지표 | `dartlab[all]` (Python) | DART 정규화 재무, ROE/영업마진/부채비율 자동 계산 |
| KR 재무 폴백 | `yfinance Ticker().info` | dartlab 실패 시 |
| US 재무지표 | `yfinance Ticker().info` | ROE/마진/PER/PBR/PEG/EV/EBITDA 완전 지원 |
| KR 섹터 분류 | KRX API (무료, 키 불필요) | `data.krx.co.kr` POST MDCSTAT03901 |
| US 섹터 분류 | `yfinance info['sector']` | |
| 배당 이벤트 | `yfinance Ticker().dividends` | US 완전 지원, KR 일부 공백 |
| 한국 개장일 | `korea-business-day` (npm) | 2022~2027, 법정공휴일+대체휴일+연말휴장 |
| IPO 공시 | DART `irdsSttus.json` API | 기존 `backend/routers/tips.py` 유지 |

### Dartlab 선택 근거

| 항목 | DART OpenAPI 직접 | dartlab |
|------|-----------------|---------|
| 계정 정규화 | 회사마다 다른 계정명 | 통일 스키마 (98.7% 성공률) |
| 분기별 수치 | 누적값만 제공 | Bridge Matching으로 분기 역산 |
| 재무비율 | 직접 계산 필요 | 자동 제공 (ROE, 마진 등) |

---

## 9. 백엔드 신규 엔드포인트 명세 (구현 완료)

### 9-1. 재무지표 + Investment Score

```
GET /api/stocks/{symbol}/fundamentals
→ 30분 TTL 캐시
→ KR: dartlab (폴백 yfinance), US: yfinance
```

응답 필드: `roe, gross_margin, operating_margin, net_margin, debt_to_equity, current_ratio, trailing_pe, price_to_book, peg_ratio, ev_to_ebitda, earnings_growth, revenue_growth, market_cap, dividend_yield, 52w_high/low, sector, industry, score{quality/growth/strength/cash/valuation/total/grade}`

### 9-2. 5개년 재무 히스토리

```
GET /api/stocks/{symbol}/history
→ 24시간 TTL 캐시
→ KR: dartlab fsSummary(), US: yfinance.financials
```

### 9-3. AI 스크리너

```
POST /api/stocks/screener
Body: { strategies: string[], combination: "AND"|"OR", market: "all"|"KR"|"US" }
→ 11개 전략: warren_buffett, peter_lynch, momentum, value, quality, growth, dividend, fcf, low_debt, deep_value, high_score
```

### 9-4. 섹터 히트맵

```
GET /api/market/sectors
→ 5분 TTL 캐시
→ KRX API + yfinance sector 조합
```

### 9-5. 배당 캘린더

```
GET /api/stocks/dividends/calendar?year={year}&month={month}
→ 24시간 TTL 캐시
→ yfinance.dividends 기반
```

---

## 10. 한국 개장일 꿀팁 통합

**위치:** `/tips` 페이지 상단, IPO 섹션 위

**구성:**
- `TradingStatusBanner` — 오늘 개장/휴장 상태 + 다음 거래일 (클라이언트 계산)
- `KoreanTradingCalendar` — 이달 달력 (거래일 초록 점 / 휴장 빨강 / 공휴일 표시)

**패키지:** `korea-business-day` v2.3.0 (date-fns 의존)

**특징:**
- 서버 없음, 클라이언트 순수 계산
- 타임존 독립적 (`date-fns-tz` 내장)
- 지원 범위: 2022~2027년

---

## 11. 구현 주의사항

### dartlab 의존성

```bash
# backend/ 에서 설치
pip install dartlab[all]
# 또는
uv add dartlab[all]
```

- `[all]` 옵션 필수 (requests, pandas 등 추가 의존성 포함)
- Python 3.10+ 권장

### KR 데이터 폴백 체계

```
dartlab 성공 → dartlab 재무 + yfinance 가격/시가총액 보강
dartlab 실패 → yfinance 전체 (source: "yfinance_fallback")
```

### KRX API 주의

- `data.krx.co.kr` 외부 방화벽 환경에서 타임아웃 가능 → 5초 timeout 설정
- CORS 없음 (서버→서버 호출이므로 무관)
- ISIN 코드 형식: `KR7{6자리코드}003`

### Investment Score 가중치

| 카테고리 | 만점 | 핵심 지표 |
|---------|------|---------|
| Quality | 25 | ROE(10) + Gross Margin(8) + Op Margin(7) |
| Growth | 20 | Earnings Growth(12) + Revenue Growth(8) |
| Strength | 15 | Current Ratio(8) + 1-D/E(7) |
| Cash | 15 | FCF Yield(12) + Dividend Yield(3) |
| Valuation | 25 | PER inverse(10) + PEG inverse(10) + PBR inverse(5) |
| **합계** | **100** | |

등급: S(80+) / A(65+) / B(50+) / C(35+) / D(35미만)

---

## 12. 일일 재무 데이터 자동 최신화 아키텍처 (계획 2026-03-15)

### 목표

Pro 대시보드 재무 데이터를 매일 자동으로 최신화하여 항상 신선한 데이터 제공.
서버 재시작 후 cold start 지연 없이 즉시 응답.

### 3계층 캐시 구조

```
요청 → [1] TtlCache(인메모리, 30분 TTL)
         hit → < 1ms 응답
         miss ↓
       [2] Supabase financials_cache (fetched_at < 25h 조건)
         hit → TtlCache warm 후 < 50ms 응답
         miss ↓
       [3] dartlab / yfinance 실시간 수집
         → Supabase upsert + TtlCache set → 2~5s 응답
```

### GitHub Actions 배치 (매일 KST 06:00)

```yaml
# .github/workflows/daily-data-refresh.yml
on:
  schedule:
    - cron: '0 21 * * *'   # UTC 21:00 = KST 06:00
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install dartlab[all] yfinance supabase python-dotenv
      - run: python backend/scripts/daily_refresh.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          DART_API_KEY: ${{ secrets.DART_API_KEY }}
```

### APScheduler 서버 내 스케줄러

```python
# backend/services/cache_warmer.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler(timezone="Asia/Seoul")

@scheduler.scheduled_job("cron", hour=7, minute=0)   # KST 07:00 (GH Actions 완료 후 1h)
async def rewarm():
    await warm_all_from_supabase()   # Supabase → TtlCache 재워밍
```

### Supabase 테이블

```sql
CREATE TABLE financials_cache (
  symbol     TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE history_cache (
  symbol     TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 신규 파일 목록

| 파일 | 역할 |
|------|------|
| `supabase/migrations/20260315_financials_cache.sql` | DB 스키마 |
| `backend/services/financials_cache_service.py` | Supabase R/W 레이어 |
| `backend/services/cache_warmer.py` | APScheduler + warm 함수 |
| `backend/scripts/daily_refresh.py` | GitHub Actions 실행 스크립트 |
| `.github/workflows/daily-data-refresh.yml` | GH Actions 워크플로우 |
| `docs/운영가이드/github-secrets.md` | Secrets 등록 가이드 |

### 수정 파일 목록

| 파일 | 변경 내용 |
|------|---------|
| `backend/services/fundamentals_service.py` | Read 우선순위: TtlCache → Supabase → 외부API |
| `backend/services/history_service.py` | 동일 패턴 적용 |
| `backend/requirements.txt` | `apscheduler>=3.10.0` 추가 |
| `backend/main.py` | `lifespan`에 `start_scheduler()` + `shutdown()` |

### 주요 설계 결정

| 결정 | 이유 |
|------|------|
| `fetched_at < 25h` (24h + 1h 버퍼) | GitHub Actions cron 지연(±30분) 허용 |
| `asyncio.sleep(1)` 심볼 간 인터벌 | dartlab DART API rate limit 방지 |
| APScheduler KST 07:00 재워밍 | GH Actions 예상 완료(06:30) 후 여유 30분 |
| RLS service_role only | 프론트엔드 직접 접근 차단, 보안 강화 |
| GitHub Secrets로 키 관리 | `.env` 파일 커밋 방지 |

---

## 13. Pro 모드 vs 일반 모드 종목 분리 설계 (2026-03-15)

### 설계 원칙

- **일반 모드** (`/home`, `/stock/:symbol`): 기존 `stockData.ts` STOCKS 배열 유지 — 사용자가 친숙한 대형주 중심
- **Pro 모드** (`/pro`): TICKERS 14개 전체, 실제 재무 API 연동 — 심층 분석 전용

### 종목 목록 차이

| 구분 | 일반 모드 | Pro 모드 |
|------|----------|---------|
| 한국 주식 | 삼성전자, SK하이닉스, 현대모비스, 효성중공업, NAVER | 삼성전자, SK하이닉스, 현대자동차, 현대모비스, 효성중공업 |
| 미국 주식 | AAPL, NVDA, TSLA, MSFT, GOOGL, AMZN, META, PLTR, HOOD | AAPL, NVDA, TSLA, MSFT, GOOGL, PLTR, HOOD, SPY, VOO |
| ETF | 없음 | SPY (S&P 500), VOO (Vanguard) |
| 데이터 타입 | 실시간 OHLCV + AI 예측 | 재무지표 + AI Score (8h 캐시) |

### Pro 모드 전체종목 현황 (ProAllTickers)

- `src/components/ProAllTickers.tsx` — overview 탭 하단에 배치
- fundamentalsMap (overview 탭 로드 시 이미 fetch됨) 재사용 → 추가 API 호출 없음
- 컬럼: 종목명 · 심볼 · 시장(KR/US) · 등급(S/A/B/C/D) · AI Score · ROE · PER · 섹터
- 행 클릭 → `activeTab = "fundamentals"` + `selectedSymbol = symbol` 자동 설정

### 심볼 포맷 규칙

| 위치 | 형식 | 예시 |
|------|------|------|
| 일반 모드 프론트 | suffix 없음 | `005930`, `NVDA` |
| Pro 모드 프론트 | `.KS` suffix 포함 | `005930.KS`, `NVDA` |
| 백엔드 API | `.KS` suffix 필수 | `005930.KS`, `NVDA` |
| `toBackendSymbol()` | 6자리 숫자 → `.KS` 자동 변환 | `005930` → `005930.KS` |

---

## 14. 전체 시장 데이터 연동 아키텍처 (Phase 9, 2026-03-15)

### 배경 및 목표

Pro 모드 대시보드에서 14개 하드코딩 종목을 넘어 한국 전체 시장(KOSPI + KOSDAQ ~2,400개)과 미국 전체 시장(~5,500개)을 조회·스크리닝할 수 있도록 확장. **무료 API만 사용**, GitHub Actions 무료 티어(월 2,000분) + Supabase 무료 티어(500 MB) 내에서 동작.

---

### korea-stock-mcp 재검토 결론

`jjlabsio/korea-stock-mcp`는 TypeScript/STDIO 기반 MCP 서버로 Python FastAPI에서 직접 호출 불가. 하지만 내부적으로 사용하는 API(KRX, DART)를 Python에서 직접 사용하면 동일한 데이터를 얻을 수 있다.

| korea-stock-mcp 도구 | 내부 사용 API | Python 대체 |
|---------------------|-------------|-----------|
| `get_stock_base_info` | KRX API | **PyKRX** |
| `get_stock_trade_info` | KRX API | **PyKRX** |
| `get_corp_code` | DART `corpCode.xml` | **OpenDartReader** |
| `get_financial_statement` | DART XBRL | **OpenDartReader / dartlab** |

---

### 데이터 소스 (무료 API만)

#### 한국 전체 시장: PyKRX

```python
from pykrx import stock

# 전체 티커 리스트 (KOSPI ~849개, KOSDAQ ~1,500개)
kospi_tickers  = stock.get_market_ticker_list(date, market="KOSPI")
kosdaq_tickers = stock.get_market_ticker_list(date, market="KOSDAQ")

# 전체 OHLCV + 시가총액 (한 번에) → 2-3 API 호출로 전체 수집
df_ohlcv = stock.get_market_ohlcv_by_ticker(date, market="KOSPI")

# 전체 재무지표 (PER, PBR, EPS, DIV 등)
df_fund = stock.get_market_fundamental_by_ticker(date, market="KOSPI")
```

**장점**: 2,400개를 API 4~6회로 수집 (개별 호출 대비 ~600x 빠름)

#### 한국 종목 유니버스: OpenDartReader

```python
import OpenDartReader
dart = OpenDartReader.OpenDartReader(DART_API_KEY)
corp_list = dart.corp_codes  # 전체 상장사 코드 + 회사명 DataFrame
```

#### 미국 전체 시장: SEC EDGAR + yfinance

```python
import httpx

# 티커 리스트 (API 키 불필요)
resp = httpx.get("https://www.sec.gov/files/company_tickers.json",
                  headers={"User-Agent": "AntGravity contact@example.com"})
tickers_us = resp.json()  # ~12,000개, 필터 후 ~5,500개

# 가격 데이터: 1,000개씩 배치
import yfinance as yf
df = yf.download(tickers=" ".join(batch), period="2d", threads=True)
```

---

### 2-티어 데이터 아키텍처

| 티어 | 대상 | 수집 내용 | 갱신 주기 |
|------|------|---------|---------|
| Tier 1 — 전체 Overview | KR ~2,400 + US ~5,500 | 가격, PER, PBR, 시총, 섹터 | 매일 |
| Tier 2 — 심층 재무 | KR 시총 Top 50 + US S&P 500 | ROE, 마진, 성장률, AI Score | 매일 |

**US 심층 재무를 S&P 500으로 제한하는 이유**: yfinance `.info` 5,500개 = ~90분 → GitHub Actions 예산 초과

---

### 신규 Supabase 테이블

```sql
-- 종목 메타 (주 1회 갱신, 8,000행 × 150B ≈ 1.2 MB)
CREATE TABLE ticker_universe (
  symbol      TEXT NOT NULL,
  market      TEXT NOT NULL,   -- 'KR' | 'US'
  name        TEXT,
  sector      TEXT,
  industry    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (symbol, market)
);

-- 일별 마켓 스냅샷 (최근 3일만 유지, 24,000행 × 100B ≈ 2.4 MB)
CREATE TABLE market_snapshot (
  symbol        TEXT NOT NULL,
  market        TEXT NOT NULL,
  close         FLOAT,
  change_pct    FLOAT,
  market_cap    FLOAT,
  per           FLOAT,
  pbr           FLOAT,
  volume        BIGINT,
  snapshot_date DATE NOT NULL DEFAULT current_date,
  PRIMARY KEY (symbol, snapshot_date)
);
```

**총 신규 용량**: ~4.75 MB (기존 ~1.15 MB 포함 합계 ~6 MB) → Supabase 500 MB의 1.2%

---

### GitHub Actions 시간 예산

| 작업 | 예상 시간 |
|------|---------|
| PyKRX KOSPI bulk | 2분 |
| PyKRX KOSDAQ bulk | 2분 |
| KR 종목명/섹터 메타 (주 1회 조건부) | 3분 |
| US SEC EDGAR 티커 리스트 | 0.5분 |
| yfinance.download US 6배치 (1,000개씩) | 15분 |
| yfinance .info S&P 500 ~500개 | 5분 |
| dartlab KR 시총 Top 50 심층 재무 | 5분 |
| Supabase upsert + 오래된 스냅샷 정리 | 3분 |
| **합계** | **~36분/일** |

월 36분 × 30일 = **1,080분** / 2,000분 한도 ✅

---

### 신규 API 엔드포인트

```
GET /api/market/full
  ?market=KR|US|all  &page=1&limit=100  &sort=market_cap|change_pct|per  &sector=Technology
  → market_snapshot + ticker_universe JOIN, 페이지네이션

GET /api/market/full/search?q=삼성
  → 종목명/심볼 ILIKE 검색
```

---

### 신규 프론트엔드 컴포넌트

| 파일 | 역할 |
|------|------|
| `src/components/ProMarketList.tsx` | 전체종목 테이블 (페이지네이션, 검색, 필터), ProAllTickers 대체 |
| `src/components/ProMarketFilter.tsx` | 시장/섹터/PER/시총 필터 패널 |
| `src/hooks/useMarketFull.ts` | 페이지네이션 쿼리 훅 (staleTime 5분) |
| `src/lib/apiClient.ts` | `MarketStock` 타입, `fetchMarketFull`, `fetchMarketSearch` 추가 |

---

### 주요 설계 결정

| 결정 | 이유 |
|------|------|
| PyKRX bulk API | 2,400개를 4-6 호출로 처리 (개별 대비 ~600x 빠름) |
| SEC EDGAR 티커 리스트 | API 키 불필요, 공식 소스, 12,000개 포함 |
| US 심층 재무는 S&P 500만 | yfinance .info 5,500개 = ~90분 → 예산 초과 |
| market_snapshot 3일만 유지 | 스토리지 최소화, 전일대비% 계산에 2일치면 충분 |
| ticker_universe 주 1회 갱신 | 상장/폐지 변동 적음, 매일 수집 불필요 |
| 프론트 페이지네이션 (limit 100) | 8,400개 한 번에 렌더링 불가 |

---

## 15. Phase 9 구현 결과 및 캐시/리프레시 전략 분석

> 작성 시각: 2026-03-15
> 커밋: 729f59a (9-A~C), 30c019e (9-B-2), 9af77ca (스크리너 자동 스케줄링)

---

### 15-1. 스크리너 2-tier 아키텍처 (구현 완료)

`screener_service.py`를 기존 14개 TICKERS → `market_snapshot` 전체 종목 대상으로 확장.

```
run_screener(strategies, combination, market, per_max, pbr_max, market_cap_min, change_pct_min)
  │
  ├─ _SCREENER_CACHE.get(cache_key)  → hit: 즉시 반환
  │
  ├─ Tier 1: _load_snapshot_universe(market)
  │    └─ market_snapshot(최신 날짜) + ticker_universe JOIN
  │    └─ snapshot 비어있으면 _run_screener_legacy() 폴백 (14개 TICKERS)
  │
  ├─ _apply_basic_filters(per_max, pbr_max, market_cap_min, change_pct_min)
  │    └─ 스냅샷 수준 숫자 필터 (PER, PBR, 시총, 등락률)
  │
  └─ Tier 2: 전략 필터 (valid_strategies 있을 때만)
       └─ get_fundamentals(symbol) → ROE/마진/성장률 기반 전략 검증
       └─ 결과 score 내림차순 정렬 → _SCREENER_CACHE.set(cache_key, result)
```

**설계 결정**: 전략 필터를 이미 가진 종목의 fundamentals만 조회하므로
snapshot 8,000개를 Tier 1에서 먼저 걸러낸 후 Tier 2는 수십~수백 개만 처리.

---

### 15-2. 스크리너 자동 사전 실행 스케줄 (구현 완료)

`cache_warmer.py` APScheduler에 KST 07:30 스크리너 워밍 잡 추가.

```
KST 06:00 — GitHub Actions 수집 시작
KST 06:30 — 수집 완료 (예상)
KST 07:00 — APScheduler: warm_all_from_supabase() (재무 캐시 재워밍)
KST 07:30 — APScheduler: warm_screener_cache() (스크리너 6개 전략 사전 실행)
```

**사전 실행 대상 전략 조합**:

| strategies | combination | market |
|-----------|-------------|--------|
| high_score | AND | all |
| value | AND | KR |
| value | AND | US |
| quality | AND | all |
| momentum | AND | all |
| dividend | AND | all |

첫 번째 사용자 요청이 오기 전에 `_SCREENER_CACHE`에 결과 적재 완료.
→ 첫 조회 응답시간 ~0ms (캐시 히트)

---

### 15-3. 캐시 현황 전수 조사

#### 백엔드 TtlCache TTL

| 서비스/라우터 | 캐시 변수 | 현재 TTL | 데이터 갱신 주기 |
|-------------|---------|---------|--------------|
| `market_snapshot_service.py` | `SNAPSHOT_CACHE` | 60초 | 장중 실시간 |
| `stocks.py` | `STOCK_RESPONSE_CACHE`, `STOCK_BUNDLE_CACHE` | 5분 | 장중 연속 |
| `market_full.py` | `_FULL_CACHE` | 5분 | 24시간 (GH Actions) |
| `sectors_service.py` | `_SECTOR_CACHE` | 5분 | 24시간 (GH Actions) |
| `fundamentals_service.py` | `_FUND_CACHE` | 30분 | 24시간 (GH Actions) |
| `screener_service.py` | `_SCREENER_CACHE` | 6시간 | 24시간 (GH Actions) |
| `history_service.py` | `_HISTORY_CACHE` | 24시간 | 분기별 |
| `dividends.py` | `_DIV_CACHE` | 24시간 | 분기별 |

추가 캐시 계층:
- `financials_cache_service.py`: Supabase DB 캐시, 25시간 freshness 검증
- `cache_warmer.py`: 서버 시작 시 + KST 07:00 Supabase → TtlCache 일괄 워밍

#### 프론트엔드 staleTime

| 훅/쿼리 | staleTime | refetchInterval | 비고 |
|--------|-----------|-----------------|------|
| `useMarketTicker` | 60초 | 60초 | 실시간 필요 |
| `useStockBundle` | 5분 | 없음 | 번들 OHLCV |
| `useMarketFull` | 5분 | 없음 | 전체종목 테이블 |
| `useIpoData` | 1시간 | 없음 | 적절 |
| `useSectors` | 4시간 | 없음 | 백엔드 5분과 불일치 |
| `useFundamentals` | 8시간 | 없음 | 백엔드 30분과 불일치 |
| `useDividendCalendar` | 24시간 | 없음 | 적절 |
| ProDashboard allFundamentals | 8시간 | 없음 | 백엔드 30분과 불일치 |
| `App.tsx` QueryClient | gcTime=24시간 | — | 언마운트 후 캐시 보존 |

---

### 15-4. 캐시/리프레시 전략 분석 및 권고

#### 구간 분류

**① 실시간 필요 — 현재 적절**

| 항목 | 현재 설정 | 이유 |
|------|---------|------|
| 주가 ticker (상단 바) | BE 60s / FE 60s refetch | 장중 매분 가격 변동, 사용자 즉시 인지 필요 |

**② 준실시간 (5분) — 현재 적절**

| 항목 | 현재 설정 | 이유 |
|------|---------|------|
| 주가 번들 (OHLCV, 5일차트) | BE 5분 / FE 5분 | 체결 지연 허용 수준, API 부하 절충 |

**③ 백엔드-프론트 불일치 (조정 권고)**

| 항목 | BE TTL | FE staleTime | 데이터 갱신 | 권고 |
|------|-------|-------------|------------|------|
| 재무지표 (fundamentals) | 30분 | 8시간 | 24시간 (GH Actions) | **BE를 8시간으로 상향** — 프론트와 맞춤, 불필요한 캐시 만료 제거 |
| 섹터 히트맵 | 5분 | 4시간 | 24시간 (GH Actions) | **BE를 4시간으로 상향** — 5분 캐시는 실제 갱신 주기(24h)와 동떨어짐 |
| 전체종목 목록 (market_full) | 5분 | 5분 | 24시간 (GH Actions) | **BE/FE 모두 30분으로 상향** — 데이터는 하루 1번 갱신, 5분은 과도한 Supabase 조회 |

**④ 캐시 미적용 (추가 권고)**

| 항목 | 현재 | 문제 | 권고 |
|------|------|------|------|
| 전체종목 검색 (`/api/market/full/search`) | 없음 | 동일 쿼리 반복 시 Supabase ILIKE 반복 | **BE 60초 TtlCache** 추가 — 동일 검색어 burst 방지 |

**⑤ 연장 가능 (더 늘려도 됨)**

| 항목 | 현재 TTL | 권고 | 이유 |
|------|---------|------|------|
| 스크리너 결과 | 6시간 | **24시간** | 데이터 하루 1번 갱신, 07:30 사전 실행으로 캐시 보장 |
| 재무 히스토리 | 24시간 | **72시간** | 분기별 갱신, 24h 이상도 신선도 문제 없음 |

---

### 15-5. 데이터 갱신 타임라인 (KST 기준)

```
06:00  GitHub Actions 시작 (UTC 21:00 cron)
         ├─ fundamentals 수집 (14개 TICKERS)
         ├─ history 수집 (14개 TICKERS)
         ├─ snapshot 수집 (KR ~2,400 + US ~5,500)
         └─ 오래된 snapshot 정리 (3일 초과)

06:30  수집 완료 (예상), Supabase DB 최신화

07:00  APScheduler: warm_all_from_supabase()
         └─ Supabase → TtlCache 14개 심볼 fundamentals + history 적재

07:30  APScheduler: warm_screener_cache()
         └─ 6개 전략 조합 사전 실행 → _SCREENER_CACHE 적재

이후   사용자 요청 → 대부분 캐시 히트 (딜레이 없음)
장 시작 → ticker만 실시간 (60s refetch)
```

---

### 15-6. 요약

| 구분 | 현재 | 권고 방향 |
|------|------|---------|
| 실시간 (ticker) | 적절 | 유지 |
| 주가 번들 | 적절 | 유지 |
| 재무지표 BE TTL | 30분 (너무 짧음) | 8시간으로 상향 |
| 섹터 BE TTL | 5분 (너무 짧음) | 4시간으로 상향 |
| 전체종목 BE/FE TTL | 5분 (너무 짧음) | 30분으로 상향 |
| 검색 API 캐시 | 없음 (위험) | 60초 TtlCache 추가 |
| 스크리너 TTL | 6시간 | 24시간으로 연장 |
| 재무 히스토리 TTL | 24시간 | 72시간으로 연장 |
