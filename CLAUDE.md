# Vaultwake V5 — Claude Code instructions

Static, dependency-free browser merge game (6×6 board, Rivet Rover / Survey Kite / Echo Crucible producers). Claude's scope in this repo is **Vaultwake V5 engine QA, gameplay review and release checks**.

## Hard rules
- Work only on Vaultwake V5 (`v5/`, `tests/v5-*`). Read other versions for context only.
- **Never modify V4** (`v4/`, `tests/v4-*`, `tests/v45-*`, `tests/v46-*`). V5 imports `../v4/platform.mjs` — treat it as read-only; propose changes, don't make them.
- **Never modify `v5/lab/`** or `tests/v5-lab*` / `.github/workflows/v5-lab.yml`. The Coastal Lab is a rejected prototype kept for traceability.
- Never touch V2, V3, root `index.html`, or `tests/game.test.cjs`.
- **Preserve saves.** Original slot `vaultwake-v5`, replay slot `vaultwake-v5-replay`, active pointer `vaultwake-v5-active-slot` (`v5/core.mjs`, `v5/replay.mjs`). Any state-shape change needs `load()` migration plus a test loading an older save. Never clear or rename keys.
- Branches: Claude works on `claude/*` branches (default `claude/v5-engine-qa`). Never commit directly to `codex/v5-coastal-workshop` or `main`. Never merge, close or retarget **PR #75**.
- No new gameplay systems (producers, currencies, order types, boosters, timers) without explicit approval. Design proposals go in a doc, not code. `docs/V5_FIRST_SESSION_DESIGN_GATE_2026-10-21.md` is the current gate: design-only until approved.
- Do not install external or third-party skills, plugins or npm packages beyond what CI already uses (`playwright@1.62.1`, `--no-save`).
- QA/review tasks must not change gameplay code; report findings with repro steps instead.

## Repository structure
- `v5/core.mjs` — state, `fresh()`, reducer `act(s,a,now)`, `load(raw)`, `goal()`; `SAVE_KEY`.
- `v5/replay.mjs` — original vs replay save slots.
- `v5/app.mjs` — UI wiring; `v5/index.html`, `v5/crazygames.html` (SDK entry); `*.css`.
- Domain modules: `journey`, `expedition`, `seals`, `mastery`, `camp`, `camp-goals`, `workshop`, `fleet`, `requests`, `treasures`, `containers`, `first-session`, `first-pier`, `coastal-journey`, `chapter-end`, `story`, `navigation`, `order-direction`.
- `tests/v5-*.test.mjs` — node:test rules/sims; `tests/v5-*-policy.mjs` — scripted player policies; `tests/v5-*-metrics.mjs` — JSON metrics; `tests/v5-*-browser.cjs`, `tests/v5-mobile.cjs` — Playwright; `tests/fixtures/stage2/` — save fixtures.
- `docs/V5_*.md` — V5 design, audit and gate documents. `.github/workflows/test.yml` — CI.

## Test commands (Node 22)
```bash
node --test tests/v5-*.test.mjs                      # all V5 rules + simulations (fast)
node --check v5/app.mjs && node --check v5/core.mjs && node --check v5/art.mjs
node tests/v5-journey-metrics.mjs                    # also: v5-seal-metrics, v5-resonance-metrics
# Browser (needs: npm install --no-save playwright@1.62.1 && npx playwright install chromium webkit)
python3 -m http.server 8080 &                        # serve repo root
node tests/v5-mobile.cjs                             # 360/390/430px matrix
COASTAL_ENGINE=webkit node tests/v5-coastal-browser.cjs
```
Some browser tests also need baseline snapshots on ports 8081/8082 — copy the exact `git archive` steps from `test.yml`.

## Collaboration boundaries
- Codex owns `codex/*` feature branches; the user/game director approves design. Claude reviews, tests and reports; it does not redesign silently.
- Commits: conventional style (`test(v5):`, `docs(v5):`, `chore(claude):`). Push only to `claude/*`. Open PRs only when asked, as drafts, never targeting a branch with an active review without asking.
- Reports cite file:line, commit SHA, exact command and viewport/engine.

## Skills
`.claude/skills/`: `gameplay-review`, `gameplay-qa`, `release-check`.
