import * as React from "react";
import { useMemo, useState } from "react";
import {
  minimalRiskCombos,
  combinedShare,
  lockoutLoss,
  type ClientCombo,
  type ClientShare,
} from "../lib/safetyModel";
import { CLIENT_SHARES, EL_SHARES_STAKE_WEIGHTED } from "../lib/constants";

type Weighting = "node" | "stake";

const COLOR_FINALITY = "#DD603C";
const COLOR_LOCKOUT = "#CC3333";

const HOLESKY_TRIO = ["Geth", "Nethermind", "Besu"];
const POSTMORTEM_URL =
  "https://github.com/ethereum/pm/blob/master/Network-Upgrade-Archive/Pectra/holesky-postmortem.md";

function pct(f: number, digits = 0): string {
  return `${(f * 100).toFixed(digits)}%`;
}

function ComboRow({ combo }: { combo: ClientCombo }) {
  const color = combo.tier === "lockout" ? COLOR_LOCKOUT : COLOR_FINALITY;
  const leak = combo.tier === "lockout" ? lockoutLoss(combo.fraction) : null;
  const joiner = combo.kind === "EL×CL" ? " × " : " + ";
  return (
    <li className="combo-row">
      <div className="combo-names">
        <span className="combo-kind">{combo.kind}</span>
        {combo.names.join(joiner)}
      </div>
      <div
        className="combo-bar"
        role="img"
        aria-label={`${combo.names.join(joiner)}: ${pct(combo.fraction, 1)} of stake`}
      >
        <div className="combo-fill" style={{ width: pct(combo.fraction, 2), background: color }} />
        <div className="combo-mark" style={{ left: "33.333%" }} />
        <div className="combo-mark" style={{ left: "66.667%" }} />
      </div>
      <div className="combo-value">
        {pct(combo.fraction, combo.fraction < 0.1 ? 1 : 0)}
        {leak && <span className="combo-leak">~{pct(leak.fractionLost)} lost leaking out</span>}
      </div>
    </li>
  );
}

