---
name: gameplay-qa
description: Automated Vaultwake V5 gameplay QA — reducer-level playthrough simulation, softlock/dead-end detection, save and replay-slot compatibility, regression tests and reproducible bug reports. Use when asked to test, simulate, find softlocks or bugs, verify a fix, check old saves still load, or write a regression test for V5. Not for design opinions (gameplay-review) or release sign-off (release-check).
---

# Vaultwake V5 gameplay QA

Tests and reports only. **Never change gameplay code (`v5/*.mjs`, `v5/*.css`, `v5/*.html`) in a QA task** — new/updated files go in `tests/` (prefix `v5-`) or `test-artifacts/`. Never touch `v5/lab/`, `tests/v5-lab*`, or V4.

## When to use
- "Play through / simulate V5", "is there a softlock", "board full and stuck".
- After any change to `v5/core.mjs` or a domain module, or on a Codex PR.
- Save questions: old save, replay slot, migration, corrupted localStorage.
- Turning a bug into a deterministic regression test.

## Procedure
1. **Baseline:** `git rev-parse HEAD`, then `node --test tests/v5-*.test.mjs`. Record pass/fail counts.
2. **Simulate through the public reducer only.** Drive `act(s, action, now)` from `v5/core.mjs` with a fixed `now` and the existing policies (`tests/v5-policy.mjs` `choose()`, `v5-coastal-policy`, `v5-workshop-policy`, `v5-navigation-policy`). Never seed milestones or mutate state directly to "help" the run. Vary policy options (`sideFirst`, `openCaches`, `clearSalvage`, `style`) to cover several player styles.
3. **Softlock checks at every step:**
   - `goal(s)` non-null until the slice's intended end; goal changes within a bounded number of actions (flag >200 actions without progress).
   - If no legal merge and no free cell, a free cleanup/rescue path exists (no spend-gated dead end).
   - Every producer that the goal needs is `sourceUnlocked` and affordable or refillable.
   - `act` never throws; board length stays 36; no `undefined` cells; counters never negative.
4. **Save compatibility:**
   - `load(JSON.stringify(s))` round-trips at each milestone; `load` of every `tests/fixtures/stage2/*.json` succeeds and keeps progress.
   - `v5/replay.mjs`: `beginReplay` leaves `vaultwake-v5` byte-identical; `returnOriginal` restores it; replay never writes the original key. Use an in-memory `storage` stub.
   - Garbage/partial JSON in `load` falls back safely without wiping the other slot.
5. **Browser repro (only if UI-specific):** serve root on 8080 and run the matching `tests/v5-*-browser.cjs` with Chromium and WebKit.
6. **Regression test:** smallest deterministic `node:test` file in `tests/v5-<topic>.test.mjs` that fails on the bug and documents the expected rule. Confirm it fails before / passes after when a fix exists elsewhere.

## Bug report format
```
Title: [V5][severity S1-S4] <symptom>
Commit: <sha>   Env: node 22 | <engine> <width>px
Seed/state: fixture path or action list (JSON) from fresh(now=<n>)
Steps: 1… 2… 3…
Expected / Actual:
Evidence: test name, failing assertion, screenshot path
Save impact: none | original slot | replay slot
Suspected area: file:line (no patch)
```
Severity: S1 softlock or save loss · S2 progression blocked with workaround · S3 wrong reward/UI state · S4 cosmetic.
