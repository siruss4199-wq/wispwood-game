# Wispwood V3 — Full Merge Game Foundation

## Design goal
V3 is built as a long-session merge game, not a short board demo. The player should always have:
- a board decision,
- a short-term order target,
- a medium-term restoration target,
- a long-term unlock target.

## Core loop
Producer → merge → fulfill one of 3 active orders → earn Coins + Forest Light → spend on restoration or producer upgrades → unlock new producers/chains → complete area → unlock next area.

## Board pressure
The 8×8 board is intentionally constrained. Space management matters, but progression must never depend on lucky drops.

Rules:
1. Producers are deterministic enough to guarantee progression.
2. Orders only request unlocked chains.
3. At least one active order is always achievable with current producers.
4. When no merge pair exists, at least two empty cells must remain available for production.
5. Crates reveal controlled rewards, not arbitrary junk.
6. No automatic matching-item rescue injection.

## Producers and chains
### Ancient Tree
Leaf chain:
Seed → Sprout → Herb → Fern → Bloom → Moon Flower → Ancient Blossom → Spirit Wreath

### Moon Spring
Water chain:
Drop → Dew → Flask → Elixir → Moonwater → Crystal Vial → Sacred Water → Moonwell

### Wisp Nest
Magic chain:
Spark → Wisp → Glow Orb → Star Dust → Star Shard → Aurora → Spirit Flame → Celestial Core

## Order board
Three parallel order slots:
- Quick: low tier, fast reward
- Standard: mid tier, stronger reward
- Story: high tier or mixed-chain request tied to progression

Orders regenerate deterministically from the current unlock tier and cannot request unavailable producers.

## Progression
Lost Clearing contains 12 restoration nodes. Each restoration spends Coins + Forest Light + crafted items.

Example progression:
1. Wake the Garden
2. Clear the Path
3. Repair the Well
4. Repair the Bridge
5. Restore the Lanterns
6. Rebuild the Workshop
7. Restore the Pond
8. Rebuild the Cottage
9. Restore the Shrine
10. Open the Moon Gate
11. Restore the Sanctuary
12. Restore Mivra's Shelter

Milestones unlock:
- Node 3: Moon Spring
- Node 6: Wisp Nest
- Node 12: Moonlit Grove

## Economy
Energy: producer taps.
Coins: orders → restoration/upgrades/storage.
Forest Light: orders/story progression threshold.
Storage: purchased with Coins.
Producer upgrades: purchased with Coins + Light.

## Retention systems
After core stability:
- discovery book
- daily tasks
- timed bonus orders
- chests
- events
- collection rewards
- cosmetic restoration options

These are layered on later. They must not be required to keep the base loop alive.
