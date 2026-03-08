// 토스페이먼츠 클라이언트 키 (공개키 - 코드에 포함 가능)
// 실제 키 발급: https://developers.tosspayments.com
// 테스트: test_ck_... / 실서비스: live_ck_...
export const TOSS_CLIENT_KEY = "test_ck_placeholder";

export const TOSS_PLAN = {
  name: "Pro",
  price: 4900,
  currency: "KRW",
  orderName: "StockAI Pro 월정액",
} as const;

export const FREE_LIMITS = {
  watchlist: 5,
  alerts: 2,
  portfolio: false, // free 유저는 DB 저장 불가
  prediction: false, // free 유저는 AI 예측 잠금
} as const;
