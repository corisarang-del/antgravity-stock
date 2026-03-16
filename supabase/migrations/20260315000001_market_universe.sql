-- Phase 9: 전체 시장 데이터 연동 — ticker_universe + market_snapshot

-- 1. 종목 메타 (정적, 주 1회 갱신)
CREATE TABLE IF NOT EXISTS ticker_universe (
  symbol      TEXT NOT NULL,
  market      TEXT NOT NULL,   -- 'KR' | 'US'
  name        TEXT,
  sector      TEXT,
  industry    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (symbol, market)
);

-- 2. 일별 마켓 스냅샷 (매일 갱신, 최근 3일만 유지)
CREATE TABLE IF NOT EXISTS market_snapshot (
  symbol        TEXT NOT NULL,
  market        TEXT NOT NULL,
  close         FLOAT,
  change_pct    FLOAT,
  market_cap    FLOAT,
  per           FLOAT,
  pbr           FLOAT,
  volume        BIGINT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (symbol, snapshot_date)
);

-- 3. 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_market_snapshot_market_date
  ON market_snapshot (market, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_market_snapshot_date_mcap
  ON market_snapshot (snapshot_date, market_cap DESC);

CREATE INDEX IF NOT EXISTS idx_ticker_universe_market
  ON ticker_universe (market);

-- 4. RLS
ALTER TABLE ticker_universe ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshot ENABLE ROW LEVEL SECURITY;

-- service_role은 RLS 우회 (Supabase 기본값), anon/authenticated 차단
CREATE POLICY "service_role_only_ticker_universe"
  ON ticker_universe
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only_market_snapshot"
  ON market_snapshot
  FOR ALL
  USING (auth.role() = 'service_role');
