import * as React from "react";
import { useState } from "react";

const SITE = "https://validatordowntime.obol.org";

/** The prompt a visitor pastes into their own AI assistant. Plain text, so it survives any chat box. */
export function agentPrompt(scenarioUrl: string): string {
  return [
    `Read ${SITE}/llms-full.txt (the reference for EIP-7716 anti-correlation attestation penalties: https://eips.ethereum.org/EIPS/eip-7716).`,
    "",
    "Then help me work out what correlated downtime would cost my Ethereum validators under EIP-7716. My setup:",
    "- Validators / stake: [e.g. 40 validators, 1,280 ETH]",
    "- Execution and consensus clients: [e.g. Geth + Lighthouse]",
    "- Hosting: [e.g. one cloud provider, one region / home staking]",
    "",
    "Tell me which correlated events I'm realistically exposed to (client bugs, cloud or region outages), roughly what share of total stake each would take down, what each would cost me per validator and in total, and what would reduce that exposure. Show your working, keep the EIP's own penalties separate from the inactivity leak, and give me a pre-filled calculator link for each scenario.",
    "",
    `The scenario I was just looking at: ${scenarioUrl}`,
  ].join("\n");
}

export function AskAnAgent({ scenarioUrl }: { scenarioUrl: string }) {
  const [copied, setCopied] = useState(false);
  const prompt = agentPrompt(scenarioUrl);

  const copy = () => {
    navigator.clipboard
      .writeText(prompt)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="ask-agent" id="ask-an-agent">
      <h3>Ask your AI about your own setup</h3>
      <p className="ask-agent-lede">
        Paste this into ChatGPT, Claude, or any assistant that can read a URL. Fill in the brackets
        first.
      </p>
      <pre className="ask-agent-prompt">{prompt}</pre>
      <div className="ask-agent-actions">
        <button type="button" className="share-button" onClick={copy}>
          {copied ? "Prompt copied ✓" : "📋 Copy prompt"}
        </button>
        <span className="ask-agent-links">
          For agents: <a href="/llms.txt">llms.txt</a> · <a href="/llms-full.txt">llms-full.txt</a>{" "}
          · <a href="/skill.md">skill.md</a>
        </span>
      </div>

      <style>{`
        .ask-agent {
          max-width: 760px;
          margin: 2.5rem auto 0;
          padding: 1.5rem;
          background: var(--bg-card, #1A292D);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 12px;
        }

        .ask-agent h3 {
          font-size: 1.1rem;
          margin: 0 0 0.4rem 0;
        }

        .ask-agent-lede {
          font-size: 0.88rem;
          color: var(--text-secondary, #9DBFC8);
          margin: 0 0 1rem 0;
        }

        .ask-agent-prompt {
          font-family: var(--font-mono);
          font-size: 0.74rem;
          line-height: 1.6;
          color: var(--text-secondary, #9DBFC8);
          background: var(--bg-primary, #091011);
          border: 1px solid var(--border-color, #243D42);
          border-radius: 8px;
          padding: 1rem;
          margin: 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          max-height: 16rem;
          overflow-y: auto;
        }

        .ask-agent-actions {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }

        .ask-agent-links {
          font-size: 0.75rem;
          color: var(--text-muted, #667A80);
        }

        .ask-agent-links a {
          color: var(--text-secondary, #9DBFC8);
        }
      `}</style>
    </div>
  );
}

export default AskAnAgent;
