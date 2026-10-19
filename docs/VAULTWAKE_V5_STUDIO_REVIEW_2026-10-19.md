# Vaultwake V5 — Mobile Game Studio Review (2026-10-19)

**Status:** Product review and deterministic QA simulation; NOT a human usability/retention study.  
**Scope:** PR #75 (`codex/v5-coastal-workshop`). V4 untouched. No inventory-space or board-density review by user request.

## Executive gate

**Do not declare the game commercially ready.** A premium coastal identity and working merge reducer exist, but a reason to return tomorrow is not yet demonstrated. CI passing is a technical gate, not engagement proof.

### What is already strong
- Distinctive original coastal art and five collectible Tide Treasure tiers.
- Three functioning producer families (Fieldworks, Wayfinding, Resonance), eight tiers each; **29 discoverable items** including five Tide Treasures.
- Native touch/drag interactions and persistent V5 saves, with Chromium/WebKit mobile regression paths.
- Existing restorative value: Workshop (8 supplies), Supply Pier (12), Loft (20), Deep Survey (18), optional Precision Bench (12).
- Choice mechanics: Ridge/Conduit route, Recover/Restore, kit and receiver choice; rewards can differ by decision.

### Critical gaps

| Discipline | Risk | Grounding | Studio decision |
|---|---|---|---|
| Core loop/readability | **High** | Expedition, camp orders and producer actions compete for main attention; latest iPhone screenshot looks scattered | One primary actionable camp goal post-Vault, order shortcut, clear next unlock; keep optional expedition separate |
| Order motivation | **High** | Procedural Quick/Standard/Expedition Kit differ mostly by item counts, tier and supplies | Associate orders with Neri/Ivo and narrative purpose; next stage needs genuinely varied chain goals |
| Producer value | **High** | Tool Press, Precision Bench and Deep Survey mostly accelerate or bypass existing recipes, with limited new chains | Future upgrade must unlock a new useful *decision*, not just another producer button |
| Pacing | **High** | Historical deterministic policies opened Vault in 14–29 actions; this is NOT human playtime | Run independent fresh-save playtest focused on first reward, restoration reveal, discovery and Vault-to-camp continuation |
| Story | **High** | Before this review, lore was concentrated in the setting, item names and a Vault reveal; no coherent character throughline | Earned Neri/Ivo expedition + camp mystery notes; evolve next into small milestone scenes without forced dialogue |
| Long-term return | **High** | After Crown + Bench, the primary loop is still repeatable orders with no new destination | Content cadence/progression backlog before release; do not simulate retention with automated action counts |
| Economy meaning | Medium | Camp supplies unlock facilities; expedition merit is visible but lacks an obvious spending path in V5 | Audit merit purpose and reward salience; do not invent another currency until loop is proven |
| UX hierarchy | High | Last screenshots showed several visually similar goals, producer buttons and order cards | Astra later: visual polish ONLY after core interaction rules stabilize |
| Reliability | High | Every story/UI change needs old-save, real mobile browser and request delivery checks | Use deterministic three-intent regression plus actual human iPhone review |

## Competitive principles (mechanic study, no copying)

- **Travel Town:** Orders clearly identify item and producer; delivery rewards go toward town/building progression and new producers. See https://support.traveltowngame.com/hc/en-us/articles/4833678076434-What-are-Orders and https://support.traveltowngame.com/hc/en-us/articles/4833664499090-The-Merge-Board
- **Merge Mansion:** Merge-task completion transforms visible places AND advances a character-centered mystery. See https://support.metacoregames.com/hc/en/merge-mansion/articles/welcome-to-merge-mansion-76
- **Gossip Harbor:** Food orders, restaurant restoration, named relationships and recurring story questions feed one another. See https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor

Do not copy any intellectual property. These are loop-design references, not asset/UI templates.

## Narrative diagnosis and story spine

