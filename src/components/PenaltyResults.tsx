import * as React from "react";
import { useState } from "react";
import {
  calculateOutage,
  formatUsd,
  formatEth,
  formatFactor,
  formatPaybackDays,
  formatHours,
} from "../lib/penaltyCalculator";
import {
  DEFAULT_ECONOMICS,
  MAX_PENALTY_FACTOR,
  PENALTY_SLOPE,
} from "../lib/constants";

interface PenaltyResultsProps {
  eventPercent: number;
  cohortHours: number;
  validatorHours: number;
  stakeEth: number;
  ethPriceUsd?: number;
}

export function PenaltyResults({
  eventPercent,
  cohortHours,
  validatorHours,
  stakeEth,
  ethPriceUsd,
}: PenaltyResultsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const econ = { ...DEFAULT_ECONOMICS, ethPriceUsd: ethPriceUsd ?? DEFAULT_ECONOMICS.ethPriceUsd };

  const r = calculateOutage(
    {
      eventFraction: eventPercent / 100,
      cohortHoursDown: cohortHours,
      validatorHoursDown: validatorHours,
      stakeEth,
    },
    econ
  );

  const multipleColor =
    r.multiple < 1.5 ? "#2FE4AB" : r.multiple < 8 ? "#E89E30" : r.multiple < 25 ? "#DD603C" : "#CC3333";

  const leakShare = r.revisedLossUsd > 0 ? r.leakLossUsd / r.revisedLossUsd : 0;

  const b = r.breakdown;

  return (
    <div className="penalty-results">
      <div className="results-grid">
        <div className="rule-card today">
          <div className="rule-label">Today&rsquo;s rules</div>
          <div className="rule-usd">{formatUsd(r.todayLossUsd)}</div>
          <div className="rule-eth">{formatEth(r.todayLossEth)}</div>
          <div className="rule-payback">
            <span>{formatPaybackDays(r.paybackDaysToday)}</span> of rewards to re-earn
          </div>
        </div>

        <div className="multiple-block" aria-label="Cost multiple versus today's rules">
          <div className="multiple-value" style={{ color: multipleColor }}>
            {r.multiple < 10 ? r.multiple.toFixed(1) : Math.round(r.multiple)}×
          </div>
          <div className="multiple-label">today&rsquo;s cost</div>
          <svg className="multiple-arrow" width="52" height="14" viewBox="0 0 52 14" aria-hidden="true">
            <path d="M0 7 H44 M44 7 L37 1.5 M44 7 L37 12.5" stroke={multipleColor} strokeWidth="2" fill="none" />
          </svg>
        </div>

        <div className="rule-card revised">
          <div className="rule-label">
            EIP-7716 revised
            <span className="factor-badge" style={{ borderColor: multipleColor, color: multipleColor }}>
              {formatFactor(r.factor)}
              {r.capBinds ? " cap" : ""}
            </span>
          </div>
          <div className="rule-usd" style={{ color: multipleColor }}>
            {formatUsd(r.revisedLossUsd)}
          </div>
          <div className="rule-eth">{formatEth(r.revisedLossEth)}</div>
          <div className="rule-payback">
            <span>{formatPaybackDays(r.paybackDaysRevised)}</span> of rewards to re-earn
          </div>
        </div>
      </div>

      {r.leakActive && (
        <div className="leak-split">
          <div className="leak-split-header">
            <strong>Above ⅓ offline, finality stops</strong> — the pre-existing inactivity
            leak activates and grows quadratically. It applies under both rule sets; don&rsquo;t
            attribute it to EIP-7716.
          </div>
          <div className="leak-bar" role="img" aria-label={`EIP-7716 share ${formatUsd(r.eipOnlyLossUsd)}, inactivity leak share ${formatUsd(r.leakLossUsd)}`}>
            <div className="leak-bar-eip" style={{ width: `${(1 - leakShare) * 100}%` }}>
              <span>EIP-7716 · {formatUsd(r.eipOnlyLossUsd)}</span>
            </div>
            <div className="leak-bar-leak" style={{ width: `${leakShare * 100}%` }}>
              <span>Inactivity leak · {formatUsd(r.leakLossUsd)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="context-line">
        Per {stakeEth} ETH, earning ≈ {formatUsd(b.dailyRewardsEth * econ.ethPriceUsd)}/day
        ({(econ.aprInclEl * 100).toFixed(2)}% APR incl. EL, {econ.label}) · ETH at{" "}
        {formatUsd(econ.ethPriceUsd)} · {(econ.totalStakedEth / 1e6).toFixed(1)}M ETH staked
      </div>

      <div className="advanced-section">
        <button
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          <span>How this number is built</span>
          <svg
            className={`chevron ${showAdvanced ? "open" : ""}`}
            width="18"
            height="18"
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
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Today</th>
                  <th>Revised</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    Forgone rewards <em>({formatHours(validatorHours)} down, 54/64 weight)</em>
                  </td>
                  <td>{formatUsd(b.forgoneEth * econ.ethPriceUsd)}</td>
                  <td>{formatUsd(b.forgoneEth * econ.ethPriceUsd)}</td>
                </tr>
                <tr>
                  <td>
                    Source penalty <em>(14/64 — never scaled)</em>
                  </td>
                  <td>{formatUsd(b.sourcePenaltyEth * econ.ethPriceUsd)}</td>
                  <td>{formatUsd(b.sourcePenaltyEth * econ.ethPriceUsd)}</td>
                </tr>
                <tr>
                  <td>
                    Target penalty <em>(26/64 — scaled {formatFactor(r.factor)} for{" "}
                    {formatHours(b.epochsAtHighFactor / 9.375)} while the cohort is down)</em>
                  </td>
                  <td>{formatUsd(b.targetPenaltyTodayEth * econ.ethPriceUsd)}</td>
                  <td>{formatUsd(b.targetPenaltyRevisedEth * econ.ethPriceUsd)}</td>
                </tr>
                {r.leakActive && (
                  <tr>
                    <td>
                      Inactivity leak{" "}
                      <em>
                        (pre-existing, both rule sets — accrues only while finality is lost:{" "}
                        {formatHours(Math.min(validatorHours, cohortHours))})
                      </em>
                    </td>
                    <td>{formatUsd(b.leakEth * econ.ethPriceUsd)}</td>
                    <td>{formatUsd(b.leakEth * econ.ethPriceUsd)}</td>
                  </tr>
                )}
                <tr className="total-row">
                  <td>Total</td>
                  <td>{formatUsd(r.todayLossUsd)}</td>
                  <td>{formatUsd(r.revisedLossUsd)}</td>
                </tr>
              </tbody>
            </table>

            <div className="model-notes">
              <p>
                Penalty factor: <code>min(1 + {PENALTY_SLOPE} × offline_share, {MAX_PENALTY_FACTOR})</code>{" "}
                at outage onset. The smoothing average has a ~12.6-day half-life, so within
                events ≤48h the factor ≈ the onset factor while the cohort is down, and ≈ 1×
                once it recovers. This approximation is exact within ~5% for events up to
                48h; the integer-exact model lives in the{" "}
                <a href="https://github.com/OisinKyne/7716" target="_blank" rel="noopener noreferrer">
                  research repo
                </a>
                .
              </p>
              <p>
                Base reward per epoch at {(econ.totalStakedEth / 1e6).toFixed(1)}M ETH staked:{" "}
                <code>{formatEth(b.baseRewardPerEpochEth)}</code> per {stakeEth} ETH. Scaling
                applies only to validators missing <strong>both</strong> the timely-source and
                timely-target flags. For &gt;⅓ events, the leak is modeled as stopping the
                moment finality resumes; in reality the inactivity score decays over the
                following hours, so validators still offline then bleed slightly more —
                negligible for short leaks, ~15–20% extra for stragglers after multi-day ones.
                This is a draft EIP under discussion for the Hegotá fork — numbers are
                estimates, not guarantees.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .penalty-results {
          margin-top: 2rem;
        }

        .results-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1.25rem;
          align-items: stretch;
        }

        .rule-card {
          background: var(--bg-card, #1A292D);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
          padding: 1.4rem 1.5rem;
        }

        .rule-card.revised {
          border-color: var(--border-color-light, #2D4D53);
          background: linear-gradient(160deg, rgba(232, 158, 48, 0.06), var(--bg-card, #1A292D) 55%);
        }

        .rule-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: var(--text-muted, #667A80);
          margin-bottom: 0.7rem;
        }

        .factor-badge {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: none;
          letter-spacing: 0;
          padding: 0.1rem 0.45rem;
          border: 1px solid;
          border-radius: 999px;
          white-space: nowrap;
        }

        .rule-usd {
          font-family: var(--font-mono);
          font-size: clamp(1.9rem, 4vw, 2.6rem);
          font-weight: 600;
          line-height: 1;
          color: var(--text-primary, #DFEAED);
          font-variant-numeric: tabular-nums;
          transition: color 0.2s ease;
        }

        .rule-eth {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
          margin-top: 0.4rem;
        }

        .rule-payback {
          margin-top: 0.85rem;
          padding-top: 0.7rem;
          border-top: 1px dashed var(--border-color, #243D42);
          font-size: 0.78rem;
          color: var(--text-muted, #667A80);
        }

        .rule-payback span {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--text-secondary, #9DBFC8);
        }

        .multiple-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 6.5rem;
          text-align: center;
        }

        .multiple-value {
          font-family: var(--font-mono);
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          transition: color 0.2s ease;
        }

        .multiple-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted, #667A80);
          margin-top: 0.3rem;
        }

        .multiple-arrow {
          margin-top: 0.5rem;
          opacity: 0.7;
        }

        .leak-split {
          margin-top: 1.25rem;
          padding: 1rem 1.25rem;
          background: rgba(204, 51, 51, 0.06);
          border: 1px solid rgba(204, 51, 51, 0.25);
          border-radius: 10px;
        }

        .leak-split-header {
          font-size: 0.82rem;
          color: var(--text-secondary, #9DBFC8);
          line-height: 1.5;
          margin-bottom: 0.8rem;
        }

        .leak-split-header strong {
          color: var(--red, #CC3333);
        }

        .leak-bar {
          display: flex;
          height: 2rem;
          border-radius: 6px;
          overflow: hidden;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          white-space: nowrap;
        }

        .leak-bar-eip,
        .leak-bar-leak {
          display: flex;
          align-items: center;
          padding: 0 0.6rem;
          overflow: hidden;
          min-width: 0;
          transition: width 0.3s ease;
        }

        .leak-bar-eip {
          background: rgba(232, 158, 48, 0.35);
          color: var(--accent-gold, #E89E30);
        }

        .leak-bar-leak {
          background: rgba(204, 51, 51, 0.35);
          color: #E88;
        }

        .context-line {
          margin-top: 1rem;
          font-size: 0.72rem;
          color: var(--text-muted, #667A80);
          text-align: center;
          line-height: 1.5;
        }

        .advanced-section {
          margin-top: 1.25rem;
          border: 1px solid var(--border-color, #243D42);
          border-radius: 10px;
          overflow: hidden;
        }

        .advanced-toggle {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1.15rem;
          background: var(--bg-secondary, #111F22);
          border: none;
          color: var(--text-secondary, #9DBFC8);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
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

        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .breakdown-table th {
          text-align: left;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted, #667A80);
          padding: 0.4rem 0.5rem;
          border-bottom: 1px solid var(--border-color, #243D42);
        }

        .breakdown-table th:not(:first-child),
        .breakdown-table td:not(:first-child) {
          text-align: right;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .breakdown-table td {
          padding: 0.5rem;
          border-bottom: 1px solid var(--border-color, #243D42);
          color: var(--text-secondary, #9DBFC8);
          vertical-align: top;
        }

        .breakdown-table td em {
          font-style: normal;
          display: block;
          font-size: 0.7rem;
          color: var(--text-muted, #667A80);
        }

        .breakdown-table .total-row td {
          border-bottom: none;
          font-weight: 700;
          color: var(--text-primary, #DFEAED);
        }

        .model-notes {
          margin-top: 1rem;
          font-size: 0.76rem;
          color: var(--text-muted, #667A80);
          line-height: 1.6;
        }

        .model-notes p {
          margin-bottom: 0.6rem;
        }

        .model-notes code {
          font-size: 0.72rem;
          color: var(--accent, #2FE4AB);
        }

        @media (max-width: 720px) {
          .results-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .multiple-block {
            flex-direction: row;
            gap: 0.6rem;
            min-width: 0;
          }

          .multiple-arrow {
            margin-top: 0;
            transform: rotate(90deg);
            width: 26px;
          }
        }
      `}</style>
    </div>
  );
}

export default PenaltyResults;
