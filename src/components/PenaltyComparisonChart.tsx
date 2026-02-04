import * as React from "react";
import { comparePenalties, type ComparisonResult } from "../lib/penaltyCalculator";
import { MAX_PENALTY_FACTOR } from "../lib/constants";

interface PenaltyComparisonChartProps {
  offlinePercentage: number;
}

export function PenaltyComparisonChart({
  offlinePercentage,
}: PenaltyComparisonChartProps) {
  const comparison: ComparisonResult = comparePenalties(offlinePercentage);

  // Normalize to percentage of max for bar widths
  const currentWidth = (comparison.currentPenalty / MAX_PENALTY_FACTOR) * 100;
  const eip7716Width = (comparison.eip7716Penalty / MAX_PENALTY_FACTOR) * 100;

  const hasIncrease = comparison.difference > 0.01;

  // Obol-themed colors
  const primaryColor = "#2FE4AB"; // obol-green
  const warningColor = "#DD603C"; // orange

  return (
    <div className="comparison-chart">
      <h3>Current System vs EIP-7716</h3>

      <div className="chart-container">
        <div className="bar-row">
          <div className="bar-label">
            <span className="label-text">Current</span>
            <span className="label-value">{comparison.currentPenalty.toFixed(2)}x</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill current"
              style={{ width: `${currentWidth}%` }}
            />
          </div>
        </div>

        <div className="bar-row">
          <div className="bar-label">
            <span className="label-text">EIP-7716</span>
            <span
              className="label-value"
              style={{ color: hasIncrease ? warningColor : primaryColor }}
            >
              {comparison.eip7716Penalty.toFixed(2)}x
            </span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill eip7716"
              style={{
                width: `${eip7716Width}%`,
                backgroundColor: hasIncrease ? warningColor : primaryColor,
              }}
            />
            {hasIncrease && (
              <div
                className="bar-delta"
                style={{
                  left: `${currentWidth}%`,
                  width: `${eip7716Width - currentWidth}%`,
                }}
              />
            )}
          </div>
        </div>

        <div className="chart-axis">
          <span>1x</span>
          <span>2x</span>
          <span>3x</span>
          <span>4x</span>
        </div>
      </div>

      {hasIncrease ? (
        <div className="delta-callout warning">
          <span className="delta-icon">⚠</span>
          <div className="delta-text">
            <strong>+{comparison.percentageIncrease.toFixed(0)}% additional penalty</strong>
            <span>
              Under EIP-7716, correlated downtime costs{" "}
              {comparison.eip7716Penalty.toFixed(2)}x vs the current flat 1x rate
            </span>
          </div>
        </div>
      ) : (
        <div className="delta-callout success">
          <span className="delta-icon">✓</span>
          <div className="delta-text">
            <strong>No additional penalty</strong>
            <span>
              Uncorrelated validators are not penalized more under EIP-7716
            </span>
          </div>
        </div>
      )}

      <style>{`
        .comparison-chart {
          width: 100%;
          max-width: 600px;
          margin: 2rem auto;
        }

        .comparison-chart h3 {
          text-align: center;
          color: var(--text-primary, #DFEAED);
          margin-bottom: 1.5rem;
          font-size: 1.25rem;
        }

        .chart-container {
          background: var(--bg-card, #1A292D);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid var(--border-color, #243D42);
        }

        .bar-row {
          margin-bottom: 1rem;
        }

        .bar-row:last-of-type {
          margin-bottom: 0.5rem;
        }

        .bar-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .label-text {
          font-size: 0.9rem;
          color: var(--text-muted, #667A80);
        }

        .label-value {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary, #DFEAED);
          font-variant-numeric: tabular-nums;
          transition: color 0.2s ease;
        }

        .bar-track {
          position: relative;
          height: 24px;
          background: var(--bg-tertiary, #182D32);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease, background-color 0.3s ease;
        }

        .bar-fill.current {
          background: var(--cyan, #3CD2DD);
        }

        .bar-fill.eip7716 {
          background: var(--obol-green, #2FE4AB);
        }

        .bar-delta {
          position: absolute;
          top: 0;
          height: 100%;
          background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 4px,
            rgba(221, 96, 60, 0.3) 4px,
            rgba(221, 96, 60, 0.3) 8px
          );
          border-radius: 0 4px 4px 0;
        }

        .chart-axis {
          display: flex;
          justify-content: space-between;
          margin-top: 0.75rem;
          padding: 0 2px;
          font-size: 0.7rem;
          color: var(--text-muted, #667A80);
        }

        .delta-callout {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 8px;
        }

        .delta-callout.warning {
          background: rgba(221, 96, 60, 0.1);
          border: 1px solid rgba(221, 96, 60, 0.3);
        }

        .delta-callout.success {
          background: rgba(47, 228, 171, 0.1);
          border: 1px solid rgba(47, 228, 171, 0.3);
        }

        .delta-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .delta-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .delta-text strong {
          color: var(--text-primary, #DFEAED);
          font-size: 0.95rem;
        }

        .delta-text span {
          color: var(--text-muted, #667A80);
          font-size: 0.85rem;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}

export default PenaltyComparisonChart;
