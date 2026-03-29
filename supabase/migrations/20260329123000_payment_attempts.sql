ALTER TABLE public.subscriptions
ADD COLUMN latest_payment_status text NOT NULL DEFAULT 'idle',
ADD COLUMN latest_payment_code text,
ADD COLUMN latest_payment_message text,
ADD COLUMN latest_payment_at timestamptz;

CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'toss',
  flow text NOT NULL,
  status text NOT NULL,
  order_id text,
  auth_key text,
  toss_customer_key text,
  toss_code text,
  toss_message text,
  amount numeric(12, 2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment attempts"
  ON public.payment_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment attempts"
  ON public.payment_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment attempts"
  ON public.payment_attempts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX payment_attempts_user_id_created_at_idx
  ON public.payment_attempts (user_id, created_at DESC);
