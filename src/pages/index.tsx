import * as React from "react";
import { useState, useRef } from "react";
import type { HeadFC, PageProps } from "gatsby";
import "../styles/global.css";
import {
  Header,
  Footer,
  CorrelationSlider,
  DowntimeControls,
  EventPresets,
  PenaltyResults,
  PenaltyComparisonChart,
} from "../components";
import {
  DEFAULT_EVENT_PERCENT,
  DEFAULT_COHORT_HOURS,
  DEFAULT_VALIDATOR_HOURS,
} from "../lib/constants";

const IndexPage: React.FC<PageProps> = () => {
  const [eventPercent, setEventPercent] = useState<number>(DEFAULT_EVENT_PERCENT);
  const [cohortHours, setCohortHours] = useState<number>(DEFAULT_COHORT_HOURS);
  const [validatorHours, setValidatorHours] = useState<number>(DEFAULT_VALIDATOR_HOURS);
  const [stakeEth, setStakeEth] = useState<number>(32);
  const calculatorRef = useRef<HTMLDivElement>(null);

  const loadPreset = (load: {
    eventPercent: number;
    cohortHours: number;
    validatorHours: number;
  }) => {
    setEventPercent(load.eventPercent);
    setCohortHours(load.cohortHours);
    setValidatorHours(load.validatorHours);
    calculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main>
      <Header />

      <div className="hero">
        <div className="container">
          <p className="hero-kicker">EIP-7716 · anti-correlation penalties · proposed for Hegotá</p>
          <h1>
            What will correlated downtime
            <br />
            <span className="hero-accent">actually cost you?</span>
          </h1>
          <p className="hero-subtitle">
            Ethereum punishes correlated slashing. In 2027, it will punish correlated downtime
            too. Fail alone and you pay exactly today&rsquo;s rates. Fail alongside 10% of the
            network and the first hours get expensive — fast.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-value">1×</span>
              <span className="stat-label">uncorrelated failures — same as today, always</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">256×</span>
              <span className="stat-label">target-penalty cap, binding at ⅓ of stake offline</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">0.75%</span>
              <span className="stat-label">of principal per day — the worst-case bleed ceiling</span>
            </div>
          </div>
        </div>
      </div>

      <section className="calculator-section" ref={calculatorRef} id="calculator">
        <div className="container">
          <div className="calculator-card">
            <CorrelationSlider value={eventPercent} onChange={setEventPercent} />
            <DowntimeControls
              cohortHours={cohortHours}
              validatorHours={validatorHours}
              stakeEth={stakeEth}
              onCohortChange={setCohortHours}
              onValidatorChange={setValidatorHours}
              onStakeChange={setStakeEth}
            />
            <PenaltyResults
              eventPercent={eventPercent}
              cohortHours={cohortHours}
              validatorHours={validatorHours}
              stakeEth={stakeEth}
            />
            <PenaltyComparisonChart
              eventPercent={eventPercent}
              cohortHours={cohortHours}
              validatorHours={validatorHours}
              stakeEth={stakeEth}
            />
            <EventPresets onLoad={loadPreset} />
          </div>
        </div>
      </section>

      <section className="fairness-section">
        <div className="container">
          <h2>&ldquo;I recover slower than the pros. Am I ruined?&rdquo;</h2>
          <p className="section-lede">
            No — and this is the most misunderstood part of the proposal. The charge is{" "}
            <strong>front-loaded</strong>: you pay for joining the correlated failure, not for
            how long your fix takes. Once the cohort recovers, the moving-average baseline has
            absorbed the event and every extra hour you stay down is charged at today&rsquo;s
            plain 1× rate. A slow recoverer&rsquo;s <em>bill</em> is bigger, but their{" "}
            <em>multiple over today&rsquo;s rules</em> is smaller — the deterrent lands on the
            correlation itself, which no amount of pager-speed can dodge.
          </p>

          <div className="fairness-grid">
            <div className="fairness-card">
              <div className="fairness-value">1.5× <span className="vs">vs</span> 4.7×</div>
              <p>
                In the Prysm post-Fusaka replay, operators who took 24–36&nbsp;hours to recover
                paid 1.5× what the 6–8&nbsp;hour crowd paid under the revised rules.
                Today&rsquo;s rules charge 4.7× for that same spread — <strong>today&rsquo;s
                proportional bleed punishes slow fixes harder than EIP-7716 does</strong>.
              </p>
            </div>
            <div className="fairness-card">
              <div className="fairness-value">57× → 9×</div>
              <p>
                The multiple over today&rsquo;s cost <em>falls</em> with recovery time: the
                fastest responders in that event paid ~57× today&rsquo;s rate for their short
                window; the slowest stragglers converged to ~9×.
              </p>
            </div>
            <div className="fairness-card">
              <div className="fairness-value">10× longer, 2.1× the cost</div>
              <p>
                Being down ten times longer cost about twice as much — not ten times. The flat
                tail after the cohort recovers is what makes the mechanism a correlation
                deterrent rather than a downtime tax.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="explainer-section">
        <div className="container">
          <h2>How the revised mechanism works</h2>
          <p className="section-lede">
            Each slot&rsquo;s <em>offline balance</em> is compared to a slow-moving average of
            itself (half-life ≈ 12.6 days). The timely-target penalty is scaled by the excess:{" "}
            <code>factor = min(1 + 765 × excess ⁄ committee_balance, 256)</code>.
          </p>

          <div className="explainer-grid">
            <div className="explainer-card">
              <div className="explainer-icon">⚡</div>
              <h3>Front-loaded, not proportional</h3>
              <p>
                Severity scales with event size and lands at outage onset: 1% of stake failing
                together → ~9×, 10% → ~78×, ⅓ or more → the 256× cap. As the moving average
                absorbs the event, the factor decays back — stragglers&rsquo; extra hours are
                charged at ~1×.
              </p>
            </div>

            <div className="explainer-card">
              <div className="explainer-icon">🛡️</div>
              <h3>Solo stakers pay today&rsquo;s rates</h3>
              <p>
                The factor is never below 1× and there are no discount windows. A validator
                failing alone — hardware, ISP, a botched update — pays exactly what it pays
                today, to the gwei. Only failing <em>together with</em> a meaningful share of
                stake costs more.
              </p>
            </div>

            <div className="explainer-card">
              <div className="explainer-icon">🎯</div>
              <h3>Only the &ldquo;offline signature&rdquo;</h3>
              <p>
                Scaling applies only to validators missing <strong>both</strong> the
                timely-source and timely-target flags. Attested with a wrong target but a live
                source — late epoch-boundary block, minority client during a majority-client
                bug, relay outage — and you pay today&rsquo;s unscaled penalty.
              </p>
            </div>

            <div className="explainer-card">
              <div className="explainer-icon">🔥</div>
              <h3>Burned, not redistributed</h3>
              <p>
                Extra penalties are burned, exactly like today&rsquo;s penalties. Nobody earns
                more when a competitor goes down, so there is no incentive to attack or DoS
                other operators — the mechanism only reshapes who pays for correlated risk.
              </p>
            </div>

            <div className="explainer-card">
              <div className="explainer-icon">📉</div>
              <h3>Above ⅓, the leak takes over</h3>
              <p>
                Past one-third offline, finality stops and the pre-existing inactivity leak —
                unchanged by this EIP — activates and grows quadratically, crossing the revised
                mechanism&rsquo;s ~0.75%/day ceiling around day 2.5. Most of a multi-day
                finality-loss bill is the leak, not EIP-7716.
              </p>
            </div>

            <div className="explainer-card">
              <div className="explainer-icon">🧩</div>
              <h3>Why: decentralization pays</h3>
              <p>
                Diverse setups — different clients, infrastructure, and geographies —
                rarely fail together, so they rarely see a factor above 1×. Concentrated
                setups carry correlated risk that today is priced at zero — this EIP prices it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="container">
          <h2>Frequently asked questions</h2>

          <div className="faq-list">
            <details className="faq-item">
              <summary>
                Why does a slow recoverer pay a bigger bill but a smaller multiple?
              </summary>
              <p>
                Two forces move in opposite directions. Nominally, more hours down always costs
                more — the bill grows monotonically. But the <em>scaled</em> hours are only the
                ones where the cohort is still down with you; after that, the baseline has
                absorbed the event and you&rsquo;re back to ~1× while today&rsquo;s rules keep
                charging linearly. So the ratio of revised-to-today shrinks the longer you take.
                Flip the chart above to &ldquo;× today&rdquo; to watch it fall. Practically: a
                fast responder might pay 30× today&rsquo;s rate on a small bill, while a
                straggler pays 5× on a bigger one.
              </p>
            </details>

            <details className="faq-item">
              <summary>Does this hurt solo stakers or small operators?</summary>
              <p>
                A validator whose downtime is uncorrelated with the rest of the network pays
                exactly today&rsquo;s penalties — the factor is never below 1× and never above
                it for lone failures. The mechanism only bites when a meaningful share of total
                stake fails simultaneously, which is characteristically a large-operator,
                shared-infrastructure, or majority-client failure mode. Small diverse setups
                are the beneficiaries, not the targets.
              </p>
            </details>

            <details className="faq-item">
              <summary>
                My client attested with the wrong target during someone else&rsquo;s bug — am I
                scaled?
              </summary>
              <p>
                No. Scaling requires the &ldquo;offline signature&rdquo;: missing{" "}
                <strong>both</strong> the timely-source and timely-target flags. If your node
                was live but voted a wrong target — a late epoch-boundary block, running a
                minority client while a majority client splits the chain, a relay outage — you
                keep the source flag and pay only today&rsquo;s unscaled penalty. This
                deliberately protects minority-client operators during majority-client
                incidents.
              </p>
            </details>

            <details className="faq-item">
              <summary>What is the absolute worst case?</summary>
              <p>
                While roughly a third of stake is newly offline and your validator is fully
                down, the revised mechanism bleeds at most ~0.75% of principal per day — and
                that rate requires the cap to bind continuously. Below the cap it&rsquo;s
                proportionally less, and it decays as the moving average catches up.
                Principal-scale losses remain exclusive to the (pre-existing) inactivity leak
                and slashing; this EIP touches neither.
              </p>
            </details>

            <details className="faq-item">
              <summary>Where do the extra penalties go?</summary>
              <p>
                They&rsquo;re burned, like all attestation penalties today — not redistributed
                to online validators. Your competitor going down earns you nothing, which
                removes any incentive to attack other operators&rsquo; infrastructure.
              </p>
            </details>

            <details className="faq-item">
              <summary>I run a large share of stake. How should I read these numbers?</summary>
              <p>
                Scale linearly: the calculator&rsquo;s per-32-ETH figures multiply by your
                validator count (the mechanism is balance-weighted, so per-32-ETH stays the
                right unit even with 2048-ETH validators). As an anchor: a 10%-of-stake event
                lasting 24 hours costs roughly 900 ETH per 1% of total stake an operator runs —
                around 9,000 ETH for a 10% operator. If your whole fleet shares one client,
                cloud, or team, your event size <em>is</em> your fleet size.
              </p>
            </details>

            <details className="faq-item">
              <summary>When would this go live?</summary>
              <p>
                EIP-7716 is a draft under discussion, proposed for inclusion in the Hegotá
                fork. The mechanism described here is the 2026 revision (
                <a
                  href="https://github.com/ethereum/EIPs/pull/11962"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ethereum/EIPs#11962
                </a>
                ), which replaced the 2024 draft&rsquo;s counter-based design after replays
                showed it barely differentiated correlated from uncorrelated failures. Nothing
                here is final — treat every number as an estimate of a moving proposal.
              </p>
            </details>

            <details className="faq-item">
              <summary>How do operators avoid correlated penalties?</summary>
              <p>
                By failing alone, not together: run a minority client, avoid the most
                crowded cloud providers and regions, and stagger upgrades rather than
                rolling a whole fleet at once. Splitting a validator across independent
                nodes (distributed validators) is another option — if part of the cluster
                fails, the rest keeps attesting. Under a mechanism that prices correlation,
                anything that de-correlates your failures is the direct hedge.
              </p>
            </details>
          </div>

          <p className="disclaimer">
            This tool models a <strong>draft EIP</strong> using an approved simplification
            (exact within ~5% for events ≤48h) and network economics that drift daily. It is
            education, not financial advice. Exact-integer models, backtests and figures live
            in the{" "}
            <a href="https://github.com/OisinKyne/7716" target="_blank" rel="noopener noreferrer">
              research repo
            </a>
            .
          </p>
        </div>
      </section>

      <Footer />

      <style>{`
        .hero {
          text-align: center;
          padding: 4.5rem 0 3rem;
          background:
            radial-gradient(ellipse 60% 50% at 50% -10%, rgba(47, 228, 171, 0.13), transparent),
            radial-gradient(ellipse 40% 35% at 80% 0%, rgba(232, 158, 48, 0.07), transparent);
        }

        .hero-kicker {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent, #2FE4AB);
          margin-bottom: 1.1rem;
        }

        .hero h1 {
          font-size: clamp(2rem, 5.5vw, 3.4rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 1.1rem;
          line-height: 1.08;
        }

        .hero-accent {
          background: linear-gradient(90deg, var(--accent, #2FE4AB), var(--cyan, #3CD2DD));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.05rem;
          color: var(--text-secondary, #9DBFC8);
          max-width: 620px;
          margin: 0 auto;
          line-height: 1.65;
        }

        .hero-subtitle em {
          color: var(--text-primary, #DFEAED);
          font-style: italic;
        }

        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 2.25rem;
          flex-wrap: wrap;
        }

        .hero-stat {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          padding: 0.9rem 1.3rem;
          background: rgba(26, 41, 45, 0.6);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
          max-width: 15rem;
        }

        .stat-value {
          font-family: var(--font-mono);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent, #2FE4AB);
          line-height: 1;
        }

        .hero-stat:nth-child(2) .stat-value {
          color: var(--accent-gold, #E89E30);
        }

        .hero-stat:nth-child(3) .stat-value {
          color: var(--orange, #DD603C);
        }

        .stat-label {
          font-size: 0.72rem;
          color: var(--text-muted, #667A80);
          line-height: 1.4;
        }

        .calculator-section {
          padding: 1.5rem 0 4rem;
          scroll-margin-top: 5rem;
        }

        .calculator-card {
          background: rgba(26, 41, 45, 0.5);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 18px;
          padding: 2.25rem;
          max-width: 860px;
          margin: 0 auto;
        }

        .fairness-section {
          padding: 4.5rem 0;
          background: var(--bg-secondary, #111F22);
          border-top: 1px solid var(--border-color, #243D42);
          border-bottom: 1px solid var(--border-color, #243D42);
        }

        .fairness-section h2,
        .explainer-section h2,
        .faq-section h2 {
          text-align: center;
          margin-bottom: 1.25rem;
          font-size: clamp(1.4rem, 3vw, 1.9rem);
        }

        .section-lede {
          max-width: 720px;
          margin: 0 auto 2.5rem;
          text-align: center;
          color: var(--text-secondary, #9DBFC8);
          font-size: 0.95rem;
          line-height: 1.7;
        }

        .section-lede code {
          font-size: 0.8rem;
          color: var(--accent, #2FE4AB);
        }

        .fairness-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .fairness-card {
          background: var(--bg-card, #1A292D);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .fairness-value {
          font-family: var(--font-mono);
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--accent-gold, #E89E30);
          margin-bottom: 0.7rem;
          letter-spacing: -0.02em;
        }

        .fairness-value .vs {
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
          font-weight: 400;
        }

        .fairness-card p {
          font-size: 0.85rem;
          color: var(--text-muted, #667A80);
          line-height: 1.6;
          margin: 0;
        }

        .fairness-card strong {
          color: var(--text-secondary, #9DBFC8);
        }

        .explainer-section {
          padding: 4.5rem 0;
        }

        .explainer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .explainer-card {
          background: var(--bg-card, #1A292D);
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid var(--border-color, #243D42);
        }

        .explainer-icon {
          font-size: 1.7rem;
          margin-bottom: 0.9rem;
        }

        .explainer-card h3 {
          margin-bottom: 0.7rem;
          font-size: 1.02rem;
        }

        .explainer-card p {
          color: var(--text-muted, #667A80);
          font-size: 0.88rem;
          line-height: 1.6;
          margin: 0;
        }

        .explainer-card strong,
        .explainer-card em {
          color: var(--text-secondary, #9DBFC8);
        }

        .faq-section {
          padding: 4.5rem 0;
          background: var(--bg-secondary, #111F22);
          border-top: 1px solid var(--border-color, #243D42);
        }

        .faq-list {
          max-width: 760px;
          margin: 0 auto;
        }

        .faq-item {
          background: var(--bg-card, #1A292D);
          border-radius: 10px;
          margin-bottom: 0.9rem;
          border: 1px solid var(--border-color, #243D42);
        }

        .faq-item summary {
          padding: 1.15rem 1.5rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text-primary, #DFEAED);
          list-style: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .faq-item summary::after {
          content: "+";
          font-family: var(--font-mono);
          font-size: 1.2rem;
          color: var(--text-muted, #667A80);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .faq-item[open] summary::after {
          transform: rotate(45deg);
        }

        .faq-item summary::-webkit-details-marker {
          display: none;
        }

        .faq-item p {
          padding: 0 1.5rem 1.25rem;
          color: var(--text-muted, #667A80);
          font-size: 0.88rem;
          line-height: 1.65;
          margin: 0;
        }

        .faq-item strong,
        .faq-item em {
          color: var(--text-secondary, #9DBFC8);
        }

        .disclaimer {
          max-width: 760px;
          margin: 2.5rem auto 0;
          padding: 1rem 1.25rem;
          background: var(--bg-card, #1A292D);
          border-left: 3px solid var(--accent-gold, #E89E30);
          border-radius: 0 8px 8px 0;
          font-size: 0.78rem;
          color: var(--text-muted, #667A80);
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .hero {
            padding: 3rem 0 2rem;
          }

          .calculator-card {
            padding: 1.5rem 1rem;
          }

          .fairness-section,
          .explainer-section,
          .faq-section {
            padding: 3rem 0;
          }
        }
      `}</style>
    </main>
  );
};

export default IndexPage;

export const Head: HeadFC = () => (
  <>
    <title>EIP-7716 Validator Downtime Calculator</title>
    <meta
      name="description"
      content="What are the increased penalties for going offline with other validators, and what can you do to protect your ETH stake from them?"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link
      href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <meta property="og:title" content="EIP-7716 Validator Downtime Calculator" />
    <meta
      property="og:description"
      content="What are the increased penalties for going offline with other validators, and what can you do to protect your ETH stake from them?"
    />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="EIP-7716 Validator Downtime Calculator" />
    <meta property="og:url" content="https://validatordowntime.obol.org/" />
    <meta property="og:image" content="https://validatordowntime.obol.org/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta
      property="og:image:alt"
      content="Chart: during a 10% correlated outage, penalties are ~78x in the first hours, then return to 1x once the crowd recovers."
    />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="EIP-7716 Validator Downtime Calculator" />
    <meta
      name="twitter:description"
      content="What are the increased penalties for going offline with other validators, and what can you do to protect your ETH stake from them?"
    />
    <meta name="twitter:image" content="https://validatordowntime.obol.org/og-image.png" />
    <link rel="canonical" href="https://validatordowntime.obol.org/" />
  </>
);
