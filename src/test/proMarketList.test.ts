import { describe, expect, it } from "vitest";

import { getProMarketListState } from "@/lib/proMarketListState";

describe("getProMarketListState", () => {
  it("로딩 중이면 loading 상태를 반환한다", () => {
    expect(getProMarketListState({ isLoading: true, isError: false, total: 0 })).toBe("loading");
  });

  it("요청 실패는 빈 데이터보다 우선해 error 상태를 반환한다", () => {
    expect(getProMarketListState({ isLoading: false, isError: true, total: 0 })).toBe("error");
  });

  it("정상 응답이지만 데이터가 없으면 empty 상태를 반환한다", () => {
    expect(getProMarketListState({ isLoading: false, isError: false, total: 0 })).toBe("empty");
  });

  it("데이터가 있으면 ready 상태를 반환한다", () => {
    expect(getProMarketListState({ isLoading: false, isError: false, total: 12 })).toBe("ready");
  });
});
