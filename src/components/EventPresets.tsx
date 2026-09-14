import * as React from "react";
import { MAX_EVENT_PERCENT } from "../lib/constants";

export interface HistoricalEvent {
  name: string;
  date: string;
  peakOfflinePercent: number;
  /** Event-window mean payback per 32 ETH, measured by historical replay. */
  paybackToday: string;
  paybackRevised: string;
  multiple: string;
  detail: string;
  /** Approximate scenario loaded into the calculator. */
  load: { eventPercent: number; cohortHours: number; validatorHours: number };
}

/** Measured by replaying the revised mechanism over real mainnet participation data. */
export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    name: "Finality incidents",
    date: "May 11–12, 2023",
    peakOfflinePercent: 69,
    paybackToday: "46 min",
    paybackRevised: "1.9 days",
    multiple: "79×",
    detail: "Two brief finality losses; the cap binds well before 69%.",
    load: { eventPercent: MAX_EVENT_PERCENT, cohortHours: 1, validatorHours: 1 },
  },
  {
    name: "Besu halt",
    date: "Jan 6, 2024",
    peakOfflinePercent: 12.4,
    paybackToday: "1.3 h",
    paybackRevised: "4.3 h",
    multiple: "3.5×",
    detail: "Execution-client halt, fixed within hours.",
    load: { eventPercent: 12.5, cohortHours: 2, validatorHours: 2 },
  },
  {
    name: "Nethermind bug",
    date: "Jan 21, 2024",
    peakOfflinePercent: 18.8,
    paybackToday: "1.5 h",
    paybackRevised: "21 h",
    multiple: "14×",
    detail: "Consensus bug in a ~19% execution client.",
    load: { eventPercent: 19, cohortHours: 4, validatorHours: 4 },
  },
  {
    name: "Prysm post-Fusaka",
    date: "Dec 4, 2025",
    peakOfflinePercent: 29.8,
    paybackToday: "2.5 h",
    paybackRevised: "4.7 days",
    multiple: "45×",
    detail: "Largest correlated outage since the Merge; recovery stretched over a day.",
    load: { eventPercent: 30, cohortHours: 24, validatorHours: 24 },
  },
];

interface EventPresetsProps {
  onLoad: (load: HistoricalEvent["load"]) => void;
}

export function EventPresets({ onLoad }: EventPresetsProps) {
  return (
    <div className="event-presets">
      <h3>How real incidents would have scored</h3>
      <p className="presets-sub">
        Measured by replaying the revised mechanism over actual mainnet participation data —
        event-window mean cost per 32 ETH, expressed as time-to-re-earn.
      </p>

      <div className="presets-grid">
        {HISTORICAL_EVENTS.map((ev) => (
          <button key={ev.name} className="preset-card" onClick={() => onLoad(ev.load)}>
            <div className="preset-top">
              <span className="preset-name">{ev.name}</span>
              <span className="preset-date">{ev.date}</span>
            </div>
            <div className="preset-peak">
              <span className="peak-value">{ev.peakOfflinePercent}%</span>
              <span className="peak-label">peak offline</span>
            </div>
            <div className="preset-paybacks">
              <div>
                <span className="pb-label">today</span>
                <span className="pb-value today">{ev.paybackToday}</span>
              </div>
              <div className="pb-mult">{ev.multiple}</div>
              <div>
                <span className="pb-label">revised</span>
                <span className="pb-value revised">{ev.paybackRevised}</span>
              </div>
            </div>
            <p className="preset-detail">{ev.detail}</p>
            <span className="preset-cta">Load into calculator →</span>
          </button>
        ))}
      </div>

      <p className="presets-note">
        Loading a preset sets the sliders to an approximate reconstruction. The calculator
        then shows the <em>worst case</em> — a validator fully down at peak size for the whole
        window. Measured event means above are gentler: outages ramp in, many validators kept
        their source flag (exempt from scaling), and most recovered quickly.
      </p>

      <style>{`
        .event-presets {
          margin-top: 2.5rem;
        }

        .event-presets h3 {
          font-size: 1.1rem;
          margin-bottom: 0.3rem;
        }

        .presets-sub {
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
          margin-bottom: 1.1rem;
        }

        .presets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(172px, 1fr));
          gap: 0.9rem;
        }

        .preset-card {
          text-align: left;
          background: var(--bg-card, #1A292D);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
          padding: 1rem 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          transition: border-color 0.15s ease, transform 0.15s ease;
          color: inherit;
        }

        .preset-card:hover {
          border-color: var(--accent, #2FE4AB);
          transform: translateY(-2px);
        }

        .preset-top {
          display: flex;
          flex-direction: column;
        }

        .preset-name {
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--text-primary, #DFEAED);
        }

        .preset-date {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--text-muted, #667A80);
        }

        .preset-peak {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
        }

        .peak-value {
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--accent-gold, #E89E30);
        }

        .peak-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted, #667A80);
        }

        .preset-paybacks {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.3rem 0.5rem;
          padding: 0.5rem 0.6rem;
          background: var(--bg-secondary, #111F22);
          border-radius: 8px;
        }

        .preset-paybacks > div {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .pb-label {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted, #667A80);
          white-space: nowrap;
        }

        .pb-value {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .pb-value.today {
          color: var(--cyan, #3CD2DD);
        }

        .pb-value.revised {
          color: var(--accent-gold, #E89E30);
        }

        .pb-mult {
          font-family: var(--font-mono);
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--orange, #DD603C);
          white-space: nowrap;
        }

        .preset-detail {
          font-size: 0.75rem;
          color: var(--text-muted, #667A80);
          line-height: 1.45;
          margin: 0;
          flex-grow: 1;
        }

        .preset-cta {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--accent, #2FE4AB);
        }

        .presets-note {
          margin-top: 1rem;
          font-size: 0.72rem;
          color: var(--text-muted, #667A80);
          line-height: 1.55;
        }
      `}</style>
    </div>
  );
}

export default EventPresets;
