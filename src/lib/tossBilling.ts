import { getSafeRedirectUrl } from "@/lib/authRedirect";
import { TOSS_CLIENT_KEY, TOSS_PLAN } from "@/config/toss";

interface TossCheckoutUser {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  } | null;
}

export function getTossCustomerName(user: TossCheckoutUser): string {
  return (
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "고객"
  );
}

function validateTossClientKey() {
  const key = TOSS_CLIENT_KEY.trim();

  if (!key || key === "test_ck_placeholder") {
    throw new Error("VITE_TOSS_CLIENT_KEY가 설정되지 않았어. .env 또는 배포 환경변수에 토스 테스트 클라이언트 키를 넣어줘.");
  }

  if (key.startsWith("test_gck_") || key.startsWith("live_gck_")) {
    throw new Error("지금 넣은 키는 결제위젯 키야. 현재 빌링 연동에는 API 개별 연동용 클라이언트 키인 test_ck_ 또는 live_ck_ 키를 넣어야 해.");
  }

  if (!key.startsWith("test_ck_") && !key.startsWith("live_ck_")) {
    throw new Error("VITE_TOSS_CLIENT_KEY 형식이 올바르지 않아. API 개별 연동용 클라이언트 키인 test_ck_ 또는 live_ck_ 키를 넣어줘.");
  }
}

export async function startSubscriptionCheckout(user: TossCheckoutUser) {
  validateTossClientKey();

  const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
  const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey: user.id });

  await payment.requestBillingAuth({
    method: "CARD",
    successUrl: getSafeRedirectUrl("/payment/success"),
    failUrl: getSafeRedirectUrl("/payment/fail"),
    customerEmail: user.email ?? "",
    customerName: getTossCustomerName(user),
  });
}
