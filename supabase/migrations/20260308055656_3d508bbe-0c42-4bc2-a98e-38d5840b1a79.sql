
-- 기존 과도한 정책 삭제 후 적절한 정책으로 교체
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- 본인만 자신의 구독 row 삽입 가능 (최초 생성용, 트리거로도 생성됨)
CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인만 자신의 구독 업데이트 가능
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);