export function ClientFailureTiers() {
  const [weighting, setWeighting] = useState<Weighting>("node");

  const shares: ClientShare[] = useMemo(
    () =>
      weighting === "node"
        ? CLIENT_SHARES
        : [...EL_SHARES_STAKE_WEIGHTED, ...CLIENT_SHARES.filter((s) => s.layer === "CL")],
    [weighting]
  );
  const combos = useMemo(() => minimalRiskCombos(shares), [shares]);
  const lockouts = combos.filter((c) => c.tier === "lockout");
  // Finality-tier sets of up to two clients; the three-client tail adds little.
  const finality = combos.filter((c) => c.tier === "finality" && c.names.length <= 2);
  const trio = combinedShare(shares, HOLESKY_TRIO);

  const lockoutLow = useMemo(() => lockoutLoss(2 / 3 + 0.001), []);
  const lockoutHigh = useMemo(() => lockoutLoss(0.95), []);

  return (
    <section className="tiers-section" id="when-clients-fail-together">
      <div className="container">
        <p className="tiers-kicker">Short-term pain, long-term gain</p>
        <h2>Why make downtime more expensive at all?</h2>
        <p className="section-lede">
          Correlated downtime and correlated safety failures have the same cause: too much stake
          running the same software. Downtime is common and survivable. A safety failure is rare
          and it destroys principal. EIP-7716 charges for crowding through the cheap failure, so
          stake spreads out before the expensive one arrives. What decides the expensive one is how
          much stake ends up on the <em>same wrong view</em>, measured against two thresholds.
        </p>

        <div className="tier-grid">
          <div className="tier-card">
            <div className="tier-range">under ⅓</div>
            <h3>Contained</h3>
            <p>
              The chain keeps finalizing. The affected cohort pays downtime penalties: pennies
              today, tens to hundreds of dollars per validator under EIP-7716. Fix, rejoin, done.
            </p>
          </div>
          <div className="tier-card finality">
            <div className="tier-range">⅓ to ⅔</div>
            <h3>Finality lost, still recoverable</h3>
            <p>
              Finality stops and the inactivity leak starts. It&rsquo;s expensive, but the wrong
              fork can&rsquo;t <em>justify</em> with under ⅔ behind it. So the cohort can return to
              the canonical chain with no slashable votes once the bug is fixed.
            </p>
          </div>
          <div className="tier-card lockout">
            <div className="tier-range">⅔ or more</div>
            <h3>Locked out</h3>
            <p>
              The wrong fork justifies. Voting on the canonical chain now means a surround vote, so
              returning early means being slashed alongside ≥⅓ of stake, which takes{" "}
              <strong>100%</strong>. Staying out means leaking until the honest side is ⅔ of active
              stake again. That costs <strong>~{pct(lockoutLow.fractionLost)}</strong> of balance
              at ⅔ trapped and <strong>~{pct(lockoutHigh.fractionLost)}</strong> at 95%, over{" "}
              {Math.round(lockoutLow.daysToFinality)}–{Math.round(lockoutHigh.daysToFinality)} days.
            </p>
          </div>
        </div>

        <div className="combos-card">
          <div className="combos-header">
            <div>
              <h3>Which client combinations get there</h3>
              <p className="combos-sub">
                The smallest sets of clients whose shared failure crosses each threshold. Having no
                single client above ⅔ isn&rsquo;t enough: two can get there together.
              </p>
            </div>
            <div className="view-toggle" role="tablist" aria-label="Client share weighting">
              <button
                role="tab"
                aria-selected={weighting === "node"}
                className={weighting === "node" ? "active" : ""}
                onClick={() => setWeighting("node")}
              >
                By node
              </button>
              <button
                role="tab"
                aria-selected={weighting === "stake"}
                className={weighting === "stake" ? "active" : ""}
                onClick={() => setWeighting("stake")}
              >
                By stake (EL)
              </button>
            </div>
          </div>

          <h4 className="combos-group" style={{ color: COLOR_LOCKOUT }}>
            ≥⅔: lockout
          </h4>
          <ul className="combo-list">
            {lockouts.map((c) => (
              <ComboRow key={c.names.join("|")} combo={c} />
            ))}
          </ul>

          <h4 className="combos-group" style={{ color: COLOR_FINALITY }}>
            ⅓–⅔: finality lost
          </h4>
          <ul className="combo-list">
            {finality.map((c) => (
              <ComboRow key={c.names.join("|")} combo={c} />
            ))}
          </ul>

          <p className="combos-note">
            {weighting === "node" ? (
              <>
                Node-count survey data (clientdiversity.org). Stake share differs, so read these as
                rough.{" "}
              </>
            ) : (
              <>
                Execution layer: stake-weighted estimates from supermajority.info, partly modelled
                (~59% of stake self-reported; the other ~6% isn&rsquo;t broken out by client). No
                current stake-weighted consensus-layer source exists, so the CL still uses node
                counts.{" "}
              </>
            )}
            <strong>EL × CL</strong> pairs mean a bug in each that takes the same wrong view. They
            trap anyone running either client, assuming EL and CL choice are independent. Lockout
            losses come from an epoch-by-epoch leak simulation (today&rsquo;s rules, honest side
            online) and are approximate.
          </p>
        </div>

        <div className="compound-grid">
          <div className="compound-card">
            <h3>When separate bugs add up</h3>
            <ul>
              <li>
                <strong>They fail toward the same answer.</strong> A missing setting falls back to
                an empty list, a zero address or mainnet&rsquo;s value. There are few defaults, so
                different mistakes land on the same wrong result.
              </li>
              <li>
                <strong>They trip on the same block.</strong> Every client that wrongly accepts
                one invalid block is on one fork by construction, whatever its bug.
              </li>
              <li>
                <strong>They share an input.</strong> Spec text, network config, a crypto library.
              </li>
            </ul>
          </div>
          <div className="compound-card">
            <h3>When they don&rsquo;t</h3>
            <ul>
              <li>
                <strong>Different wrong values.</strong> Two different bad state roots are two
                different forks, each too small to justify.
              </li>
              <li>
                <strong>Crashes.</strong> A crashed node votes for nothing. Crashes add up toward
                ⅓ (finality) but never toward ⅔: nothing can justify a chain nobody votes for.
                Stopping when unsure is safer than carrying on.
              </li>
            </ul>
          </div>
        </div>

        <div className="halt-card">
          <h3>A bug should be able to stop you, never steer you</h3>
          <p>
            The network is a ⅔-threshold system, and your setup can be one too. The number that
            matters isn&rsquo;t how many clients you run. It&rsquo;s{" "}
            <strong>how many of your nodes must agree before you sign</strong>.
          </p>
          <p>
            <a href="https://validatorbeat.com/methodology/" target="_blank" rel="noopener noreferrer">
              Validator Beat
            </a>{" "}
            grades setups on the same two failure modes: <strong>Stage&nbsp;1</strong> means no
            single failure can get you slashed, and <strong>Stage&nbsp;2</strong> means no single
            failure can get you slashed <em>or</em> take you offline. Stage&nbsp;1 is the
            &ldquo;stop, don&rsquo;t steer&rdquo; property. Stage&nbsp;2 adds staying live through
            a failure as well.
          </p>
          <ul>
            <li>
              <strong>Primary + fallback beacon nodes</strong> use whichever node answers. No
              agreement is needed, so a buggy primary steers you onto the wrong fork with
              everyone else. It covers a node going offline but not a node being wrong, so a
              single client bug can still carry you to a slashable position: short of
              Stage&nbsp;1.
            </li>
            <li>
              <strong>Threshold or majority setups</strong> (e.g. distributed validators, where
              nodes run different clients and check each attestation candidate against their own
              beacon node&rsquo;s view before agreeing on it) sign only when enough independent
              nodes agree. Take a 3-of-4 setup on four different execution clients:
              <ul>
                <li>
                  One buggy client: the other three still agree, and you keep attesting. Neither
                  slashed nor offline: Stage&nbsp;2.
                </li>
                <li>
                  Two sharing a bug (the Holesky shape): 2 vs 2, and you halt. Offline but not
                  slashable, so you keep the Stage&nbsp;1 property even beyond a single failure.
                </li>
                <li>
                  Halting costs you a downtime penalty. You never signed the bad chain, so once
                  the fix ships you resume on the canonical chain, which a validator that followed
                  the crowd can&rsquo;t do.
                </li>
              </ul>
            </li>
            <li>
              The trade-off: higher agreement thresholds halt more often (more liveness risk) in
              exchange for rarely signing something wrong. EIP-7716 makes that halt a bit more
              expensive. It&rsquo;s still a rounding error next to the loss it protects you from.
            </li>
          </ul>
        </div>

        <aside className="holesky-card" id="holesky">
          <div className="holesky-date">24 Feb 2025 · Holesky testnet · Pectra upgrade</div>
          <h3>This happened, at a fork</h3>
          <p>
            Three execution clients (Geth, Nethermind and Besu) each shipped a{" "}
            <em>different</em> wrong deposit-contract setting for Holesky. Each fell back to an
            empty deposit list, so all three computed the same wrong result and accepted the same
            invalid block. Together they carried a supermajority of validators onto a chain that
            justified. Those validators couldn&rsquo;t return without surround votes. Operators were
            told to wipe their slashing protection, and a coordinated re-join still fell short of
            ⅔. Finality took two weeks of coordinated recovery (restored 10 March). Afterwards the
            exit queue was full for over a year, and Holesky was retired in favour of a new testnet,
            Hoodi.
          </p>
          <p>
            Those three clients carry{" "}
            <strong>~{pct(trio)} of mainnet {weighting === "node" ? "nodes" : "stake"}</strong>{" "}
            today. Upgrades are the high-risk window: every client runs new code at the same epoch,
            configured per network, and none of it has run in production before.
          </p>
          <a className="holesky-link" href={POSTMORTEM_URL} target="_blank" rel="noopener noreferrer">
            Holesky post-mortem ↗
          </a>
        </aside>
      </div>

      <style>{`
        .tiers-section {
          padding: 4.5rem 0;
        }

        .tiers-section > .container > h2 {
          text-align: center;
          margin-bottom: 1.25rem;
          font-size: clamp(1.4rem, 3vw, 1.9rem);
        }

        .tiers-kicker {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent, #2FE4AB);
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .tier-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .tier-card {
          padding: 1.25rem;
          background: var(--bg-card, #1A292D);
          border: 1px solid var(--border-color, #243D42);
          border-top: 3px solid var(--text-muted, #667A80);
          border-radius: 12px;
        }
        .tier-card.finality { border-top-color: ${COLOR_FINALITY}; }
        .tier-card.lockout { border-top-color: ${COLOR_LOCKOUT}; }

        .tier-range {
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.1;
          color: var(--text-secondary, #9DBFC8);
          margin-bottom: 0.5rem;
        }
        .tier-card.finality .tier-range { color: ${COLOR_FINALITY}; }
        .tier-card.lockout .tier-range { color: ${COLOR_LOCKOUT}; }

        .tier-card h3,
        .compound-card h3,
        .halt-card h3,
        .holesky-card h3 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .tier-card p,
        .compound-card li,
        .halt-card p,
        .halt-card li,
        .holesky-card p {
          font-size: 0.86rem;
          color: var(--text-secondary, #9DBFC8);
          line-height: 1.6;
        }

        .combos-card {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: var(--bg-card, #1A292D);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
        }

        .combos-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .combos-header h3 {
          font-size: 1.05rem;
          margin-bottom: 0.3rem;
        }

        .combos-sub,
        .combos-note {
          font-size: 0.78rem;
          color: var(--text-muted, #667A80);
          line-height: 1.5;
          margin: 0;
        }

        .combos-note {
          margin-top: 1rem;
        }

        .combos-group {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          margin: 1rem 0 0.4rem;
        }

        .combo-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .combo-row {
          display: grid;
          grid-template-columns: minmax(9rem, 14rem) 1fr 11rem;
          gap: 0.75rem;
          align-items: center;
          padding: 0.3rem 0;
        }

        .combo-names {
          font-size: 0.85rem;
          color: var(--text-primary, #DFEAED);
        }

        .combo-kind {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          color: var(--text-muted, #667A80);
          border: 1px solid var(--border-color-light, #2D4D53);
          border-radius: 4px;
          padding: 0 0.3rem;
          margin-right: 0.45rem;
          vertical-align: 1px;
        }

        .combo-bar {
          position: relative;
          height: 10px;
          background: var(--bg-secondary, #111F22);
          border-radius: 5px;
        }

        .combo-fill {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: 5px;
        }

        .combo-mark {
          position: absolute;
          top: -3px;
          bottom: -3px;
          width: 0;
          border-left: 1px dashed var(--text-secondary, #9DBFC8);
          opacity: 0.6;
        }

        .combo-value {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--text-primary, #DFEAED);
          display: flex;
          flex-direction: column;
        }

        .combo-leak {
          font-size: 0.68rem;
          color: var(--text-muted, #667A80);
        }

        .compound-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .compound-card,
        .halt-card {
          padding: 1.25rem 1.5rem;
          background: var(--bg-card, #1A292D);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
        }

        .compound-card ul,
        .halt-card ul {
          padding-left: 1.1rem;
          margin: 0;
          display: grid;
          gap: 0.5rem;
        }

        .halt-card ul ul {
          margin-top: 0.4rem;
          gap: 0.25rem;
        }

        .halt-card {
          margin-top: 1.5rem;
        }

        .halt-card p {
          margin-bottom: 0.75rem;
        }

        .holesky-card {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: var(--bg-secondary, #111F22);
          border: 1px solid var(--border-color, #243D42);
          border-left: 3px solid ${COLOR_LOCKOUT};
          border-radius: 12px;
        }

        .holesky-date {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--text-muted, #667A80);
          margin-bottom: 0.35rem;
        }

        .holesky-card p + p {
          margin-top: 0.75rem;
        }

        .halt-card a {
          color: var(--accent, #2FE4AB);
        }

        .holesky-link {
          display: inline-block;
          margin-top: 0.75rem;
          font-size: 0.82rem;
          color: var(--accent, #2FE4AB);
        }

        @media (max-width: 760px) {
          .tier-grid,
          .compound-grid {
            grid-template-columns: 1fr;
          }
          .combos-header {
            flex-direction: column;
          }
          .combo-row {
            grid-template-columns: 1fr auto;
          }
          .combo-bar {
            grid-column: 1 / -1;
            grid-row: 2;
          }
        }
      `}</style>
    </section>
  );
}

export default ClientFailureTiers;
