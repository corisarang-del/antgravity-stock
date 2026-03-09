-- ============================================================
-- AntGravity — ML 예측 모델 연동 DB 스키마
-- 목적: 학습 예측 모델(AI/ML)을 백엔드에서 구동하고
--       예측 결과·피처·히스토리를 저장하기 위한 구조
-- 실행 방법: Lovable Cloud > Backend > SQL Editor 에서 붙여넣고 실행
-- 작성: 2026-03-09
-- ============================================================


-- ─────────────────────────────────────────────
-- 1. stock_prices_history  (OHLCV 원시 데이터)
--    모델 학습 및 추론의 입력 소스
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_prices_history (
  id            uuid           NOT NULL DEFAULT gen_random_uuid(),
  symbol        text           NOT NULL,
  market        text           NOT NULL DEFAULT 'US',       -- 'US' | 'KR' | 'CN'
  trade_date    date           NOT NULL,
  open_price    numeric(20,4)  NOT NULL,
  high_price    numeric(20,4)  NOT NULL,
  low_price     numeric(20,4)  NOT NULL,
  close_price   numeric(20,4)  NOT NULL,
  adj_close     numeric(20,4),
  volume        bigint         NOT NULL DEFAULT 0,
  source        text           NOT NULL DEFAULT 'manual',   -- 'manual' | 'api' | 'dart'
  created_at    timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT pk_stock_prices_history PRIMARY KEY (id),
  CONSTRAINT uq_stock_date UNIQUE (symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_sph_symbol_date ON public.stock_prices_history (symbol, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_sph_market      ON public.stock_prices_history (market, trade_date DESC);

COMMENT ON TABLE public.stock_prices_history IS 'OHLCV 일별 주가 데이터. 모델 학습·추론 입력 소스.';


-- ─────────────────────────────────────────────
-- 2. technical_indicators  (기술적 지표 캐시)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.technical_indicators (
  id            uuid           NOT NULL DEFAULT gen_random_uuid(),
  symbol        text           NOT NULL,
  trade_date    date           NOT NULL,
  -- Moving Averages
  ma_5          numeric(20,4),
  ma_10         numeric(20,4),
  ma_20         numeric(20,4),
  ma_60         numeric(20,4),
  ema_12        numeric(20,4),
  ema_26        numeric(20,4),
  -- Momentum
  rsi_14        numeric(8,4),
  macd          numeric(20,6),
  macd_signal   numeric(20,6),
  macd_hist     numeric(20,6),
  stoch_k       numeric(8,4),
  stoch_d       numeric(8,4),
  -- Volatility
  bb_upper      numeric(20,4),
  bb_middle     numeric(20,4),
  bb_lower      numeric(20,4),
  atr_14        numeric(20,4),
  -- Volume
  obv           bigint,
  volume_ratio  numeric(10,4),
  -- Price change rates
  price_change_1d  numeric(10,6),
  price_change_5d  numeric(10,6),
  price_change_20d numeric(10,6),
  computed_at   timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT pk_technical_indicators PRIMARY KEY (id),
  CONSTRAINT uq_ti_symbol_date UNIQUE (symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_ti_symbol_date ON public.technical_indicators (symbol, trade_date DESC);
COMMENT ON TABLE public.technical_indicators IS '사전 계산된 기술적 지표. 모델 피처 캐시.';


-- ─────────────────────────────────────────────
-- 3. model_registry  (모델 버전 관리)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.model_registry (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  model_name    text        NOT NULL,
  version       text        NOT NULL,
  model_type    text        NOT NULL,   -- 'gradient_boosting'|'lstm'|'transformer'|'ensemble'
  target        text        NOT NULL DEFAULT 'signal',   -- 'signal'|'score'|'return_5d'
  scope         text        NOT NULL DEFAULT 'global',   -- 'global'|'per_symbol'|'sector'
  features      jsonb       NOT NULL DEFAULT '[]',
  hyperparams   jsonb       NOT NULL DEFAULT '{}',
  metrics       jsonb       NOT NULL DEFAULT '{}',       -- { accuracy, f1, sharpe, ... }
  artifact_url  text,                                    -- Storage 모델 파일 경로
  is_active     boolean     NOT NULL DEFAULT false,
  trained_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_model_registry PRIMARY KEY (id),
  CONSTRAINT uq_model_version UNIQUE (model_name, version)
);

CREATE INDEX IF NOT EXISTS idx_mr_active ON public.model_registry (is_active, model_type);
COMMENT ON TABLE public.model_registry IS 'ML 모델 버전 레지스트리. 배포 이력 및 메타데이터 관리.';


-- ─────────────────────────────────────────────
-- 4. stock_predictions  (예측 결과)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_predictions (
  id                uuid           NOT NULL DEFAULT gen_random_uuid(),
  symbol            text           NOT NULL,
  model_id          uuid           REFERENCES public.model_registry (id) ON DELETE SET NULL,
  prediction_date   date           NOT NULL,
  -- Core outputs
  ai_score          smallint       NOT NULL CHECK (ai_score BETWEEN 0 AND 100),
  signal            text           NOT NULL
                    CHECK (signal IN ('STRONG BUY','BUY','HOLD','SELL','STRONG SELL')),
  confidence        numeric(5,4),                        -- 0.0~1.0
  predicted_return  numeric(10,6),                       -- 5일 예측 수익률
  target_price      numeric(20,4),
  -- Factor breakdown (flexible JSON)
  factor_scores     jsonb          NOT NULL DEFAULT '{}',
  -- { technical:82, fundamental:74, sentiment:68, volume:91, momentum:79 }
  raw_output        jsonb,                               -- 모델 raw softmax/logit
  -- Post-hoc validation
  actual_return     numeric(10,6),
  is_correct        boolean,
  created_at        timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT pk_stock_predictions PRIMARY KEY (id),
  CONSTRAINT uq_pred_symbol_date_model UNIQUE (symbol, prediction_date, model_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_symbol_date ON public.stock_predictions (symbol, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_sp_signal      ON public.stock_predictions (signal, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_sp_model       ON public.stock_predictions (model_id, prediction_date DESC);
COMMENT ON TABLE public.stock_predictions IS '모델 예측 결과. symbol × date × model 조합으로 저장.';


-- ─────────────────────────────────────────────
-- 5. prediction_backtests  (백테스트 결과)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prediction_backtests (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  model_id      uuid        NOT NULL REFERENCES public.model_registry (id) ON DELETE CASCADE,
  backtest_name text        NOT NULL,
  start_date    date        NOT NULL,
  end_date      date        NOT NULL,
  universe      text[]      NOT NULL DEFAULT '{}',
  metrics       jsonb       NOT NULL DEFAULT '{}',
  -- metrics: { total_return, sharpe, max_drawdown, win_rate, avg_holding_days }
  trades        jsonb       NOT NULL DEFAULT '[]',
  run_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_prediction_backtests PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pb_model ON public.prediction_backtests (model_id, run_at DESC);
COMMENT ON TABLE public.prediction_backtests IS '백테스트 결과 저장. 모델 성능 비교에 사용.';


-- ─────────────────────────────────────────────
-- 6. sentiment_snapshots  (감성 분석 스냅샷)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sentiment_snapshots (
  id              uuid           NOT NULL DEFAULT gen_random_uuid(),
  symbol          text,                                  -- NULL = 전체 시장
  snapshot_date   date           NOT NULL,
  source          text           NOT NULL DEFAULT 'ai',  -- 'ai'|'news'|'community'
  bullish_pct     numeric(5,2)   NOT NULL DEFAULT 0,
  bearish_pct     numeric(5,2)   NOT NULL DEFAULT 0,
  neutral_pct     numeric(5,2)   NOT NULL DEFAULT 0,
  sentiment_score numeric(5,2),                          -- -100~+100
  fear_greed_idx  smallint,                              -- 0~100
  post_count      integer,
  raw_data        jsonb,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT pk_sentiment_snapshots PRIMARY KEY (id),
  CONSTRAINT uq_sentiment_symbol_date_src UNIQUE (symbol, snapshot_date, source)
);

CREATE INDEX IF NOT EXISTS idx_ss_symbol_date ON public.sentiment_snapshots (symbol, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ss_market_date ON public.sentiment_snapshots (snapshot_date DESC) WHERE symbol IS NULL;
COMMENT ON TABLE public.sentiment_snapshots IS '감성 분석 스냅샷. 개미의 일기 피처 및 모델 입력.';


-- ─────────────────────────────────────────────
-- 7. model_training_jobs  (학습 작업 큐)
-- ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM (
    'pending','running','completed','failed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.model_training_jobs (
  id            uuid               NOT NULL DEFAULT gen_random_uuid(),
  model_name    text               NOT NULL,
  requested_by  uuid,                                    -- auth.users.id (null = system)
  status        public.job_status  NOT NULL DEFAULT 'pending',
  config        jsonb              NOT NULL DEFAULT '{}',
  log           text,
  error_msg     text,
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz        NOT NULL DEFAULT now(),
  updated_at    timestamptz        NOT NULL DEFAULT now(),
  CONSTRAINT pk_model_training_jobs PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_mtj_status ON public.model_training_jobs (status, created_at DESC);
COMMENT ON TABLE public.model_training_jobs IS '모델 학습 작업 큐. 학습 요청·상태·로그 추적.';


-- ─────────────────────────────────────────────
-- 8. user_prediction_feedback  (사용자 피드백)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_prediction_feedback (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  prediction_id   uuid        NOT NULL REFERENCES public.stock_predictions (id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL,
  rating          smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  agreed          boolean,
  comment         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_upf PRIMARY KEY (id),
  CONSTRAINT uq_upf_pred_user UNIQUE (prediction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_upf_pred ON public.user_prediction_feedback (prediction_id);
CREATE INDEX IF NOT EXISTS idx_upf_user ON public.user_prediction_feedback (user_id);
COMMENT ON TABLE public.user_prediction_feedback IS '예측 피드백. 강화학습 및 모델 개선 데이터.';


-- ─────────────────────────────────────────────
-- 9. RLS 정책
-- ─────────────────────────────────────────────
ALTER TABLE public.stock_prices_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_indicators      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_registry            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_predictions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_backtests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_training_jobs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prediction_feedback  ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (로그인 필요)
CREATE POLICY "read_stock_prices"    ON public.stock_prices_history   FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_indicators"      ON public.technical_indicators    FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_model_registry"  ON public.model_registry          FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_predictions"     ON public.stock_predictions       FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_backtests"       ON public.prediction_backtests    FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_sentiment"       ON public.sentiment_snapshots     FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_training_jobs"   ON public.model_training_jobs     FOR SELECT TO authenticated USING (true);

-- 피드백: 본인 것만
CREATE POLICY "upf_insert" ON public.user_prediction_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upf_select" ON public.user_prediction_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "upf_update" ON public.user_prediction_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- 10. updated_at 자동 갱신 트리거
-- ─────────────────────────────────────────────
CREATE OR REPLACE TRIGGER set_model_registry_updated_at
  BEFORE UPDATE ON public.model_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER set_training_job_updated_at
  BEFORE UPDATE ON public.model_training_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────
-- 11. 편의 뷰 — latest_predictions
--     프론트엔드에서 최신 예측만 조회
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.latest_predictions AS
SELECT DISTINCT ON (sp.symbol)
  sp.*,
  mr.model_name,
  mr.version    AS model_version,
  mr.model_type
FROM public.stock_predictions sp
LEFT JOIN public.model_registry mr ON mr.id = sp.model_id
ORDER BY sp.symbol, sp.prediction_date DESC;

COMMENT ON VIEW public.latest_predictions IS '종목별 최신 예측 뷰. 홈/종목 상세 API에서 사용.';
