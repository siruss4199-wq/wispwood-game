# Merge-game benchmark research for Vaultwake V5 (2026-10-21)

## Method and honesty notes
- **WebFetch could not resolve any host from this environment** (DNS `ENOTFOUND` for support.traveltowngame.com, deconstructoroffun.com, naavik.co, en.wikipedia.org). All findings below come from **WebSearch result summaries** of the cited pages, not from reading the full pages myself.
- Labels:
  - **VERIFIED\*** — the cited source states it, per the search-engine summary/snippet of that page (not read in full by me).
  - **OBSERVED** — from a playthrough/video I actually watched or read in detail. **None in this pass**: no gameplay footage was accessible.
  - **HYPOTHESIS** — my own design inference.
- No metrics are invented. The few numbers quoted are attributed to their (often secondary, sometimes dated) source and should not drive Vaultwake balance.

## 1. Core loop (all three benchmarks)
- VERIFIED\* Travel Town official help: producers, earned items, orders and inventory all sit on the main merge board; merging two items yields the next item in the same series; fulfilling orders earns items and Coins. — Travel Town "The Merge Board" [S1]
- VERIFIED\* Travel Town: each producer tap costs energy; coins from orders buy buildings/upgrades; a third-party guide says repairing buildings is what raises player level and opens new producer chains. [S1][S9]
- VERIFIED\* Naavik (Sept 2024): Travel Town is a "lean casual puzzler" — "much more about the core gameplay than deep meta systems"; its building meta has no customisation and exists mainly to unlock new item generators. [S5]
- VERIFIED\* Deconstructor of Fun (Just Dessert vs Gossip Harbor): the core loop is a board of producers + orders giving clear goals; each tap consumes Energy, the resource powering the loop. Orders are broken into smaller merge steps so the goal feels close ("one more merge"). [S3]
- VERIFIED\* Gossip Harbor review (orcz): story progress costs coins, coins come from orders, orders need merged items — the narrative is tied directly to the merge economy; energy, board space and cooldowns pace it. [S7]
- VERIFIED\* Merge Mansion: players complete merge tasks to unlock/renovate garden and mansion spaces; progression "is all about completing tasks"; Maddie must clean and repair or the mansion will be condemned/demolished; Grandma's secret past drives the mystery. [S10][S11]

## 2. First session / onboarding
- VERIFIED\* DoF Gossip Harbor case study: the early game is generous with energy and provides easy orders; players can reach player level 10 within two sessions; first monetisation offer ~10 minutes in. [S4]
- VERIFIED\* Udonis (Merge Mansion): the story serves as a hook before the tutorial teaches merging. [S12]
- VERIFIED\* General FTUE guidance (Playio, July 2026): aim for core gameplay within ~60 s and an "aha moment" within ~90 s; measure per-step drop-off. Udonis: split onboarding into small steps with visible progress. [S13][S14] (Generic, not merge-specific.)
- HYPOTHESIS: In merge-2, the first-session hook is a pre-seeded board with an obvious pair, a single order using that pair's output, and an immediate visible world change — the "aha" is "my merge fixed something."

## 3. Producers / generators
- VERIFIED\* Travel Town official: producer chains were **streamlined** so "merging feels cleaner and easier"; some secondary producers now follow a single merge line; high-energy items were removed; active orders using removed items were swapped for equivalents at a similar stage (progress preserved). [S2]
- VERIFIED\* (third-party guides) Travel Town distinguishes active producers (cost energy per tap) from auto-producers (spawn over time, no energy). [S6]
- VERIFIED\* LevelWinner (Merge Mansion): a Toolbox produces a tool per tap for 1 energy, can drop more than one item type (e.g. gardening tools and gloves), and capacity depends on its level; energy bar caps at 100 when regenerating. [S15]
- VERIFIED\* DoF Gossip Harbor: later generators have strict caps (e.g. four items then long cooldown) and become persistent long-term goals; long-term quest items can occupy significant board space. [S4]
- VERIFIED\* Gossip Harbor fan wiki: energy max 100, +1 per 2 minutes; boost generators skip item levels at higher energy cost. [S16]

## 4. Orders
- VERIFIED\* Travel Town official: orders sit on the merge board, are fulfilled with merged items and pay coins/items. [S1]
- VERIFIED\* DoF: orders are decomposed into smaller merge steps so completion feels near. [S3]
- VERIFIED\* (Medium genre history) Merge Mansion's merge orders are directly connected to the meta task, so every player gets the same order; downside: players stall on big meta tasks that gate story. Voodoo's Plantopia made the orders board personal (customers asking for items) — called its riskiest change. [S17]
- VERIFIED\* (player reviews via Naavik summary) Travel Town late orders can take "a ton of energy" while energy caps at 100 — a known pain point. [S5]
- VERIFIED\* Guides: stop merging at the tier an order needs; generate only for visible orders; a full board halts production even with energy left. [S18]

## 5. Rewards, renovation, story
- VERIFIED\* GameRefinery: Gossip Harbor is a standout for integrating story into merge, contrasted with titles where story is secondary. [S8]
- VERIFIED\* DoF: the board supplies the actions, the story gives those actions meaning. [S3]
- VERIFIED\* Love & Pies store listing: merge treats to serve customers, renovate rooms/garden, discover secrets, plot twists and clues to solve a mystery. [S19]
- VERIFIED\* Naavik/Gossip Harbor: renovation choices (players choose what upgrades look like). [S7]

