# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EIP-7716 Validator Downtime Calculator — an interactive tool for Ethereum validators to understand anti-correlation penalties under the **revised (2026) EIP-7716 mechanism**. Live at [validatordowntime.obol.org](https://validatordowntime.obol.org).

The site models the revision from [ethereum/EIPs#11962](https://github.com/ethereum/EIPs/pull/11962) (PFI for the Hegotá fork), which replaced the 2024 counter-based draft. `UPDATE_PLAN.md` in the repo root documents the mechanism spec, canonical test-vector numbers, and the ground rules for that migration — read it before touching the calculation engine.

**Tech Stack:** React 18 + TypeScript + Gatsby 5, vitest for the engine tests

## Commands

```bash
npm run develop    # Start dev server at localhost:8000
npm run build      # Production build
npm run test       # Calculation-engine test vectors (vitest)
npm run typecheck  # TypeScript validation
npm run lint       # ESLint check
npm run clean      # Clear Gatsby cache
```

## Architecture

### Core Calculation Engine (`src/lib/`)

**`penaltyCalculator.ts`** — the brain:
- `onsetFactor(fraction)` — `min(1 + 765 × fraction, 256)`, never below 1
- `calculateOutage(params, econ)` — full outage model: today vs revised loss (ETH/USD), payback days, multiple, EIP-vs-leak split for >⅓ events
- `costCurve(...)` — series for the front-loaded cost chart
- Simplified event model (approved): factor ≈ onset factor while the cohort is down, ≈ 1 after it recovers. Exact within ~5% for events ≤48h.

**`penaltyCalculator.test.ts`** — every row of the canonical anchors table (UPDATE_PLAN.md §3) is a test vector at `ANCHOR_ECONOMICS`, tolerance ±5%. **Do not "fix" a failing anchor — flag it.**

**`constants.ts`** — protocol parameters and economics:
- Revised EIP-7716: `MAX_PENALTY_FACTOR = 256`, `PENALTY_SLOPE = 765`, `OFFLINE_BALANCE_SMOOTHING_FACTOR = 2^17`
- `ANCHOR_ECONOMICS` (July 2026, pins the tests) vs `CURRENT_ECONOMICS` (display defaults — refresh stake/APR from beaconcha.in/ethstore and the ETH price periodically)
- Client shares for quick-picks (clientdiversity.org), Obol brand colors

### Components (`src/components/`)

- **CorrelationSlider** — event-size slider (0–45% of stake), onset-factor readout, ⅓ finality-threshold marker, client-share chips
- **DowntimeControls** — cohort outage duration vs your downtime (independent), stake input
- **PenaltyResults** — today / revised / multiple readout, payback days, leak split when >⅓, breakdown table
- **PenaltyComparisonChart** — SVG cost-vs-hours-down curve (front-loaded vs today's proportional line) with a "× today" fairness view
- **EventPresets** — real incidents with replay-measured numbers; loading one is an *approximate* reconstruction (the calculator shows the clean worst case, replay means are gentler)
- **Header/Footer** — Obol branding and resource links

### Page (`src/pages/index.tsx`)

Hero → Calculator → Fairness section (fast vs slow recoverer) → Mechanism explainers → FAQ → disclaimer.

## Key Technical Notes

1. **Scope rules that must survive any copy edit**: factor never below 1×; only both-flags-missed validators are scaled; penalties are burned not redistributed; >⅓ totals must attribute the inactivity-leak share honestly (it predates this EIP).
2. **Per-32-ETH normalization** stays correct despite Electra's 2048-ETH max balance — the mechanism is balance-weighted.
3. **Static site**: all client-side, no backend. Component styles are inline CSS-in-JS. Fonts: Archivo (display) + IBM Plex Mono (data) via Google Fonts in `Head`.
4. **Path alias**: `@/*` maps to `src/*`.
5. **Commits**: stage changes and write the message to a file; Oisín signs and pushes himself (hardware key). Never run `git commit`.

## Deployment

Automatic GitHub Pages deployment on push to `main` via `.github/workflows/deploy.yml`
