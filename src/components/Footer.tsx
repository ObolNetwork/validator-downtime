import * as React from "react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-main">
          <div className="footer-branding">
            <p className="footer-credit">
              Built by{" "}
              <a
                href="https://obol.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Obol Network
              </a>
            </p>
            <p className="footer-tagline">
              Securing and Powering the Ethereum Economy
            </p>
          </div>

          <div className="footer-links">
            <div className="link-group">
              <h4>Resources</h4>
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

            <div className="link-group">
              <h4>Obol</h4>
              <a
                href="https://obol.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
              <a
                href="https://docs.obol.tech"
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </a>
              <a
                href="https://github.com/ObolNetwork"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
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
            © {new Date().getFullYear()} Obol Network. Open source under MIT license.
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
          max-width: 300px;
        }

        .footer-credit {
          font-size: 1rem;
          color: var(--text-primary, #DFEAED);
          margin: 0 0 0.5rem 0;
        }

        .footer-credit a {
          color: var(--obol-green, #2FE4AB);
          text-decoration: none;
          font-weight: 600;
        }

        .footer-credit a:hover {
          text-decoration: underline;
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
          color: var(--obol-green, #2FE4AB);
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

          .footer-links {
            gap: 2rem;
          }
        }

        @media (max-width: 480px) {
          .footer-links {
            flex-direction: column;
            gap: 1.5rem;
          }
        }
      `}</style>
    </footer>
  );
}

export default Footer;
