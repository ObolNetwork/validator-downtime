/**
 * EIP-7716 Anti-Correlation Attestation Penalties — Constants
 *
 * Revised mechanism (2026, PR ethereum/EIPs#11962, PFI for the Hegotá fork).
 * The 2024 draft's NET_EXCESS_PENALTIES counter is gone; the revised mechanism
 * compares each slot's offline balance to a slow-moving average of itself and
 * scales the timely-target penalty by the excess.
 *
 * Sources of truth:
 * - EIP text: https://github.com/ethereum/EIPs/pull/11962
 * - Research: https://github.com/OisinKyne/7716
 * - consensus-specs: https://github.com/ethereum/consensus-specs/pull/5452
 */

// ── EIP-7716 revised protocol parameters ────────────────────────────────────

/** Penalty-factor cap; the single severity knob. */
export const MAX_PENALTY_FACTOR = 256;

/** 3 × (cap − 1): makes the cap bind at exactly ⅓ of stake offline. */
export const PENALTY_SLOPE = 765;

/** Moving-average smoothing factor 2^16 → half-life ≈ 6.3 days. */
export const OFFLINE_BALANCE_SMOOTHING_FACTOR = 2 ** 16;

/** Offline fraction at which the factor saturates and finality is at risk. */
export const FINALITY_THRESHOLD = 1 / 3;

// ── Participation-flag weights (Altair, unchanged) ──────────────────────────

export const TIMELY_SOURCE_WEIGHT = 14;
export const TIMELY_TARGET_WEIGHT = 26;
export const TIMELY_HEAD_WEIGHT = 14;
export const WEIGHT_DENOMINATOR = 64;
/** Source + target + head: ideal attestation rewards forgone while offline. */
export const ATTESTATION_WEIGHT =
  TIMELY_SOURCE_WEIGHT + TIMELY_TARGET_WEIGHT + TIMELY_HEAD_WEIGHT; // 54

// ── Ethereum consensus constants ────────────────────────────────────────────

export const SLOTS_PER_EPOCH = 32;
export const SECONDS_PER_SLOT = 12;
export const SECONDS_PER_EPOCH = SLOTS_PER_EPOCH * SECONDS_PER_SLOT; // 384 s
export const EPOCHS_PER_HOUR = 3600 / SECONDS_PER_EPOCH; // 9.375
export const EPOCHS_PER_DAY = EPOCHS_PER_HOUR * 24; // 225

export const BASE_REWARD_FACTOR = 64;
export const GWEI_PER_ETH = 1_000_000_000;

/**
 * Electra raised MAX_EFFECTIVE_BALANCE to 2048 ETH, but the mechanism is
 * balance-weighted, so per-32-ETH normalization stays the right display unit.
 */
export const DISPLAY_STAKE_ETH = 32;

/** Cumulative inactivity-leak loss ≈ balance × epochs² / 2^25 (score +4/epoch, quotient 2^26). */
export const INACTIVITY_LEAK_QUOTIENT = 2 ** 25;

// ── Safety-failure parameters (pre-existing, unchanged by EIP-7716) ─────────
// Used to put the revised downtime penalties next to what a correlated
// *safety* failure costs. Electra values, consensus-specs.

/** Fraction of stake a validator must be on the same fork with for that fork to justify. */
export const SUPERMAJORITY_THRESHOLD = 2 / 3;

/** Initial slashing penalty = effective_balance / 4096 (MIN_SLASHING_PENALTY_QUOTIENT_ELECTRA). */
export const MIN_SLASHING_PENALTY_QUOTIENT = 4096;

/** Correlation penalty = balance × min(3 × slashed_fraction, 1) (PROPORTIONAL_SLASHING_MULTIPLIER_BELLATRIX). */
export const PROPORTIONAL_SLASHING_MULTIPLIER = 3;

/** A slashed validator stays eligible for penalties this many epochs (~36 days) before it's withdrawable. */
export const EPOCHS_PER_SLASHINGS_VECTOR = 8192;

/** Leak mechanics, exact: score +4 per missed epoch once finality is >4 epochs late, penalty = eff × score / 2^26. */
export const INACTIVITY_SCORE_BIAS = 4;
export const INACTIVITY_PENALTY_QUOTIENT = 2 ** 24;
export const MIN_EPOCHS_TO_INACTIVITY_PENALTY = 4;

/** Validators are force-exited once effective balance falls to 16 ETH (EJECTION_BALANCE). */
export const EJECTION_BALANCE_ETH = 16;

/** Exit queue throughput, ETH per epoch (MAX_PER_EPOCH_ACTIVATION_EXIT_CHURN_LIMIT, Electra). */
export const EXIT_CHURN_ETH_PER_EPOCH = 256;

/** Effective balance only steps down once balance is 0.25 ETH below it (hysteresis). */
export const EFFECTIVE_BALANCE_DOWNWARD_THRESHOLD_ETH = 0.25;

