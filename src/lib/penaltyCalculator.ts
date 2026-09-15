/**
 * EIP-7716 (2026 revision) outage cost model.
 *
 * The revised mechanism scales the timely-target penalty by how far the
 * slot's offline balance exceeds a slow-moving average of itself:
 *
 *   excess = max(0, offline − smoothed_offline_balance)
 *   factor = min(1 + PENALTY_SLOPE × excess / committee_balance, MAX_PENALTY_FACTOR)
 *
 * The moving average has a ~12.6-day half-life, so within events lasting
 * ≤~48h it barely moves. Approved simplification used here:
 * factor ≈ onset factor while the cohort is offline; factor ≈ 1 once the
 * cohort has recovered. Exact within ~5% for events ≤48h; the integer-exact
 * model lives in https://github.com/OisinKyne/7716.
 */

import {
  MAX_PENALTY_FACTOR,
  PENALTY_SLOPE,
  FINALITY_THRESHOLD,
  TIMELY_SOURCE_WEIGHT,
  TIMELY_TARGET_WEIGHT,
  WEIGHT_DENOMINATOR,
  ATTESTATION_WEIGHT,
  EPOCHS_PER_HOUR,
  BASE_REWARD_FACTOR,
  GWEI_PER_ETH,
  INACTIVITY_LEAK_QUOTIENT,
  DEFAULT_ECONOMICS,
  BASELINE_OFFLINE_FRACTION,
  type EconomicsSnapshot,
} from "./constants";

// ── Inputs / outputs ────────────────────────────────────────────────────────

export interface OutageParams {
  /** Share of total stake offline together, as a fraction (0–1). */
  eventFraction: number;
  /** How long the correlated cohort stays down, in hours. */
  cohortHoursDown: number;
  /** Your own downtime, in hours. Can be shorter or longer than the cohort's. */
  validatorHoursDown: number;
  /** Your stake in ETH (default 32). */
  stakeEth?: number;
}

export interface OutageBreakdown {
  /** Ideal attestation rewards forgone while down (ETH) — same under both rule sets. */
  forgoneEth: number;
  /** Timely-source penalty (ETH) — never scaled. */
  sourcePenaltyEth: number;
  /** Timely-target penalty under today's rules (ETH). */
  targetPenaltyTodayEth: number;
  /** Timely-target penalty under the revised rules (ETH). */
  targetPenaltyRevisedEth: number;
  /** Inactivity-leak loss (ETH); >0 only when the event exceeds ⅓ of stake. */
  leakEth: number;
  epochsDown: number;
  epochsAtHighFactor: number;
  baseRewardPerEpochEth: number;
  dailyRewardsEth: number;
}

export interface OutageResult {
  /** Onset penalty factor applied to the timely-target penalty. */
  factor: number;
  /** Whether the factor is capped (event ≥ ⅓ of stake). */
  capBinds: boolean;
  /** Whether the inactivity leak is active (event > ⅓ of stake). */
  leakActive: boolean;

  /** Total loss under today's rules (incl. leak when active). */
  todayLossEth: number;
  todayLossUsd: number;
  /** Total loss under revised EIP-7716 (incl. leak when active). */
  revisedLossEth: number;
  revisedLossUsd: number;
  /** Loss attributable to EIP-7716 scaling alone, excluding the pre-existing leak. */
  eipOnlyLossUsd: number;
  /** Leak share of the revised total (also present under today's rules). */
  leakLossUsd: number;

  /** revisedLoss / todayLoss. 1.0 for uncorrelated failures. */
  multiple: number;

  /** Days of full CL+EL rewards needed to re-earn each loss. */
  paybackDaysToday: number;
  paybackDaysRevised: number;

  breakdown: OutageBreakdown;
}

// ── Core pieces ─────────────────────────────────────────────────────────────

