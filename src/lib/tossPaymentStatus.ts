export type PaymentAttemptStatus =
  | "idle"
  | "success"
  | "cancelled_by_user"
  | "failed";

const USER_CANCEL_CODES = new Set([
  "USER_CANCEL",
  "USER_CANCELED",
  "USER_CANCELLED",
  "PAY_PROCESS_CANCELED",
  "PAY_PROCESS_CANCELLED",
]);

export function classifyTossFailure(input: {
  code?: string | null;
  message?: string | null;
}): Extract<PaymentAttemptStatus, "cancelled_by_user" | "failed"> {
  const normalizedCode = input.code?.trim().toUpperCase() ?? "";
  const normalizedMessage = input.message?.trim() ?? "";

  if (USER_CANCEL_CODES.has(normalizedCode)) {
    return "cancelled_by_user";
  }

  if (/사용자.*취소|결제.*취소|취소되었|취소되었습니다|취소했/.test(normalizedMessage)) {
    return "cancelled_by_user";
  }

  return "failed";
}
