/**
 * Safety-failure costs, for scale against the EIP-7716 downtime penalties.
 *
 * None of this is changed by EIP-7716 — it is the protocol's pre-existing
 * pricing of correlated *safety* failures, modelled here so the site can show
 * what the (larger) downtime penalty is buying down:
 *
 *   - correlated slashing: a signing bug makes a cohort double- or
 *     surround-vote. Loss ≈ balance × min(3 × cohort, 1).
 *   - wrong-fork lockout: ≥⅔ of stake follows the same invalid chain and
 *     justifies it. Coming back means surround votes (→ correlated slashing),
 *     so the realistic path is to stay offline on the canonical chain while
 *     the inactivity leak drains you — until the honest remainder is ⅔ of
 *     active stake again. Holesky, February 2025.
 */

import {
  FINALITY_THRESHOLD,
  SUPERMAJORITY_THRESHOLD,
  MIN_SLASHING_PENALTY_QUOTIENT,
  PROPORTIONAL_SLASHING_MULTIPLIER,
  EPOCHS_PER_SLASHINGS_VECTOR,
  INACTIVITY_SCORE_BIAS,
  INACTIVITY_PENALTY_QUOTIENT,
  MIN_EPOCHS_TO_INACTIVITY_PENALTY,
  EJECTION_BALANCE_ETH,
  EXIT_CHURN_ETH_PER_EPOCH,
  EFFECTIVE_BALANCE_DOWNWARD_THRESHOLD_ETH,
  TIMELY_SOURCE_WEIGHT,
  TIMELY_TARGET_WEIGHT,
  WEIGHT_DENOMINATOR,
  BASE_REWARD_FACTOR,
  GWEI_PER_ETH,
  EPOCHS_PER_DAY,
  DEFAULT_ECONOMICS,
  type EconomicsSnapshot,
} from "./constants";
import { baseRewardPerEpochEth } from "./penaltyCalculator";

// ── Correlated slashing ─────────────────────────────────────────────────────

export interface SlashingLoss {
  /** effective_balance / 4096, applied immediately. */
  initialEth: number;
  /** balance × min(3 × slashed fraction, 1), applied ~18 days in. */
  correlationEth: number;
  /** Source + target penalties for the ~36 days until withdrawable. */
  missedDutiesEth: number;
  totalEth: number;
  /** totalEth / stake. */
  fractionLost: number;
}

/**
 * Loss when `slashedFraction` of total stake is slashed together (within the
 * same ~36-day window), e.g. a validator-client or remote-signer bug.
 */
export function slashingLoss(
  slashedFraction: number,
  stakeEth = 32,
  econ: EconomicsSnapshot = DEFAULT_ECONOMICS
): SlashingLoss {
  const f = Math.max(0, slashedFraction);
  const initialEth = stakeEth / MIN_SLASHING_PENALTY_QUOTIENT;
  const correlationEth = stakeEth * Math.min(PROPORTIONAL_SLASHING_MULTIPLIER * f, 1);
  const missedDutiesEth =
    (baseRewardPerEpochEth(stakeEth, econ) *
      (TIMELY_SOURCE_WEIGHT + TIMELY_TARGET_WEIGHT) *
      EPOCHS_PER_SLASHINGS_VECTOR) /
    WEIGHT_DENOMINATOR;
  const totalEth = Math.min(stakeEth, initialEth + correlationEth + missedDutiesEth);
  return { initialEth, correlationEth, missedDutiesEth, totalEth, fractionLost: totalEth / stakeEth };
}

// ── Wrong-fork lockout (leak-out) ───────────────────────────────────────────

export interface LockoutResult {
  /** Epochs until the canonical chain finalizes again. */
  epochsToFinality: number;
  daysToFinality: number;
  /** Average share of each trapped validator's balance lost. */
  fractionLost: number;
  /** Share of trapped validators that reached the 16 ETH ejection balance. */
  ejectedShare: number;
  /** Share of trapped validators that actually got through the exit queue before finality. */
  exitedShare: number;
}

