import * as React from "react";
import { useMemo, useRef, useState } from "react";
import {
  costCurve,
  calculateOutage,
  formatUsd,
  formatHours,
  type CostCurvePoint,
} from "../lib/penaltyCalculator";
import { DEFAULT_ECONOMICS, MAX_HOURS } from "../lib/constants";

interface PenaltyComparisonChartProps {
  eventPercent: number;
  cohortHours: number;
  validatorHours: number;
  stakeEth: number;
}

type View = "cost" | "multiple";

const W = 760;
const H = 400;
const M = { top: 26, right: 20, bottom: 42, left: 66 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const COLOR_TODAY = "#3CD2DD";
const COLOR_REVISED = "#E89E30";
const COLOR_YOU = "#2FE4AB";
const COLOR_MUTED = "#667A80";

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rawStep = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(v);
  return ticks;
}

export function PenaltyComparisonChart({
  eventPercent,
  cohortHours,
  validatorHours,
  stakeEth,
}: PenaltyComparisonChartProps) {
  const [view, setView] = useState<View>("multiple");
  const [hover, setHover] = useState<CostCurvePoint | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const econ = DEFAULT_ECONOMICS;

  const points = useMemo(
    () => costCurve(eventPercent / 100, cohortHours, stakeEth, MAX_HOURS, econ),
    [eventPercent, cohortHours, stakeEth, econ]
  );

  const you = useMemo(
    () =>
      calculateOutage(
        {
          eventFraction: eventPercent / 100,
          cohortHoursDown: cohortHours,
          validatorHoursDown: validatorHours,
          stakeEth,
        },
        econ
      ),
    [eventPercent, cohortHours, validatorHours, stakeEth, econ]
  );

  const yMax =
    view === "cost"
      ? Math.max(...points.map((p) => p.revisedUsd), 1) * 1.06
      : Math.max(...points.map((p) => p.multiple), 2) * 1.08;

  const x = (hours: number) => M.left + (hours / MAX_HOURS) * PLOT_W;
  const y = (v: number) => M.top + PLOT_H - (Math.min(v, yMax) / yMax) * PLOT_H;

  const linePath = (get: (p: CostCurvePoint) => number) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.hoursDown).toFixed(1)},${y(get(p)).toFixed(1)}`)
      .join(" ");

  const yTicks = niceTicks(yMax);
  const xTicks = [0, 12, 24, 36, 48, 60, 72];

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const hours = Math.max(0, Math.min(MAX_HOURS, ((px - M.left) / PLOT_W) * MAX_HOURS));
    const idx = Math.round((hours / MAX_HOURS) * (points.length - 1));
    setHover(points[idx] ?? null);
  };

  const flatteningVisible = cohortHours < MAX_HOURS;

  return (
    <div className="cost-chart">
      <div className="chart-header">
        <div>
          <h3>
            {view === "cost"
              ? "The charge is front-loaded"
              : "The multiple falls as recovery stretches"}
          </h3>
          <p className="chart-sub">
            {view === "cost"
              ? "Today, cost is proportional to how long you're down. Revised, most of the bill lands in the first hours — the tail is nearly flat once the cohort recovers."
              : "Fast responders bear the deterrent; stragglers converge back toward today's rules. Bigger nominal bill, smaller relative one."}
          </p>
        </div>
        <div className="view-toggle" role="tablist" aria-label="Chart view">
          <button
            role="tab"
            aria-selected={view === "cost"}
            className={view === "cost" ? "active" : ""}
            onClick={() => setView("cost")}
          >
            Cost
          </button>
          <button
            role="tab"
            aria-selected={view === "multiple"}
            className={view === "multiple" ? "active" : ""}
            onClick={() => setView("multiple")}
          >
            × today
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={
          view === "cost"
            ? `Loss versus hours offline for a ${eventPercent}% event. At your ${formatHours(validatorHours)}: ${formatUsd(you.todayLossUsd)} under today's rules, ${formatUsd(you.revisedLossUsd)} revised.`
            : `Cost multiple versus today's rules, falling as downtime lengthens. At your ${formatHours(validatorHours)}: ${you.multiple.toFixed(1)} times.`
        }
      >
        <defs>
          <linearGradient id="revisedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLOR_REVISED} stopOpacity="0.18" />
            <stop offset="100%" stopColor={COLOR_REVISED} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#243D42"
              strokeWidth="1"
              strokeDasharray={t === 0 ? "" : "2 4"}
            />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" className="tick-label">
              {view === "cost" ? formatUsd(t) : `${t}×`}
            </text>
          </g>
        ))}

        {/* x ticks */}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={H - M.bottom + 20} textAnchor="middle" className="tick-label">
            {t}h
          </text>
        ))}
        <text x={M.left + PLOT_W / 2} y={H - 4} textAnchor="middle" className="axis-label">
          hours you stay offline
        </text>

        {/* cohort recovery marker */}
        {flatteningVisible && (
          <g>
            <line
              x1={x(cohortHours)}
              x2={x(cohortHours)}
              y1={M.top}
              y2={M.top + PLOT_H}
              stroke="#DD603C"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.7"
            />
            <text
              x={x(cohortHours) + 6}
              y={M.top + 14}
              className="marker-label"
              fill="#DD603C"
            >
              cohort recovers
            </text>
          </g>
        )}

        {view === "cost" ? (
          <>
            <path
              d={`${linePath((p) => p.revisedUsd)} L${x(MAX_HOURS)},${y(0)} L${x(0)},${y(0)} Z`}
              fill="url(#revisedFill)"
            />
            <path
              d={linePath((p) => p.todayUsd)}
              fill="none"
              stroke={COLOR_TODAY}
              strokeWidth="2"
              strokeDasharray="6 5"
            />
            <path
              d={linePath((p) => p.revisedUsd)}
              fill="none"
              stroke={COLOR_REVISED}
              strokeWidth="2.5"
            />
            {/* your position */}
            <line
              x1={x(validatorHours)}
              x2={x(validatorHours)}
              y1={y(you.todayLossUsd)}
              y2={y(you.revisedLossUsd)}
              stroke={COLOR_YOU}
              strokeWidth="1"
              opacity="0.6"
            />
            <circle cx={x(validatorHours)} cy={y(you.revisedLossUsd)} r="5.5" fill={COLOR_YOU} stroke="#091011" strokeWidth="2" />
            <circle cx={x(validatorHours)} cy={y(you.todayLossUsd)} r="4" fill={COLOR_TODAY} stroke="#091011" strokeWidth="2" />
          </>
        ) : (
          <>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(1)}
              y2={y(1)}
              stroke={COLOR_TODAY}
              strokeWidth="1.5"
              strokeDasharray="6 5"
            />
            <text x={W - M.right - 4} y={y(1) - 6} textAnchor="end" className="marker-label" fill={COLOR_TODAY}>
              1× = today&rsquo;s rules
            </text>
            <path
              d={linePath((p) => p.multiple)}
              fill="none"
              stroke={COLOR_REVISED}
              strokeWidth="2.5"
            />
            <circle cx={x(validatorHours)} cy={y(you.multiple)} r="5.5" fill={COLOR_YOU} stroke="#091011" strokeWidth="2" />
          </>
        )}

        {/* hover crosshair */}
        {hover && (
          <g pointerEvents="none">
            <line
              x1={x(hover.hoursDown)}
              x2={x(hover.hoursDown)}
              y1={M.top}
              y2={M.top + PLOT_H}
              stroke={COLOR_MUTED}
              strokeWidth="1"
              opacity="0.5"
            />
            <g
              transform={`translate(${Math.min(x(hover.hoursDown) + 10, W - 190)}, ${M.top + 8})`}
            >
              <rect width="180" height={view === "cost" ? 64 : 48} rx="6" fill="#111F22" stroke="#243D42" />
              <text x="10" y="18" className="tooltip-title">
                down {formatHours(hover.hoursDown)}
              </text>
              {view === "cost" ? (
                <>
                  <text x="10" y="37" className="tooltip-line" fill={COLOR_REVISED}>
                    revised {formatUsd(hover.revisedUsd)}
                  </text>
                  <text x="10" y="54" className="tooltip-line" fill={COLOR_TODAY}>
                    today {formatUsd(hover.todayUsd)}
                  </text>
                </>
              ) : (
                <text x="10" y="37" className="tooltip-line" fill={COLOR_REVISED}>
                  {hover.multiple.toFixed(1)}× today&rsquo;s cost
                </text>
              )}
            </g>
          </g>
        )}
      </svg>

      <div className="chart-legend">
        <span className="legend-item">
          <span className="swatch" style={{ background: COLOR_REVISED }} /> EIP-7716 revised
        </span>
        <span className="legend-item">
          <span className="swatch dashed" style={{ borderColor: COLOR_TODAY }} /> today&rsquo;s rules
        </span>
        <span className="legend-item">
          <span className="swatch dot" style={{ background: COLOR_YOU }} /> you
        </span>
      </div>

      <style>{`
        .cost-chart {
          margin-top: 2.25rem;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .chart-header h3 {
          font-size: 1.1rem;
          letter-spacing: -0.01em;
          margin-bottom: 0.3rem;
        }

        .chart-sub {
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
          line-height: 1.5;
          margin: 0;
          max-width: 34rem;
        }

        .view-toggle {
          display: flex;
          flex-shrink: 0;
          border: 1px solid var(--border-color, #243D42);
          border-radius: 8px;
          overflow: hidden;
        }

        .view-toggle button {
          padding: 0.4rem 0.9rem;
          font-size: 0.78rem;
          font-weight: 600;
          background: var(--bg-secondary, #111F22);
          border: none;
          color: var(--text-muted, #667A80);
          transition: background 0.15s ease, color 0.15s ease;
        }

        .view-toggle button.active {
          background: var(--bg-card-hover, #243D42);
          color: var(--accent, #2FE4AB);
        }

        .chart-svg {
          width: 100%;
          height: auto;
          display: block;
          background: var(--bg-secondary, #111F22);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
          touch-action: pan-y;
        }

        .tick-label {
          font-family: var(--font-mono);
          font-size: 11px;
          fill: var(--text-muted, #667A80);
        }

        .axis-label {
          font-size: 11px;
          fill: var(--text-muted, #667A80);
          letter-spacing: 0.05em;
        }

        .marker-label {
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .tooltip-title {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          fill: var(--text-primary, #DFEAED);
        }

        .tooltip-line {
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .chart-legend {
          display: flex;
          gap: 1.25rem;
          justify-content: center;
          margin-top: 0.7rem;
          font-size: 0.75rem;
          color: var(--text-secondary, #9DBFC8);
          flex-wrap: wrap;
        }

        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .swatch {
          width: 18px;
          height: 3px;
          border-radius: 2px;
          display: inline-block;
        }

        .swatch.dashed {
          background: none;
          border-top: 2px dashed;
          height: 0;
        }

        .swatch.dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        @media (max-width: 640px) {
          .chart-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default PenaltyComparisonChart;
