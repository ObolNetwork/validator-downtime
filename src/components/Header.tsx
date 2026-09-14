import * as React from "react";

export function Header() {
  return (
    <header className="site-header">
      <div className="header-content">
        <div className="site-title">
          <span className="title-main">EIP-7716</span>
          <span className="title-sub">Validator Downtime Calculator</span>
        </div>

        <nav className="header-nav">
          <a
            href="https://github.com/ethereum/EIPs/pull/11962"
            target="_blank"
            rel="noopener noreferrer"
          >
            EIP-7716
          </a>
          <a
            href="https://ethresear.ch/t/supporting-decentralized-staking-through-more-anti-correlation-incentives/19116/18"
            target="_blank"
            rel="noopener noreferrer"
          >
            Research
          </a>
          <a
            href="https://github.com/ObolNetwork/validator-downtime"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>

      <style>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(9, 16, 17, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color, #243D42);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .site-title {
          display: flex;
          align-items: baseline;
          gap: 0.6rem;
        }

        .title-main {
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--accent, #2FE4AB);
          font-variant-numeric: tabular-nums;
        }

        .title-sub {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary, #9DBFC8);
        }

        .header-nav {
          display: flex;
          gap: 1.5rem;
        }

        .header-nav a {
          color: var(--text-muted, #667A80);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .header-nav a:hover {
          color: var(--accent, #2FE4AB);
        }

        @media (max-width: 640px) {
          .header-content {
            padding: 0.75rem 1rem;
          }

          .title-sub {
            display: none;
          }

          .header-nav {
            gap: 1rem;
          }

          .header-nav a {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </header>
  );
}

export default Header;