/**
 * Onset penalty factor for a cohort of `eventFraction` of stake newly going
 * down on top of the normal offline baseline. Computed in the spec's own
 * form — offline balance vs the smoothed moving average — with the moving
 * average warmed at the realistic ~0.3% baseline rather than assuming a
 * perfectly-online network:
 *
 *   offline  = BASELINE_OFFLINE_FRACTION + eventFraction
 *   smoothed = BASELINE_OFFLINE_FRACTION
 *   excess   = offline − min(offline, smoothed)  ( = eventFraction )
 *
 * The baseline cancels exactly, for any baseline value: the slope is
 * normalized by total active balance, not by the moving average, so the
 * factor depends only on the size of the anomaly. (An average-relative
 * slope would NOT have this property — it was evaluated and rejected for
 * exactly that reason.) Never below 1: uncorrelated failures pay exactly
 * today's penalties.
 */
export function onsetFactor(eventFraction: number): number {
  const offline = BASELINE_OFFLINE_FRACTION + Math.max(0, eventFraction);
  const smoothed = BASELINE_OFFLINE_FRACTION;
  const excess = offline - Math.min(offline, smoothed);
  return Math.min(1 + PENALTY_SLOPE * excess, MAX_PENALTY_FACTOR);
}

/**
 * Spec base reward per epoch for a validator of `stakeEth`, in ETH:
 * increments × EFFECTIVE_BALANCE_INCREMENT × BASE_REWARD_FACTOR / sqrt(total_balance_gwei).
 */
export function baseRewardPerEpochEth(
  stakeEth: number,
  econ: EconomicsSnapshot = DEFAULT_ECONOMICS
): number {
  const totalGwei = econ.totalStakedEth * GWEI_PER_ETH;
  const perIncrementGwei = (GWEI_PER_ETH * BASE_REWARD_FACTOR) / Math.sqrt(totalGwei);
  return (stakeEth * perIncrementGwei) / GWEI_PER_ETH;
}

/** Full CL+EL rewards per day (ETH) — used for "days to re-earn" framing. */
export function fullRewardsPerDayEth(
  stakeEth: number,
  econ: EconomicsSnapshot = DEFAULT_ECONOMICS
): number {
  return (stakeEth * econ.aprInclEl) / 365;
}

/**
 * Cumulative inactivity-leak loss after `leakEpochs` epochs fully offline
 * during a leak: balance × t² / 2^25. Pre-existing mechanism, unchanged by
 * EIP-7716 — applies identically under both rule sets. The leak only runs
 * while finality is lost, i.e. while the >⅓ cohort is still offline — so
 * callers must pass the overlap of the validator's downtime with the
 * cohort's, not the validator's full downtime.
 */
export function leakLossEth(stakeEth: number, leakEpochs: number): number {
  return (stakeEth * leakEpochs * leakEpochs) / INACTIVITY_LEAK_QUOTIENT;
}

// ── Full outage model ───────────────────────────────────────────────────────

