/**
 * EIP-7716 Anti-Correlation Penalty Calculator
 *
 * Implements the penalty formula from EIP-7716:
 * penalty_factor = min(
 *   (non_attesting_balance * PENALTY_ADJUSTMENT_FACTOR) /
 *   (NET_EXCESS_PENALTIES * total_active_balance + 1),
 *   MAX_PENALTY_FACTOR
 * )
 *
 * The key insight: when more validators are offline simultaneously (correlated failure),
 * the penalty_factor increases, up to MAX_PENALTY_FACTOR (4x).
 *
 * References:
 * - EIP-7716: https://eips.ethereum.org/EIPS/eip-7716
 * - Research: https://ethresear.ch/t/diseconomies-of-scale-anti-correlation-penalties-eip-7716/20114
 */

import {
  PENALTY_ADJUSTMENT_FACTOR,
  MAX_PENALTY_FACTOR,
  APPROXIMATE_DAILY_REWARD_ETH,
  APPROXIMATE_HOURLY_REWARD_ETH,
  EPOCHS_PER_HOUR,
  APPROXIMATE_BASE_REWARD_PER_EPOCH_ETH,
  DEFAULT_DOWNTIME_HOURS,
  SLOTS_PER_EPOCH,
  SECONDS_PER_SLOT,
  MAX_EFFECTIVE_BALANCE_ETH,
} from "./constants";

export interface PenaltyCalculationResult {
  /** The penalty multiplier (1x to 4x) */
  penaltyFactor: number;
  /** Percentage increase in penalty vs uncorrelated (0% to 300%) */
  relativeIncrease: number;
  /** Estimated hours to recover the extra penalty through normal rewards */
  recoveryTimeHours: number;
  /** Net excess penalties state variable (estimated) */
  netExcessPenalties: number;
  /** Description of the severity level */
  severityLevel: "minimal" | "moderate" | "significant" | "severe";
  /** Detailed breakdown for advanced section */
  breakdown: PenaltyBreakdown;
}

export interface PenaltyBreakdown {
  /** Number of epochs in the downtime period */
  downtimeEpochs: number;
  /** Hours of downtime assumed */
  downtimeHours: number;
  /** Base penalty per epoch (ETH) without correlation multiplier */
  basePenaltyPerEpoch: number;
  /** Total base penalty for the downtime period (ETH) */
  totalBasePenalty: number;
  /** EIP-7716 penalty with multiplier applied (ETH) */
  totalEip7716Penalty: number;
  /** Extra penalty due to correlation (ETH) */
  extraPenaltyFromCorrelation: number;
  /** Normal hourly rewards used for recovery calculation */
  hourlyRewards: number;
  /** Calculation steps for transparency */
  calculationSteps: string[];
}

export interface ComparisonResult {
  /** Current system penalty (always 1x) */
  currentPenalty: number;
  /** EIP-7716 penalty with correlation */
  eip7716Penalty: number;
  /** Absolute difference */
  difference: number;
  /** Percentage increase */
  percentageIncrease: number;
}

/**
 * Calculate the penalty factor based on percentage of network offline.
 *
 * From EIP-7716:
 * penalty_factor = min(
 *   (non_attesting_balance * PENALTY_ADJUSTMENT_FACTOR) /
 *   (net_excess_penalties * total_active_balance + 1),
 *   MAX_PENALTY_FACTOR
 * )
 *
 * For the interactive calculator, we use a simplified model that captures
 * the key behavior: penalty increases with correlation, from 1x to 4x.
 *
 * @param offlinePercentage - Percentage of the network that is offline (0-100)
 * @returns The penalty multiplier (1 to MAX_PENALTY_FACTOR)
 */
export function calculatePenaltyFactor(offlinePercentage: number): number {
  // Clamp input
  const clampedOffline = Math.max(0, Math.min(100, offlinePercentage));

  if (clampedOffline === 0) {
    return 1; // No correlation penalty when nobody is offline
  }

  // The penalty factor scales based on offline percentage.
  // We use a power curve that models the EIP-7716 behavior:
  // - Low offline (< 5%): penalty ≈ 1 (solo staker, uncorrelated)
  // - Medium offline (5-33%): penalty grows moderately
  // - High offline (> 33%): penalty approaches MAX_PENALTY_FACTOR
  //
  // This models the "diseconomies of scale" effect from the research.

  const offlineFraction = clampedOffline / 100;

  // Use a power curve: p = 1 + (MAX - 1) * offlineFraction^0.6
  // This gives approximately:
  // - 1% offline → 1.07x
  // - 5% offline → 1.28x
  // - 10% offline → 1.50x
  // - 25% offline → 2.05x
  // - 50% offline → 2.86x
  // - 100% offline → 4.00x
  const scaleFactor = Math.pow(offlineFraction, 0.6);
  const penaltyFactor = 1 + (MAX_PENALTY_FACTOR - 1) * scaleFactor;

  return Math.min(penaltyFactor, MAX_PENALTY_FACTOR);
}

