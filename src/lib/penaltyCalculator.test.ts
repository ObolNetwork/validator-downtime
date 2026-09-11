/**
 * Test vectors from the canonical anchors table in UPDATE_PLAN.md §3
 * (computed against the July 2026 research anchors). Tolerance ±5% —
 * the anchors round, and the site model is the approved ≤48h approximation.
 */

import { describe, it, expect } from "vitest";
import {
  calculateOutage,
  onsetFactor,
  fullRewardsPerDayEth,
  type OutageParams,
} from "./penaltyCalculator";
import { ANCHOR_ECONOMICS, MAX_PENALTY_FACTOR } from "./constants";

const econ = ANCHOR_ECONOMICS;

function expectWithin(actual: number, expected: number, tolerance = 0.05) {
  expect(Math.abs(actual - expected) / expected).toBeLessThanOrEqual(tolerance);
}

describe("economic anchors", () => {
  it("full CL+EL rewards ≈ $5.08/day per 32 ETH", () => {
    const usdPerDay = fullRewardsPerDayEth(32, econ) * econ.ethPriceUsd;
    expectWithin(usdPerDay, 5.08);
  });
});

describe("onset factor by event size", () => {
  it("never drops below 1 (no discount windows)", () => {
    expect(onsetFactor(0)).toBe(1);
    expect(onsetFactor(0.0001)).toBeGreaterThanOrEqual(1);
  });

  it.each([
    [0.01, 9],
    [0.05, 39],
    [0.1, 78],
    [0.2, 154],
  ])("%d of stake newly offline → ~%dx", (fraction, expected) => {
    expectWithin(onsetFactor(fraction), expected);
  });

  it("caps at 256 from one-third of stake", () => {
    expect(onsetFactor(1 / 3)).toBeCloseTo(MAX_PENALTY_FACTOR, 0);
    expect(onsetFactor(0.4)).toBe(MAX_PENALTY_FACTOR);
    expect(onsetFactor(0.69)).toBe(MAX_PENALTY_FACTOR);
  });
});

describe("§3 canonical loss table (per 32 ETH, USD at anchors)", () => {
  type Vector = {
    name: string;
    params: OutageParams;
    todayUsd: number;
    revisedUsd: number;
    multiple: number;
  };

  const vectors: Vector[] = [
    {
      name: "uncorrelated failure, 24h",
      params: { eventFraction: 0, cohortHoursDown: 24, validatorHoursDown: 24 },
      todayUsd: 6.17,
      revisedUsd: 6.17,
      multiple: 1.0,
    },
    {
      name: "1% correlated, 24h",
      params: { eventFraction: 0.01, cohortHoursDown: 24, validatorHoursDown: 24 },
      todayUsd: 6.17,
      revisedUsd: 19,
      multiple: 3.1,
    },
    {
      name: "5% correlated, 24h",
      params: { eventFraction: 0.05, cohortHoursDown: 24, validatorHoursDown: 24 },
      todayUsd: 6.17,
      revisedUsd: 70,
      multiple: 11.3,
    },
    {
      name: "10% correlated, down 6h",
      params: { eventFraction: 0.1, cohortHoursDown: 24, validatorHoursDown: 6 },
      todayUsd: 1.54,
      revisedUsd: 34,
      multiple: 22,
    },
    {
      name: "10% correlated, 24h",
      params: { eventFraction: 0.1, cohortHoursDown: 24, validatorHoursDown: 24 },
      todayUsd: 6.17,
      revisedUsd: 133,
      multiple: 21.6,
    },
    {
      name: "10% correlated, down 72h",
      params: { eventFraction: 0.1, cohortHoursDown: 24, validatorHoursDown: 72 },
      todayUsd: 18.5,
      revisedUsd: 146,
      multiple: 7.9,
    },
    {
      name: "20% correlated, 24h",
      params: { eventFraction: 0.2, cohortHoursDown: 24, validatorHoursDown: 24 },
      todayUsd: 6.17,
      revisedUsd: 260,
      multiple: 42,
    },
    {
      name: "40% (leak active), 24h",
      params: { eventFraction: 0.4, cohortHoursDown: 24, validatorHoursDown: 24 },
      todayUsd: 95,
      revisedUsd: 530,
      multiple: 5.6,
    },
    {
      name: "40%, down 72h (finality lost)",
      params: { eventFraction: 0.4, cohortHoursDown: 72, validatorHoursDown: 72 },
      todayUsd: 819,
      revisedUsd: 2124,
      multiple: 2.6,
    },
  ];

  it.each(vectors)("$name", ({ params, todayUsd, revisedUsd, multiple }) => {
    const r = calculateOutage(params, econ);
    expectWithin(r.todayLossUsd, todayUsd);
    expectWithin(r.revisedLossUsd, revisedUsd);
    expectWithin(r.multiple, multiple);
  });

  it("40%/72h splits into ~$1,324 EIP + ~$801 pre-existing leak", () => {
    const r = calculateOutage(
      { eventFraction: 0.4, cohortHoursDown: 72, validatorHoursDown: 72 },
      econ
    );
    expect(r.leakActive).toBe(true);
    expectWithin(r.eipOnlyLossUsd, 1324);
    expectWithin(r.leakLossUsd, 801);
  });

  it("payback framing: 10%/24h ≈ 3.7 weeks, uncorrelated 24h ≈ 1.2 days", () => {
    const big = calculateOutage(
      { eventFraction: 0.1, cohortHoursDown: 24, validatorHoursDown: 24 },
      econ
    );
    expectWithin(big.paybackDaysRevised, 3.7 * 7, 0.06);

    const solo = calculateOutage(
      { eventFraction: 0, cohortHoursDown: 24, validatorHoursDown: 24 },
      econ
    );
    expectWithin(solo.paybackDaysRevised, 1.2, 0.06);
  });
});

