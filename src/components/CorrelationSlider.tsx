import * as React from "react";
import { useCallback } from "react";
import { onsetFactor, formatFactor } from "../lib/penaltyCalculator";
import { MAX_EVENT_PERCENT, CLIENT_SHARES } from "../lib/constants";

interface CorrelationSliderProps {
  /** Share of total stake offline together, in percent (0–45). */
  value: number;
  onChange: (value: number) => void;
}

const THRESHOLD = 100 / 3; // ⅓ of stake — cap binds, finality at risk

export function CorrelationSlider({ value, onChange }: CorrelationSliderProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value)),
    [onChange]
  );

  const factor = onsetFactor(value / 100);
  const pct = (value / MAX_EVENT_PERCENT) * 100;
  const thresholdPct = (THRESHOLD / MAX_EVENT_PERCENT) * 100;

  const getColor = (v: number): string => {
    if (v < 1) return "#2FE4AB";
    if (v < 5) return "#B6EA5C";
    if (v < 15) return "#E89E30";
    if (v < THRESHOLD) return "#DD603C";
    return "#CC3333";
  };
  const color = getColor(value);

  return (
    <div className="event-slider">
      <div className="slider-header">
        <div>
          <label htmlFor="event-range">Stake offline with you</label>
          <span className="sub-label">share of the whole network failing together</span>
        </div>
        <div className="readout">
          <span className="readout-pct" style={{ color }}>
            {value.toFixed(1)}%
          </span>
          <span className="readout-factor" style={{ color }}>
            {formatFactor(factor)} <em>target penalty</em>
          </span>
        </div>
      </div>

      <div className="slider-container">
        <input
          type="range"
          id="event-range"
          min={0}
          max={MAX_EVENT_PERCENT}
          step={0.5}
          value={value}
          onChange={handleChange}
          style={
            {
              "--slider-progress": `${pct}%`,
              "--slider-color": color,
            } as React.CSSProperties
          }
          aria-label="Percentage of total stake offline simultaneously"
          aria-valuemin={0}
          aria-valuemax={MAX_EVENT_PERCENT}
          aria-valuenow={value}
        />
        <div
          className="threshold-marker"
          style={{ left: `${thresholdPct}%` }}
          aria-hidden="true"
        >
          <div className="threshold-line" />
          <div className="threshold-label">
            ⅓ — finality threshold
            <span>penalty caps at 256×; inactivity leak takes over</span>
          </div>
        </div>
      </div>

      <div className="slider-scale" aria-hidden="true">
        <span>0%</span>
        <span>10%</span>
        <span>20%</span>
        <span>30%</span>
        <span>{MAX_EVENT_PERCENT}%</span>
      </div>

      <div className="client-chips">
        <span className="chips-label">If your client stack fails:</span>
        {CLIENT_SHARES.map((c) => (
          <button
            key={c.name}
            className={`chip ${Math.abs(value - Math.min(c.percent, MAX_EVENT_PERCENT)) < 0.3 ? "active" : ""}`}
            onClick={() => onChange(Math.min(c.percent, MAX_EVENT_PERCENT))}
            title={`${c.name} ≈ ${c.percent}% of ${c.layer} nodes${c.percent > THRESHOLD ? " — above the finality threshold" : ""}`}
          >
            {c.name} <em>{c.percent}%</em>
            {c.percent > THRESHOLD && <span className="chip-warn">⚠</span>}
          </button>
        ))}
      </div>
      <p className="chips-note">
        Client shares are node-count estimates from{" "}
        <a href="https://clientdiversity.org" target="_blank" rel="noopener noreferrer">
          clientdiversity.org
        </a>{" "}
        (Sept 2026); stake-weighted shares differ. A client bug is the classic correlated
        failure — but only validators missing <strong>both</strong> source and target flags
        are scaled, so partial failures score smaller than these shares.
      </p>

      <style>{`
        .event-slider {
          width: 100%;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }

        .slider-header label {
          display: block;
          font-weight: 700;
          color: var(--text-primary, #DFEAED);
          font-size: 1.05rem;
          letter-spacing: -0.01em;
        }

        .sub-label {
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
        }

        .readout {
          text-align: right;
          flex-shrink: 0;
        }

        .readout-pct {
          display: block;
          font-family: var(--font-mono);
          font-size: 1.9rem;
          font-weight: 600;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          transition: color 0.2s ease;
        }

        .readout-factor {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          margin-top: 0.3rem;
          transition: color 0.2s ease;
        }

        .readout-factor em {
          font-style: normal;
          color: var(--text-muted, #667A80);
          font-size: 0.7rem;
        }

        .slider-container {
          position: relative;
          padding: 0.5rem 0 2.9rem;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(
            to right,
            var(--slider-color) 0%,
            var(--slider-color) var(--slider-progress),
            var(--bg-tertiary, #182D32) var(--slider-progress),
            var(--bg-tertiary, #182D32) 100%
          );
          cursor: pointer;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--slider-color);
          border: 3px solid var(--bg-card, #1A292D);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          cursor: grab;
          transition: transform 0.15s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.12);
        }

        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--slider-color);
          border: 3px solid var(--bg-card, #1A292D);
          cursor: grab;
        }

        input[type="range"]:focus {
          outline: none;
        }

        input[type="range"]:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(47, 228, 171, 0.3);
        }

        .threshold-marker {
          position: absolute;
          top: 0.15rem;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .threshold-line {
          width: 2px;
          height: 1.3rem;
          margin: 0 auto;
          background: repeating-linear-gradient(
            to bottom,
            var(--red, #CC3333) 0 3px,
            transparent 3px 6px
          );
        }

        .threshold-label {
          margin-top: 0.35rem;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--red, #CC3333);
          text-align: center;
          white-space: nowrap;
          transform: translateX(calc(-50% + 1px));
          margin-left: 50%;
        }

        .threshold-label span {
          display: block;
          font-weight: 400;
          color: var(--text-muted, #667A80);
        }

        .slider-scale {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--text-muted, #667A80);
        }

        .client-chips {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.4rem;
          margin-top: 1.25rem;
        }

        .chips-label {
          font-size: 0.78rem;
          color: var(--text-secondary, #9DBFC8);
          margin-right: 0.25rem;
        }

        .chip {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          padding: 0.3rem 0.6rem;
          border-radius: 999px;
          border: 1px solid var(--border-color, #243D42);
          background: var(--bg-tertiary, #182D32);
          color: var(--text-secondary, #9DBFC8);
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        }

        .chip:hover {
          border-color: var(--obol-green, #2FE4AB);
          color: var(--text-primary, #DFEAED);
        }

        .chip.active {
          border-color: var(--obol-green, #2FE4AB);
          background: rgba(47, 228, 171, 0.1);
          color: var(--obol-green, #2FE4AB);
        }

        .chip em {
          font-style: normal;
          opacity: 0.7;
        }

        .chip-warn {
          margin-left: 0.2rem;
        }

        .chips-note {
          margin: 0.75rem 0 0;
          font-size: 0.72rem;
          color: var(--text-muted, #667A80);
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .threshold-label span {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default CorrelationSlider;
