-- 배당 캐시 테이블 (일일 수집)
CREATE TABLE IF NOT EXISTS dividends_cache (
  symbol     TEXT NOT NULL,
  data       JSONB NOT NULL,  -- [{ex_date, amount, pay_date}, ...]
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol)
);

-- RLS 활성화 (service_role만 접근)
ALTER TABLE dividends_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role only" ON dividends_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dividends_cache_fetched_at ON dividends_cache(fetched_at);
