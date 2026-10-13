import { describe, it, expect } from "vitest";
import { computeBreakEven } from "@/components/onboarding/breakeven";
import { buildTimeline } from "@/components/guide/timeline-model";

const fees = [
  { termMonths: 3, feeGel: "200.00" },
  { termMonths: 6, feeGel: "300.00" },
  { termMonths: 12, feeGel: "500.00" },
];

describe("computeBreakEven", () => {
  it("compares broker cost with the yearly access fee", () => {
    const r = computeBreakEven({ declarations: 12, brokerFee: "150", term: 12, fees });
    expect(r.brokerYear.toFixed(2)).toBe("1800.00");
    expect(r.accessPerYear.toFixed(2)).toBe("500.00");
    expect(r.saving.toFixed(2)).toBe("1300.00");
    expect(r.breakeven).toBe(4);
  });
  it("annualises shorter terms", () => {
    const r = computeBreakEven({ declarations: 4, brokerFee: "100", term: 3, fees });
    expect(r.accessPerYear.toFixed(2)).toBe("800.00");
    expect(r.saving.toFixed(2)).toBe("-400.00");
    expect(r.breakeven).toBe(8);
  });
  it("accepts comma decimals and survives garbage input", () => {
    expect(computeBreakEven({ declarations: 10, brokerFee: "99,5", term: 12, fees }).brokerYear.toFixed(2)).toBe("995.00");
    const bad = computeBreakEven({ declarations: "abc", brokerFee: "", term: "x", fees });
    expect(bad.brokerYear.toFixed(2)).toBe("0.00");
    expect(bad.breakeven).toBe(0);
    expect(bad.term).toBe(12);
  });
  it("falls back to the 12 month fee for unknown terms", () => {
    expect(computeBreakEven({ declarations: 1, brokerFee: 100, term: 9, fees }).accessPerYear.toFixed(2)).toBe("500.00");
  });
});

describe("buildTimeline", () => {
  const createdAt = new Date("2026-10-01T10:00:00Z");
  it("marks reached milestones done and the next one current", () => {
    const tl = buildTimeline({ status: "paid", createdAt });
    expect(tl.map((e) => e.state)).toEqual(["done", "done", "done", "done", "done", "done", "done", "current", "todo", "todo"]);
    expect(tl[0]!.at).toBe(createdAt);
  });
  it("treats every corridor colour as the same milestone", () => {
    for (const status of ["corridor_green", "corridor_blue", "corridor_yellow", "corridor_red"]) {
      const tl = buildTimeline({ status, createdAt });
      expect(tl.find((e) => e.key === "corridor")!.state).toBe("done");
      expect(tl.find((e) => e.key === "released")!.state).toBe("current");
    }
  });
  it("starts at created for drafts and finishes when closed", () => {
    expect(buildTimeline({ status: "draft", createdAt })[1]!.state).toBe("current");
    expect(buildTimeline({ status: "closed", createdAt, closedAt: new Date() }).every((e) => e.state === "done")).toBe(true);
  });
  it("has no current step for cancelled shipments", () => {
    expect(buildTimeline({ status: "cancelled", createdAt }).some((e) => e.state === "current")).toBe(false);
  });
});