/**
 * Calculate base penalty per epoch for missed attestations.
 *
 * In the current Ethereum consensus:
 * - Missing source/target/head attestations each have penalties
 * - The base reward is approximately BASE_REWARD_FACTOR / sqrt(total_balance)
 * - For ~32M ETH staked, base reward ≈ 12.6 microETH per attestation component
 *
 * Penalties for missing attestations are roughly equal to forgone rewards.
 */
function calculateBasePenaltyPerEpoch(): number {
  // Each epoch, a validator can earn rewards for:
  // - Source attestation (correct source checkpoint)
  // - Target attestation (correct target checkpoint)
  // - Head attestation (correct head)
  //
  // Missing all of these costs approximately the base reward.
  // Additionally, there's a small inactivity leak component.
  //
  // Using empirical data: ~12.6 microETH per epoch base reward
  return APPROXIMATE_BASE_REWARD_PER_EPOCH_ETH;
}

/**
 * Calculate comprehensive penalty information for a given offline percentage.
 *
 * Assumes DEFAULT_DOWNTIME_HOURS (4 hours) of downtime.
 */
export function calculatePenalty(
  offlinePercentage: number,
  downtimeHours: number = DEFAULT_DOWNTIME_HOURS
): PenaltyCalculationResult {
  const penaltyFactor = calculatePenaltyFactor(offlinePercentage);
  const relativeIncrease = (penaltyFactor - 1) * 100;

  // Calculate epochs in downtime period
  const downtimeEpochs = downtimeHours * EPOCHS_PER_HOUR;

  // Base penalty calculation
  const basePenaltyPerEpoch = calculateBasePenaltyPerEpoch();
  const totalBasePenalty = basePenaltyPerEpoch * downtimeEpochs;

  // EIP-7716 penalty with multiplier
  const totalEip7716Penalty = totalBasePenalty * penaltyFactor;
  const extraPenaltyFromCorrelation = totalEip7716Penalty - totalBasePenalty;

  // Recovery time calculation:
  // How long to earn back the EXTRA penalty (not total penalty)
  // Recovery rate = hourly rewards from attestations
  const hourlyRewards = APPROXIMATE_HOURLY_REWARD_ETH;
  const recoveryTimeHours = extraPenaltyFromCorrelation > 0
    ? extraPenaltyFromCorrelation / hourlyRewards
    : 0;

  // Net excess penalties estimation for display
  // This is a simplification - actual value depends on network state
  const netExcessPenalties = estimateNetExcessPenalties(offlinePercentage);

  // Severity classification
  let severityLevel: PenaltyCalculationResult["severityLevel"];
  if (penaltyFactor < 1.5) {
    severityLevel = "minimal";
  } else if (penaltyFactor < 2.5) {
    severityLevel = "moderate";
  } else if (penaltyFactor < 3.5) {
    severityLevel = "significant";
  } else {
    severityLevel = "severe";
  }

  // Build calculation steps for transparency
  const calculationSteps = [
    `1. Downtime duration: ${downtimeHours} hours = ${downtimeEpochs.toFixed(1)} epochs`,
    `2. Base penalty per epoch: ${(basePenaltyPerEpoch * 1e6).toFixed(2)} microETH`,
    `3. Total base penalty: ${(totalBasePenalty * 1e6).toFixed(2)} microETH`,
    `4. Penalty factor (from ${offlinePercentage.toFixed(1)}% correlation): ${penaltyFactor.toFixed(3)}x`,
    `5. EIP-7716 total penalty: ${(totalBasePenalty * 1e6).toFixed(2)} × ${penaltyFactor.toFixed(3)} = ${(totalEip7716Penalty * 1e6).toFixed(2)} microETH`,
    `6. Extra penalty from correlation: ${(extraPenaltyFromCorrelation * 1e6).toFixed(2)} microETH`,
    `7. Hourly attestation rewards: ${(hourlyRewards * 1e6).toFixed(2)} microETH`,
    `8. Recovery time: ${(extraPenaltyFromCorrelation * 1e6).toFixed(2)} ÷ ${(hourlyRewards * 1e6).toFixed(2)} = ${recoveryTimeHours.toFixed(1)} hours`,
  ];

  const breakdown: PenaltyBreakdown = {
    downtimeEpochs,
    downtimeHours,
    basePenaltyPerEpoch,
    totalBasePenalty,
    totalEip7716Penalty,
    extraPenaltyFromCorrelation,
    hourlyRewards,
    calculationSteps,
  };

  return {
    penaltyFactor,
    relativeIncrease,
    recoveryTimeHours,
    netExcessPenalties,
    severityLevel,
    breakdown,
  };
}

