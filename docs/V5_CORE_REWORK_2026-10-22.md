# Vaultwake V5 — Core rework (2026-10-22)

**Status:** approved by the user (2026-10-22, "Цөмийг бүрэн шинэчлэх").
**Branch:** `claude/v5-autonomous-rebuild`. The original V5 stays intact on
`codex/v5-coastal-workshop`, `main` and in git history; PR #75 is untouched.

## Why
Phone playtest of the incremental build: "no real improvement felt". Measured causes:
- Half the occupied board was fixtures (machine sites, sealed ground, rocks, cases):
  only 8–14 mergeable items on a 36-cell board.
- Restorations were separate "Use / Build / Deploy" buttons; crew orders were a
  parallel supplies economy, unrelated to what the coast needed.
- Machines and milestones handed out the next machine's parts, so producers were
  barely needed and the story ran past in ~130 scripted actions.
- Six overlapping systems (supplies, charges/service, seals beam, finds/rocks, kits,
  tide treasures, bench/press, contracts) competed for attention.

## The one loop
**Tap a producer → merge → deliver to a coast task → the coast visibly changes, a
character speaks, a new capability opens → next task.**

- **Board = producers, items and supply cases only.** No fixtures.
- **Coast tasks** (the main objective, one at a time) consume items directly and
  restore a site on the scene above the board: landing path, storm pier, chart
  table, Workshop, crossing, Stone Lift, beacon, ring engine, Vault door.
- **Crew orders** (optional, two lanes) take spare items for energy and the odd
  supply case. They never take items the current task is holding.
- **Energy** powers producer taps. Tasks and orders refill it. A free field meal is
  always available at zero energy: no wall, no timer, no purchase.

## Producers, one job each
| Producer | Family | Job | Unlocked by |
|---|---|---|---|
| Rivet Rover | Fieldworks | Physical repair: path, pier, Workshop, Stone Lift | start |
| Survey Kite | Wayfinding | Charts and navigation: chart table, crossing, beacon, rings | storm pier (Neri can launch from it) |
| Echo Crucible | Resonance | Signal parts: Lift charge, beacon, ring engine, Vault | the crossing |

A tap costs 1 energy and makes a tier-0 part; on a roomy board it drops a second
part (an instant pair). Task rewards give **rich pulls** (next pulls make tier-1
parts) and producer upgrades, never finished mid-tier parts.

## Chapter 1 tasks (one at a time)
| # | Site | Task | Needs | Opens |
|---|---|---|---|---|
| 1 | Landing | Clear the landing path | Grip tool | — |
| 2 | Storm pier | Brace the pier | 2 Grip tools | crew orders |
| 3 | Storm pier | Lay the pier deck | Split spanner | **Survey Kite** + chart case |
| 4 | Chart table | Restore Neri's chart table | 2 Route folds | the erased-coast clue |
| 5 | Workshop | Repair the Workshop | Split spanner + Route fold | Rover upgrade (richer pulls) |
| 6 | Crossing | Chart the safe crossing | Sight lens + Split spanner | the route choice |
| 7 | Crossing | Choose: Ridge (Pocket winch) or Conduit (Survey scope) | one of them | **Echo Crucible**; Ridge upgrades Rover, Conduit upgrades Kite |
| 8 | Stone Lift | Wake the Stone Lift | Pocket winch + Loop cell | — |
| 9 | Beacon | Raise the tide beacon | Pulse coil + Sight lens | — |
| 10 | Ring engine | Wake the ring engine | Resonator + Survey scope | scene: powered rings |
| 11 | Vault door | Open the Tideglass Vault | Pocket winch + Survey scope + Resonator | scene: open Vault |
| 12 | Signal | Listen to the fleet signal | — (story) | the open question |
| 13 | Signal mast | Build the signal mast | Crawler jack + Bearing dial + Phase lantern | long goal beyond the first session |

Raw-part estimate through task 11: ~94 tier-0 equivalents (≈60 producer taps,
≈85 merges, ~15 deliveries) — a design hypothesis of 12–18 human minutes, to be
validated by human playtest, not by simulation.

## Saves
State `version: 6`. `load()` migrates any `version: 5` save: furthest progress
maps to completed tasks (sequential), the route choice is kept, producers unlock
accordingly, board items/sources/cases are kept, fixtures are removed, energy is
clamped. Original slot `vaultwake-v5`, replay slot `vaultwake-v5-replay` and the
active pointer are unchanged.

## Removed from V5 (still in git history)
Supplies currency, producer charges/service, the seals beam puzzle, rocks/finds,
vault kits, instrument mastery, tide treasures/Loft/Deep Survey, Precision Bench and
press, contracts/opportunities, sealed ground and route tiles on the board.
