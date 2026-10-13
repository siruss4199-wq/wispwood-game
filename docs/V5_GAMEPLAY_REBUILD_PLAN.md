# V5 gameplay rebuild — Phase 1

Baseline: PR #69, `dev/v5-premium-restoration`, `8e69a823f879579405aa5d0dbff55ea8b0af6bdb`.
Isolated branch: `codex/v5-first-session-foundation`. No PR #65–#68 UI imports.

## Five root causes

1. **Competing first action.** A fresh save advertises a READY supply contract for the one tool already needed by the landing. Before learning merging, a newcomer can give that tool away. Introduce the optional strip after the first landing restoration; keep optional trade-offs thereafter.
2. **The objects do not teach their affordances consistently.** Identical objects merge directly, equipment works on devices, but a spanner cannot be dragged onto stone. Use the same held-object → valid-target rule for stone, routes and devices. Highlight only genuinely usable destinations.
3. **Readiness and delivery are conflated.** PR #69 correctly retains the surveyed route tools, but the generic delivery animation still makes them appear consumed. Preparation must highlight the retained tools and reveal route choices, not collect the tools into the mission.
4. **Premature interactive-looking destinations.** Buried devices and routes can look like drop targets before their progression state permits use. Tie every target highlight and drop dispatch to the same pure eligibility function. Preserve the environmental art, rather than labeling every cell.
5. **Consequences are detached from the action.** Stone clearing is selected through a lower button and silently chooses a tool, making cost and reward hard to connect. Direct use consumes the exact held tool; existing collection/reward flights connect tool → obstacle → salvage. Route choices show their existing space-versus-supplies consequences without extra panels.

## Opening loop and state transitions

| State | Player action | Consequence / next reason to play |
|---|---|---|
| Blocked landing | Merge the naturally emphasized offcut pair | A second grip tool makes the main objective ready |
| Landing ready | Deliver two grip tools | Camp scene changes, Survey Kite opens, optional supplies become available |
| Survey camp | Build lens and spanner | Both remain on the board; surveying reveals two viable routes |
| Prepared routes | Use one tool on its route | Ridge buys working space; Conduit buys relic stock and Surge. The other tool stays available |
| Excavation | Merge higher, use a spanner on stone, or commit equipment to a device | Immediate board opening, salvage or cross-family resources; existing chapter progression continues |

The opening pair emphasis is a short contact-ring animation, not an arrow, tutorial sheet or modal. It stops after the first merge and is static under reduced motion. The board remains 6×6 with the same 27 occupied starting cells and all premium assets retained.

## Scope and trade-offs

This pass fixes action coherence, not the entire economy or post-vault loop. No new verbs, currencies, recipes, timers, art, chapters or maintenance states. Contracts become visible after landing but their reducer remains backward-compatible with older saves and integrations. Do not consume both prepared tools. Do not change the route costs or turn the route choice into two mandatory deliveries.

## Verification

- Baseline: 202 automated tests pass; capture Chromium 360/390/430/1440 and existing WebKit mobile checks before implementation.
- Regression checks: exact held-tool consumption, rejected/locked targets leave state untouched, prepared survey has no item-consumption flight, optional tasks unlock after landing, opening pair disappears after merging.
- Full chapter policies: expedition-first, contract-heavy, exploration-first and aggressive merging; retain density, deterministic drops and no-softlock checks.
- Compare real browser screenshots at fresh start, surveyed routes and excavation. Check board prominence, asset integrity and no clipped touch targets.
- Physical iPhone Safari remains a user playtest; Chromium/WebKit emulation is not proof of real-device ergonomics or human comprehension.

Measured results and remaining issues will be appended after browser review. No invented human playtime or retention claims.
