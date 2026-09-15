import * as React from "react";
import { formatHours } from "../lib/penaltyCalculator";

/** Discrete duration stops (hours) shared by both duration sliders. */
export const DURATION_STOPS = [0.5, 1, 2, 3, 4, 6, 8, 12, 18, 24, 36, 48, 72];

interface DowntimeControlsProps {
  cohortHours: number;
  validatorHours: number;
  stakeEth: number;
  ethPriceUsd: number;
  onCohortChange: (hours: number) => void;
  onValidatorChange: (hours: number) => void;
  onStakeChange: (eth: number) => void;
  onEthPriceChange: (usd: number) => void;
}

function nearestStopIndex(hours: number): number {
  let best = 0;
  for (let i = 1; i < DURATION_STOPS.length; i++) {
    if (Math.abs(DURATION_STOPS[i] - hours) < Math.abs(DURATION_STOPS[best] - hours)) {
      best = i;
    }
  }
  return best;
}

function DurationSlider({
  id,
  label,
  subLabel,
  hours,
  onChange,
  accent,
}: {
  id: string;
  label: string;
  subLabel: string;
  hours: number;
  onChange: (hours: number) => void;
  accent: string;
}) {
  const index = nearestStopIndex(hours);
  return (
    <div className="duration-slider">
      <div className="duration-header">
        <div>
          <label htmlFor={id}>{label}</label>
          <span className="duration-sub">{subLabel}</span>
        </div>
        <span className="duration-value" style={{ color: accent }}>
          {formatHours(hours)}
        </span>
      </div>
      <input
        type="range"
        id={id}
        min={0}
        max={DURATION_STOPS.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(DURATION_STOPS[parseInt(e.target.value, 10)])}
        style={
          {
            "--slider-progress": `${(index / (DURATION_STOPS.length - 1)) * 100}%`,
            "--slider-color": accent,
          } as React.CSSProperties
        }
        aria-label={label}
        aria-valuetext={formatHours(hours)}
      />
      <div className="duration-scale" aria-hidden="true">
        <span>30m</span>
        <span>4h</span>
        <span>24h</span>
        <span>72h</span>
      </div>
    </div>
  );
}

export function DowntimeControls({
  cohortHours,
  validatorHours,
  stakeEth,
  ethPriceUsd,
  onCohortChange,
  onValidatorChange,
  onStakeChange,
  onEthPriceChange,
}: DowntimeControlsProps) {
  const relation =
    validatorHours < cohortHours
      ? { text: "You recover before the rest of the cohort — a fast responder.", color: "#2FE4AB" }
      : validatorHours > cohortHours
        ? {
            text: "You stay down after the cohort recovers — the extra hours are charged at today's 1× rate.",
            color: "#E89E30",
          }
        : { text: "You recover together with the cohort.", color: "#9DBFC8" };

  return (
    <div className="downtime-controls">
      <div className="duration-grid">
        <DurationSlider
          id="cohort-hours"
          label="Cohort outage"
          subLabel="how long the correlated group stays down"
          hours={cohortHours}
          onChange={onCohortChange}
          accent="#DD603C"
        />
        <DurationSlider
          id="validator-hours"
          label="Your downtime"
          subLabel="how long your validators stay down"
          hours={validatorHours}
          onChange={onValidatorChange}
          accent="#3CD2DD"
        />
      </div>

      <div className="relation-note" style={{ borderColor: relation.color }}>
        {relation.text}
      </div>

      <div className="stake-row">
        <label htmlFor="stake-input">Your stake</label>
        <div className="stake-input-wrap">
          <input
            id="stake-input"
            type="number"
            min={32}
            step={32}
            value={stakeEth}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v) && v > 0) onStakeChange(v);
            }}
            aria-label="Your stake in ETH"
          />
          <span className="stake-unit">ETH</span>
        </div>
        <span className="stake-hint">≈ {Math.max(1, Math.round(stakeEth / 32))} × 32-ETH validators</span>

        <label htmlFor="eth-price-input" className="price-label">ETH price</label>
        <div className="stake-input-wrap">
          <span className="stake-unit">$</span>
          <input
            id="eth-price-input"
            type="number"
            min={1}
            step={50}
            value={ethPriceUsd}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v) && v > 0) onEthPriceChange(v);
            }}
            aria-label="ETH price assumption in US dollars"
          />
        </div>
      </div>

      <style>{`
        .downtime-controls {
          margin-top: 1.75rem;
        }

        .duration-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .duration-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.6rem;
        }

        .duration-header label {
          display: block;
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--text-primary, #DFEAED);
        }

        .duration-sub {
          font-size: 0.72rem;
          color: var(--text-muted, #667A80);
          line-height: 1.3;
          display: block;
        }

        .duration-value {
          font-family: var(--font-mono);
          font-size: 1.1rem;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .duration-slider input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(
            to right,
            var(--slider-color) 0%,
            var(--slider-color) var(--slider-progress),
            var(--bg-tertiary, #182D32) var(--slider-progress),
            var(--bg-tertiary, #182D32) 100%
          );
          cursor: pointer;
        }

        .duration-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--slider-color);
          border: 3px solid var(--bg-card, #1A292D);
          cursor: grab;
        }

        .duration-slider input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--slider-color);
          border: 3px solid var(--bg-card, #1A292D);
          cursor: grab;
        }

        .duration-slider input[type="range"]:focus {
          outline: none;
        }

        .duration-scale {
          display: flex;
          justify-content: space-between;
          margin-top: 0.35rem;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--text-muted, #667A80);
        }

        .relation-note {
          margin-top: 1.1rem;
          padding: 0.55rem 0.9rem;
          border-left: 3px solid;
          background: var(--bg-secondary, #111F22);
          border-radius: 0 6px 6px 0;
          font-size: 0.8rem;
          color: var(--text-secondary, #9DBFC8);
        }

        .stake-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.25rem;
          flex-wrap: wrap;
        }

        .stake-row label {
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--text-primary, #DFEAED);
        }

        .stake-input-wrap {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary, #182D32);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 8px;
          overflow: hidden;
        }

        .stake-input-wrap:focus-within {
          border-color: var(--accent, #2FE4AB);
        }

        .stake-input-wrap input {
          width: 6.5rem;
          padding: 0.45rem 0.6rem;
          background: transparent;
          border: none;
          color: var(--text-primary, #DFEAED);
          font-family: var(--font-mono);
          font-size: 0.95rem;
          text-align: right;
        }

        .stake-input-wrap input:focus {
          outline: none;
        }

        .stake-unit {
          padding: 0.45rem 0.6rem 0.45rem 0.25rem;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
        }

        .stake-hint {
          font-size: 0.75rem;
          color: var(--text-muted, #667A80);
        }

        .price-label {
          margin-left: 0.75rem;
        }

        @media (max-width: 640px) {
          .price-label {
            margin-left: 0;
          }
        }

        @media (max-width: 640px) {
          .duration-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default DowntimeControls;
