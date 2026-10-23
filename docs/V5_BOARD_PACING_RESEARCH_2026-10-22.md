# Coast Camp — board pacing and generator sources: research and build 19 (2026-10-22)

**Asked by the user:** "Tuuhees bish boardnaas generatoraa olchihloo, board bas hurdan l
tseverlegdeed baina. Chi minii ugsun medeelel bolon busad eh survalj internetees sudlaad
hugjuuldehdee." (The generator came from the board, not the story; the board still clears
fast; research the information I gave and other sources, and develop it.)

## What the sources say (community guides and design write-ups, not official design docs)
- **Free board space is the scarcest resource.** A Makeover Merge analysis: players soon see
  free space as the most valuable thing, and locked items give them a reason to clear it
  (4Enjoy). Guides call a full board ("board lock") the most common way new players stall
  (Freejoy; a Gossip Harbor guide).
- **Board space opens with progression.** Travel Town players report squares opening as they
  level up, with faded items freed by merging their twin (AppGamer Q&A). Merge Mansion frees
  cobwebbed items by merging a free twin onto them, and opens crates by merging next to them;
  one guide says boxes uncover when a *higher-level* item is made beside them (Merge Mansion
  wiki, Metacore support, LevelWinner).
- **Generators arrive with progress.** Gossip Harbor starts with few generators and adds more
  as you progress, which opens new order types (Deconstructor of Fun, SocialPeta).
- **Story and orders are tied.** Merge Mansion links orders to story tasks; the risk is
  players stuck on a big task (Ludocious, Deconstructor of Fun on Merge Garden).
- The user's reference board (screenshot): a small open area with a generator, half-buried
  items next to it, and numbered sand cells further out that open with progress.

## What was wrong here
- Level chests at odd levels (5, 7, …) still put a generator copy on the board, so
  generators came from the board as well as the beach.
- The whole outer ring could be opened as soon as its neighbours were open, and any merge
  beside tideglass chipped it, so a busy camp cleared its surroundings quickly.

## Build 19 (our own take, not a copy)
- **Generators only from the beach.** Level chests now give a driftwood crate and energy,
  never a generator. Copies come from beach stages; level 3 brings out the next kind.
- **The tide** covers the board's outer ring (24 cells). Each side comes free as the beach
  is upgraded: left after 3 upgrades, bottom 6, right 9, top 12. Cells under the tide show
  a wave and how many more upgrades they need; their crates show no key and their glass
  cannot crack. The board's space grows with the story instead of with the player level
  (the reference game's numbers), which ties the two halves of the game together.
- **Only a strong merge cracks tideglass:** what the merge makes must be at least as high a
  tier as the part in the glass (Merge Mansion uncovers boxes on higher-level merges; ours
  is a crack count, three cracks to break).
- Beach costs 1175 coins in all.
- Scripted player, 4–6 s per action: closed cells (crates and glass, of 40) ~32 at 10 min,
  ~26–31 at 20, ~22 at the end (build 18: 33 / 27–32 / 20, with more opened early in the
  camp ring); Survey Kite at 12–19 min, Landing Beach in 40–60 min, no waiting.

## Sources
- https://4enjoy.com/articles/5-secrets-of-playing-in-the-merge-subgenre
- https://freejoy.games/en/blog/how-to-play-merge-games.html
- https://www.appgamer.com/travel-town/how-to-unlock-more-squares-on-board
- https://www.appgamer.com/travel-town/what-do-items-that-faded-light-coloured-mean-noticed
- https://merge-mansion.fandom.com/wiki/Cobwebs
- https://support.metacoregames.com/hc/en/merge-mansion/articles/how-do-i-make-use-of-the-items-covered-in-cobwebs-87
- https://www.levelwinner.com/merge-mansion-beginners-guide-tips-tricks-strategies/
- https://deconstructoroffun.com/blog/2024/8/19/finding-genre-success-the-case-of-gossip-harbor
- https://socialpeta.com/en/blog/the-new-rising-revenue-king-of-the-merge-genre-how-gossip-harbor-conquered-the-u-s-market
- https://www.topuplive.com/news/gossip-harbor-beginner-guide.html
- https://ludocious.com/index.php?p=blog&u=merge2021
- https://www.deconstructoroffun.com/blog/2023/10/22/deconstructing-merge-garden
- https://www.gamedeveloper.com/design/part-2-how-merge-unlocks-its-next-stage-of-growth

## Build 20 — shores tied to beach places, no numbers (user: "Ene yun toonuudtai tsenher nudnuud bilee" … "travel towniig duuraisan bolchihgui yu" … chose option 1)
The numbered blue cells read like the reference game's level-numbered cells. Each side of
the outer ring is now tied to one place on the beach instead of an upgrade count, and the
water shows that place's picture, not a number:
- left shore dries with **Lay a boardwalk** (landing path stage 2),
- lower shore with **Raise the signal mast** (stage 1),
- right shore with **Build the supply pier** (stage 1),
- far shore with **Light the beacon** (stage 1).
Each of those stages says so in its story lines; the beach screen adds "dries the … shore of
the board" to the place whose next stage does it; tapping a covered cell names the stage
to build. `SHORES`, `shoreOpen` in `v5/next/game.mjs`; no save change (derived from the
beach stages). Pacing as in build 19 (Landing Beach 41–61 min, Survey Kite 12–19 min).

## Build 21 — the tide removed; the edge wants later generators' parts (user: "Ene shine uurchlult sain bish yum baina, uur shiidel"; chose "outer crates want the new generators' parts")
The tide (builds 19–20) is gone: no blue cells, badges or shore story lines. Instead the
outer ring's 17 crates all open with a Survey Kite or a Rope Winch part (tier 3–4 for
everyday finds, 4–5 for tokens, trunks and big pouches), so the edge of the board opens as
those generators arrive (Kite at level 3 of the Rover, Rope Winch at level 3 of the Kite).
No new rule, mark or state: it is in the crate keys. Generators still come only from the
beach, and only a strong merge cracks tideglass.
Scripted player, 4–6 s per action: Survey Kite at 11–16 min, Rope Winch at 33–50 min,
Landing Beach in 37–56 min, energy 17–19 at the end, no waiting; closed cells of 40:
~32 at 10 min, 28–31 at 20, 26 at the end.
