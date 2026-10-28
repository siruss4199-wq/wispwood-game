# V5 Coast Camp: the level path (2026-10-27, Build 46j)

Scope: Coast Camp only (`v5/play.html`, `v5/next/`). Gameplay branch `claude/v5-audit-fixes`.

## Why

The user asked: "Level er ni nemegdeed yamar ashig baina" (what does levelling up give?). Then:
"shagnal saijruulah bish togloomond ashiglaad gameplayd sonirholtoi zuilsee nemmeer baina" (not a
bigger reward: use the level in the game and add interesting gameplay). They approved Claude's
proposal ("Za uuriin sanalaaraa hii"), A plus B1, and asked what happens to the level-up energy.

### What the level did

`game.mjs` `gainXp()`: each level-up gave +15 energy, up to the refill cap of 50. Nothing in the
game read the level.

The scripted player levels up often (`v5-next-policy`, seeds 1–5, first hour):

| | 5 s an action | 7 s an action |
|---|---|---|
| Level at 10 min | 5 | 4 |
| Level at 20 min | 7 | 6 |
| Level at 30 min | 9–10 | 7 |
| Level at 60 min | 13 | 12 |

- **Gap between level-ups:** median 4.3 min.
- **Energy given:** 95 of 115 level-ups gave the full +15; none gave 0.

## Decision

- **Energy:** the +15 stays. The energy balance (Build 46f, every economy guard) counts on it. The
  new unlocks come on top of it.
- **What changed from the chat proposal, after reading the code:**
  - Tide tokens and energy jars already come from cargo behind tier 3–5 keys, so they already arrive
    later in the game.
  - Generators already make a better part every fourth tap.
  - One upgrade already gives a fourth order card.

  So the path gives the level what the game lacked: one merge rule (B1, made to fit this game), and
  two kinds of crew order that bring the existing tools into the order loop.

## The path (`LEVEL_PATH` in `game.mjs`)

| Level | Unlock | Rule |
|---|---|---|
| 3 (about 5 min) | **Triple merge** | Drag a part of level 3 or more onto its twin while a third identical part touches the twin (above, below, left or right). All three make **two** parts of the next level. |
| 5 (about 10 min) | **Tide tokens from the crew** | The first everyday crew order after reaching level 5 pays a Tide token on top of its coins. After that, every eighth one does. |
| 8 (about 25 min) | **Crew favours** | Every sixth everyday crew order is a favour: its first part is one tier higher (within reach and the order limits). On top of its coins it pays a Sea chest at the beach, or a Brass cog from the Survey Worksite on. |

### Triple merge (B1, made to fit pair merges)

The chat proposal said "five merge into two", the rule of games where you merge a group of three or
more. Here a merge is one part dragged onto one other (2 → 1), so the same idea becomes:
- **Rule:** three identical parts → two of the next level, instead of one plus a leftover. That is
  one free part each time.
- **Choice:** the player decides whether to line up a third before merging.

Details:
- **Which third part:** the third must touch the space the part is dropped on, not the space it
  came from. If several do, it is the first in the order up, down, left, right.
- **Effects:** the second new part takes the third's space. Tideglass beside either space cracks
  once for the action. XP and the merge count are as for two merges.
- **What does not join:** parts only. Crates, generators, cogs and tokens are not included.
- **Level 3 parts and up only (tier 2+, `TRIPLE_MIN_TIER`).** Triples of smaller parts used up the
  cheap pairs a player merges for free while energy is out. At 4.5 s an action, low-energy moments
  with a free move fell from about 80 % to 45 %.
- **Trade-off:** a third part the player meant to deliver is used up. Where the part is dropped
  stays the player's choice, and the level-3 moment explains the rule.

### Tool orders (A, made to fit)

- **Which orders count:** by the order's own sequence number (deterministic; `n` in `makeOrder`),
  everyday orders only, never the gold order.
- **How the reward is stored:** an optional `bonus` field on the order: `'token'`, `'chest'` or
  `'cog'`.
- **First token at once.** Without it, the first token order came about 51 min in, against level 5
  at about 10 min; the level-up's promise was not kept. Level 5 sets `s.pathNext='token'`, and the
  next everyday order pays it.
  - Favours do not get this: a favour at once left slow players never short of energy (10 s an
    action, lowest energy 3–8).
  - Their first comes within six orders, as the level-8 text says.
- **Favour reward:** a Sea chest at the beach, a Brass cog from the Survey Worksite on. Cogs at the
  beach brought the Shell Trap out before the beach was finished (4 s an action: at 45 min, against
  the beach's 54), which the pacing test forbids.
- **Frequencies:** every 8th order for tokens, every 6th for favours. Every 5th token order left
  the slowest player never out of energy. Other mixes failed one guard or another.
- **On delivery:** the tool goes to the nearest free space to the Rover, or to the shed if the
  board is full.
- **UI:**
  - order cards show the tool beside the coins, hidden on a ready card where Deliver fills the
    foot;
  - the delivery message names the tool;
  - level-up moments name what opens;
  - the level badge opens the path;
  - "How to play" lists it.

## Saves

- No version change.
- **Orders:** an optional `bonus` field (`'token'`, `'chest'` or `'cog'`; anything else is a
  damaged save, as with other bad orders).
- **Owed token:** an optional `s.pathNext` (`'token'` only; a bad value is dropped and the save
  kept).
- **Older saves:** Build 46i saves load unchanged. A save already past a level has that unlock at
  once, without its moment.
- Tests load a 46i-shaped save, a save with a bonus order, and bad `bonus` and `pathNext` values.

## Measured (economy harness, 8 speeds × 5 seeds, both areas, shop on)

| | Before (46i) | Build 46j |
|---|---|---|
| Low-energy moments with a free move (worst seed: 4 / 4.5 / 5 / 6 / 7 / 8 / 9 / 10 s per action) | 89 / 79 / 89 / 92 / 70 / 93 / 58 / 56 % | 95 / 79 / 73 / 79 / 100 / 67 / 67 / 100 % |
| Energy runs out at every speed | yes | yes |
| Both areas, mean real time (4 → 10 s) | 1.9 · 2.4 · 2.1 · 2.6 · 3.1 · 3.3 · 3.8 · 4.2 h | 1.8 · 2.0 · 2.2 · 2.6 · 2.9 · 3.5 · 3.8 · 4.1 h |
| Shell Trap vs end of the beach (4 s run) | 62 vs 54 min | 61 vs 50 min (still at the worksite) |

**What the scripted player gets, per run through both areas:**

| | Triple merges | Tokens | Chests | Cogs |
|---|---|---|---|---|
| 5 s an action | 4.2 | 5.4 | 4.6 | 3.6 |
| 7 s an action | 2.6 | 4.6 | 3.0 | 3.6 |

- **First token:** at 11–15 min.
- **Triple merges:** the scripted player does not line up triples on purpose, so a real player will
  do more.
- **Note:** the free-move share swings by seed (the same build moves 20–40 points between seeds), so
  each row is a guard, not a precise figure.

**Tests:** `node --test tests/v5-*.test.mjs` passes 293/293. The new tests check:
- the triple rule, including that small parts never triple;
- the tool orders and their frequencies;
- that the next order after level 5 pays the token;
- the favour rewards;
- the level-up unlock and its energy;
- the saves.