**Promising premise:** a tidal coast that disagrees with the charts; a buried Vault containing a star ocean; lost survey instruments; a vanished fleet.

**Before:** The user opens a Vault and sees beautiful sky art, but no meaningful consequence or named person who needs the truth. Neri and Ivo were generic contract senders.

**Now (small incremental implementation):**
1. **Neri, navigator:** the tide is wrong, and an erased coast appears in old charts.
2. **Ivo, quartermaster:** survey equipment was abandoned and sealed in a hurry.
3. **Early Tide Dial:** clue to the erased coast, earned by orders.
4. **Vault reveal:** the stars are a map of a coast that has not appeared yet.
5. **Workshop → Pier → Loft → Deep Survey:** physical restoration lets the crew decode the clue.
6. **Pearl Astrolabe → Sextant → Ocean Crown:** a missing fleet, a lighthouse without a shore, and an unanswered recall signal.

Implemented as progress-derived notes in the existing field journal plus select milestone copy. **No forced cutscenes, new currencies, save flags or artwork.** This is an opening narrative spine, not a complete drama with character growth and player choice consequences.

## Deterministic QA simulations

New file: `tests/v5-studio-simulation.test.mjs`. The simulations execute the same reducer actions as the game; no human playtime or retention conclusions can follow from them.

- **Story-first:** prioritizes expedition route, restores the main Vault milestone; verifies an actionable camp goal after opening.
- **Exploration-first:** takes a different route/receiver and optional exploration before the Vault; verifies progression and the revealed mystery.
- **Request-first:** uses genuine producer/merge/order deliveries to earn two Tide Dial fragments and merge a Reef Compass before Vault opening.
- **Returning after Vault:** loads an advanced state with treasure collection complete but Precision Bench unfinished; verifies real order recommendation and continued optional expedition goal.

Expected automated observations are action count, merges, producer pulls, delivered orders, discoveries, continuation goal and reload integrity. These are **path feasibility** indicators, not proxies for delight.

## Progression product rules

1. One *primary* next goal at a time; optional Vault-engine or exploration goals remain accessible.
2. When camp supplies are insufficient, show a relevant **real, active order** and its reward; delivering a ready order should actually complete it.
3. Explain **what a construction unlocks** before asking to grind orders for supplies.
4. After the Vault, unfinished Workshop/Pier/Loft/Deep Survey/Precision Bench outrank unrelated high-tier collection requests.
5. After all built-in milestones, offer honest repeatable orders; do **not** invent an ending or a fake new chapter.
6. Keep all save fields, existing art, V4 and the 6×6 board unchanged.

## Next genuine development gates

**Gate A (now):** Full CI green, no stale old assertions, no actual iPhone blocker. Review exact Vault-open legacy 6/8 and advanced 5/12 Bench.  
**Gate B (TT-1H2):** Design 6–9 repeatable orders with *distinct production intent*: quick completion, mid-tier merge goal, collectible quest; test real cost and dead-end protection. No order engine rewrite.  
**Gate C (TT-1H3 + Astra art):** One real new producer evolution/secondary chain providing choices unavailable in the current game. Decide mechanics before generating artwork.  
**Gate D (story):** At least three earned short character-driven chapter beats, first setback/reversal, a reveal with visible consequence and a next mystery; no exposition dump.  
**Gate E (human test):** New mobile players must independently understand what to do, why the reward matters and what happens next. Observe first order, first restoration, first real discovery, optional/primary confusion, and whether the player voluntarily continues. Ask them to return after a day; measure actual return behavior, not automated policy actions.

### Release decision

No CrazyGames/Poki submission on the strength of successful automated tests alone. Require stable touch behavior, understandable first-play, differentiated content and observed player desire to continue. This document sets *tests to run*, not claims they have passed.

### Exclusions

Do not spend development budget reworking board empty-cell counts, inventing daily timers, building a second hub, duplicating producer screens, adding more currencies, or copying another title's specific art.
