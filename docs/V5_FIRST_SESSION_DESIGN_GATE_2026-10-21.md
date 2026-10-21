# VAULTWAKE V5 — FIRST-SESSION GAME DESIGN GATE
**Status:** DESIGN ONLY · Not approved for gameplay implementation
**Date:** 2026-10-21
**Target:** Existing draft PR #75 on `codex/v5-coastal-workshop`
**Audience:** Game director, designer, economy designer, engineer, artist, QA, playtesters

> **Шийдвэр:** V5 болон тусдаа Coastal Lab-ийг дахин шууд patch хийхгүй. Эхлээд 10–15 минутын эхний тоглолтын утгатай gameplay, producer, order, reward, story, pacing-ийг нэг цогц загвараар туршиж батална. Хуучин код, artwork, V4 болон save-ийг хадгална.

## 0. What the user demonstrated (evidence, not assumptions)
- Repeated real iPhone screenshots: crowded competing goals/buttons; mystery reached before all three producer chains developed; abrupt "Chapter 1 complete"; a separate Coastal Lab rapidly reached "Someone answered" with **31/36 empty cells** and no continuation.
- Technical green checks did **not** demonstrate an engaging, understandable session.
- V5 already contains complex systems (three source families, optional repeatable Quick/Standard/Long orders, kits, seals, workshop, pier, loft, treasure recovery, story reveals); adding more mechanisms without a single playable reason makes it harder to understand.
- Current Lab `v5/lab/` is a **rejected experimental comparison**, never to be merged into V5 as the target design. Preserve its files for traceability; stop developing it.
- Initial problem is NOT that the player must do more taps. Previous Tier 3/4 gates merely turned the brief session into grinding.

## 1. Research-derived principles, not a copy
Official references:
- Travel Town: https://support.traveltowngame.com/hc/en-us/articles/4833664499090-The-Merge-Board — producers create items, merge chains feed orders, orders fund town buildings/upgrades.
- Travel Town: https://support.traveltowngame.com/hc/en-us/articles/4833678076434-What-are-Orders — requests display the target, producer and reward; players progress from one early order to several.
- Travel Town producer simplification: https://support.traveltowngame.com/hc/en-us/articles/18254985564434-What-Changes-have-been-made-to-my-Producers-and-Board — fewer competing chains and fewer unusually expensive orders can improve clarity.
- Merge Mansion: https://support.metacoregames.com/hc/en/merge-mansion/articles/welcome-to-merge-mansion-76 — merge-task completion renovates tangible places and moves a mystery forward.
- Gossip Harbor: https://play.google.com/store/apps/details?id=com.mergegames.gossipharbor — food orders, restaurant transformation and personal mystery form one loop.
These support *mechanic principles*. No evidence here quantifies the competitors' first-session duration, engagement, or economy. No copied assets, character/story, UI layout or recipes.

## 2. Single product proposition
**Fantasy:** Recover a storm-ravaged coastal expedition, restoring physical equipment to find the vanished fleet.

**Player question:** "If I merge this, what changes on the coast, and what clue will I get?"

**Main loop:** choose an intelligible order / restoration need → make a requested item from a relevant producer → merge → deliver/use that specific item → immediately see the pier, chart station or beacon change → receive a playable capability or clue → choose the next useful action. No branch ends in a generic "complete" screen in this 15-minute slice.

**Pillars:** 
1. Every core item has a **visible destination** in a world task, commission or playable discovery; not meaningless tier climbing.
2. One **primary** goal at once. Optional orders coexist but cannot compete at the same visual priority.
3. The coastline is the reward display; big accomplishments actually **alter the scene** and open gameplay, not just a badge.
4. Player choices trade real capabilities, not two different names for identical prizes.
5. End the first slice with **new playable opportunity**, not a false chapter finale.

## 3. Board and tactile feel — design constraints
- Retain 6×6 (36) cells. Proposed fresh-save seed: **25 occupied / 11 free** (working design target, not implemented); count by type: 3 producer fixtures (one active, two dormant), 11 ordinary items with at least one obvious legal pair, 5 peelable covered cells, 3 recognizable worksite blockers, 2 distinct earned reward containers, 1 story clue = **25**.
- No item must be mistaken for a button, card, sticker or generic cache. Covered ground vs object vs producer must be visually distinct. Unlock dormant sources as part of a restoration. Do **not** expose three active machines with several recipes at time zero.
- Starter items must enable 2–3 meaningful merges without a production tap. Show only the intended pair with a subtle highlight for the first merge; remove the highlight after the action.
- At 390px: assets remain readable at typical board scale; the entire first actionable goal and board entry point remain discoverable without scrolling through a wall of text. Avoid forced full-screen tutorial or labels on every item.
- After the opening: target a board with enough real decisions to be interesting while leaving room for production. Working heuristic: **roughly 18–27 occupied**, not a hard cap or goal for every moment. If board has no legal merge and no free cell, the player must have a *free*, clear cleanup/rescue path; no spend-gated dead end.
- Every producer tap must create recognizable item(s) and immediate feedback. Drag/tap merge both supported. The player can clearly see which level combined and where the resulting item landed.
- No more general "service/refill/bench/press" controls in one selected producer panel. Maximum one primary action plus one contextual secondary action. Complex recipes accessible only when relevant.