describe("inactivity leak window", () => {
  it("leak accrues only while the >1/3 cohort is down, not your full downtime", () => {
    const straggler = calculateOutage(
      { eventFraction: 0.45, cohortHoursDown: 4, validatorHoursDown: 72 },
      econ
    );
    const together = calculateOutage(
      { eventFraction: 0.45, cohortHoursDown: 4, validatorHoursDown: 4 },
      econ
    );
    // Same finality-loss window → identical leak, despite 18x longer downtime.
    expect(straggler.leakLossUsd).toBeCloseTo(together.leakLossUsd, 6);
    expect(straggler.leakLossUsd).toBeGreaterThan(0);
  });

  it("recovering before the cohort limits the leak to your own downtime", () => {
    const fast = calculateOutage(
      { eventFraction: 0.45, cohortHoursDown: 72, validatorHoursDown: 4 },
      econ
    );
    const slow = calculateOutage(
      { eventFraction: 0.45, cohortHoursDown: 72, validatorHoursDown: 72 },
      econ
    );
    expect(fast.leakLossUsd).toBeLessThan(slow.leakLossUsd / 10);
  });
});

describe("fairness properties (the w4/w5 story)", () => {
  it("nominal cost grows with your downtime, but the multiple vs today falls", () => {
    const fast = calculateOutage(
      { eventFraction: 0.1, cohortHoursDown: 24, validatorHoursDown: 3 },
      econ
    );
    const slow = calculateOutage(
      { eventFraction: 0.1, cohortHoursDown: 24, validatorHoursDown: 48 },
      econ
    );
    expect(slow.revisedLossUsd).toBeGreaterThan(fast.revisedLossUsd);
    expect(slow.multiple).toBeLessThan(fast.multiple);
  });

  it("staying down 12x longer costs far less than 12x more", () => {
    const fast = calculateOutage(
      { eventFraction: 0.1, cohortHoursDown: 6, validatorHoursDown: 6 },
      econ
    );
    const slow = calculateOutage(
      { eventFraction: 0.1, cohortHoursDown: 6, validatorHoursDown: 72 },
      econ
    );
    const costRatio = slow.revisedLossUsd / fast.revisedLossUsd;
    expect(costRatio).toBeGreaterThan(1);
    expect(costRatio).toBeLessThan(4);
  });
});