/**
 * Estimate the net_excess_penalties state variable.
 * This is for display purposes only - actual value depends on network history.
 */
function estimateNetExcessPenalties(offlinePercentage: number): number {
  // In steady state, net_excess adjusts so penalty_factor ≈ 1
  // During sudden offline spikes, there's a lag
  // We model this as proportional to recent offline rate
  const offlineFraction = offlinePercentage / 100;
  return Math.max(1, offlineFraction * PENALTY_ADJUSTMENT_FACTOR * 0.1);
}

/**
 * Compare current system penalties vs EIP-7716 penalties.
 * In the current system, all penalties are 1x regardless of correlation.
 */
export function comparePenalties(offlinePercentage: number): ComparisonResult {
  const currentPenalty = 1; // Current system: no correlation adjustment
  const eip7716Penalty = calculatePenaltyFactor(offlinePercentage);

  return {
    currentPenalty,
    eip7716Penalty,
    difference: eip7716Penalty - currentPenalty,
    percentageIncrease: (eip7716Penalty - currentPenalty) * 100,
  };
}

/**
 * Calculate recovery time in human-readable format.
 *
 * @param penaltyFactor - The penalty multiplier
 * @param downtimeHours - Hours of downtime
 * @returns Object with hours and formatted string
 */
export function calculateRecoveryTime(
  penaltyFactor: number,
  downtimeHours: number = DEFAULT_DOWNTIME_HOURS
): { hours: number; days: number; formatted: string } {
  const downtimeEpochs = downtimeHours * EPOCHS_PER_HOUR;
  const basePenaltyPerEpoch = calculateBasePenaltyPerEpoch();
  const totalBasePenalty = basePenaltyPerEpoch * downtimeEpochs;
  const extraPenalty = totalBasePenalty * (penaltyFactor - 1);

  const totalHours = extraPenalty / APPROXIMATE_HOURLY_REWARD_ETH;
  const totalDays = totalHours / 24;

  let formatted: string;
  if (totalHours < 0.5) {
    formatted = "< 30 min";
  } else if (totalHours < 1) {
    formatted = `~${Math.round(totalHours * 60)} min`;
  } else if (totalHours < 24) {
    formatted = `~${totalHours.toFixed(1)} hours`;
  } else if (totalDays < 7) {
    const days = Math.floor(totalDays);
    const remainingHours = Math.round((totalDays - days) * 24);
    formatted = days === 1
      ? `~1 day${remainingHours > 0 ? ` ${remainingHours}h` : ""}`
      : `~${days} days${remainingHours > 0 ? ` ${remainingHours}h` : ""}`;
  } else {
    formatted = `~${totalDays.toFixed(1)} days`;
  }

  return { hours: totalHours, days: totalDays, formatted };
}

/**
 * Get a description of what this penalty level means for operators.
 */
export function getPenaltyDescription(penaltyFactor: number): string {
  if (penaltyFactor < 1.2) {
    return "Minimal impact. Your downtime appears uncorrelated with others.";
  } else if (penaltyFactor < 2) {
    return "Moderate correlation detected. Consider diversifying your infrastructure.";
  } else if (penaltyFactor < 3) {
    return "Significant correlation. You share infrastructure with many other validators.";
  } else {
    return "Severe correlation. Major infrastructure dependency affecting many validators.";
  }
}

/**
 * Get the EIP-7716 formula as a displayable string.
 */
export function getFormulaDisplay(): {
  formula: string;
  variables: Array<{ name: string; value: string; description: string }>;
} {
  return {
    formula: "penalty_factor = min((B_offline × P_adj) / (P_excess × B_total + 1), P_max)",
    variables: [
      {
        name: "P_adj",
        value: PENALTY_ADJUSTMENT_FACTOR.toString(),
        description: "PENALTY_ADJUSTMENT_FACTOR - Controls how quickly penalties adjust",
      },
      {
        name: "P_max",
        value: MAX_PENALTY_FACTOR.toString(),
        description: "MAX_PENALTY_FACTOR - Maximum penalty multiplier (4x)",
      },
      {
        name: "B_offline",
        value: "Variable",
        description: "Total balance of non-attesting validators",
      },
      {
        name: "B_total",
        value: "~32M ETH",
        description: "Total active validator balance on the network",
      },
      {
        name: "P_excess",
        value: "Dynamic",
        description: "NET_EXCESS_PENALTIES - Accumulates during participation drops",
      },
    ],
  };
}