## 4. Distinct, purposeful producers
**Rivet Rover — FIELDWORKS:** physical repair. Makes tools for the damaged pier and equipment needed to open working space. First unlocked source. Source pull has a largely consistent material chain; higher items permit satisfying visible renovations. No forced Tier 4 simply to check a box.

**Survey Kite — WAYFINDING:** chart making and opening a new reachable area. Unlocked **because** the pier repair made it possible to launch. Its products lead to a chart restoration, reveal a clue and open two possible route discoveries. Not an interchangeable reskinned Rover.

**Echo Crucible — RESONANCE:** signal/ancient tech interpretation. Unlocked after uncovering the hidden channel; the player turns a quiet beacon into a working instrument and receives an actual mystery beat. One production distinction, for example rare signal fragments on predictable milestones, but no random impossible demands.

**Cross-family meaningful trade-off:** A pier repair can consume an ordinary tool *or* use a rare discovery to give a stronger follow-up reward, with clear preview before commitment. The player should see what is spent vs kept. Neither choice may block finishing the opening story. Choose *one* small, testable decision for initial implementation; avoid introducing multiple additional systems at once.

**Guardrails:** No automatic rewards count as having climbed a producer's full merge chain. Do not require all families to climb an arbitrary tier; require them to accomplish differentiated tasks. No passive producer spam as a substitute for orders.

## 5. Orders: why they exist
The first order should teach the ordinary gameplay loop. Later orders provide a **choice of effort vs world progress** and a way to use spare items.

- **Opening:** one live order, named person, one low-tier target, known producer, reward explicitly contributes to the pier. No deliver-ready item that is also the protected opening tool.
- **After first repair:** two orders max visible, one clearly linked to current restoration and one optional short commission; third lane not shown until the player already understands deliveries.
- **Ready state:** one tap deliver with immediate reward flight to the *specific* damaged site, clear before/after. Existing reserved gear is never silently consumed.
- **Longer orders:** should offer visibly stronger, distinct consequence or useful container; never just slightly more generic supplies. Exact economy is to be calibrated using actual action costs.
- **No early demands:** tier higher than player can produce, rare unearned treasure, producer not unlocked, and repeated orders competing for the exact unique quest item. Already accepted live orders never reroll.
- Prefer **bounded selection + available stock** over repetitive deterministic same-item spam or opaque random generation.

Example concept commissions (names and balances provisional):
1. Ivo repairs gangway: 1 × Grip Tool → restoration progress visibly moves, unlocks a pier animation.
2. Neri needs shoreline sketch: 1 × Route Fold → chart table transforms and reveals a missing channel.
3. Ivo's beacon clamp: 1 × Pocket Winch + 1 × low Resonance part → powers beacon and yields a clue.
These are **concept examples**, not commands to add currencies or immediately change the existing recipes.

## 6. First-session storyboard (time windows = desired human playtest pacing, NEVER timers)
| Approx. time | Player experience | Why keep playing | Checkpoint |
|---|---|---|---|
| 0:00–1:30 | Immediate natural merge, one clear use, first small delivery | "I made something useful" | Player finds first action unaided |
| 1:30–4:00 | Repair one **visible pier component** in 2–3 small steps; earned container or satisfying item upgrade | "My work physically changed the coast" | A visible before/after and a new interaction |
| 4:00–6:30 | Survey Kite unlocked; first distinct chart-making pattern, a short contextual order | "I have a new tool for a new purpose" | Player can explain what changed |
| 6:30–9:30 | Reveal submerged route / mark chart table. Small original character beat for Neri and Ivo | "There is a mystery worth pursuing" | Scene and player capabilities change |
| 9:30–12:00 | Echo Crucible signal task or one meaningful route trade-off | "My choice matters" | Predictable, different consequences, both viable |
| 12:00–15:00 | Beacon clue reveal and a **new reachable next order/area** rather than completed chapter | "I want to see what is beyond the signal" | Player can continue immediately |

These are hypotheses, not demonstrated timelines. If the first human playthrough ends in 4 minutes, fix the **variety and consequences** first, not the tier requirement. If it takes 25 minutes because of repetitive merges, remove grind, not reward.

