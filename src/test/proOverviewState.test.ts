import { describe, expect, it } from "vitest";

import { getProOverviewState } from "@/lib/proOverviewState";

describe("getProOverviewState", () => {
  it("로딩 중이면 loading 상태를 반환한다", () => {
    expect(getProOverviewState({ isLoading: true, isError: false, availableCount: 0 })).toBe("loading");
  });

  it("에러가 있으면 error 상태를 반환한다", () => {
    expect(getProOverviewState({ isLoading: false, isError: true, availableCount: 0 })).toBe("error");
  });

  it("사용 가능한 재무 데이터가 없으면 empty 상태를 반환한다", () => {
    expect(getProOverviewState({ isLoading: false, isError: false, availableCount: 0 })).toBe("empty");
  });

  it("사용 가능한 재무 데이터가 있으면 ready 상태를 반환한다", () => {
    expect(getProOverviewState({ isLoading: false, isError: false, availableCount: 3 })).toBe("ready");
  });
});
