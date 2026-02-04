import * as React from "react";
import { useState } from "react";
import type { HeadFC, PageProps } from "gatsby";
import "../styles/global.css";
import {
  Header,
  Footer,
  CorrelationSlider,
  PenaltyResults,
  PenaltyComparisonChart,
} from "../components";

const IndexPage: React.FC<PageProps> = () => {
  const [offlinePercentage, setOfflinePercentage] = useState<number>(15);

  return (
    <main>
      <Header />

      <div className="hero">
        <div className="container">
          <h1>EIP-7716 Validator Downtime Calculator</h1>
          <p className="hero-subtitle">
            Understand how anti-correlation penalties affect your validator rewards
            when infrastructure fails simultaneously with others.
          </p>
        </div>
      </div>

      <section className="calculator-section">
        <div className="container">
          <div className="calculator-card">
            <CorrelationSlider
              value={offlinePercentage}
              onChange={setOfflinePercentage}
            />
            <PenaltyResults offlinePercentage={offlinePercentage} />
            <PenaltyComparisonChart offlinePercentage={offlinePercentage} />
          </div>
        </div>
      </section>

      <section className="explainer-section">
        <div className="container">
          <h2>How EIP-7716 Works</h2>

          <div className="explainer-grid">
            <div className="explainer-card">
              <div className="explainer-icon">📊</div>
              <h3>Anti-Correlation Penalties</h3>
              <p>
                EIP-7716 introduces a penalty multiplier (1x to 4x) that scales based
                on how many validators are offline simultaneously. If your downtime
                is uncorrelated with others, you pay the standard 1x penalty. If your
                downtime coincides with many other validators (correlated failure),
                your penalty increases.
              </p>
            </div>

            <div className="explainer-card">
              <div className="explainer-icon">🎯</div>
              <h3>Why It Matters</h3>
              <p>
                This creates economic incentives for validators to diversify their
                infrastructure—different cloud providers, geographic regions, and
                client software. Solo stakers and distributed validator clusters
                naturally exhibit uncorrelated behavior, benefiting from lower
                average penalties.
              </p>
            </div>

            <div className="explainer-card">
              <div className="explainer-icon">⚖️</div>
              <h3>The Formula</h3>
              <p>
                The penalty factor is calculated as:{" "}
                <code>
                  min((offline_balance × 4096) / (net_excess × total_balance + 1), 4)
                </code>
                . The <code>net_excess</code> variable adapts over time, creating a
                self-regulating system that responds to participation changes.
              </p>
            </div>

            <div className="explainer-card">
              <div className="explainer-icon">🛡️</div>
              <h3>Protection Mechanisms</h3>
              <p>
                The MAX_PENALTY_FACTOR of 4x provides a ceiling during extreme events
                like major cloud outages. The system also gradually adjusts, so brief
                correlation spikes don't immediately result in maximum penalties.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="container">
          <h2>Frequently Asked Questions</h2>

          <div className="faq-list">
            <details className="faq-item">
              <summary>How does this affect solo stakers?</summary>
              <p>
                Solo stakers generally benefit from EIP-7716. Since their downtime is
                unlikely to coincide with other validators (different hardware, ISP,
                location), they typically experience penalty factors close to 1x.
                Meanwhile, large operators with correlated infrastructure face higher
                penalties, effectively redistributing rewards toward smaller,
                decentralized operators.
              </p>
            </details>

            <details className="faq-item">
              <summary>What causes correlated downtime?</summary>
              <p>
                Common causes include: cloud provider outages (AWS, GCP, Azure),
                client software bugs affecting a specific implementation, ISP failures
                in regions with many validators, and shared infrastructure among
                staking-as-a-service providers. DVT (Distributed Validator Technology)
                helps reduce correlation by spreading validator duties across
                multiple independent nodes.
              </p>
            </details>

            <details className="faq-item">
              <summary>When will EIP-7716 be implemented?</summary>
              <p>
                EIP-7716 is currently a proposal being discussed by the Ethereum
                community. Implementation timing depends on the EIP process and
                consensus among core developers. Check the official EIP page for
                the latest status.
              </p>
            </details>

            <details className="faq-item">
              <summary>How is recovery time calculated?</summary>
              <p>
                Recovery time estimates how long it takes to earn back the extra
                penalty through normal attestation rewards. It assumes 4 hours of
                downtime and continued perfect participation after the correlated
                event. The calculation uses approximate validator APR (~3.5%) and
                base reward per epoch (~12.6 microETH) to estimate recovery.
              </p>
            </details>

            <details className="faq-item">
              <summary>How does Obol help with this?</summary>
              <p>
                Obol's Distributed Validator Technology (DVT) allows multiple
                independent operators to run a single validator together. This
                naturally reduces correlation risk—if one operator's infrastructure
                fails, others continue attesting. DVT clusters benefit from lower
                anti-correlation penalties while improving overall validator
                resilience.
              </p>
            </details>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        .hero {
          text-align: center;
          padding: 4rem 0 3rem;
          background: linear-gradient(
            180deg,
            rgba(47, 228, 171, 0.08) 0%,
            transparent 100%
          );
        }

        .hero h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, var(--text-primary, #DFEAED) 0%, var(--text-secondary, #9DBFC8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: var(--text-muted, #667A80);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .calculator-section {
          padding: 2rem 0 4rem;
        }

        .calculator-card {
          background: rgba(26, 41, 45, 0.5);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 16px;
          padding: 2rem;
          max-width: 700px;
          margin: 0 auto;
        }

        .explainer-section {
          padding: 4rem 0;
          background: var(--bg-secondary, #111F22);
        }

        .explainer-section h2 {
          text-align: center;
          margin-bottom: 2.5rem;
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
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .explainer-card h3 {
          margin-bottom: 0.75rem;
          color: var(--text-primary, #DFEAED);
        }

        .explainer-card p {
          color: var(--text-muted, #667A80);
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0;
        }

        .explainer-card code {
          background: var(--bg-tertiary, #182D32);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.8rem;
          word-break: break-all;
          color: var(--obol-green, #2FE4AB);
        }

        .faq-section {
          padding: 4rem 0;
        }

        .faq-section h2 {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .faq-list {
          max-width: 700px;
          margin: 0 auto;
        }

        .faq-item {
          background: var(--bg-card, #1A292D);
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid var(--border-color, #243D42);
        }

        .faq-item summary {
          padding: 1.25rem 1.5rem;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-primary, #DFEAED);
          list-style: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .faq-item summary::after {
          content: "+";
          font-size: 1.25rem;
          color: var(--text-muted, #667A80);
          transition: transform 0.2s ease;
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
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 768px) {
          .hero {
            padding: 3rem 0 2rem;
          }

          .hero h1 {
            font-size: 1.75rem;
          }

          .hero-subtitle {
            font-size: 1rem;
          }

          .calculator-card {
            padding: 1.5rem 1rem;
          }

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
    <title>EIP-7716 Validator Downtime Calculator | Obol Network</title>
    <meta
      name="description"
      content="Interactive tool to understand how anti-correlation penalties under EIP-7716 affect Ethereum validator rewards based on correlated downtime."
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="og:title" content="EIP-7716 Validator Downtime Calculator" />
    <meta
      property="og:description"
      content="Understand how correlated downtime affects your validator rewards under EIP-7716's anti-correlation penalties."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://validatordowntime.obol.tech" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="EIP-7716 Validator Downtime Calculator" />
    <meta
      name="twitter:description"
      content="Interactive tool to visualize anti-correlation penalties for Ethereum validators."
    />
    <link rel="canonical" href="https://validatordowntime.obol.tech" />
  </>
);