export function calculateOutage(
  params: OutageParams,
  econ: EconomicsSnapshot = DEFAULT_ECONOMICS
): OutageResult {
  const stakeEth = params.stakeEth ?? 32;
  const eventFraction = Math.max(0, params.eventFraction);

  const epochsDown = params.validatorHoursDown * EPOCHS_PER_HOUR;
  const cohortEpochs = params.cohortHoursDown * EPOCHS_PER_HOUR;
  const epochsAtHighFactor = Math.min(epochsDown, cohortEpochs);

  const factor = onsetFactor(eventFraction);
  const capBinds = factor >= MAX_PENALTY_FACTOR;
  const leakActive = eventFraction > FINALITY_THRESHOLD;

  const base = baseRewardPerEpochEth(stakeEth, econ);
  const w = WEIGHT_DENOMINATOR;

  const forgoneEth = (base * ATTESTATION_WEIGHT * epochsDown) / w;
  const sourcePenaltyEth = (base * TIMELY_SOURCE_WEIGHT * epochsDown) / w;
  const targetPenaltyTodayEth = (base * TIMELY_TARGET_WEIGHT * epochsDown) / w;
  const targetPenaltyRevisedEth =
    (base *
      TIMELY_TARGET_WEIGHT *
      (factor * epochsAtHighFactor + (epochsDown - epochsAtHighFactor))) /
    w;

  // Finality resumes once the cohort recovers, so the leak accrues only over
  // the overlap of your downtime with the cohort's.
  const leak = leakActive ? leakLossEth(stakeEth, epochsAtHighFactor) : 0;

  const todayLossEth = forgoneEth + sourcePenaltyEth + targetPenaltyTodayEth + leak;
  const revisedLossEth = forgoneEth + sourcePenaltyEth + targetPenaltyRevisedEth + leak;

  const dailyRewardsEth = fullRewardsPerDayEth(stakeEth, econ);

  const breakdown: OutageBreakdown = {
    forgoneEth,
    sourcePenaltyEth,
    targetPenaltyTodayEth,
    targetPenaltyRevisedEth,
    leakEth: leak,
    epochsDown,
    epochsAtHighFactor,
    baseRewardPerEpochEth: base,
    dailyRewardsEth,
  };

  return {
    factor,
    capBinds,
    leakActive,
    todayLossEth,
    todayLossUsd: todayLossEth * econ.ethPriceUsd,
    revisedLossEth,
    revisedLossUsd: revisedLossEth * econ.ethPriceUsd,
    eipOnlyLossUsd: (revisedLossEth - leak) * econ.ethPriceUsd,
    leakLossUsd: leak * econ.ethPriceUsd,
    multiple: todayLossEth > 0 ? revisedLossEth / todayLossEth : 1,
    paybackDaysToday: dailyRewardsEth > 0 ? todayLossEth / dailyRewardsEth : 0,
    paybackDaysRevised: dailyRewardsEth > 0 ? revisedLossEth / dailyRewardsEth : 0,
    breakdown,
  };
}

// ── Chart series ────────────────────────────────────────────────────────────

export interface CostCurvePoint {
  hoursDown: number;
  todayUsd: number;
  revisedUsd: number;
  multiple: number;
}

/**
 * Cost as a function of *your* hours down, for a fixed event size and cohort
 * outage duration. Today's rules give a proportional line; the revised rules
 * give a front-loaded curve that flattens once the cohort recovers.
 */
export function costCurve(
  eventFraction: number,
  cohortHoursDown: number,
  stakeEth: number,
  maxHours: number,
  econ: EconomicsSnapshot = DEFAULT_ECONOMICS,
  steps = 144
): CostCurvePoint[] {
  const points: CostCurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const hoursDown = (maxHours * i) / steps;
    const r = calculateOutage(
      { eventFraction, cohortHoursDown, validatorHoursDown: hoursDown, stakeEth },
      econ
    );
    points.push({
      hoursDown,
      todayUsd: r.todayLossUsd,
      revisedUsd: r.revisedLossUsd,
      multiple: r.multiple,
    });
  }
  return points;
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export function formatUsd(usd: number): string {
  if (usd >= 1000) {
    return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (usd >= 100) return `$${usd.toFixed(0)}`;
  if (usd >= 10) return `$${usd.toFixed(1)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatEth(eth: number): string {
  if (eth >= 1) return `${eth.toFixed(3)} ETH`;
  if (eth >= 0.001) return `${eth.toFixed(4)} ETH`;
  return `${(eth * 1e6).toFixed(1)} μETH`;
}

export function formatFactor(factor: number): string {
  return factor >= 10 ? `${Math.round(factor)}×` : `${factor.toFixed(1)}×`;
}

export function formatPaybackDays(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 24 * 60))} min`;
  if (days < 1) return `${(days * 24).toFixed(1)} h`;
  if (days < 14) return `${days.toFixed(1)} days`;
  if (days < 70) return `${(days / 7).toFixed(1)} weeks`;
  return `${(days / 30.4).toFixed(1)} months`;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours % 1 === 0 ? hours : hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(hours % 24 === 0 ? 0 : 1)} days`;
}
