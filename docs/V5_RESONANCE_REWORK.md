# Phase 2B — reflected-light worksite

Baseline: PR #71, `97257751210101d95dba7d957276a9bfc2a43573`.
Working branch: `codex/v5-resonance-worksite-puzzle`. Phase 2B is limited to Resonance.

## Reproduced shortcut

The original 64-policy simulation reproduces a 17-action Conduit run: seven
merges, zero producer pulls. Its first eleven actions prepare the route, Recover
the winch, Restore the scope and deploy the lift. Two more merges make two Loop
Cells, two moves place them at 21/22, then Power and Open finish the chapter.
The repaired lift at 20 and scope at 23 are already separated by just two empty
spaces. The UI draws the exact shortest path. Starting stock, survey supplies
and the Conduit coil fund the entire run; the scope also returns a coil.
There is no obstacle, directional constraint or intermediate configuration.
Having alternative buttons did not make that connection a puzzle.

## Changed interaction

Repairing the lift unfolds two reusable reflectors into free spaces. If a board
is full they stay pending until space becomes available; nothing is overwritten.
One Loop Cell lights the lift. It aims north or south. Light crosses empty
spaces, turns at reflectors and stops at inventory, terrain or device backs.
Receivers accept light through their visible top/bottom ports. The stone rib
between spaces 15/16 (one-based) blocks the tempting middle crossing.

Players choose a crossing, position and turn reflectors, and decide where to
keep obstructing inventory. The game shows only the beam actually built—not a
solution path. Dragging a reflector onto movable stock swaps them, including
on a full board. Turns and moves are free and reversible. No additional tiers,
timers, producer costs or seal checklists were added.

The Relic finder returns a five-output relic ampoule. The Power bridge returns a Pocket winch, refills
sources and grants three improved pulls. The winch guarantees a tangible reward
even if all charges were already full. The chosen receiver therefore affects
the board or the next production choices, rather than granting the same reward.
Navigation, Stabilization and their existing equipment costs are unchanged.

## Measurement, not a difficulty claim

`node tests/v5-resonance-metrics.mjs` evaluates 64 policies using real reducer
actions. The old fastest policy now takes 20 chapter actions (six merges, zero
pulls). Its Resonance segment takes eight actions instead of five, excluding
the final vault button. Those eight include one merge, one prime, two reflector
placements, two aim/orientation changes, one inventory relocation and Power.
Across policies, Resonance takes 5–11 actions; shortest observed chapters are
20 Conduit / 22 Ridge. These are not exhaustive shortest-path proofs or human
playtime measurements.

There are three planning questions: which crossing can reach the chosen
receiver, how the reflectors must face, and where obstructing kept stock can
go. Orientation is a constraint to solve, not an additional reward choice.
The old fastest entry has three geometric solutions to its repaired receiver;
alternate receiver tests exercise both reward outcomes. We do not count every
turn, tap or available button as a separate meaningful decision.

## Verification and remaining limits

Focused tests reject the old line even with unlimited cells, exercise stone
and inventory blocking, directional sockets, alternate solutions, reversible
wrong turns, full-board swaps, legacy unresolved saves and old completed saves.
Existing tap/drag, route, delivery, density and chapter tests remain in place.
Recorded browser walkthroughs use real touch drags and buttons from fresh saves,
including an intentionally failed crossing and wrong-turn recovery. Browser
emulation is not physical iPhone or independent human playtesting.

This is a small spatial puzzle, not proof of retention or a challenging full
chapter. A player who already knows the layout can solve it quickly. Early
inventory still permits zero-pull chapter runs. Navigation and Stabilization
remain generous, as requested. Independent first-time playtesting should judge
beam/port readability and whether the arrangement is enjoyable before any
broader difficulty or economy work.
