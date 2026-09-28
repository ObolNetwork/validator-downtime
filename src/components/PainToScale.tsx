import * as React from "react";
import { useMemo } from "react";
import { calculateOutage, formatUsd, formatHours } from "../lib/penaltyCalculator";
import { slashingLoss } from "../lib/safetyModel";
import { DEFAULT_ECONOMICS } from "../lib/constants";

interface PainToScaleProps {
  eventPercent: number;
  cohortHours: number;
  validatorHours: number;
  ethPriceUsd?: number;
}

const COLOR_TODAY = "#3CD2DD";
const COLOR_REVISED = "#E89E30";
const COLOR_SLASHED = "#CC3333";

// 32 cells of 1 ETH each — the per-32-ETH display unit.
const COLS = 8;
const ROWS = 4;
const CELL = 34;
const GAP = 4;
const PAD = 1;
const GRID_W = COLS * CELL + (COLS - 1) * GAP + PAD * 2;
const GRID_H = ROWS * CELL + (ROWS - 1) * GAP + PAD * 2;

const cellOrigin = (i: number) => ({
  x: PAD + (i % COLS) * (CELL + GAP),
  y: PAD + Math.floor(i / COLS) * (CELL + GAP),
});

/**
 * Area-true loss: whole 1-ETH cells, then the remainder as a square whose
 * area is that fraction of a cell, anchored in the next cell's corner.
 */
function LossFill({
  eth,
  color,
  title,
  minSide = 0,
}: {
  eth: number;
  color: string;
  title: string;
  minSide?: number;
}) {
  const whole = Math.min(32, Math.floor(eth));
  const rest = Math.min(1, eth - whole);
  const side = rest > 0 ? Math.max(minSide, CELL * Math.sqrt(rest)) : 0;
  const tail = whole < 32 ? cellOrigin(whole) : null;
  return (
    <g>
      <title>{title}</title>
      {Array.from({ length: whole }, (_, i) => {
        const o = cellOrigin(i);
        return <rect key={i} x={o.x} y={o.y} width={CELL} height={CELL} rx="4" fill={color} />;
      })}
      {tail && side > 0 && <rect x={tail.x} y={tail.y} width={side} height={side} rx={Math.min(4, side / 3)} fill={color} />}
    </g>
  );
}

function Waffle({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox={`0 0 ${GRID_W} ${GRID_H}`} className="waffle" role="img" aria-label={label}>
      {Array.from({ length: 32 }, (_, i) => {
        const o = cellOrigin(i);
        return (
          <rect
            key={i}
            x={o.x}
            y={o.y}
            width={CELL}
            height={CELL}
            rx="4"
            fill="#1A292D"
            stroke="#243D42"
            strokeWidth="1"
          />
        );
      })}
      {children}
    </svg>
  );
}

function formatEthShort(eth: number): string {
  if (eth >= 10) return `${eth.toFixed(1)} ETH`;
  if (eth >= 1) return `${eth.toFixed(2)} ETH`;
  if (eth >= 0.01) return `${eth.toFixed(3)} ETH`;
  return `${eth.toFixed(4)} ETH`;
}

function formatRatio(r: number): string {
  if (r >= 100) return `${Math.round(r / 10) * 10}×`;
  if (r >= 10) return `${Math.round(r)}×`;
  return `${r.toFixed(1)}×`;
}

