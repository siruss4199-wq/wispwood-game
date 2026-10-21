---
name: release-check
description: Vaultwake V5 release readiness — GitHub Actions CI status, mobile 360/390/430px Chromium+WebKit checks, CrazyGames Basic Launch compatibility and a go/no-go report. Use when asked "is V5 ready to ship/release/upload", to validate a branch or PR's CI, to check mobile layouts, or to prepare a CrazyGames build. Not for design critique (gameplay-review) or bug hunting (gameplay-qa).
---

# Vaultwake V5 release check

Verification and reporting only. Do not merge, close or retarget PRs (especially **#75**), do not push to `codex/*` or `main`, and do not edit gameplay or `v4/platform.mjs` to make a check pass — report it.

## When to use
- Before a release, a CrazyGames upload, or marking a PR ready for review.
- When CI is red or flaky on a V5 branch.
- When asked to confirm mobile rendering at 360/390/430px.

## Procedure
1. **Identify target.** Branch + `git rev-parse HEAD`. Confirm the branch is in `test.yml` `pull_request.branches` or note that CI only runs via `workflow_dispatch`/push to main.
2. **CI status.** `gh pr checks <n>` or `gh run list --branch <b> --limit 5` then `gh run view <id> --log-failed`. Every job in `test.yml` (`test`, `coastal-journey` chromium+webkit) must be green on the exact SHA. A `v5-lab.yml` result is irrelevant to V5 release. Distinguish flaky (passes on rerun, same SHA) from real failures.
3. **Local reproduction (Node 22):**
   ```bash
   node --test tests/v5-*.test.mjs
   node --check v5/app.mjs && node --check v5/core.mjs && node --check v5/art.mjs
   npm install --no-save playwright@1.62.1 && npx playwright install --with-deps chromium webkit
   python3 -m http.server 8080 &
   node tests/v5-mobile.cjs && node tests/v5-replay-browser.cjs
   COASTAL_ENGINE=chromium node tests/v5-coastal-browser.cjs
   COASTAL_ENGINE=webkit   node tests/v5-coastal-browser.cjs
   ```
   For the full suite, copy the 8081/8082 `git archive` baseline steps from `test.yml`.
4. **Mobile matrix (360, 390, 430px; Chromium + WebKit):** no horizontal scroll; whole 6×6 board and the primary goal visible without scrolling; tap targets ≥44px; one primary CTA; drag and tap merge both work; text not clipped; reload keeps progress. Save screenshots as `test-artifacts/v5/release/<view>-<width>-<engine>.png`.
5. **CrazyGames (Basic Launch, see `docs/CRAZYGAMES_BASIC_LAUNCH.md`):**
   - `v5/crazygames.html` loads the HTML5 v3 SDK; standalone `v5/index.html` stays platform-neutral.
   - Goes straight into gameplay; `gameplayStart()` only after the board is playable.
   - No ad or rewarded-ad UI, no payments, no external network calls besides the SDK.
   - Fits 907×510 desktop embed; total payload well under 20 MB (`du -sh v5 v4/platform.mjs`, excluding `v5/lab` and `v5/assets/review`).
   - `platform.save` used only for the original slot; replay slot stays local.
   - No console errors on load or first 5 actions.
6. **Save safety:** an existing `vaultwake-v5` save from the previous release loads with progress intact (see gameplay-qa step 4).

## Report
```
## Release: GO / NO-GO — <branch>@<sha>
| Check | Chromium | WebKit | Evidence |
CI jobs · Unit/sim · 360 · 390 · 430 · CrazyGames · Saves · Console
## Blockers (S1/S2) with repro
## Non-blocking issues
```
Any red CI job, S1/S2 bug, save regression or ad/payment UI ⇒ NO-GO.
