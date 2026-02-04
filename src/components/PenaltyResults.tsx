import * as React from "react";
import { useState } from "react";
import {
  calculatePenalty,
  calculateRecoveryTime,
  getPenaltyDescription,
  getFormulaDisplay,
  type PenaltyCalculationResult,
} from "../lib/penaltyCalculator";
import {
  MAX_PENALTY_FACTOR,
  PENALTY_ADJUSTMENT_FACTOR,
  DEFAULT_DOWNTIME_HOURS,
} from "../lib/constants";

interface PenaltyResultsProps {
  offlinePercentage: number;
}

export function PenaltyResults({ offlinePercentage }: PenaltyResultsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const result: PenaltyCalculationResult = calculatePenalty(offlinePercentage);
  const recovery = calculateRecoveryTime(result.penaltyFactor);
  const description = getPenaltyDescription(result.penaltyFactor);
  const formula = getFormulaDisplay();

  // Calculate position on the visual scale (1x to 4x)
  const scalePosition =
    ((result.penaltyFactor - 1) / (MAX_PENALTY_FACTOR - 1)) * 100;

  // Obol-themed severity colors
  const severityColors: Record<
    PenaltyCalculationResult["severityLevel"],
    string
  > = {
    minimal: "#2FE4AB",    // obol-green
    moderate: "#E89E30",   // obol-gold
    significant: "#DD603C", // orange
    severe: "#CC3333",     // red
  };

  const color = severityColors[result.severityLevel];

  return (
    <div className="penalty-results">
      <h3>Penalty Impact Under EIP-7716</h3>
      <p className="downtime-note">
        Based on {DEFAULT_DOWNTIME_HOURS} hours of downtime
      </p>

      <div className="result-grid">
        <div className="result-card main-card">
          <div className="result-label">Penalty Multiplier</div>
          <div className="result-value" style={{ color }}>
            {result.penaltyFactor.toFixed(2)}x
          </div>

          <div className="penalty-scale">
            <div className="scale-bar">
              <div
                className="scale-fill"
                style={{
                  width: `${scalePosition}%`,
                  backgroundColor: color,
                }}
              />
              <div
                className="scale-marker"
                style={{
                  left: `${scalePosition}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="scale-labels">
              <span>1x</span>
              <span>2x</span>
              <span>3x</span>
              <span>4x</span>
            </div>
          </div>
        </div>

        <div className="result-card">
          <div className="result-label">Extra Loss vs Solo Staker</div>
          <div className="result-value secondary" style={{ color }}>
            +{result.relativeIncrease.toFixed(0)}%
          </div>
          <div className="result-subtext">
            {result.relativeIncrease > 0
              ? `You lose ${result.relativeIncrease.toFixed(0)}% more than an uncorrelated validator`
              : "No additional penalty - your downtime appears uncorrelated"}
          </div>
        </div>

        <div className="result-card">
          <div className="result-label">Recovery Time</div>
          <div className="result-value secondary">
            {result.penaltyFactor <= 1.01 ? "None" : recovery.formatted}
          </div>
          <div className="result-subtext">
            Time to earn back the extra penalty through normal attestation rewards
          </div>
        </div>
      </div>

      <div className="severity-banner" style={{ borderColor: color }}>
        <span className="severity-badge" style={{ backgroundColor: color }}>
          {result.severityLevel.toUpperCase()}
        </span>
        <p>{description}</p>
      </div>

      {/* Advanced Section - Collapsible */}
      <div className="advanced-section">
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          <span>Advanced: Calculation Details</span>
          <svg
            className={`chevron ${showAdvanced ? "open" : ""}`}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showAdvanced && (
          <div className="advanced-content">
            {/* EIP-7716 Formula */}
            <div className="formula-section">
              <h4>EIP-7716 Penalty Formula</h4>
              <code className="formula-code">{formula.formula}</code>

              <div className="variables-grid">
                {formula.variables.map((v) => (
                  <div key={v.name} className="variable-row">
                    <code className="var-name">{v.name}</code>
                    <span className="var-value">{v.value}</span>
                    <span className="var-desc">{v.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation Steps */}
            <div className="calculation-section">
              <h4>Step-by-Step Calculation</h4>
              <ol className="calculation-steps">
                {result.breakdown.calculationSteps.map((step, i) => (
                  <li key={i}>{step.substring(step.indexOf(" ") + 1)}</li>
                ))}
              </ol>
            </div>

            {/* Key Values */}
            <div className="key-values-section">
              <h4>Key Values Used</h4>
              <div className="key-values-grid">
                <div className="kv-item">
                  <span className="kv-label">PENALTY_ADJUSTMENT_FACTOR</span>
                  <code className="kv-value">{PENALTY_ADJUSTMENT_FACTOR}</code>
                </div>
                <div className="kv-item">
                  <span className="kv-label">MAX_PENALTY_FACTOR</span>
                  <code className="kv-value">{MAX_PENALTY_FACTOR}</code>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Base reward per epoch</span>
                  <code className="kv-value">
                    ~{(result.breakdown.basePenaltyPerEpoch * 1e6).toFixed(2)} microETH
                  </code>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Hourly rewards</span>
                  <code className="kv-value">
                    ~{(result.breakdown.hourlyRewards * 1e6).toFixed(2)} microETH
                  </code>
                </div>
                <div className="kv-item">
                  <span className="kv-label">Total base penalty ({DEFAULT_DOWNTIME_HOURS}h)</span>
                  <code className="kv-value">
                    ~{(result.breakdown.totalBasePenalty * 1e6).toFixed(2)} microETH
                  </code>
                </div>
                <div className="kv-item">
                  <span className="kv-label">EIP-7716 penalty</span>
                  <code className="kv-value">
                    ~{(result.breakdown.totalEip7716Penalty * 1e6).toFixed(2)} microETH
                  </code>
                </div>
              </div>
            </div>

            <p className="advanced-note">
              <strong>Note:</strong> These calculations use simplified models for illustration.
              Actual penalties depend on real-time network state, the <code>net_excess_penalties</code>{" "}
              variable history, and consensus layer implementation details.
              See <a href="https://eips.ethereum.org/EIPS/eip-7716" target="_blank" rel="noopener noreferrer">
                EIP-7716
              </a> for the full specification.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .penalty-results {
          width: 100%;
          max-width: 600px;
          margin: 2rem auto;
        }

        .penalty-results h3 {
          text-align: center;
          color: var(--text-primary, #DFEAED);
          margin-bottom: 0.25rem;
          font-size: 1.25rem;
        }

        .downtime-note {
          text-align: center;
          color: var(--text-muted, #667A80);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }

        .result-grid {
          display: grid;
          gap: 1rem;
        }

        .result-card {
          background: var(--bg-card, #1A292D);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
          border: 1px solid var(--border-color, #243D42);
        }

        .result-card.main-card {
          padding: 1.5rem;
        }

        .result-label {
          font-size: 0.85rem;
          color: var(--text-muted, #667A80);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .result-value {
          font-size: 2.5rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          transition: color 0.2s ease;
        }

        .result-value.secondary {
          font-size: 1.75rem;
        }

        .result-subtext {
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
          margin-top: 0.5rem;
          line-height: 1.4;
        }

        .penalty-scale {
          margin-top: 1.5rem;
        }

        .scale-bar {
          position: relative;
          height: 12px;
          background: var(--bg-tertiary, #182D32);
          border-radius: 6px;
          overflow: visible;
        }

        .scale-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.3s ease, background-color 0.3s ease;
        }

        .scale-marker {
          position: absolute;
          top: 50%;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          border: 3px solid var(--bg-card, #1A292D);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: left 0.3s ease, background-color 0.3s ease;
        }

        .scale-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.75rem;
          font-size: 0.75rem;
          color: var(--text-muted, #667A80);
          padding: 0 0.25rem;
        }

        .severity-banner {
          margin-top: 1.5rem;
          padding: 1rem 1.25rem;
          background: var(--bg-secondary, #111F22);
          border-radius: 8px;
          border-left: 4px solid;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .severity-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--bg-primary, #091011);
          white-space: nowrap;
        }

        .severity-banner p {
          margin: 0;
          color: var(--text-secondary, #9DBFC8);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        /* Advanced Section */
        .advanced-section {
          margin-top: 1.5rem;
          border: 1px solid var(--border-color, #243D42);
          border-radius: 8px;
          overflow: hidden;
        }

        .advanced-toggle {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: var(--bg-secondary, #111F22);
          border: none;
          color: var(--text-secondary, #9DBFC8);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .advanced-toggle:hover {
          background: var(--bg-tertiary, #182D32);
          color: var(--text-primary, #DFEAED);
        }

        .chevron {
          transition: transform 0.2s ease;
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .advanced-content {
          padding: 1.25rem;
          background: var(--bg-card, #1A292D);
          border-top: 1px solid var(--border-color, #243D42);
        }

        .advanced-content h4 {
          font-size: 0.95rem;
          color: var(--text-primary, #DFEAED);
          margin-bottom: 0.75rem;
          margin-top: 1.25rem;
        }

        .advanced-content h4:first-child {
          margin-top: 0;
        }

        .formula-section {
          margin-bottom: 1.5rem;
        }

        .formula-code {
          display: block;
          background: var(--bg-secondary, #111F22);
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--obol-green, #2FE4AB);
          overflow-x: auto;
          white-space: nowrap;
        }

        .variables-grid {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .variable-row {
          display: grid;
          grid-template-columns: 80px 100px 1fr;
          gap: 0.75rem;
          align-items: baseline;
          font-size: 0.8rem;
        }

        .var-name {
          color: var(--cyan, #3CD2DD);
          font-weight: 500;
        }

        .var-value {
          color: var(--text-primary, #DFEAED);
          font-weight: 600;
        }

        .var-desc {
          color: var(--text-muted, #667A80);
        }

        .calculation-section {
          margin-bottom: 1.5rem;
        }

        .calculation-steps {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .calculation-steps li {
          padding: 0.5rem 0;
          font-size: 0.8rem;
          color: var(--text-secondary, #9DBFC8);
          border-bottom: 1px solid var(--border-color, #243D42);
          font-family: "SF Mono", "Fira Code", monospace;
        }

        .calculation-steps li:last-child {
          border-bottom: none;
        }

        .key-values-section {
          margin-bottom: 1rem;
        }

        .key-values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .kv-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: var(--bg-secondary, #111F22);
          border-radius: 6px;
        }

        .kv-label {
          font-size: 0.7rem;
          color: var(--text-muted, #667A80);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .kv-value {
          font-size: 0.85rem;
          color: var(--obol-green, #2FE4AB);
          font-weight: 500;
        }

        .advanced-note {
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
          line-height: 1.5;
          margin: 1rem 0 0;
          padding: 0.75rem;
          background: var(--bg-secondary, #111F22);
          border-radius: 6px;
          border-left: 3px solid var(--obol-green, #2FE4AB);
        }

        .advanced-note strong {
          color: var(--text-primary, #DFEAED);
        }

        .advanced-note code {
          background: var(--bg-tertiary, #182D32);
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          font-size: 0.75rem;
        }

        .advanced-note a {
          color: var(--obol-green, #2FE4AB);
        }

        @media (min-width: 640px) {
          .result-grid {
            grid-template-columns: 1fr 1fr;
          }

          .result-card.main-card {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 640px) {
          .variable-row {
            grid-template-columns: 1fr;
            gap: 0.25rem;
          }

          .key-values-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default PenaltyResults;
