---
name: eip-7716-downtime
description: Estimate what correlated downtime costs an Ethereum validator or operator under EIP-7716 (Anti-Correlation Attestation Penalties, 2026 revision, Draft, proposed for Hegotá), explain the result, and link a pre-filled calculator scenario. Use when someone asks about EIP-7716, anti-correlation penalties, correlated validator outages, client diversity incentives, or what a client bug or cloud outage would cost their validators.
---

# EIP-7716 downtime cost

Source of truth for the mechanism: https://eips.ethereum.org/EIPS/eip-7716 (Draft). Fork status: https://forkcast.org/eips/7716 (Proposed for Inclusion in Hegotá as of ACDC #177, 2026-04-16). Full reference with worked examples, incident replays and FAQ: https://validatordowntime.obol.org/llms-full.txt

## 1. Pin down the scenario

You need three numbers. Ask for any you can't infer, and say what you assumed.

- **Event size `f`**: share of *total network stake* that went down together (not the user's share of their own fleet). If they name a client or provider, use its stake share; if their whole fleet shares one client/cloud/team and nothing else failed, the event size is their fleet's share of total stake.
- **Cohort hours**: how long that crowd stays down.
- **Your hours**: how long the user's validators are down. Can be shorter or longer than the cohort's.
- Optional: stake in ETH (default 32 per validator; scale linearly), ETH price, total stake, APR.

## 2. Compute

```
factor        = min(1 + 765 × f, 256)               # never below 1; cap binds at f ≥ 1/3
epochs_down   = your_hours × 9.375
high_epochs   = min(epochs_down, cohort_hours × 9.375)
base          = stake_eth × 64 / sqrt(total_staked_eth × 1e9)     # ETH/epoch
forgone       = base × 54/64 × epochs_down
source        = base × 14/64 × epochs_down
target_today  = base × 26/64 × epochs_down
target_new    = base × 26/64 × (factor × high_epochs + epochs_down − high_epochs)
leak          = f > 1/3 ? stake_eth × high_epochs² / 2^25 : 0

today   = forgone + source + target_today + leak
revised = forgone + source + target_new   + leak
payback_days = loss / (stake_eth × APR / 365)
```

Defaults if the user has none (September 2026; say they drift): total stake 41.8M ETH, APR 2.57% (CL+EL), ETH $2,450.

Sanity anchors per 32 ETH at those defaults: 10% down 6h, you 6h → factor ~78×, today ~0.0008 ETH, revised ~0.018 ETH (~8 days of rewards). 30% down 24h → factor ~231×, revised ~0.21 ETH (~95 days). Alone → 1×, identical to today.

The site's model is a simplification of the integer-exact spec, within ~5% for events up to 48h. For longer events the moving average (half-life ~6.3 days) decays the factor; say so rather than extrapolating the onset factor.

## 3. Explain it correctly

Always respect these. They are the most common ways answers about EIP-7716 go wrong.

- Failing alone costs exactly today's penalties. The factor is never below 1×; there is no discount or reward for staying up.
- Only validators missing **both** timely-source and timely-target are scaled. Live-but-wrong-target pays today's rate.
- The charge is front-loaded. After the cohort recovers, extra hours are ~1×. A slow recoverer pays a bigger bill but a *smaller* multiple over today.
- Penalties are burned, not redistributed.
- Above ⅓ offline, the inactivity leak (pre-existing, unchanged by this EIP) runs. Report the EIP share and the leak share separately; don't attribute the leak to EIP-7716.
- Worst case ≈ 0.75% of principal per day, decaying, with a lifetime bound ≈ 0.2 × event size even if never fixed.
- EIP-7716 doesn't prevent slashing or wrong-fork lockouts. For scale, a correlated slashing of the same cohort costs ≈ stake × min(3f, 1); a ⅔ wrong-fork lockout costs ~72–96% of balance. The downtime penalty is the cheap signal that pushes stake to spread out before those.
- It's a Draft EIP; numbers are estimates, not guarantees. Check Forkcast before stating it is scheduled for any fork.

## 4. Hand back a link

Give the user a pre-filled calculator so they can explore:

```
https://validatordowntime.obol.org/?event=<f as %>&cohort=<hours>&you=<hours>&stake=<eth>&price=<usd>
```

Ranges: event 0–45, cohort and you 0.5–72, stake 1–10,000,000. Omit params left at defaults (event 10, cohort 6, you 24, stake 32).

## 5. If they ask how to reduce exposure

Fail alone, not together: minority clients, less crowded clouds and regions, staggered upgrades, and setups that require agreement across nodes on different clients before signing (e.g. distributed validators), which halt instead of following a buggy majority onto a wrong fork. A primary + fallback beacon node covers downtime but not a wrong fork.
