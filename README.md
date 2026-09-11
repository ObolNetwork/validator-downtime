# EIP-7716 Validator Downtime Calculator

Interactive tool for understanding what correlated downtime costs Ethereum validators under the **revised EIP-7716** anti-correlation penalties (2026 mechanism, [ethereum/EIPs#11962](https://github.com/ethereum/EIPs/pull/11962), proposed for the Hegotá fork).

**Live site**: [validatordowntime.obol.tech](https://validatordowntime.obol.tech)

## Overview

The revised EIP-7716 compares each slot's *offline balance* to a slow-moving average of itself and scales the timely-target penalty by the excess:

```
excess = max(0, offline − smoothed_offline_balance)
factor = min(1 + PENALTY_SLOPE × excess / committee_balance, MAX_PENALTY_FACTOR)
```

With:

- `MAX_PENALTY_FACTOR = 256` — the cap and single severity knob
- `PENALTY_SLOPE = 765 = 3 × (cap − 1)` — makes the cap bind at exactly ⅓ of stake offline
- `OFFLINE_BALANCE_SMOOTHING_FACTOR = 2^17` — moving-average half-life ≈ 12.6 days

Key properties the calculator demonstrates:

- **Uncorrelated failures pay exactly today's penalties** — the factor is never below 1× and there are no discount windows
- **Severity scales with event size** at outage onset: 1% of stake → ~9×, 10% → ~78×, ≥⅓ → 256× (cap)
- **The charge is front-loaded**: you pay for joining the correlation, not for how long the fix takes; the multiple vs today's rules *falls* as recovery stretches
- **Only the "offline signature" is scaled** — validators missing *both* timely-source and timely-target flags; wrong-target-with-live-source (relay outages, minority clients during majority bugs) pays today's unscaled rate
- **Above ⅓ offline** the pre-existing inactivity leak activates and dominates multi-day totals — the site attributes that split honestly

## Features

- Event-size slider (0–45% of stake) with onset-factor readout and the ⅓ finality threshold marked
- Independent cohort-outage and your-downtime durations — model fast responders and stragglers
- Today-vs-revised cost in ETH/USD, payback expressed as days of full rewards, and the multiple vs today
- Front-loaded cost curve chart (cost vs hours down) with a "× today" fairness view
- Real-event presets measured by historical replay (May 2023 finality incidents, Besu halt, Nethermind bug, Prysm post-Fusaka)
- EIP-vs-leak split for >⅓ events
- Client market share quick-picks from [clientdiversity.org](https://clientdiversity.org)

## The model (and its limits)

The site uses an approved simplification of the full mechanism: because the moving average has a ~12.6-day half-life, within events lasting ≤~48h the factor ≈ the onset factor while the cohort is offline, and ≈ 1 once the cohort has recovered. A validator's loss over an outage is:

```
loss = base_reward × 54/64 × epochs_down                      # forgone rewards
     + base_reward × 14/64 × epochs_down                      # source penalty, unscaled
     + base_reward × 26/64 × (factor × min(epochs_down, cohort_epochs)
                              + (epochs_down − min(...)))     # target penalty, scaled
     + inactivity_leak(epochs_down)                           # only if event > ⅓
```

This is exact within ~5% for events ≤48h. The integer-exact model, backtests over real mainnet outages, and all figures live in the [research repo](https://github.com/OisinKyne/7716). Unit tests (`npm test`) pin the calculator to the research repo's canonical anchor table.

## Development

**Tech stack**: React 18 + TypeScript + Gatsby 5, vitest for the calculation engine.

```bash
npm install
npm run develop    # dev server at localhost:8000
npm run build      # production build
npm run test       # calculation-engine test vectors
npm run typecheck  # TypeScript validation
npm run lint       # ESLint
```

## Deployment

Automatic GitHub Pages deployment on push to `main` via GitHub Actions. Custom domain: CNAME `validatordowntime.obol.tech` → `obolnetwork.github.io`.

## Resources

- [EIP-7716 revision PR (constants, FAQ, rationale)](https://github.com/ethereum/EIPs/pull/11962)
- [Research repo: replays, severity/window tuning, figures](https://github.com/OisinKyne/7716)
- [ethresear.ch analysis write-up](https://ethresear.ch/t/supporting-decentralized-staking-through-more-anti-correlation-incentives/19116/18)
- [consensus-specs feature PR](https://github.com/ethereum/consensus-specs/pull/5452)
- [Obol Network](https://obol.org) — Distributed Validator Technology

## License

MIT