## 7. Economy: specify before engineering, validate with logs
Keep existing energy + existing repair supply unit. **Do not add a third currency.** Draft initial tuning envelope, subject to scripted cost proof and human playtest:
- Opening should have enough free taps / prepared merges for a first reward without waiting. Player never meets an energy wall before the first visible renovation.
- At least one rewarding non-energy interaction (merge, reveal, restoration, meaningful decision) must remain available after several producer taps.
- Small order should take **a few** reachable merges. Longer orders cost more effort but visibly advance a world goal, not a tier treadmill.
- Protect story-critical unique items; never require a single item simultaneously for a mandatory restoration and a trade unless a player can reasonably make a spare.
- Produce a spreadsheet/table from actual reducer instrumentation **before** setting hard reward amounts: for each task, producer taps, number of merges, resources consumed, board occupancy trajectory, energy deficit, expected useful reward and available alternative.
- Loot containers must be earned through a concrete milestone and have distinct purpose. No generic `Open cache` with no narrative payoff or unexplained new collectible.
- No artificial session-length cap, timer, energy-starvation gate, forced claim popup every 20 seconds, or mandatory premium mechanics.

## 8. Visual information hierarchy — single screen
1. **World scene**: the coastal worksite with one visible changeable restoration target and credible mystery. No row of equal-weight `FLEET SIGNAL / BENCH / PIER / DEEP SURVEY` buttons.
2. **Main request**: one sentence, required item image(s), simple progress and a primary action. The item should be tappable to locate matching parts or its producer.
3. **Board**: biggest interaction region, easy 390px touch and item distinction. Newly selected item shows only useful primary action and one optional context action.
4. **Optional orders / inventory / journal**: compact and accessible but visually secondary, never hiding the immediate task.
5. **Reward moment**: item flies toward the actual worksite, before/after environment state persists, one brief character response, then the next game action appears.

No new helper dashboard, floating game-controller menu, mission spreadsheet, excessive micro-labels, or fake unimplemented chapter entrances.

## 9. Story spine
Ivo needs to rebuild the landing, Neri has found a map that contradicts the coast, and a third party may be answering the old fleet signal. Repair lets the player reach chart evidence; chart evidence leads to the silent beacon; the beacon reveals a living signal. **Each plot beat is earned through a specific player action.** A choice changes which useful location/resource they can access first. The first slice stops on a question + a **playable** next objective. Do not show Chapter 1 Complete until the full chapter exists.

## 10. Testable design acceptance — no more "CI passed = good game"
**Design gates (must pass before merging into main V5):**
- 5 unprompted first-time human phone players. At least **4/5 identify first action within 10 seconds** without prompting.
- At least **4/5 can say why they are merging**, and **4/5 notice the first visible world change** without needing the designer to point it out.
- At least **3/5 independently want to continue** after the first big reveal. Record what they voluntarily tap next, not a leading satisfaction question.
- At least **4/5 identify the purpose of the second producer**; each player understands the immediate next order after the first restoration.
- **Zero progression deadlocks** across real and scripted fresh/play/reload actions; no fully completed main chapter in an under-5-minute test without meaningful player agency.
- Instrument board occupancy at start / after each milestone / before every attempted source tap; impossible/blocked actions, hint taps, order claim timing, use of each producer and player-initiated exits. Track actual user elapsed time separately from game actions and idle time.
- 360/390/430px Chromium + WebKit tests for: whole first playable sequence, meaningful route consequences, save compatibility, tap and drag, input hitboxes, responsive content, first reward animation, no false ending.
- Existing V4 + V5 saves must remain intact. Save migration must be additive; preserve original/replay slots.

**Kill criteria:** No new art/theme overhaul until player comprehension and first reward are solved. If 3/5 or more first-time testers cannot explain the objective, revisit the core loop; do not patch a tooltip. If a route generates the same outcome, remove the fake choice. If an extra producer has no distinct task, simplify the system.

## 11. Implementation sequence — do not start until design is explicitly approved
- **Gate A: economic model + executable paper prototype.** Create a small reducer-only experiment representing 2–3 real orders and one pier transformation. Validate balance and no softlock. No new UI/art. Design signoff.
- **Gate B: playable first 4 minutes.** Improve actual board, producer interaction, order delivery and a dramatic visible pier repair. One strong slice with 360/390/430 browser captures, not a full chapter demo. Human playtest before proceeding.
- **Gate C: second producer + story.** Chart table change, mystery clue and actionable next destination. Retest human comprehension.
- **Gate D: third producer + a *real* choice.** 2 routes and different capabilities, first signal reward, immediate next objective (not ending). Five-person test and full cross-device regression.
- **Gate E:** Only after the above is fun: animation quality, original sound and premium polish, then content expansion.

**Repository guardrails:** Stay on `codex/v5-coastal-workshop`, PR #75 OPEN+DRAFT; no V4 edits; no unapproved replacement of the production V5; preserve every existing save and the rejected Lab for comparison; no new branch/PR unless user explicitly changes this requirement. Do not assert any implementation or player enjoyment from this document.

## 12. Explicit questions for user approval before coding
1. Approve **orders funding visible coastline restoration** as the single main loop?
2. Approve **first 4-minute slice only**, not another complete Chapter 1 rebuild?
3. Approve preserving all three producer identities but unlocking them **one at a time** for different purposes?

**Recommendation:** yes to all three. The next requested engineering work should be Gate A/B only, with an actual playable first reward and a first human acceptance test; not a new chapter, hard-tier gate, extra UI panel or another one-off Lab.
