CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  name text NOT NULL,
  market text NOT NULL,
  predicted_date date NOT NULL,
  prediction_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  predicted_prices jsonb NOT NULL DEFAULT '[]'::jsonb,
  volatility numeric(10, 4) NOT NULL DEFAULT 0,
  risk_level text NOT NULL,
  last_close numeric(20, 4) NOT NULL DEFAULT 0,
  model_name text NOT NULL,
  regime_label text NOT NULL,
  prediction_interval_low numeric(20, 4),
  prediction_interval_high numeric(20, 4),
  diagnostics_source text,
  vectrix_poc_score numeric(10, 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT predictions_symbol_predicted_date_key UNIQUE (symbol, predicted_date)
);

CREATE INDEX IF NOT EXISTS predictions_predicted_date_idx
  ON public.predictions (predicted_date DESC);

CREATE INDEX IF NOT EXISTS predictions_symbol_idx
  ON public.predictions (symbol);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read predictions"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage predictions"
  ON public.predictions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_predictions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS predictions_set_updated_at ON public.predictions;

CREATE TRIGGER predictions_set_updated_at
BEFORE UPDATE ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.set_predictions_updated_at();