## 6. Retention / negatives worth avoiding
- VERIFIED\* AppMagic: Merge Mansion's revenue plateaued in 2023; repetitive events and lack of fresh content cited as possible churn causes. [S17]
- VERIFIED\* Player review summary: Merge Mansion criticised for no undo on accidental merges and repetitive, tedious event tasks. [S12]
- VERIFIED\* Energy is the primary monetisation lever across the genre (DoF, guides). Ad-for-energy (Travel Town help center, 4 ads/day per a secondary source). [S3][S20]
- Only retention numbers found were secondary/dated (Sensor Tower 2020 via Medium: MM D1 69%, D60 22%; Love & Pies developer statement: D30 > 20% in testing). **Not used for Vaultwake decisions.**

## 7. Principles for Vaultwake V5 (6×6, three producers, coastal restoration, fleet mystery)
Adopt:
1. **One board, one loop**: producer → merge → order/restoration → visible coast change → next goal. Every system must sit on this loop (S1, S3, S5). Cut or hide anything that doesn't.
2. **Lean chains over many chains** (Travel Town streamlining, S2): each producer has one legible chain; avoid "two names for the same item" and side recipes until the core is understood.
3. **Orders decomposed into near steps** (S3): the next order should be 1–3 merges from what is on the board; show a "1 merge away" state.
4. **Generous opening** (S4, S13): no energy wall in the first session; first merge with zero producer taps; first reward inside ~90 s (HYPOTHESIS target).
5. **Meta exists to unlock producers** (S5, S9): restorations should unlock/upgrade producers or open board space — capability rewards, not badges.
6. **Story spends progress** (S7, S8): each restoration step pays out a short character/clue beat; the mystery advances only through player actions.
7. **Personal orders** (S17): orders come from named characters (Ivo, Neri) with a one-line reason tied to the coast.
8. **Stop at the needed tier** (S18): orders and goals should rarely require tiers above what the current goal needs; no arbitrary tier climbing.
9. **Board-space is a first-class resource** (S4, S18): keep occupancy in a playable band; always a free cleanup path when full.
10. **Order swaps preserve progress** (S2): when changing content, migrate live orders to equivalents rather than resetting.
11. **Restoration as reward display** (S10, S19): big wins visibly change the scene and persist.
12. **Personal choice in renovation** (S7): a small, real choice with different consequences, not cosmetic-only.
Avoid:
13. Energy walls / late orders that exceed the energy cap (S5 player pain).
14. Stalling on huge meta tasks that gate story (S17).
15. Long-cooldown capped generators and persistent board-clogging quest items in the first session (S4).
16. Pay gates, ad-gated energy, premium currencies — out of scope and contrary to the design gate.
17. Repetitive filler orders that ask for the same item over and over (S17, S12).

## Sources
- [S1] Travel Town Help — The Merge Board: https://support.traveltowngame.com/hc/en-us/articles/4833664499090-The-Merge-Board
- [S2] Travel Town Help — What Changes have been made to my Producers and Board?: https://support.traveltowngame.com/hc/en-us/articles/18254985564434-What-Changes-have-been-made-to-my-Producers-and-Board
- [S3] Deconstructor of Fun — Just Dessert vs. Gossip Harbor: https://www.deconstructoroffun.com/blog/just-dessert-vs-gossip-harbor-who-merged-it-better
- [S4] Deconstructor of Fun — Finding Genre Success: the Case of Gossip Harbor: https://www.deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor
- [S5] Naavik — Why Travel Town Dominates Mobile Merge: https://naavik.co/digest/why-travel-town-is-dominating-mobile-merge/
- [S6] allloot — Travel Town Auto Producers: https://allloot.com/travel-town-auto-producers/
- [S7] orcz — Gossip Harbor Review: https://orcz.com/gossip-harbor-review-a-cozy-cafe-mystery-with-a-cash-register-behind-the-counter/ ; Naavik — Gossip Harbor's meteoric rise: https://naavik.co/digest/gossip-harbors-meteoric-rise-in-merge/
- [S8] GameRefinery — Game-Changing Storytelling: https://www.gamerefinery.com/game-changing-storytelling-how-to-integrate-narrative-elements-in-mobile-games/
- [S9] thegamereward — Travel Town Guide: https://thegamereward.com/travel-town/
- [S10] Merge Mansion App Store: https://apps.apple.com/us/app/merge-mansion-puzzles-story/id1484442152
- [S11] Merge Mansion Wiki — Story Lore: https://merge-mansion.fandom.com/wiki/Story_Lore
- [S12] Udonis — Merge Mansion analysis: https://blog.udonis.co/mobile-marketing/mobile-games/merge-mansion-advertising-analysis
- [S13] Playio — Onboarding Decides Your D1: https://blog.playio.co/mobile-game-onboarding-retention
- [S14] Udonis — FTUE in Mobile Games: https://www.blog.udonis.co/mobile-marketing/mobile-games/first-time-user-experience
- [S15] LevelWinner — Merge Mansion Beginner's Guide: https://www.levelwinner.com/merge-mansion-beginners-guide-tips-tricks-strategies/
- [S16] Gossip Harbor Wiki — Energy: https://gossip-harbor.fandom.com/wiki/Energy
- [S17] Medium — A (Not So) Brief History of The Merge Genre: https://pratama-naufal.medium.com/a-not-so-brief-history-of-the-merge-genre-b28136f33d22 ; AppMagic — Merge Mansion: https://appmagic.rocks/blog/merge-mansion-reclaiming-top-spot
- [S18] TopUpLive — Gossip Harbor beginner guide: https://www.topuplive.com/news/gossip-harbor-beginner-guide.html
- [S19] Love & Pies App Store: https://apps.apple.com/us/app/-/id1563239332
- [S20] Travel Town Google Play: https://play.google.com/store/apps/details?id=io.randomco.travel&hl=en_US