/**
 * Epoch-by-epoch leak simulation of the canonical chain after
 * `trappedFraction` (≥⅔) of stake has justified a wrong fork and can't vote
 * on the canonical chain without being slashed.
 *
 * Every trapped validator starts at 32 ETH and follows the same balance path
 * (same score, same effective balance), so one representative trajectory plus
 * a count of still-active validators is exact. Uses today's rules — EIP-7716
 * would drain the trapped side slightly faster, but the endpoint barely
 * moves: the leak stops only once the honest side is ⅔ of active stake
 * again, a balance condition, not a time condition.
 *
 * Simplifications: the honest side stays fully online; trapped validators
 * stay offline until finality returns (then their bad votes are older than
 * the canonical justified checkpoint and they can safely rejoin); nobody
 * submits a voluntary exit early (even if all did, the 256 ETH/epoch churn
 * would let only a few percent out before finality).
 */
export function lockoutLoss(
  trappedFraction: number,
  econ: EconomicsSnapshot = DEFAULT_ECONOMICS,
  maxEpochs = 200_000
): LockoutResult {
  const trapped = Math.min(Math.max(trappedFraction, 0), 0.999);
  const total = econ.totalStakedEth;
  const honestEth = (1 - trapped) * total;

  let balance = 32;
  let effective = 32;
  let score = 0;
  let activeCount = (trapped * total) / 32; // trapped validators still active
  const initialCount = activeCount;
  let exitedLossSum = 0; // Σ ETH lost by validators that exited, at exit time
  let exitedCount = 0;
  let queued = 0; // ejected, waiting for the exit queue
  let ejected = false;

  let epoch = 0;
  for (; epoch < maxEpochs; epoch++) {
    const trappedActiveEth = activeCount * effective;
    if (honestEth >= SUPERMAJORITY_THRESHOLD * (honestEth + trappedActiveEth)) break;

    // process_inactivity_updates: +4 while missing, −16 recovery outside a leak.
    const inLeak = epoch > MIN_EPOCHS_TO_INACTIVITY_PENALTY;
    score += INACTIVITY_SCORE_BIAS;
    if (!inLeak) score -= Math.min(16, score);

    // Missed source + target (no rewards for anyone during a leak), plus the leak itself.
    const totalActiveGwei = (honestEth + trappedActiveEth) * GWEI_PER_ETH;
    const baseReward = (effective * BASE_REWARD_FACTOR) / Math.sqrt(totalActiveGwei);
    const attestationPenalty =
      (baseReward * (TIMELY_SOURCE_WEIGHT + TIMELY_TARGET_WEIGHT)) / WEIGHT_DENOMINATOR;
    const leakPenalty = (effective * score) / (INACTIVITY_SCORE_BIAS * INACTIVITY_PENALTY_QUOTIENT);
    balance = Math.max(0, balance - attestationPenalty - leakPenalty);

    if (balance + EFFECTIVE_BALANCE_DOWNWARD_THRESHOLD_ETH < effective) {
      effective = Math.floor(balance);
    }

    // Ejection at 16 ETH effective; the exit queue drains 256 ETH of
    // (initiation-time) effective balance per epoch.
    if (!ejected && effective <= EJECTION_BALANCE_ETH) {
      ejected = true;
      queued = activeCount;
    }
    if (queued > 0) {
      const leaving = Math.min(queued, EXIT_CHURN_ETH_PER_EPOCH / EJECTION_BALANCE_ETH);
      queued -= leaving;
      activeCount -= leaving;
      exitedCount += leaving;
      exitedLossSum += leaving * (32 - balance);
    }
  }

  const stillActiveLoss = activeCount * (32 - balance);
  return {
    epochsToFinality: epoch,
    daysToFinality: epoch / EPOCHS_PER_DAY,
    fractionLost: (exitedLossSum + stillActiveLoss) / (initialCount * 32),
    ejectedShare: ejected ? 1 : 0,
    exitedShare: exitedCount / initialCount,
  };
}

// ── Client-failure risk tiers ───────────────────────────────────────────────

