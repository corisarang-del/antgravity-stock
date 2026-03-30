// 토스페이먼츠 클라이언트 키 (공개키)
// 테스트: test_ck_... / 실서비스: live_ck_...
export const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY ?? "test_ck_placeholder";

export const TOSS_PLAN = {
  name: "Pro",
  price: 9900,
  currency: "KRW",
  orderName: "AntGravity Pro 월정액",
} as const;

export const FREE_LIMITS = {
  watchlist: 5,
  alerts: 2,
  portfolio: false, // free 유저는 DB 저장 불가
  prediction: false, // free 유저는 AI 예측 잠금
} as const;
