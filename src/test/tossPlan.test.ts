import { describe, expect, it } from "vitest";

import { TOSS_PLAN } from "@/config/toss";

describe("TOSS_PLAN", () => {
  it("Pro 월 요금을 9900원으로 유지한다", () => {
    expect(TOSS_PLAN.price).toBe(9900);
  });
});