// ── Network economics snapshots ─────────────────────────────────────────────

export interface EconomicsSnapshot {
  /** Human-readable label for the snapshot. */
  label: string;
  /** Total active stake on the beacon chain, in ETH. */
  totalStakedEth: number;
  /** ETH price in USD. */
  ethPriceUsd: number;
  /** Full CL+EL staking APR (ETH.STORE-style reference rate). */
  aprInclEl: number;
}

/**
 * July 2026 anchors from the research repo — the §3 table on
 * https://github.com/OisinKyne/7716 was computed against these, and the unit
 * tests reproduce it with them. Do not edit without re-checking the vectors.
 */
export const ANCHOR_ECONOMICS: EconomicsSnapshot = {
  label: "July 2026 research anchors",
  totalStakedEth: 40_700_000,
  ethPriceUsd: 1_840,
  aprInclEl: 0.032,
};

/**
 * Display defaults. Refresh from beaconcha.in/ethstore and market data.
 * Last refreshed 2026-09-11.
 */
export const CURRENT_ECONOMICS: EconomicsSnapshot = {
  label: "September 2026",
  totalStakedEth: 41_800_000,
  ethPriceUsd: 2_450,
  aprInclEl: 0.0257,
};

export const DEFAULT_ECONOMICS = CURRENT_ECONOMICS;

/**
 * Share of stake offline in normal operation (~99.7% 30-day network uptime).
 * The mechanism's moving average sits at this level in steady state, so an
 * event's excess is measured on top of it. By design the baseline cancels
 * out of every penalty factor (the slope is normalized by active balance,
 * not by the moving average) — this constant exists so the model states its
 * assumption explicitly rather than implying a 0% baseline.
 */
export const BASELINE_OFFLINE_FRACTION = 0.003;

// ── Calculator input defaults / bounds ──────────────────────────────────────

export const DEFAULT_EVENT_PERCENT = 10; // % of stake offline together
export const DEFAULT_COHORT_HOURS = 6; // how long the cohort stays down
export const DEFAULT_VALIDATOR_HOURS = 24; // your own downtime
export const MAX_EVENT_PERCENT = 45; // slider bound; cap binds from 33.3%
export const MAX_HOURS = 72;

/**
 * Client market share quick-picks (clientdiversity.org, Sept 2026).
 * Node-count survey data — stake share differs, so these are rough presets.
 */
export const CLIENT_SHARES: Array<{ name: string; percent: number; layer: "EL" | "CL" }> = [
  { name: "Geth", percent: 50, layer: "EL" },
  { name: "Nethermind", percent: 25, layer: "EL" },
  { name: "Besu", percent: 9, layer: "EL" },
  { name: "Reth", percent: 8, layer: "EL" },
  { name: "Erigon", percent: 6.5, layer: "EL" },
  { name: "EthRex", percent: 1, layer: "EL" },
  { name: "Lighthouse", percent: 51, layer: "CL" },
  { name: "Prysm", percent: 21, layer: "CL" },
  { name: "Nimbus", percent: 10, layer: "CL" },
  { name: "Teku", percent: 7, layer: "CL" },
  { name: "Lodestar", percent: 3, layer: "CL" },
  { name: "Grandine", percent: 2, layer: "CL" },
];

/**
 * Stake-weighted execution-layer shares (supermajority.info via
 * clientdiversity.org, Sept 2026). Partly modelled: ~59% of stake is
 * self-reported by staking entities, the rest is estimated. The remaining
 * ~6% of stake isn't broken out by client. There is no current
 * stake-weighted CL source (Sigma Prime's blockprint was archived in 2025).
 */
export const EL_SHARES_STAKE_WEIGHTED: Array<{ name: string; percent: number; layer: "EL" }> = [
  { name: "Geth", percent: 43, layer: "EL" },
  { name: "Nethermind", percent: 43, layer: "EL" },
  { name: "Besu", percent: 8, layer: "EL" },
];

// ── Obol brand colors ───────────────────────────────────────────────────────

export const OBOL_COLORS = {
  // Primary
  obolGreen: "#2FE4AB",
  obolGreenDark: "#18AF6B",
  obolGreenLight: "#27CAA1",
  obolBlue: "#162A40",
  obolGold: "#E89E30",

  // Backgrounds
  bgPrimary: "#091011",
  bgSecondary: "#111F22",
  bgTertiary: "#182D32",
  bgCard: "#1A292D",
  bgCardHover: "#243D42",

  // Text
  textPrimary: "#DFEAED",
  textSecondary: "#9DBFC8",
  textMuted: "#667A80",

  // Accents
  cyan: "#3CD2DD",
  lime: "#B6EA5C",
  purple: "#9167E4",
  orange: "#DD603C",
  red: "#CC3333",
};
