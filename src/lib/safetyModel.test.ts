/**
 * Safety-failure model: correlated slashing, wrong-fork lockout, and the
 * client-combination risk tiers. Pinned at ANCHOR_ECONOMICS; share fixtures
 * are inline so refreshing the site's client presets can't move these.
 */

import { describe, it, expect } from "vitest";
import {
  slashingLoss,
  lockoutLoss,
  riskTier,
  minimalRiskCombos,
  combinedShare,
  type ClientShare,
} from "./safetyModel";
import { calculateOutage } from "./penaltyCalculator";
import { ANCHOR_ECONOMICS } from "./constants";

const econ = ANCHOR_ECONOMICS;

describe("correlated slashing", () => {
  it("initial penalty is 1/4096 of balance", () => {
    expect(slashingLoss(0, 32, econ).initialEth).toBeCloseTo(32 / 4096, 10);
  });

  it.each([
    [0.01, 0.96],
    [0.1, 9.6],
    [0.25, 24],
  ])("%d slashed together → correlation penalty %d ETH per 32", (f, eth) => {
    expect(slashingLoss(f, 32, econ).correlationEth).toBeCloseTo(eth, 6);
  });

  it("is total from one-third of stake slashed together", () => {
    expect(slashingLoss(1 / 3, 32, econ).fractionLost).toBe(1);
    expect(slashingLoss(0.5, 32, econ).totalEth).toBe(32);
  });

  it("missed duties over the ~36-day wait are small (~0.05 ETH)", () => {
    const d = slashingLoss(0.1, 32, econ).missedDutiesEth;
    expect(d).toBeGreaterThan(0.03);
    expect(d).toBeLessThan(0.08);
  });

  it("dwarfs the revised downtime penalty for the same cohort (the headline ratio)", () => {
    const downtime = calculateOutage(
      { eventFraction: 0.25, cohortHoursDown: 24, validatorHoursDown: 24 },
      econ
    ).revisedLossEth;
    expect(slashingLoss(0.25, 32, econ).totalEth / downtime).toBeGreaterThan(100);
  });
});

describe("wrong-fork lockout (leak-out)", () => {
  it.each([
    [2 / 3 + 0.001, 0.72],
    [0.75, 0.81],
    [0.9, 0.93],
  ])("%d trapped → ~%d of trapped balance lost", (f, lost) => {
    expect(Math.abs(lockoutLoss(f, econ).fractionLost - lost)).toBeLessThan(0.03);
  });

  it("tracks the ⅔ arithmetic: trapped balance must fall to ~(1−f)/2f of its start", () => {
    for (const f of [0.7, 0.8, 0.9]) {
      const analytic = 1 - (1 - f) / (2 * f);
      const sim = lockoutLoss(f, econ).fractionLost;
      // Exits through the churn-limited queue let a few percent out a bit early.
      expect(sim).toBeLessThanOrEqual(analytic + 0.01);
      expect(sim).toBeGreaterThan(analytic - 0.08);
    }
  });

  it("gets worse the more stake is trapped", () => {
    const a = lockoutLoss(0.7, econ).fractionLost;
    const b = lockoutLoss(0.85, econ).fractionLost;
    expect(b).toBeGreaterThan(a);
  });

  it("takes weeks, and the exit queue lets almost nobody out", () => {
    const r = lockoutLoss(0.8, econ);
    expect(r.daysToFinality).toBeGreaterThan(20);
    expect(r.daysToFinality).toBeLessThan(60);
    expect(r.exitedShare).toBeLessThan(0.15);
  });
});

describe("risk tiers", () => {
  it("splits at ⅓ and ⅔", () => {
    expect(riskTier(0.33)).toBe("contained");
    expect(riskTier(1 / 3)).toBe("finality");
    expect(riskTier(0.66)).toBe("finality");
    expect(riskTier(2 / 3)).toBe("lockout");
  });

  const shares: ClientShare[] = [
    { name: "A", percent: 50, layer: "EL" },
    { name: "B", percent: 25, layer: "EL" },
    { name: "C", percent: 9, layer: "EL" },
    { name: "D", percent: 8, layer: "EL" },
    { name: "X", percent: 51, layer: "CL" },
    { name: "Y", percent: 21, layer: "CL" },
    { name: "Z", percent: 5, layer: "CL" },
  ];
  const combos = minimalRiskCombos(shares);
  const find = (names: string[]) =>
    combos.find((c) => c.names.length === names.length && names.every((n) => c.names.includes(n)));

  it("finds the same-layer pairs that reach lockout", () => {
    expect(find(["A", "B"])?.tier).toBe("lockout");
    expect(find(["X", "Y"])?.tier).toBe("lockout");
  });

  it("combines an EL and a CL as a union, not a sum", () => {
    const c = find(["A", "X"]);
    expect(c?.kind).toBe("EL×CL");
    expect(c?.fraction).toBeCloseTo(1 - 0.5 * 0.49, 6);
    expect(c?.tier).toBe("lockout");
  });

  it("lists a big client alone at the finality tier, not its supersets", () => {
    expect(find(["A"])?.tier).toBe("finality");
    expect(find(["A", "C"])).toBeUndefined();
  });

  it("finds minority pairs that only jointly cross ⅓", () => {
    expect(find(["B", "C"])?.tier).toBe("finality");
  });

  it("every listed set is minimal for its tier", () => {
    for (const c of combos) {
      const smaller = combos.filter(
        (o) => o !== c && o.tier === c.tier && o.names.length < c.names.length && o.names.every((n) => c.names.includes(n))
      );
      expect(smaller).toEqual([]);
    }
  });

  it("sums a named same-layer set", () => {
    expect(combinedShare(shares, ["A", "B", "C"])).toBeCloseTo(0.84, 10);
  });
});