/**
 * What a cohort of this size on the same wrong view does to the network:
 * - contained: <⅓, chain finalizes, the cohort pays downtime penalties;
 * - finality: ⅓–⅔, finality stops and the leak runs, still recoverable;
 * - lockout: ≥⅔, the wrong fork justifies and its validators can't return.
 */
export type RiskTier = "contained" | "finality" | "lockout";

export function riskTier(fraction: number): RiskTier {
  if (fraction >= SUPERMAJORITY_THRESHOLD - 1e-9) return "lockout";
  if (fraction >= FINALITY_THRESHOLD - 1e-9) return "finality";
  return "contained";
}

export interface ClientShare {
  name: string;
  percent: number;
  layer: "EL" | "CL";
}

export interface ClientCombo {
  names: string[];
  /** "EL", "CL", or "EL×CL" (a bug in each, on the same block). */
  kind: "EL" | "CL" | "EL×CL";
  /** Share of stake on the wrong view if these clients fail the same way. */
  fraction: number;
  tier: RiskTier;
}

/**
 * The smallest client sets whose shared failure crosses each threshold.
 *
 * Same-layer failures add (a validator runs one EL and one CL). A bug in an
 * EL and a bug in a CL that take the same wrong view trap everyone running
 * *either*, so shares combine as a union: a + b − ab, assuming EL and CL
 * choice are independent (the joint distribution isn't published).
 *
 * "Minimal" means no smaller subset already reaches the same tier, so the
 * list reads as "these are the combinations that newly get you there".
 */
export function minimalRiskCombos(shares: ClientShare[], maxSize = 3): ClientCombo[] {
  const byLayer = (layer: "EL" | "CL") =>
    shares.filter((s) => s.layer === layer).sort((a, b) => b.percent - a.percent);
  const out: ClientCombo[] = [];
  const reached = new Map<RiskTier, string[][]>([
    ["finality", []],
    ["lockout", []],
  ]);
  const isSuperset = (names: string[], tier: RiskTier) =>
    (reached.get(tier) ?? []).some((sub) => sub.every((n) => names.includes(n)));

  const consider = (names: string[], kind: ClientCombo["kind"], fraction: number) => {
    for (const tier of ["lockout", "finality"] as const) {
      const hit = tier === "lockout" ? fraction >= SUPERMAJORITY_THRESHOLD - 1e-9 : fraction >= FINALITY_THRESHOLD - 1e-9;
      // A set that reaches lockout also reaches finality; list it once, at its top tier.
      if (hit && !isSuperset(names, tier)) {
        reached.get(tier)!.push(names);
        if (tier === "lockout" || riskTier(fraction) === "finality") {
          out.push({ names, kind, fraction, tier: riskTier(fraction) });
        }
      }
    }
  };

  // Enumerate by size so smaller sets register first.
  for (let size = 1; size <= maxSize; size++) {
    for (const layer of ["EL", "CL"] as const) {
      const clients = byLayer(layer);
      const walk = (start: number, picked: ClientShare[]) => {
        if (picked.length === size) {
          consider(
            picked.map((p) => p.name),
            layer,
            picked.reduce((s, p) => s + p.percent, 0) / 100
          );
          return;
        }
        for (let i = start; i < clients.length; i++) walk(i + 1, [...picked, clients[i]]);
      };
      walk(0, []);
    }
    if (size === 2) {
      for (const el of byLayer("EL")) {
        for (const cl of byLayer("CL")) {
          const a = el.percent / 100;
          const b = cl.percent / 100;
          consider([el.name, cl.name], "EL×CL", 1 - (1 - a) * (1 - b));
        }
      }
    }
  }

  const rank = { lockout: 0, finality: 1, contained: 2 };
  return out.sort((x, y) => rank[x.tier] - rank[y.tier] || x.names.length - y.names.length || y.fraction - x.fraction);
}

/** Combined share of a named set of same-layer clients (e.g. the Holesky trio). */
export function combinedShare(shares: ClientShare[], names: string[]): number {
  return shares.filter((s) => names.includes(s.name)).reduce((sum, s) => sum + s.percent, 0) / 100;
}
