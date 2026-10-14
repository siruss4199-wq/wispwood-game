# Phase 2A — three-seal gameplay foundation

Base: PR #70, `codex/v5-first-session-foundation`, `1fb99d6`.
Working branch: `codex/v5-three-seal-foundation`; draft PR #71. No V4/art changes.

## Connected progression

- **Navigation:** prepare a Sight Lens and Split Spanner together; surveying retains both. Ridge spends the spanner for workspace; Conduit spends the lens for relic resources. The chosen breach secures Navigation, exposes the entrance and unlocks the Crucible.
- **Stabilization:** repair the Stone lift. Recover its winch with a spanner to keep/trade/merge/deploy it, or spend a Pulse Coil to restore the fixed machinery immediately. The lift opens ground and yields Wayfinding parts.
- **Resonance:** prepare either the Relic finder (relic supplies) or Power bridge (source charges). Keep Loop Cells separate and arrange an orthogonal connection between the repaired lift and receiver. Tap the connected machine or Power rings. Connected cells become permanent wiring; the scene powers up, sources recharge and three improved pulls become available.
- **Vault:** all three seals permit opening. This replaces the old final high-tier checklist rather than adding grind on top of it.

Cells can instead merge into a repair coil or fund one optional exchange for receiver equipment and improved pulls. The same inventory supports different outcomes. No new currency, timer, producer or family.

## Save compatibility

The existing save key/version remain unchanged. Missing seal data migrates once. Previously powered/opened saves retain earned progress without redoing the chapter; stage-two saves retain their inventory and repaired devices. Partial wiring persists. No item positions are reset.

## Verification and honest limits

- 221 local automated regression tests pass (67 V5).
- Twelve completion simulations cover four styles with Recover/Restore/mixed excavation, both routes and both receiver types. They finish in 31–77 actions with 0–5 producer taps. Normal exploration variants retain at least 19 occupied cells; the deliberately aggressive mixed variant reaches 15 temporarily.
- A separate 64-policy search skips optional work where allowed. **Fastest observed: Conduit, 17 actions / 7 merges / 0 producer taps; Ridge minimum: 20 actions.** This is not a globally optimal-path proof or measured human playtime. Full action witnesses are emitted by `node tests/v5-seal-metrics.mjs` and saved in CI artifacts.
- That fastest witness encounters both affordable route choices, two Recover/Restore alternatives, and keep/merge/exchange uses for cells. These are observed available alternatives, not claims that the solver deliberated or that human players will find every tradeoff equally attractive.
- Focused rules cover incomplete-seal rejection, diagonal/wrong-tier/disconnected wiring, exact cell consumption, repeat activation rejection, full-board/depleted-source recovery, legacy progress and reload during wiring.
- Mobile/browser review is recorded in the PR once completed. Emulated browser checks are not physical-iPhone testing.

## Phase 2B, not included

The chapter remains short for a knowledgeable solver. The foundation adds a spatial keep-versus-merge action, but does not establish commercial difficulty or retention. Next evaluate connection comprehension and receiver/reward balance with real players before expanding content. The existing post-vault collection loop is unchanged. No economy overhaul or Chapter 2.
