# EIP-7716 Validator Downtime Calculator

Interactive tool to understand how anti-correlation penalties under EIP-7716 affect Ethereum validator rewards based on correlated downtime.

**Live site**: [validatordowntime.obol.tech](https://validatordowntime.obol.tech)

## Overview

EIP-7716 introduces anti-correlation attestation penalties to Ethereum's consensus layer. This calculator helps validators understand:

- How the penalty multiplier (1x to 4x) scales with correlated downtime
- The additional loss compared to an uncorrelated solo staker
- Recovery time needed to earn back extra penalties
- Comparison between current penalties and EIP-7716 penalties

## Features

- **Interactive Slider**: Adjust the percentage of network offline to see real-time penalty calculations
- **Penalty Visualization**: Clear visual representation of the 1x-4x penalty scale
- **Comparison Chart**: Side-by-side view of current system vs EIP-7716
- **Educational Content**: Explainers and FAQ about how anti-correlation penalties work

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Development Server

```bash
npm run develop
```

Open [http://localhost:8000](http://localhost:8000)

### Build

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

## Deployment

The site automatically deploys to GitHub Pages on push to `main` via GitHub Actions.

### Custom Domain Setup

1. Create a CNAME record for `validatordowntime.obol.tech` pointing to `obolnetwork.github.io`
2. Enable GitHub Pages in repository settings
3. Set custom domain to `validatordowntime.obol.tech`

## Technical Details

### Penalty Calculation

The penalty factor is calculated based on EIP-7716's formula:

```
penalty_factor = min(
  (non_attesting_balance × PENALTY_ADJUSTMENT_FACTOR) /
  (net_excess_penalties × total_active_balance + 1),
  MAX_PENALTY_FACTOR
)
```

Where:
- `PENALTY_ADJUSTMENT_FACTOR = 4096`
- `MAX_PENALTY_FACTOR = 4`

### Key Insight

- Solo stakers with uncorrelated downtime experience ~1x penalty
- Large operators with correlated infrastructure face up to 4x penalties
- This creates economic incentives for infrastructure diversification

## Resources

- [EIP-7716 Specification](https://eips.ethereum.org/EIPS/eip-7716)
- [Research: Diseconomies of Scale & Anti-Correlation Penalties](https://ethresear.ch/t/diseconomies-of-scale-anti-correlation-penalties-eip-7716/20114)
- [Obol Network](https://obol.tech) - Distributed Validator Technology

## License

MIT
