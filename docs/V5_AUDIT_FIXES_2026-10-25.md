# Vaultwake V5 Coast Camp — Build 46, audit fixes (2026-10-25)

Branch `claude/v5-audit-fixes`, from `claude/v5-coastal-board-ui` 646e4ef (Build 45e). The user
asked for an audit ("toglood yag sonirholtoi bainuu, aldaa garch bainauu, simulation hiine uu"),
then for every proposal to be done ("Бүгдийг нь хий"). This build changes gameplay (orders and
energy), so it is its own PR, not part of the UI PR #82. Save keys and the save version are
unchanged; the one new order field (`born`) is optional, and older saves load as they were
(tested).

## What the audit found (Build 45e)

No bugs: 160,000 random actions in 40 runs (invalid ones included) with no crash, no broken state,
no save reset and no two identical orders; no dead end in a whole chapter; a real-browser
playthrough of 275 actions at 390 × 844 with no page or console error and no sideways scroll.
The design problems, measured with the scripted player (`tests/v5-next-economy-audit.mjs`,
`tests/v5-next-economy-sim.mjs`):

| Problem | Measured |
|---|---|
| Waiting for energy | a quick player (4 s an action) waits 65 % of the chapter, 6 s 44 %, 8 s 28 %; energy first runs out after 26 min (5 s) or 70 min (8 s) |
| Repeats | 24 % of beach orders and 14 % of the chapter's repeat the parts of one of the last four; in the first quarter hour (one generator) three in five |
| Stuck orders | one in ten crew orders took over 61–84 min (mostly two-crew jobs) |
| The end | after the last stage crew orders keep paying coins with nothing to build |
| Small | story text turned blue under a sliding finger; the strip and the gold card could name different places; the order panel's "100/100" read as done; on an iPhone, Safari's bars hid the last row of the board |

## What Build 46 does

| Fix | How | Where |
|---|---|---|
| Less waiting | a delivery also gives +1 energy (`DELIVER_ENERGY`), shown flying to the energy pill; help text says so. +2 or more per delivery was measured and removed waiting altogether (energy stopped mattering), so +1 | `game.mjs` `deliver`, `app.mjs` |
| Fewer repeats | a new everyday order avoids the parts of the last four in any number while anything else can be asked; the area's focus chain gives way before a job repeats; with one generator a two-part job asks two tiers of its chain | `game.mjs` `makeOrder` |
| Stuck orders | a crew order not ready 200 moves after it came (half are delivered within 60, nine in ten within ~320) shows "↻ New?"; its panel has the New order button. Gold orders never. Orders from older saves (no `born`) never; a damaged `born` is dropped | `game.mjs` `isStuck`, `STUCK_MOVES`, `load`; `app.mjs`; `coastal.css` |
| The end | the strip says "Chapter complete · Coins carry over to the Vault Entrance · N"; the end screen says crew orders keep coming and their coins carry over (the shop takes them now) | `app.mjs` |
| One goal | the strip shows a stage ready to build, else the stage of the live gold order, so it and the gold card name the same place | `app.mjs` `nextPlace` |
| Order panel | three lines: why, "+N → place", how to make the parts, and New order (the bonus sums and the "n/m" are gone) | `app.mjs` `renderOrderTools` |
| No text selection | nothing in the game is selected by a slide of the finger (the playtest log still is) | `coastal.css` |
| Short screens | ~~the board shrank to fit above Safari's bottom bar~~ — undone in Build 46d (user, 2026-10-26: "Board hemjee jijig bolchihson baina"): the board keeps the full width (370 px at 390, cells 49 px) and the page scrolls for the last row | `coastal.css` |

## Measured after (same scripts, 5 seeds)

| | Before (45e) | After (46) |
|---|---|---|
| Waiting, chapter, 4 / 6 / 8 / 10 s an action | 65 / 44 / 28 / 16 % | 54 / 27 / 3 / 0 % |
| Energy first runs out (5 s / 8 s) | 26 / 70 min | 58 / 130 min |
| Chapter length (scripted player, 3–12 s an action) | 5.6–6.3 h | 3.7–5.5 h |
| Beach length | 109–158 min | 89–148 min |
| Repeats of the last four, beach / chapter | 24 / 14 % | 10 / 6 % |
| Orders already done on arrival | 4–5 % | 0 % |
| Slowest tenth of beach crew orders | 61–83 min | 27–56 min |
| Longest gap between two stages (3 s an action) | 27 min | 49 min (the quickest player runs out of energy) |
| Coins per part | 3.05–3.21 | 3.13–3.26 |
| Random actions / bugs | 160,000 / 0 | 160,000 / 0 |

The chapter is shorter because less of it is waiting. Order sizes, stage costs, drop rates and
generators are unchanged.

## Tests

- `tests/v5-next.test.mjs`: delivery energy (and the cap), stuck orders, gold orders never stuck,
  an older save with no `born` loads as it was, a damaged `born` is dropped, and repeats of the last
  four stay at or under 15 % over the scripted player's chapter.
- `tests/v5-next-bright-browser.cjs`: the stuck badge and its panel's New order, the short panel,
  no text selection, "Chapter complete · Coins carry over", and the board above the bottom at 390 × 664.

## Limits

- On an iPhone with Safari's bars the last board row can sit under the bottom bar; the page scrolls (the board was kept large on purpose, Build 46d).
- Fun is not something the scripts measure; a few real players (with the playtest log) are the test.
- The first quarter hour still repeats more than the rest (one generator, few parts): about one in
  four orders there.

## Build 46c: the big job is dropped (2026-10-26)

The user asked whether the big job was needed ("2iin hoorond big job hereg baina uu ter
tulhuurnuudee l hundruuleed yavchihiin bishuu orderuudaa saijruulaad") and chose to drop it. A big
job was one part a tier past what its generator makes easily, paying ×1.3, with a "Big job" tag:
it made orders harder, not more interesting.

- Everyday orders are now quick jobs (one small part) and two-part jobs, two of every three
  being two-part (`ROLE_TURN=['quick','pair','pair']`). Plain turns (quick, two-part) were
  measured first: the board ran dry while energy was out (at 4.5 s an action only 45 % of
  low-energy moments had a free move, against 86 % or more this way); two-part jobs keep
  enough merging on the board.
- No "Big job" tag; the order panel says "Quick job" or "Two-part job".
- Orders saved as big jobs keep their coins and show as quick jobs (tested).
- Random play then found two identical crew cards at once while only Rivet Rover was out (two-part
  jobs of one chain ran out of new combinations): a new order that would match a card on the
  board becomes a quick job that does not. A random-play test (12 seeds × 1,500 actions) guards it.

| Chapter, 5 seeds | 46b (big job) | 46c |
|---|---|---|
| Waiting, 4 / 6 / 8 / 10 s an action | 54 / 27 / 3 / 0 % | 57 / 29 / 7 / 0 % |
| Chapter length | 3.7–5.5 h | 3.8–5.4 h |
| Highest tier asked (share of orders at tier 4) | 20–55 of ~150 | 14–16 of ~150 |
| Coins per part | 3.1–3.3 | 3.0 |
| Repeats of the last four (beach / chapter) | 10 / 6 % | 8 / 5 % |
| Repeats once two generators are out | 8 of 206 | 0 of 160 |
| Low-energy moments with a free move (worst speed) | 89 % | 86 % |
| Random actions / bugs | 160,000 / 0 | 160,000 / 0 (after the fix above) |