export function PainToScale({ eventPercent, cohortHours, validatorHours, ethPriceUsd }: PainToScaleProps) {
  const econ = useMemo(
    () => ({ ...DEFAULT_ECONOMICS, ethPriceUsd: ethPriceUsd ?? DEFAULT_ECONOMICS.ethPriceUsd }),
    [ethPriceUsd]
  );
  const fraction = eventPercent / 100;

  const downtime = useMemo(
    () =>
      calculateOutage(
        { eventFraction: fraction, cohortHoursDown: cohortHours, validatorHoursDown: validatorHours, stakeEth: 32 },
        econ
      ),
    [fraction, cohortHours, validatorHours, econ]
  );
  const slashed = useMemo(() => slashingLoss(fraction, 32, econ), [fraction, econ]);
  const ratio = downtime.revisedLossEth > 0 ? slashed.totalEth / downtime.revisedLossEth : 0;

  return (
    <div className="pain-to-scale" id="pain-to-scale">
      <div className="pts-header">
        <h3>Short-term pain, to scale</h3>
        <p className="pts-sub">
          Each square is 1 ETH of a 32-ETH validator. The first grid is what the revised rules charge
          for your outage. The second is what the protocol already charges if the same{" "}
          {eventPercent}% of stake gets <em>slashed</em> together, say by a shared signing bug.
          The downtime penalty grows so that the slashing never happens.
        </p>
      </div>

      <div className="pts-panels">
        <figure className="pts-panel">
          <figcaption>
            <span className="pts-label">
              Down {formatHours(validatorHours)} alongside {eventPercent}% of stake
            </span>
            <span className="pts-value" style={{ color: COLOR_REVISED }}>
              {formatEthShort(downtime.revisedLossEth)}
              <span className="pts-usd">{formatUsd(downtime.revisedLossUsd)}</span>
            </span>
          </figcaption>
          <Waffle
            label={`Downtime loss under the revised rules: ${formatEthShort(downtime.revisedLossEth)} of 32 ETH, shown as a speck in the first square.`}
          >
            <LossFill
              eth={downtime.revisedLossEth}
              color={COLOR_REVISED}
              minSide={2}
              title={`With EIP-7716: ${formatEthShort(downtime.revisedLossEth)} (${formatUsd(downtime.revisedLossUsd)})`}
            />
            <LossFill
              eth={downtime.todayLossEth}
              color={COLOR_TODAY}
              minSide={1}
              title={`Today: ${formatEthShort(downtime.todayLossEth)} (${formatUsd(downtime.todayLossUsd)})`}
            />
            {downtime.revisedLossEth < 0.25 && (
              // Ring the speck so the eye finds it; the ring is decoration, not data.
              <circle
                cx={cellOrigin(0).x + Math.max(2, CELL * Math.sqrt(downtime.revisedLossEth)) / 2}
                cy={cellOrigin(0).y + Math.max(2, CELL * Math.sqrt(downtime.revisedLossEth)) / 2}
                r={Math.max(9, CELL * Math.sqrt(downtime.revisedLossEth))}
                fill="none"
                stroke={COLOR_REVISED}
                strokeWidth="1.2"
                strokeDasharray="2 2.5"
                opacity="0.8"
                pointerEvents="none"
              />
            )}
          </Waffle>
          <p className="pts-note">
            <span className="pts-swatch" style={{ background: COLOR_REVISED }} /> with EIP-7716{" "}
            <span className="pts-swatch" style={{ background: COLOR_TODAY }} /> today (
            {formatEthShort(downtime.todayLossEth)}). Both are the circled speck in the top-left corner.
          </p>
        </figure>

        <div className="pts-ratio" aria-hidden="true">
          <span className="pts-ratio-value">{formatRatio(ratio)}</span>
          <span className="pts-ratio-label">smaller</span>
        </div>

        <figure className="pts-panel">
          <figcaption>
            <span className="pts-label">Slashed alongside {eventPercent}% of stake</span>
            <span className="pts-value" style={{ color: COLOR_SLASHED }}>
              {formatEthShort(slashed.totalEth)}
              <span className="pts-usd">{formatUsd(slashed.totalEth * econ.ethPriceUsd)}</span>
            </span>
          </figcaption>
          <Waffle
            label={`Correlated slashing loss: ${formatEthShort(slashed.totalEth)} of 32 ETH (${Math.round(slashed.fractionLost * 100)}%).`}
          >
            <LossFill
              eth={slashed.totalEth}
              color={COLOR_SLASHED}
              title={`Correlated slashing: ${formatEthShort(slashed.totalEth)} (${formatUsd(slashed.totalEth * econ.ethPriceUsd)})`}
            />
          </Waffle>
          <p className="pts-note">
            {slashed.fractionLost >= 1 ? (
              <>From ⅓ of stake slashed together, the protocol takes everything.</>
            ) : (
              <>
                {Math.round(slashed.fractionLost * 100)}% of principal: 3 × the share slashed,
                plus small fixed penalties. Everything, from ⅓.
              </>
            )}
          </p>
        </figure>
      </div>

      <p className="pts-footnote">
        The slashing figure is the correlation penalty (3 × the share slashed within ~36 days)
        plus the 1/4096 initial penalty and ~36 days of missed duties. It&rsquo;s pre-existing and
        EIP-7716 doesn&rsquo;t change it. Worse still is a bug that carries ⅔ of stake onto a wrong
        fork. <a href="#when-clients-fail-together">See below</a>.
      </p>

      <style>{`
        .pain-to-scale {
          margin-top: 2.25rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border-color, #243D42);
        }

        .pts-header h3 {
          font-size: 1.1rem;
          letter-spacing: -0.01em;
          margin-bottom: 0.3rem;
        }

        .pts-sub {
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
          line-height: 1.5;
          margin: 0 0 1.25rem;
          max-width: 40rem;
        }

        .pts-panels {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1.25rem;
          align-items: stretch;
        }

        .pts-panel {
          margin: 0;
          padding: 1rem;
          background: var(--bg-secondary, #111F22);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
          min-width: 0;
        }

        .pts-panel figcaption {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .pts-label {
          font-size: 0.78rem;
          color: var(--text-secondary, #9DBFC8);
        }

        .pts-value {
          font-family: var(--font-mono);
          font-size: 1.05rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .pts-usd {
          margin-left: 0.5rem;
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--text-muted, #667A80);
        }

        .waffle {
          width: 100%;
          height: auto;
          display: block;
        }

        .pts-note {
          margin: 0.7rem 0 0;
          font-size: 0.72rem;
          color: var(--text-muted, #667A80);
          line-height: 1.5;
        }

        .pts-swatch {
          display: inline-block;
          width: 9px;
          height: 9px;
          border-radius: 2px;
          vertical-align: baseline;
          margin-right: 0.15rem;
        }

        .pts-ratio {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .pts-ratio-value {
          font-family: var(--font-mono);
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--text-primary, #DFEAED);
          line-height: 1.1;
        }

        .pts-ratio-label {
          font-size: 0.7rem;
          color: var(--text-muted, #667A80);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .pts-footnote {
          margin: 1rem 0 0;
          font-size: 0.72rem;
          color: var(--text-muted, #667A80);
          line-height: 1.55;
        }

        .pts-footnote a {
          color: var(--accent, #2FE4AB);
        }

        @media (max-width: 760px) {
          .pts-panels {
            grid-template-columns: 1fr;
          }
          .pts-ratio {
            flex-direction: row;
            gap: 0.5rem;
            justify-content: center;
            align-items: baseline;
          }
        }
      `}</style>
    </div>
  );
}

export default PainToScale;
