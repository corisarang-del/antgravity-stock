-- 재무지표 일일 캐시 테이블
-- GitHub Actions 배치 + APScheduler가 upsert, 백엔드가 SELECT
CREATE TABLE IF NOT EXISTS financials_cache (
  symbol      TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5개년 재무 히스토리 캐시 테이블
CREATE TABLE IF NOT EXISTS history_cache (
  symbol      TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 활성화: 서버사이드 service_role만 접근 (프론트엔드 직접 접근 차단)
ALTER TABLE financials_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_cache ENABLE ROW LEVEL SECURITY;

-- service_role에만 전체 권한 (anon/authenticated role 접근 불가)
CREATE POLICY "service_role_only_financials"
  ON financials_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_only_history"
  ON history_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- fetched_at 기준 최신 데이터 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_financials_cache_fetched_at ON financials_cache (fetched_at);
CREATE INDEX IF NOT EXISTS idx_history_cache_fetched_at ON history_cache (fetched_at);
