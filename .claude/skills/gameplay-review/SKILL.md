---
name: gameplay-review
description: Commercial casual merge-game design review of Vaultwake V5 — first-session pacing, progression, rewards, producer chains, orders and economy. Use when asked to review, critique or evaluate V5 gameplay, a design doc, a balance change, a Codex PR's design, or "is this fun / clear / commercial?". Not for running bug hunts (gameplay-qa) or release gating (release-check).
---

# Vaultwake V5 gameplay review

Output is a written review. **Do not edit gameplay code.** Do not propose new systems unless asked; prefer removing or clarifying existing ones.

## When to use
- Reviewing a V5 design doc (`docs/V5_*.md`) or a gameplay PR/commit on a `codex/*` branch.
- Judging producer chains, order/reward values, progression gates, first 10–15 minutes.
- User reports "confusing", "grindy", "boring", "abrupt ending", "too many buttons".

## Procedure
1. **Anchor on the gate.** Read `docs/V5_FIRST_SESSION_DESIGN_GATE_2026-10-21.md` pillars: one primary goal at a time; every item has a visible destination; coast changes on big wins; real trade-offs; slice ends in a new playable opportunity, not a false finale.
2. **Read the real data, not docs alone.** `v5/core.mjs` (`FAMILIES`, `SOURCES` costs/unlocks, `STAGES`, `fresh()` seed, `act()`), plus the relevant domain module (`requests`, `journey`, `workshop`, `seals`, `camp-goals`, `chapter-end`).
3. **Measure, don't guess.** Run `node tests/v5-journey-metrics.mjs` (and `v5-seal-metrics` / `v5-resonance-metrics` if relevant). Use existing policies in `tests/v5-*policy.mjs` for taps-to-goal, free cells over time and order completion.
4. **Score each area (✅ / ⚠️ / ❌) with evidence:**
   - *Onboarding:* first merge possible without a producer tap; first goal visible at 390px without scrolling.
   - *Producers:* each of Rover/Kite/Crucible has a distinct purpose and an earned unlock; no arbitrary "climb to Tier N" gates.
   - *Orders & rewards:* target, producer and reward are legible; reward size scales with effort; rewards change the world or grant capability.
   - *Economy:* energy/supply costs vs income per minute; no spend-gated dead end; board occupancy roughly 18–27 after opening.
   - *Progression & pacing:* time/taps per milestone; any spike >2× the previous step is a ⚠️.
   - *Clarity:* number of simultaneous CTAs; competing goals at equal visual priority is ❌.
   - *Commercial fit:* compare against merge-genre *principles* (producers → orders → renovation → mystery). Never copy competitor assets, names, layouts or recipes.
5. **Write findings** ordered by player impact: problem → evidence (file:line, metric, screenshot) → smallest change that fixes it → risk to saves. Flag anything that would need a new system as "needs approval".

## Output template
```
## Verdict: <ship / iterate / block> — one sentence
## Top 3 player-impact issues
## Area scores (table)
## Metrics used (command + numbers)
## Proposals requiring approval
```
