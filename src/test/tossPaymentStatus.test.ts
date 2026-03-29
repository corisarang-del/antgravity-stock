import { describe, expect, it } from "vitest";

import { classifyTossFailure } from "@/lib/tossPaymentStatus";

describe("classifyTossFailure", () => {
  it("사용자 취소 코드를 취소 상태로 분류한다", () => {
    expect(classifyTossFailure({ code: "USER_CANCEL" })).toBe("cancelled_by_user");
  });

  it("취소 메시지를 취소 상태로 분류한다", () => {
    expect(classifyTossFailure({ message: "사용자가 결제를 취소했습니다." })).toBe("cancelled_by_user");
  });

  it("일반 실패는 실패 상태로 분류한다", () => {
    expect(classifyTossFailure({ code: "INVALID_CARD_COMPANY" })).toBe("failed");
  });
});
