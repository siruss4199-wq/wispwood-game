# Vaultwake V5 Coast Camp — CrazyGames release check (2026-10-26)

User: "Togloomoo hurdan publish hiihiin tuld uldsen ajiluudaa shalgaaad hurdan hugjuulyaa".
Target: Coast Camp (`v5/play.html`, `v5/next/`) Build 46d on `claude/v5-audit-fixes` (PR #83, on
#82 on #81), for CrazyGames Basic Launch (`docs/CRAZYGAMES_BASIC_LAUNCH.md`).

## Found and fixed in this pass

| Gap | Fix |
|---|---|
| No CrazyGames page for Coast Camp (the adapter `v5/next/platform-cg.mjs` named `v5/coast-crazygames.html`, which did not exist; `v5/crazygames.html` is Classic V5) | `tools/coast-crazygames.mjs` makes `v5/coast-crazygames.html` from `play.html` (SDK v3 loaded); CI fails if it is out of date (`--check`) |
| Basic Launch allows no ads or rewarded-ad offers; Coast Camp showed four (the energy ad button, the shop's "Free with a short ad", "▶ New order", the ad stand-in) | `data-ads="off"` on the CrazyGames page hides every ad offer and its help text; `play.html` is unchanged |
| Links out of the game (Play Classic, playtest log, sound check page, feedback export) | hidden on the CrazyGames page (`data-platform="crazygames"`) |
| No upload package | `node tools/coast-crazygames.mjs --zip` writes `dist/vaultwake-coast-crazygames.zip` (3.7 MB; `index.html` opens the game; only what Coast Camp loads: no Classic pages, review pages, lab or review art) |
| No test of the CrazyGames page | `tests/v5-next-crazygames-browser.cjs` (in CI): SDK stand-in records init → loadingStart → loadingStop → gameplayStart; no ad offer on the board, in the shop or for a new order, and no ad requested; no link out in the menu; no sideways scroll at 907 × 510, 390 and 360; no page error, no missing file, no other request. Also run against the unpacked zip: passes |

## Release check

| Check | Chromium | WebKit | Evidence |
|---|---|---|---|
| Rules and simulations | ✅ 285 pass | — | `node --test tests/v5-*.test.mjs` |
| Coast Camp browser tests (360/390/430/907×510) | ✅ | ✅ CI | `v5-next-browser`, `-playtest-`, `-bright-` |
| CrazyGames page | ✅ | CI | `v5-next-crazygames-browser.cjs` |
| Packaged zip plays | ✅ | — | same test with `CG_URL` on the unpacked zip |
| Saves (`vaultwake-v5-coast`) | ✅ older saves load (tests) | | `v5-next.test.mjs` |
| Payload | 3.7 MB zip, 4.1 MB unpacked (limit 20 MB) | | `--zip` output |
| Random play | 160,000 actions, 0 bugs | | audit fuzz |
| CI job "Game rule and markup tests" / "Fresh coastal journey (webkit)" | ❌ Classic V5 only (`v5-camp-browser.cjs:126`, `v5-coastal-browser.cjs:29`), red on the gameplay base too | | not Coast Camp |

## Left for the user (cannot be done from here)

1. **Merge** the review PRs in order (#81 → #82 → #83) into the gameplay branch or `main`, as you
   decide; Claude does not merge.
2. **Upload** `dist/vaultwake-coast-crazygames.zip` (or a zip built with the command above from
   the merged branch) in the CrazyGames developer portal, with the title, description, cover and
   thumbnail images the portal asks for; check it in CrazyGames' QA/preview tool.
3. **A real iPhone and Android** check (only Chromium and WebKit engines were tested; sound and
   vibration were never listened to or felt here).
4. The Classic V5 CI failures above, if Classic V5 is also shipped.

After Full Launch is offered: turn ads on (drop `data-ads="off"` in `tools/coast-crazygames.mjs`;
the rewarded-ad code and `platform-cg.mjs` are already in place) and validate in the QA tool.
