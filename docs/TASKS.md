# Pro 대시보드 + 꿀팁 개장일 + 일일 재무 자동 최신화 구현 태스크

## [Branch: feature/tips-trading-calendar] Phase 4: 꿀팁 페이지 한국 개장일

워크트리: `.worktrees/tips-trading-calendar/`

- [x] T4-0: 워크트리 생성 `git worktree add .worktrees/tips-trading-calendar -b feature/tips-trading-calendar`
- [x] T4-1: `pnpm add korea-business-day` (worktree에서)
- [x] T4-2: `src/components/TradingStatusBanner.tsx` — 오늘 개장 여부 배너
- [x] T4-3: `src/components/KoreanTradingCalendar.tsx` — 이달 개장일 달력
- [x] T4-4: `src/pages/Tips.tsx` — 개장일 섹션 추가
- [x] T4-5: 품질 게이트 (tsc, lint — 새 파일 에러 없음)
- [x] T4-6: 커밋 완료 (96e9607)
- [ ] T4-7: PR → main 머지 (대기 중)

---

## [Branch: feature/pro-dashboard] Phase 1: 백엔드 재무 데이터 인프라

워크트리: `.worktrees/pro-dashboard/`

- [x] T1-0: `git merge main` (pnpm-lock 충돌 해결)
- [x] T1-1: `dartlab[all]` → `backend/requirements.txt` 추가
- [x] T1-2: `backend/services/fundamentals_service.py` 신규
  - KR 종목: Dartlab Company().ratios (폴백: yfinance)
  - US 종목: yfinance Ticker().info
  - Investment Score 5카테고리 계산 (Quality/Growth/Strength/Cash/Valuation)
  - 30분 TTL 인메모리 캐시
- [x] T1-2b: `backend/services/history_service.py` 신규
  - 5개년 재무 히스토리 (dartlab fsSummary / yfinance financials)
  - 24시간 TTL 캐시
- [x] T1-3: `backend/routers/stocks.py` 확장
  - GET /api/stocks/{symbol}/fundamentals
  - GET /api/stocks/{symbol}/history
- [x] T1-4: `backend/services/screener_service.py` 신규
  - 11개 투자 전략 필터 함수
  - AND/OR 조합 로직 + Score 계산
- [x] T1-5: `backend/routers/screener.py` → POST /api/stocks/screener
- [x] T1-6: `backend/services/sectors_service.py` (KRX API + yfinance sector)
- [x] T1-7: `backend/routers/sectors.py` → GET /api/market/sectors (5분 캐시)
- [x] T1-8: `backend/routers/dividends.py` → GET /api/stocks/dividends/calendar
- [x] T1-9: `backend/main.py` 라우터 등록

## [Branch: feature/pro-dashboard] Phase 2: 프론트엔드 API 클라이언트 확장

- [x] T2-1: `src/lib/apiClient.ts` 타입/함수 추가
  - 타입: Fundamentals, HistoryRow, ScreenerResult, SectorItem, DividendCalendarData 등
  - 함수: fetchFundamentals, fetchHistory, fetchScreener, fetchSectors, fetchDividendCalendar
- [x] T2-2: `src/hooks/useFundamentals.ts` (staleTime 30분)
- [x] T2-3: `src/hooks/useScreener.ts` (useMutation)
- [x] T2-4: `src/hooks/useSectors.ts` (staleTime 5분)
- [x] T2-5: `src/hooks/useDividendCalendar.ts` (staleTime 24시간)

## [Branch: feature/pro-dashboard] Phase 3: Pro 대시보드 컴포넌트

