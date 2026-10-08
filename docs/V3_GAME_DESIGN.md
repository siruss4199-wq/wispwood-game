# Wispwood V3 — Full Merge Game Foundation

## The V3 correction
The board must not be something the player clears in a few minutes. Opening space is now a progression system, not a side effect of every merge.

## Four simultaneous goals
Every session gives the player four layers of purpose:
- Board decision: merge, store, or preserve an item.
- Order decision: Quick, Standard, or Story order.
- Exploration decision: build merge progress toward the next buried tile.
- Meta decision: spend Coins/Light/items on restoration, storage, or producer upgrades.

## Visible item-rich board
The board is not just a wall of identical boxes. Twelve buried positions start as visible vine/cobweb items across several tiers. They are real future inventory: craft the matching item and drag it onto the cobweb to free it. This creates long-term targets on the board itself and makes the board visually richer without filling it with meaningless decoration.

## Board expansion
- Initial screen is still visually full: 62 buried cells + 2 Seeds.
- First merge opens a central working clearing: Ancient Tree + four intentional empty cells.
- Later merges award 1 Exploration point.
- Buried cells open only when Exploration reaches a threshold.
- Threshold starts at 3 merges per explored crate and slowly rises as more of the board is uncovered.
- Emergency safety openings happen only when production would otherwise have no two-cell working capacity.
- Therefore the board is a long-lived space-management puzzle, not a 62-merge countdown.

## Item depth
Each chain now has 10 tiers:
- Leaf: Seed → … → Heartwood Relic
- Water: Drop → … → Lunar Chalice
- Magic: Spark → … → Heart Star

## Orders
Three parallel slots create different decisions:
- Quick: one lower-tier item.
- Standard: two copies of a mid-tier item.
- Story: a high-tier item plus a second requirement; after more producers unlock this becomes cross-chain.

Orders scale with completed work and only use unlocked producers.

## Progression
12 Lost Clearing restoration nodes remain the main chapter spine.
- Node 3 unlocks Moon Spring.
- Node 6 unlocks Wisp Nest.
- Later restoration costs require increasingly higher tiers.
- Storage and producer upgrades compete for the same Coins/Light, so spending choices matter.

## Economy
Energy → producer taps.
Coins → restoration, storage, producer upgrades.
Forest Light → progression and producer upgrades.
Discovery rewards → small bonus, not the main economy.

## Test philosophy
V3 tests now explicitly verify:
- 3 different order shapes
- first clearing capacity
- no crate opening on every merge
- exploration threshold opening
- order refill/economy
- 180-action state stability

The next milestone is balancing and adding producer upgrades/storage UI before expanding to Moonlit Grove.
