# Coast UX — Build 19 integration

Integrated Claude's `19d62b33da63b7ad16c0cba567b7de942b07a62a` into `codex/v5-coast-ux`, preserving the previous UX commit `ee12c7f8816dfc0d51f12e58e6f446c38bb2d9e5`. The integration commit has both commits as parents. This supersedes the Build 18 coordination note in COAST_UX_REVIEW.md.

## Conflicts and resolutions

Three files conflicted: `v5/next/app.mjs`, `v5/next/next.css`, and `v5/play.html`. Combined the existing contextual objective, compact orders, matching/drag feedback, restoration receipts and mobile layout with Build 19 tide rendering and stronger tideglass rules. Updated build/cache markers to `19-ux2`.

Claude's `game.mjs` and `areas.mjs` are identical to Build 19. Its economy, tide thresholds (3/6/9/12 beach upgrades), generator progression, level rewards, save loader and save keys are unchanged. V4 and v5/lab have no changes; PR #75 is untouched.

## Presentation adaptations

- Tide-covered cargo/glass show water shading, wave counts and an accessible remaining-upgrades label. Selection explains the actual requirement and links to the beach.
- Locked cargo never appears as a valid matching/drop target. Tap or drag onto it shows the tide explanation without consuming the carried item. Glass selection explains the strength requirement rather than repeating the engine's generic rejection text.
- Tide lock styling applies to cargo/glass only. Older saves can contain usable parts or generators on the outer ring; those remain usable under Claude's rules and are not falsely shown as locked.
- Beach progress explains the next tide threshold. Restoration and story receipts report newly uncovered spaces; this avoids losing the notification behind a modal.
- Help and generator details explain that beach stages supply generator copies, while level chests give parts and energy. Tideglass details include the required result strength and remaining cracks.

## Verification

- `node --test tests/v5-*.test.mjs`: 252 passed, zero failures.
- `node tests/v5-next-browser.cjs`: Chromium 360/390/430 passed (tap merges, production, orders, restoration, reload, cargo, generator drag, level-three unlock, cog and Classic-save preservation). Command exits unsuccessfully when reaching WebKit: its executable is absent. This is an environment coverage blocker, not an observed game regression; the earlier Build 18 run had the same blocker.
- `node tests/v5-coast-ux-browser.cjs`: 360/390/430 and 907×510 passed. Additional cases exercise locked cargo via tap/drag, immutable saves on blocked interaction, tide thresholds at 3/6/9/12, the third-upgrade receipt, legacy outer-ring objects, help, modal return and responsive layout. Threshold fixtures are advanced using the unchanged engine.
- `node tests/v5-coast-ux-capture.cjs`: 12-state playthrough at all four sizes; each delivered an order and restored a location, with zero page errors. Board widths: 344/374/414/415px. Minimum tile width: 45.7px. No horizontal overflow; landscape board ends at y=491 in the 510px viewport.
- Syntax and whitespace checks pass. No runtime dependency added. Chromium 153 is supplied by the existing external QA installation.

## Remaining QA limitations

WebKit/Safari and physical-iPhone touch/safe-area behavior remain unverified. Browser drag coverage uses pointer/mouse events in touch-enabled contexts, not a physical touchscreen. Reduced-motion captures do not verify every animation timing. Existing mixed raster/vector art remains. No changes have been merged into Claude's branch or main; review this separate draft PR before integration.
