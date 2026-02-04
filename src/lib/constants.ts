/**
 * EIP-7716 Anti-Correlation Attestation Penalties Constants
 * https://eips.ethereum.org/EIPS/eip-7716
 */

// EIP-7716 Protocol Parameters (from the EIP specification)
export const PENALTY_ADJUSTMENT_FACTOR = 4096;
export const MAX_PENALTY_FACTOR = 4;
export const PENALTY_RECOVERY_RATE = 1; // p_recovery in the formula

// Ethereum Consensus Layer Constants (from consensus specs)
export const SLOTS_PER_EPOCH = 32;
export const SECONDS_PER_SLOT = 12;
export const SECONDS_PER_EPOCH = SLOTS_PER_EPOCH * SECONDS_PER_SLOT; // 384 seconds = 6.4 minutes
export const EPOCHS_PER_HOUR = 3600 / SECONDS_PER_EPOCH; // ~9.375 epochs per hour
export const EPOCHS_PER_DAY = EPOCHS_PER_HOUR * 24; // ~225 epochs per day

// Validator Economics Constants (from consensus specs)
// Base reward quotient determines the base reward
export const BASE_REWARD_FACTOR = 64;
export const EFFECTIVE_BALANCE_INCREMENT = 1_000_000_000n; // 1 Gwei
export const MAX_EFFECTIVE_BALANCE = 32_000_000_000n; // 32 ETH in Gwei
export const MAX_EFFECTIVE_BALANCE_ETH = 32;

// Inactivity penalty quotient (Altair)
export const INACTIVITY_PENALTY_QUOTIENT_ALTAIR = 50331648n; // 3 * 2^24

// For display purposes
export const ETH_DECIMALS = 18;
export const GWEI_DECIMALS = 9;

// Current network state approximations (as of 2024)
// These are used for realistic calculations
export const APPROXIMATE_TOTAL_ACTIVE_VALIDATORS = 1_000_000;
export const APPROXIMATE_TOTAL_ACTIVE_BALANCE_ETH = APPROXIMATE_TOTAL_ACTIVE_VALIDATORS * MAX_EFFECTIVE_BALANCE_ETH;
export const APPROXIMATE_BASE_REWARD_PER_EPOCH_ETH = 0.0000126; // ~12.6 microETH per attestation

// Validator APR calculations
// Current issuance ~950k ETH/year for ~32M ETH staked = ~2.97%
// With tips and MEV, effective APR ~3.5%
export const APPROXIMATE_VALIDATOR_APR = 0.035; // ~3.5% APR
export const APPROXIMATE_DAILY_REWARD_ETH = (MAX_EFFECTIVE_BALANCE_ETH * APPROXIMATE_VALIDATOR_APR) / 365;
export const APPROXIMATE_HOURLY_REWARD_ETH = APPROXIMATE_DAILY_REWARD_ETH / 24;

// Default downtime assumption for calculator
export const DEFAULT_DOWNTIME_HOURS = 4;
export const DEFAULT_DOWNTIME_EPOCHS = DEFAULT_DOWNTIME_HOURS * EPOCHS_PER_HOUR;

// Obol Brand Colors
export const OBOL_COLORS = {
  // Primary
  obolGreen: '#2FE4AB',
  obolGreenDark: '#18AF6B',
  obolGreenLight: '#27CAA1',
  obolBlue: '#162A40',
  obolGold: '#E89E30',

  // Backgrounds
  bgPrimary: '#091011',
  bgSecondary: '#111F22',
  bgTertiary: '#182D32',
  bgCard: '#1A292D',
  bgCardHover: '#243D42',

  // Text
  textPrimary: '#DFEAED',
  textSecondary: '#9DBFC8',
  textMuted: '#667A80',

  // Accents
  cyan: '#3CD2DD',
  lime: '#B6EA5C',
  purple: '#9167E4',
  orange: '#DD603C',
  red: '#CC3333',
};
