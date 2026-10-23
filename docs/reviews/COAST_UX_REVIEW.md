# Coast Camp UI/UX review — 23 October 2026

Source: `claude/v5-autonomous-rebuild`, `9b40008b5205421c0ad954cb5780a3ba21fcc6c8` (Build 18).
Review branch: `codex/v5-coast-ux`. No PR created; no merge requested.

## Five baseline problems

1. **Competing opening instructions.** A crew delivery is already ready on the fresh board while the hint says to start by merging. Neither instruction identifies a single priority consistently.
2. **Missing request-to-generator connection.** Incomplete orders say MAKE; tapping them marks exact finished items, but does not show the machine that supplies their chain or explain the requested parts clearly.
3. **Clipped instructions.** Inherited two-line clamping hides selection details, including generator progression. The next-objective hint shifts to distant level-three progression instead of the immediate order loop.
4. **Weak manipulation feedback and layout.** Ordinary items sit on a largely undivided beige surface. Dragging only dims the origin. Source/kit/token/cog gestures inherit scroll behavior. At 907×510 the portrait layout extends below the viewport and the brand overflows the header.
5. **Restoration reads as a list.** Upgrades add small item icons on a largely unchanged scene. Spending lacks a persistent receipt; unaffordable buttons show prices without the shortfall. The return-to-board action sits after several unavailable future-area previews.

## Implementation by file

- `v5/play.html`: contextual objective button; ocean theme color; separate UX cache revision.
- `v5/next/app.mjs`: ready-first objective derived from actual engine state; pair highlighting; request producer highlighting and named needs; stable order-scroll position; readable short selection copy with expandable details; disabled produce action when energy/space is unavailable; focus restoration after rendering; drag ghost, pointer capture, target preview and cancellation cleanup; producer output feedback no longer erased by a second render; delivery coin receipt; restoration spending receipt, shortfalls and progress; stage-derived path/tent/mast/pier scenery using inline vector shapes; damaged/operational Workshop assets; contextual return action. Story replay does not report a new coin spend.
- `v5/next/next.css`: Coast-only layout and visual treatment. Turquoise tray, separated wells, coral/gold producers, quiet blue-gray blockers, clear matching/selection states; compact character requests; comfortable controls, safe areas, reduced-motion overrides; 907×510 two-column layout; restoration screen and receipt styling.
- `tests/v5-coast-ux-capture.cjs`: reproducible 12-state, four-viewport screenshot playthrough.
- `tests/v5-coast-ux-browser.cjs`: regression checks for truthful opening guidance, request sourcing, valid matching, drag ghost lifecycle and merge, expanded instructions, unaffordable upgrades, help/map return, horizontal overflow and landscape board visibility.

No runtime dependency or external asset added. Board remains 7×7 with unchanged index mapping. No changes to `game.mjs`, economy, requirements, progression, save keys, V4, lab, Claude's branch, or PR #75.

## Verification

- `node --test tests/v5-*.test.mjs`: **251 passed, 0 failed**, before and after.
- `node tests/v5-next-browser.cjs`: Chromium **360 / 390 / 430 passed** on both baseline and modified branch. Covers intro, tap merging, production, cargo, orders, two restorations, reload, map, Classic-save preservation, generator drag and cog upgrade.
- The same command cannot finish its WebKit section: required Linux libraries are missing. `playwright install-deps webkit` fails on workspace setgroups/seteuid permissions. This is reproduced on the unchanged baseline, not classified as a UI regression. Safari/iPhone hardware testing is still required.
- Chromium fallback: packaged Chromium 153 from `@sparticuz/chromium`, installed in a QA-only directory outside the repository; standard Playwright Chromium download returned an unavailable HTML page. Test browser is not bundled into the repository.
- `node tests/v5-coast-ux-browser.cjs`: **360 / 390 / 430 / 907 passed**, with zero page errors.
- Baseline and after capture playthrough: 12 states at 360×844, 390×844, 430×844, 907×510. Fresh opening, selection, merge, producer, orders, beach, ready order, reward, affordable upgrade, story, restored beach, returning save. Actual taps and engine actions; reduced motion for readable captures. Images are awaited before capture.
- After capture playthrough: zero page errors; all four widths delivered an order and restored a location. No horizontal overflow. Mobile page height 844px in the tested states; landscape 510px, versus baseline 809px. Minimum mobile tile width approximately 45.7px.
- `git diff --check` and module syntax checks pass.

## Remaining limitations and coordination

- WebKit and physical-iPhone gesture/safe-area checks remain open; desktop touch emulation is not a hardware test.
- The existing mixture of raster and vector object art remains. Complete location-specific art for all 21 stages would improve restoration beyond this presentation pass; current vectors represent only earned existing stages and reuse existing art elsewhere.
- Expanded details and the beach location list intentionally scroll; the compact board view does not hide gameplay actions.
- Unavailable future-area preview panels are suppressed on this screen; no access to playable areas was removed.
- Guidance prioritizes immediate delivery, affordable restoration, a matching pair, then the requested producer. It is guidance, not an economy or progression policy.
- Claude should review/cherry-pick the presentation changes only after reviewing this branch. Keep Build 18 engine and save semantics intact; if order/area schemas change later, recheck guidance and stage rendering. No engine coordination is required for this branch to run.
