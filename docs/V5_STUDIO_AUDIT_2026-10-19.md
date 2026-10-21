# VAULTWAKE V5 — Studio Product Audit & Next Playable Slice
Date: 2026-10-19
Branch: codex/v5-coastal-workshop · PR #75 (draft, do not merge)
Baseline reviewed: e757a6fadd242cc91c2795277d28032f1b34b1ab

## Scope and evidence
Code-inspection audit of v5/core.mjs, requests.mjs, camp-goals.mjs, story.mjs, treasures.mjs and tests/v5-studio-simulation.test.mjs. This is not a human retention study or a physical iPhone usability test. CI was passing at the reviewed baseline. No V4 modifications, save resets, new branch or PR, board-density changes, or inventory-capacity changes.

## Studio verdict
The game has functional merge and multi-system progression, but the player motivation layer is thinner than the implementation layer. Shipping more object tiers without upgrading the reason to make them will repeat the earlier “three merges and done / dashboard instead of a game” problem. Prioritize one playable **story-to-restoration payoff** rather than a new economy, map, producer or unrelated mini-game.

## Comparison
- Travel Town: orders are immediately legible above the board and visibly fund town expansion. V5 now has above-board one-tap orders, Workshop, Pier, Loft and supplies; ensure the renovation payoff is made visible to a player rather than only stored in flags.
- Merge Mansion: repair tasks change a place while a central unresolved mystery pulls the player forward. V5 has the changing coast and a missing fleet, but storySnapshot currently reports progress in short static exposition; the player rarely experiences a concrete scene-level reveal.
- Gossip Harbor: orders fund visible renovation and story beats. V5 currently allows repeat orders to become the dominant destination after the Tide collection, without a distinct emotional completion or next chapter tease.
References: Travel Town official support 'What are Orders?' and 'The Merge Board'; Merge Mansion official welcome guide; Gossip Harbor order/story references. Competitor details must not be copied literally.

## Findings by severity
P0 — Verify player comprehension on a real iPhone: can first-time players identify the current order, the producer, required item and benefit within 10 seconds without explanation? Automated 390px tests do not establish this.
P0 — Story/reward disconnect: storySnapshot(s) holds two separate exposition beats, but obtaining Reef Compass, Pearl Astrolabe, Sextant and Ocean Crown does not yet create a staged interactive scene payoff. The final campGoal falls back to repeat orders. A mystery needs concrete reveals and closure.
P1 — Request variety is deterministic and shallow. Three lanes differ in tier, quantities, energy and supplies, but have little differentiated player-facing purpose. Randomness is not the fix; requests should signal what part of the site they restore.
P1 — Progression legibility: late-game mechanics (Workshop, Precision Bench, Pier, Loft, Deep Survey, ordinary vs Tide Wayfinding, engine infusions) create many nouns. Use a single clearly expressed immediate objective, then contextual explanation on selection.
P1 — Progression pacing: the studio policy simulation validates reachability for scripted strategies; it cannot substantiate session duration, tension, delight, replay rate or difficulty. Gather player telemetry instead of interpreting action counts as enjoyment.
P2 — Presentation review: validate actual object legibility and tap targets on 360/390/430px iOS, especially the distinction between Tide treasure and ordinary chart items. Do not increase board dimensions or inventory.
P2 — Long-term retention: there is no demonstrated post-Ocean Crown content cadence. Avoid adding a fake endless mission; use a truthful chapter-end tease until follow-on content exists.

## Next implementation: TT-1H — The Missing Fleet Reveal (one finished slice)
**Goal:** One tangible reward-and-story payoff earned by normal merge play, integrated into existing camp. Do not start Chapter 2.

1. Use existing Ocean Crown discovery as the trigger for a one-time **Fleet Signal Reveal** in the existing coastal scene. A very short Neri/Ivo exchange resolves what the Crown is and exposes one new question. No unrelated currency, new producer, or modal before the player can act.
2. Display the discovered Crown in the existing Loft environment as an earned, permanent visual change, not just a progress label. Include a visible but dismissible reveal control; preserve 44px mobile touch targets.
3. The reveal must be recoverable after reload if unviewed and not replay compulsorily if seen. Add one additive save flag only if necessary; old save with Crown already discovered must be able to view the reveal without receiving extra currency/items.
4. The post-Crown goal must accurately signal **Chapter 1 complete — continue camp orders / optional expedition discoveries**, never claim an unimplemented region can be explored.
5. Keep Deep Survey recipe/costs, all earned treasure tiers, early two fragments, workshop restoration, Pier cases, order reservations and old saves unchanged.

## Acceptance tests
- Fresh save can earn its first two Tide Fragments, first Compass, Workshop, Pier, Loft, Pearl, Deep Survey, Sextant and Crown through actual rules; no seeded cash or hidden shortcuts in the player path.
- New reveal fires once for a fresh Crown discovery; reload before opening retains it; reload after viewing does not auto-replay.
- Older save already containing Crown remains compatible; previously delivered orders, supplies, seal history and objects unchanged.
- Distinguish story / camp orders / optional vault objective on a real 390px viewport and show where the next tap is.
- Run focused rule tests, all V5 tests, legacy/V4 CI, mobile Chromium and WebKit; inspect failure logs rather than weakening tests. Report CI link, commit SHA, preview and actual screenshots.
- Preserve V4 and draft PR #75; no board empty-space/density or inventory-capacity work.

## Follow-on roadmap — only after TT-1H acceptance
A. Instrument anonymized first-session funnel: first merge, first fulfilled order, first camp restore, first Compass, first Loft recovery, Vault, Crown; exits and confusion points. Report observed events, not fabricated retention.
B. Redesign request motives and tradeoffs within the existing lanes so 2–3 consecutive orders produce distinct visible repair progress instead of pure supplies grinding.
C. Conduct 5-player unprompted phone tests and capture the next-action and fun/confusion observations; prioritize fixes by frequency.
D. Scope Chapter 2 only after ending and return-player demand are proven.

## Out of scope / guardrails
Never overwrite V4, delete saves, merge #75, spin up another branch/PR, inflate board space, add arbitrary timers/monetization, claim unmeasured fun or clone competitor assets.
