# Update plan: bring this calculator to the 2026 EIP-7716 revision

**Read this whole file before touching code.** This site was built in early 2026
against EIP-7716 *as drafted in 2024*. That mechanism has since been replaced —
not retuned, replaced — in the live EIP (PR ethereum/EIPs#11962, PFI for the
Hegotá fork). Every formula, constant, and headline number the site currently
shows is obsolete. This document contains everything needed to update it:
the new mechanism spec-exactly, the canonical numbers, test vectors, and a
file-by-file work plan. **Treat the numbers here as canonical — do not
re-derive them, and do not go digging in the research repos to second-guess
them.** If something seems inconsistent, flag it to Oisín rather than
resolving it yourself; a separate session holds the research context.

## 1. What changed and why (the one-paragraph version for site copy)

The 2024 draft scaled penalties by a factor of 1–4x driven by a
`NET_EXCESS_PENALTIES` counter. Replaying it over real mainnet outages showed
it to be a measured no-op: the counter has a fixed excess-penalty budget, so a
correlated outage of any size or duration cost within a few percent of an
uncorrelated one, at any cap. The revised mechanism (2026) compares each
slot's *offline balance* to a slow-moving average of itself and scales the
penalty by the excess. Severity now scales with event size, is front-loaded at
outage onset, and validators failing alone pay exactly what they pay today.

## 2. The revised mechanism (this is what the calculator must model)

```text
# per slot of the previous epoch, at epoch processing:
offline           = balance in that slot's committees missing BOTH the
                    timely-source AND timely-target participation flags
committee_balance = total_active_balance // 32          # '//' = integer floor division
excess            = max(0, offline - smoothed_offline_balance)
factor            = min(1 + PENALTY_SLOPE * excess // committee_balance,
                        MAX_PENALTY_FACTOR)
# then the moving average absorbs the slot:
smoothed_offline_balance += (offline - smoothed_offline_balance)
                            // OFFLINE_BALANCE_SMOOTHING_FACTOR
```

| Constant | Value | Meaning |
|---|---|---|
| `MAX_PENALTY_FACTOR` | **256** | cap; the single severity knob |
| `PENALTY_SLOPE` | **765** = 3·(cap−1) | makes the cap bind at exactly ⅓ of stake offline |
| `OFFLINE_BALANCE_SMOOTHING_FACTOR` | **2^17** | moving-average half-life ≈ 12.6 days |

Scope rules (these matter for the copy and the FAQ):

- The factor multiplies **only the timely-target penalty** (weight 26/64 of the
  base reward), and **only** for validators that missed *both* source and
  target — the "offline signature". A validator that attested with a wrong
  target but a live source (late epoch-boundary block, minority client during
  a majority-client bug, relay outage) pays exactly today's unscaled penalty.
- The factor is **never below 1**: uncorrelated failures pay exactly today's
  penalties. There are no discount windows.
- Onset factor by event size (baseline-independent): 1% of stake newly
  offline → **9x**, 5% → **39x**, 10% → **78x**, 20% → **154x**, ≥33.3% → **256x** (cap).
- Above ⅓ offline, the (unchanged, pre-existing) **inactivity leak** activates
  and grows to dominate. Always attribute the >33% totals honestly: most of a
  multi-day finality-loss total is the leak, not this EIP.

### Simplified event model for the calculator (approved approximation)

The moving average has a 12.6-day half-life, so within events lasting ≤~48h it
barely moves. Approved simplification for the site: **factor ≈ onset factor
while the cohort is offline; factor ≈ 1 once the cohort has recovered.** A
validator's loss over an outage is then:

```text
epochs_down          = user's own downtime in epochs (225/day)
epochs_at_high_factor = min(epochs_down, cohort_outage_epochs)
base_reward          = per-epoch base reward for the validator's balance

loss = forgone_rewards(epochs_down)                          # same as today
     + base_reward * 14/64 * epochs_down                     # source pen, unscaled
     + base_reward * 26/64 * (factor * epochs_at_high_factor # target pen, scaled
                              + 1 * (epochs_down - epochs_at_high_factor))
     + inactivity_leak(epochs_down)                          # only if event > 33%

forgone_rewards(e) = base_reward * 54/64 * e   (ideal-participation approximation)
```

Inactivity leak (only when >⅓ offline; unchanged from today, include in BOTH
the "today" and "revised" columns): score grows 4/epoch while down during a
leak, penalty per epoch = `balance * score / 2^26`. Cumulative after `t`
epochs down ≈ `balance * t² / 2^25`. In %/day terms the leak's instantaneous
rate ≈ 0.30% × (days since leak start) and it crosses the revised mechanism's
0.75%/day ceiling at ~day 2.5.

## 3. Canonical numbers (use as display anchors AND unit-test vectors)

Economic anchors (July 2026): ~40.7M ETH staked, ETH ≈ $1,840, full CL+EL
rewards ≈ **$5.08/day per 32 ETH** (~3.2% APR incl. EL). Per 32 ETH validator,
cohort offline 24h unless stated; "payback" = days of full rewards to re-earn:

