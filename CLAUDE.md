# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EIP-7716 Validator Downtime Calculator - an interactive tool for Ethereum validators to understand anti-correlation penalties. Live at [validatordowntime.obol.tech](https://validatordowntime.obol.tech).

**Tech Stack:** React 18 + TypeScript + Gatsby 5

## Commands

```bash
npm run develop    # Start dev server at localhost:8000
npm run build      # Production build
npm run typecheck  # TypeScript validation
npm run lint       # ESLint check
npm run clean      # Clear Gatsby cache
```

## Architecture

### Core Calculation Engine (`src/lib/`)

**`penaltyCalculator.ts`** - The brain of the calculator:
- `calculatePenaltyFactor(offlinePercentage)` - Core EIP-7716 formula using power curve: `penalty = 1 + (MAX_PENALTY - 1) × offline^0.6`
- `calculatePenalty()` - Full penalty breakdown with severity levels and recovery time
- `comparePenalties()` - Current system (always 1x) vs EIP-7716 comparison

**`constants.ts`** - Protocol parameters and Ethereum consensus constants:
- EIP-7716: `PENALTY_ADJUSTMENT_FACTOR = 4096`, `MAX_PENALTY_FACTOR = 4`
- Ethereum: `SLOTS_PER_EPOCH = 32`, `SECONDS_PER_SLOT = 12`
- Economics: Approximate validator APR (~3.5%), base rewards per epoch
- Obol brand colors for UI consistency

### Component Structure (`src/components/`)

- **CorrelationSlider** - Range input (0-100%) with dynamic color feedback
- **PenaltyResults** - Displays penalty multiplier, severity, recovery time, and advanced calculation breakdown
- **PenaltyComparisonChart** - Bar chart comparing current vs EIP-7716 penalties
- **Header/Footer** - Layout with Obol branding and resource links

### Page Layout (`src/pages/index.tsx`)

Single-page app with sections: Hero → Calculator (slider + results + chart) → Explainer Cards → FAQ

## Key Technical Notes

1. **Simplified Model**: Uses power curve approximation (`offline^0.6`) rather than exact EIP-7716 state tracking for visualization purposes
2. **Static Site**: All calculations are client-side; no backend
3. **Component Styles**: Inline CSS-in-JS within components
4. **Path Alias**: `@/*` maps to `src/*` in TypeScript config

## Deployment

Automatic GitHub Pages deployment on push to `main` via `.github/workflows/deploy.yml`