- [x] T3-1: `src/components/ProTopRanking.tsx` — 수익성장/AI점수 Top5
- [x] T3-2: `src/components/AiScreener.tsx` — 전략 토글 카드 + 결과 테이블
- [x] T3-3: `src/components/SectorHeatmap.tsx` — Recharts Treemap
- [x] T3-4: `src/components/InvestmentScoreCard.tsx` — 5카테고리 Progress bars
- [x] T3-5: `src/components/FundamentalsGrid.tsx` — 재무지표 카드 그리드
- [x] T3-6: `src/components/HistoricalTable.tsx` — 5개년 재무 테이블
- [x] T3-7: `src/components/DividendCalendar.tsx` — 배당 캘린더
- [x] T3-8: `src/pages/ProDashboard.tsx` — Pro 가드 + 탭 레이아웃
- [x] T3-9: `src/App.tsx` — /pro 라우트 추가
- [x] T3-10: 커밋 완료 (07fc8fa)

## [Branch: feature/pro-dashboard] Perf: Vercel React 베스트 프랙티스

- [x] TP-1: `vite.config.ts` `optimizeDeps` — lucide-react, recharts, date-fns 사전 번들링 (Rule 2.1)
- [x] TP-2: `SectorHeatmap` → `React.lazy` + `Suspense` (Rule 2.4)
- [x] TP-3: `screener.data &&` → ternary (Rule 6.7) — AiScreener, DividendCalendar
- [x] TP-4: `KR_SYMBOL_RE` 모듈 레벨 호이스팅 (Rule 7.9) — apiClient.ts 양쪽 워크트리
- [x] TP-5: `.sort()` → `.toSorted()` (Rule 7.12) — ProTopRanking, DividendCalendar
- [x] TP-6: 커밋 완료 (d7e01eb, 171c334)

---

## Phase 5: 머지 준비

- [ ] T5-1: `feature/tips-trading-calendar` → main 머지
- [ ] T5-2: `feature/pro-dashboard`에서 `git merge main` 싱크
- [ ] T5-3: 품질 게이트 재확인 (tsc, lint)
- [ ] T5-4: 백엔드 엔드포인트 curl 테스트
- [ ] T5-5: /pro 페이지 브라우저 확인
- [ ] T5-6: `feature/pro-dashboard` → main PR 머지

## Phase 6: 문서화 (main)

- [x] T6-1: `research-refer.md` 최신화 (섹션 8~11 추가)
- [x] T6-2: `docs/TASKS.md` 생성 (이 파일)
- [x] T6-3: `docs/개발일지/2026-03-15_Pro대시보드_개장일캘린더_구현.md`

---

## [Branch: feature/pro-dashboard] Phase 7: 일일 재무 데이터 자동 최신화

> **목표**: TtlCache(인메모리) → Supabase(DB) → 외부API 3계층 캐시
> GitHub Actions 매일 KST 06:00 배치 + APScheduler 서버 내 캐시 워밍

워크트리: `.worktrees/pro-dashboard/`

### Phase A: Supabase 스키마 + 캐시 서비스

- [x] TA-1: `supabase/migrations/20260315000000_financials_cache.sql` 신규
  - `financials_cache (symbol PK, data JSONB, fetched_at TIMESTAMPTZ)` 생성
  - `history_cache (symbol PK, data JSONB, fetched_at TIMESTAMPTZ)` 생성
  - RLS 활성화: service_role만 INSERT/UPDATE/SELECT 허용
- [x] TA-2: `backend/services/financials_cache_service.py` 신규
  - `read_fundamentals(symbol)` → Supabase 조회, fetched_at 25h 이내만 반환
  - `write_fundamentals(symbol, data)` → Supabase upsert
  - `read_history(symbol)` / `write_history(symbol, data)` 동일 패턴

### Phase B: 서비스 계층 Read 우선순위 변경

- [x] TB-1: `backend/services/fundamentals_service.py` 수정
  - `get_fundamentals(symbol)` 내부 Read 우선순위:
    1. `TtlCache.get(symbol)` → hit: 즉시 반환
    2. `financials_cache_service.read_fundamentals(symbol)` → hit: TtlCache.set 후 반환
    3. dartlab/yfinance 수집 → `write_fundamentals` + `TtlCache.set` 후 반환
