import * as React from "react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-main">
          <div className="footer-branding">
            <p className="footer-credit">
              Built and maintained by contributors at{" "}
              <a
                href="https://obol.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Obol
              </a>
              .
            </p>
            <p className="footer-tagline">
              Deliberately neutral: the model follows the EIP as proposed.
            </p>
          </div>

          <div className="footer-links">
            <div className="link-group">
              <h4>The proposal</h4>
              <a
                href="https://github.com/ethereum/EIPs/pull/11962"
                target="_blank"
                rel="noopener noreferrer"
              >
                EIP-7716 (revision PR)
              </a>
              <a
                href="https://ethresear.ch/t/supporting-decentralized-staking-through-more-anti-correlation-incentives/19116/18"
                target="_blank"
                rel="noopener noreferrer"
              >
                Research Post
              </a>
              <a
                href="https://github.com/OisinKyne/7716"
                target="_blank"
                rel="noopener noreferrer"
              >
                Backtests &amp; Figures
              </a>
              <a
                href="https://github.com/ethereum/consensus-specs/pull/5452"
                target="_blank"
                rel="noopener noreferrer"
              >
                consensus-specs PR
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            This calculator provides estimates for a draft EIP under discussion for the
            Hegotá fork. Actual penalties may vary based on network conditions and
            implementation details.
          </p>
          <p className="copyright">
            Open source under MIT license.
          </p>
        </div>
      </div>

      <style>{`
        .site-footer {
          margin-top: 4rem;
          background: var(--bg-secondary, #111F22);
          border-top: 1px solid var(--border-color, #243D42);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 1.5rem 2rem;
        }

        .footer-main {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .footer-branding {
          max-width: 340px;
        }

        .footer-credit {
          font-size: 0.9rem;
          color: var(--text-secondary, #9DBFC8);
          margin: 0 0 0.5rem 0;
        }

        .footer-credit a {
          color: var(--text-secondary, #9DBFC8);
          text-decoration: underline;
          text-decoration-color: var(--text-muted, #667A80);
          font-weight: 500;
        }

        .footer-credit a:hover {
          color: var(--accent, #2FE4AB);
        }

        .footer-tagline {
          font-size: 0.85rem;
          color: var(--text-muted, #667A80);
          margin: 0;
        }

        .footer-links {
          display: flex;
          gap: 4rem;
        }

        .link-group h4 {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted, #667A80);
          margin: 0 0 1rem 0;
        }

        .link-group a {
          display: block;
          color: var(--text-secondary, #9DBFC8);
          text-decoration: none;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          transition: color 0.2s ease;
        }

        .link-group a:hover {
          color: var(--accent, #2FE4AB);
        }

        .footer-bottom {
          padding-top: 2rem;
          border-top: 1px solid var(--border-color, #243D42);
        }

        .footer-bottom p {
          font-size: 0.8rem;
          color: var(--text-muted, #667A80);
          margin: 0 0 0.5rem 0;
          line-height: 1.5;
        }

        .footer-bottom .copyright {
          margin-top: 1rem;
        }

        @media (max-width: 768px) {
          .footer-main {
            flex-direction: column;
          }
        }
      `}</style>
    </footer>
  );
}

export default Footer;
