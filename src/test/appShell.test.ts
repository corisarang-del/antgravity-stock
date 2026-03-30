import { describe, expect, it } from "vitest";

import { buildTabs } from "@/lib/appShellTabs";

describe("buildTabs", () => {
  it("프로 유저에게 프로 대시보드 탭을 노출한다", () => {
    const tabs = buildTabs(true);

    expect(tabs.some((tab) => tab.path === "/pro")).toBe(true);
    expect(tabs.some((tab) => tab.path === "/upgrade")).toBe(false);
  });

  it("무료 유저에게 업그레이드 탭을 노출한다", () => {
    const tabs = buildTabs(false);

    expect(tabs.some((tab) => tab.path === "/upgrade")).toBe(true);
    expect(tabs.some((tab) => tab.path === "/pro")).toBe(false);
  });
});