| Event | Today | Revised | Payback |
|---|---|---|---|
| uncorrelated failure, 24h | $6.17 | $6.17 (1.0x) | 1.2 d |
| 1% correlated, 24h | $6.17 | $19 (3.1x) | 3.7 d |
| 5% correlated, 24h | $6.17 | $70 (11.3x) | ~2 wk |
| 10% correlated, down 6h | $1.54 | $34 (22x) | ~1 wk |
| 10% correlated, 24h | $6.17 | **$133 (21.6x)** | 3.7 wk |
| 10% correlated, down 72h | $18.50 | $146 (7.9x) | 4.1 wk |
| 20% correlated, 24h | $6.17 | $260 (42x) | 7.3 wk |
| 40% (leak active), 24h | $95 | $530 (5.6x) | 3.4 mo |
| 40%, down 72h (finality lost) | $819 | **$2,124 (2.6x)** — $1,324 EIP + $801 leak | ~14 mo ≈ 3.6% of principal |

Real-event presets (measured by historical replay; event-window means per 32 ETH):

| Event | peak offline | payback today | revised |
|---|---|---|---|
| May 11+12 2023 finality incidents | 69% (cap binds) | 46 min | 1.9 days (79x) |
| Besu halt, 2024-01-06 | 12.4% | 1.3 h | 4.3 h (3.5x) |
| Nethermind bug, 2024-01-21 | 18.8% | 1.5 h | 21 h (14x) |
| Prysm post-Fusaka, 2025-12-04 | 29.8% | 2.5 h | 4.7 days (45x) |

Fairness facts (the most-asked question — surface these prominently):

- Among validators down from the Fusaka event's onset, recovering at 24–36h
  cost **1.5x** the 6–8h crowd; today's rules charge **4.7x** for that spread.
- The multiple over today's cost **falls** with recovery time: ~57x for the
  fastest responders → ~9x for the slowest. Being down 10x longer cost 2.1x
  more, not 10x.
- Worst-case bleed ceiling: **0.75% of principal per day**, only while ~⅓ of
  stake is newly offline and the validator is fully down. Principal-level
  losses remain exclusive to the leak and slashing.
- Operator scale: a 10%/24h event ≈ 900 ETH per 1% of total stake an operator
  runs (~9,000 ETH for a 10%-of-stake operator).

## 4. Sources of truth (link these; don't re-derive from them)

- EIP text: https://github.com/ethereum/EIPs/pull/11962 (constants, FAQ, rationale)
- Research + figures repo: https://github.com/OisinKyne/7716 — README, SEVERITY.md,
  WINDOW_TUNING.md, REDISTRIBUTION.md, BACKTEST.md; figures f1–f7 and w1–w5
  are publishable PNGs (`figures/`). `figures/w5_cost_growth.png` and
  `figures/f3_onset_vs_size.png` are the two best explainer images.
- Analysis write-up: https://ethresear.ch/t/supporting-decentralized-staking-through-more-anti-correlation-incentives/19116/18
- consensus-specs feature: https://github.com/ethereum/consensus-specs/pull/5452

## 5. Work plan, file by file

0. **`CLAUDE.md`** — rewrite to describe the updated site + point at this plan.
1. **`src/lib/constants.ts`** — remove `PENALTY_ADJUSTMENT_FACTOR`,
   `PENALTY_RECOVERY_RATE`, `MAX_PENALTY_FACTOR = 4`. Add the three new
   constants above. Refresh network approximations: ~40.7M ETH staked (not
   32M), APR ~3.2% incl. EL, note Electra `MAX_EFFECTIVE_BALANCE` is 2048 ETH
   but the mechanism is balance-weighted so per-32-ETH normalization stays the
   right display unit. Keep the Obol palette.
2. **`src/lib/penaltyCalculator.ts`** — replace the counter simulation with
   the simplified event model in §2. Inputs: event size (% of stake), cohort
   outage duration, user's own downtime, stake. Outputs: loss in ETH/USD,
   payback days, vs-today multiple, and (when >33%) the EIP-vs-leak split.
   Write unit tests against the §3 table — every row is a test vector
   (tolerance ±5%, the anchors round).
3. **`src/components/CorrelationSlider.tsx`** — range to 0–45%, factor readout
   `min(1 + 765·x, 256)`, mark the ⅓ saturation point ("finality threshold —
   inactivity leak takes over").
4. **`src/components/PenaltyResults.tsx`** — three-line result: today /
   revised / multiple. When >33%, show the stacked split (this EIP vs
   pre-existing leak) so the leak isn't mistaken for 7716.
5. **`src/components/PenaltyComparisonChart.tsx`** — replace with (or add) the
   w5 framing: x = hours down (linear), today's rules as the proportional
   straight line, revised as the front-loaded flattening curve. Second nice
   addition: real-event preset buttons (table in §3) that set the slider.
6. **Copy / FAQ (`src/pages/index.tsx`)** — rewrite around: front-loading
   ("pay for joining the correlation, not for how long the fix takes"),
   solo stakers pay exactly today's rates, the both-flags gate (relay outages
   and minority clients exempt), never below 1x, burn not redistribution,
   and the 1x–4x language everywhere must go. Keep the disclaimer that this
   is a Draft EIP under discussion for Hegotá.
7. **`README.md`** — update the description (no more "1x to 4x"), constants,
   and add a "model" section describing the §2 approximation and its limits
   (exact within ~5% for events ≤48h; the full integer-exact model lives in
   the research repo).

## 6. Ground rules

- Commits: stage changes and write the message to a file; Oisín signs and
  pushes himself (hardware key). Never run `git commit`.
- Do not modify anything outside this repo. The research repos
  (`OisinKyne/7716`, consensus-specs, EIPs) are owned by another session.
- If a number you compute disagrees with §3 by more than ~5%, stop and flag
  it — do not "fix" the anchor.
- The site is public-facing education: prefer fewer numbers displayed well
  over exhaustive tables. The research repo exists for the exhaustive part.