- [x] TB-2: `backend/services/history_service.py` 동일 패턴 적용

### Phase C: 일일 배치 스크립트

- [x] TC-1: `backend/scripts/` 디렉토리 생성
- [x] TC-2: `backend/scripts/daily_refresh.py` 신규
  - 독립 실행 가능 (FastAPI 서버 불필요)
  - 14개 심볼 전체 순회 (pipeline.py TICKERS와 동기화)
  - fundamentals + history 수집 → Supabase upsert
  - 심볼별 성공/실패 로그, `--symbol` CLI 옵션
  - 실패 시 exit code 1
- [ ] TC-3: 로컬 테스트: `python backend/scripts/daily_refresh.py` (단일 심볼)

### Phase D: GitHub Actions 워크플로우

- [x] TD-1: `.github/workflows/daily-data-refresh.yml` 신규
  - `cron: '0 21 * * *'` (UTC 21:00 = KST 06:00)
  - `workflow_dispatch` 수동 트리거 + optional symbol input
  - Python 3.11, `pip install dartlab[all] yfinance supabase python-dotenv`
  - GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DART_API_KEY`
- [x] TD-2: `docs/운영가이드/github-secrets.md` 신규

### Phase E: APScheduler 서버 내 스케줄러

- [x] TE-1: `backend/requirements.txt` → `apscheduler>=3.10.0` 추가
- [x] TE-2: `backend/services/cache_warmer.py` 신규
  - `warm_all_from_supabase()` async 함수: Supabase → TtlCache 전체 워밍
  - `start_scheduler()`: 매일 KST 07:00 자동 워밍
- [x] TE-3: `backend/main.py` lifespan 연동

### Phase F: 품질 게이트

- [ ] TF-1: `pnpm typecheck` + `pnpm lint` 통과
- [ ] TF-2: `python backend/scripts/daily_refresh.py` 로컬 실행 확인
- [ ] TF-3: GitHub Actions 수동 `workflow_dispatch` 실행 확인

---

## Phase 5: 머지 준비

- [ ] T5-1: `feature/tips-trading-calendar` → main 머지
- [ ] T5-2: `feature/pro-dashboard`에서 `git merge main` 싱크
- [ ] T5-3: 품질 게이트 재확인 (tsc, lint)
- [ ] T5-4: 백엔드 엔드포인트 curl 테스트
- [ ] T5-5: /pro 페이지 브라우저 확인
- [ ] T5-6: `feature/pro-dashboard` → main PR 머지

## Phase 6: 문서화 (main)

- [x] T6-1: `research-refer.md` 최신화 (섹션 8~11 추가)
- [x] T6-2: `docs/TASKS.md` 생성 (이 파일)
- [x] T6-3: `docs/개발일지/2026-03-15_Pro대시보드_개장일캘린더_구현.md`
- [x] T6-4: `docs/TASKS.md` Phase 7 추가 (일일 자동 최신화)
- [x] T6-5: `research-refer.md` 섹션 12 추가 (일일 자동 최신화 아키텍처)
- [x] T6-6: `docs/개발일지/2026-03-15_일일재무데이터자동최신화_계획.md`

---

---

## Phase 8: Pro 전용 전체종목 현황 + 모드 분리

> **목표**: Pro 대시보드에서 14개 전체 종목을 테이블로 조회, 일반 모드는 기존 stockData.ts 유지

### 모드별 종목 분리 설계

| 항목 | 일반 모드 (`/home`) | Pro 모드 (`/pro`) |
|------|-------------------|-----------------|
| 종목 목록 | `src/data/stockData.ts` STOCKS (14개) | `ProDashboard.tsx` TICKERS (14개) |
| 데이터 소스 | 실시간 번들 API (`/api/stocks/{symbol}/bundle`) | 재무 API (`/api/stocks/{symbol}/fundamentals`) |
| 캐시 | 5분 | 8시간 |
| 추가 종목 | AMZN, META | SPY, VOO |
| 전체종목 테이블 | 없음 | ProAllTickers 컴포넌트 |
| 접근 제어 | 공개 | Pro 구독자 (개발 환경 우회) |

- [x] T8-1: `src/components/ProAllTickers.tsx` 신규
  - 14개 전체 종목 테이블 (AI Score 내림차순)
  - 컬럼: 종목명, 심볼, 시장(KR/US), 등급, Score, ROE, PER, 섹터
  - 행 클릭 → 재무 탭으로 이동 + 해당 종목 자동 선택
  - fundamentalsMap 재사용 (overview 탭에서 이미 fetch됨, 추가 API 호출 없음)
- [x] T8-2: `src/pages/ProDashboard.tsx` 수정
  - overview 탭에 ProAllTickers 추가
  - onSelect 콜백으로 탭 전환 + 종목 선택 연동
- [x] T8-3: 일반 모드는 stockData.ts 변경 없음 (모드 분리 유지)
- [x] T8-4: TASKS.md, research-refer.md 최신화

---

## [Branch: feature/pro-dashboard] Phase 9: 전체 시장 데이터 연동

> **목표**: Pro 모드에서 KR 전체(~2,400개) + US 전체(~5,500개) 종목 조회 및 스크리닝
> **제약**: 무료 API만 사용, GitHub Actions 월 2,000분 이내, Supabase 500 MB 이내

### Phase 9-D: 문서화 (구현 전 선행)

- [x] T9-D-1: `docs/TASKS.md` — Phase 9 태스크 추가 (이 파일)
- [x] T9-D-2: `research-refer.md` — 섹션 14: 전체 시장 데이터 연동 아키텍처
- [x] T9-D-3: `docs/개발일지/2026-03-15_전체시장데이터연동_계획.md`

### Phase 9-A: 백엔드 데이터 수집 확장

- [x] T9-A-1: `backend/requirements.txt` → `pykrx`, `opendartreader` 추가
- [x] T9-A-2: `supabase/migrations/20260315000001_market_universe.sql` 신규
  - `ticker_universe (symbol, market, name, sector, industry, updated_at)` 생성
  - `market_snapshot (symbol, market, close, change_pct, market_cap, per, pbr, volume, snapshot_date)` 생성
  - 인덱스: `(market, snapshot_date)`, `(snapshot_date, market_cap DESC)`
  - RLS: service_role만 접근
- [x] T9-A-3: `backend/services/market_snapshot_service.py` 확장
  - `collect_kr_snapshot(date)`: PyKRX 벌크 — KOSPI(.KS) + KOSDAQ(.KQ) OHLCV + 재무지표
  - `collect_us_snapshot()`: yfinance.download 배치 — 1,000개씩 (가격)
  - `collect_ticker_universe_kr()`: PyKRX — KOSPI/KOSDAQ 전체 종목명 + 올바른 접미사
  - `collect_ticker_universe_us()`: SEC EDGAR `company_tickers.json` — 미국 전체 티커
  - `_cleanup_old_snapshots()`: 3일 초과 snapshot 자동 정리
- [x] T9-A-4: `backend/scripts/daily_refresh.py` 확장
  - `--phase universe` 옵션: ticker_universe 갱신 (주 1회)
  - `--phase snapshot` 옵션: 전체 시장 스냅샷 수집 + 정리
  - 기존 fundamentals/history 수집 유지

### Phase 9-B: 백엔드 API 엔드포인트

- [x] T9-B-1: `backend/routers/market_full.py` 신규
  - `GET /api/market/full` — 전체종목 테이블 (page/limit/sort/sector 파라미터)
  - `GET /api/market/full/search?q=삼성` — 종목명/심볼 검색
  - `market_snapshot` + `ticker_universe` JOIN, 5분 TTL 캐시
- [x] T9-B-2: `backend/services/screener_service.py` 확장 (커밋 30c019e)
  - market_snapshot 전체 종목 대상 2-tier 스크리닝
  - `_load_snapshot_universe(market)`: market_snapshot 최신일자 + ticker_universe 병합
  - `_apply_basic_filters(...)`: per_max, pbr_max, market_cap_min, change_pct_min 기본 필터
  - `_SCREENER_CACHE`: 6시간 TtlCache, cache_key에 모든 파라미터 포함
  - snapshot 없으면 14개 TICKERS 폴백 (`_run_screener_legacy`)
- [x] T9-B-3: `backend/routers/screener.py` 확장 — ScreenerRequest 파라미터 추가
- [x] T9-B-4: `backend/main.py` 라우터 등록
- [x] T9-B-5: `backend/services/cache_warmer.py` 스크리너 자동 사전 실행 (커밋 9af77ca)
  - `warm_screener_cache()`: 6개 대표 전략 조합 사전 실행
  - APScheduler KST 07:30 일별 자동 실행 (재무 워밍 07:00 완료 후 30분 여유)

### Phase 9-C: 프론트엔드

- [x] T9-C-1: `src/lib/apiClient.ts` 확장
  - `MarketStock`, `MarketFullResponse`, `MarketSearchResponse` 타입
  - `fetchMarketFull(params)`, `fetchMarketSearch(q)` 함수
- [x] T9-C-2: `src/hooks/useMarketFull.ts` 신규 (useQuery 페이지네이션, staleTime 5분)
- [x] T9-C-3: `src/components/ProMarketFilter.tsx` 신규 (시장/정렬 필터)
- [x] T9-C-4: `src/components/ProMarketList.tsx` 신규
  - 전체종목 테이블 (페이지네이션, 검색바, 필터 패널 연동)
  - 기존 `ProAllTickers.tsx` 대체
- [x] T9-C-5: `src/pages/ProDashboard.tsx` 수정
  - 개요 탭: `ProAllTickers` → `ProMarketList` 교체

### Phase 9-D: 문서화

- [x] T9-D-1: `docs/TASKS.md` — Phase 9 태스크 추가 (이 파일)
- [x] T9-D-2: `research-refer.md` — 섹션 14: 전체 시장 데이터 연동 아키텍처 (설계)
- [x] T9-D-3: `docs/개발일지/2026-03-15_전체시장데이터연동_계획.md`
- [x] T9-D-4: `docs/개발일지/2026-03-15_Phase9_전체시장데이터연동_구현.md`
- [x] T9-D-5: `research-refer.md` — 섹션 15: Phase 9 구현 결과 + 캐시/리프레시 전략 분석
- [x] T9-D-6: `docs/개발일지/2026-03-15_캐시전략_분석.md`

### Phase 9-E: 품질 게이트

- [x] T9-E-1: `pnpm build` 성공 + Phase 9 신규 파일 lint 클린 (커밋 729f59a)
- [ ] T9-E-2: `python backend/scripts/daily_refresh.py --phase snapshot --market KR` 로컬 테스트
- [ ] T9-E-3: `curl "http://localhost:8000/api/market/full?market=KR&page=1&limit=20"` 응답 확인
- [ ] T9-E-4: GitHub Actions `workflow_dispatch` 수동 실행 확인
- [ ] T9-E-5: `/pro` 개요 탭 브라우저 확인 (전체종목 테이블 표시)

---

## 브랜치 현황

| 브랜치 | 최신 커밋 | 상태 |
|--------|----------|------|
| `feature/tips-trading-calendar` | 171c334 | 커밋 완료, 머지 대기 |
| `feature/pro-dashboard` | 9af77ca | Phase 9 구현 완료 (E2~E5 런타임 테스트 대기) |
| `main` | da66a1d | 기준 브랜치 |
