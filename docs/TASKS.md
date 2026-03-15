# Pro 대시보드 + 꿀팁 개장일 구현 태스크

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

---

## Phase 5: 머지 준비

- [ ] T5-1: `feature/tips-trading-calendar` → main 머지
- [ ] T5-2: `feature/pro-dashboard`에서 `git merge main` 싱크
- [ ] T5-3: 품질 게이트 재확인 (tsc, lint)
- [ ] T5-4: 백엔드 엔드포인트 curl 테스트
- [ ] T5-5: /pro 페이지 브라우저 확인
- [ ] T5-6: `feature/pro-dashboard` → main PR 머지

## Phase 6: 문서화 (main)

- [ ] T6-1: `research-refer.md` 최신화 (섹션 8~11)
- [x] T6-2: `docs/TASKS.md` 생성 (이 파일)
- [ ] T6-3: `docs/개발일지/2026-03-15_Pro대시보드_개장일캘린더_구현.md`

---

## 브랜치 현황

| 브랜치 | 커밋 | 상태 |
|--------|------|------|
| `feature/tips-trading-calendar` | 96e9607 | 커밋 완료, 머지 대기 |
| `feature/pro-dashboard` | 07fc8fa | 커밋 완료, 머지 대기 |
| `main` | 312bd43 | 기준 브랜치 |
