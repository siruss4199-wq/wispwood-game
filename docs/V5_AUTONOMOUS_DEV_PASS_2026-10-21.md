# Vaultwake V5 — Autonomous development pass (2026-10-21)

Branch `claude/v5-autonomous-rebuild`, based on `claude/v5-engine-qa` @ `406863c`.
Scope: first-session gameplay improvements authorized by the user; V4, `v5/lab/`,
`main` and PR #75 untouched. All save keys preserved; no new save fields.

> Evidence labels: **SIM** = reducer simulation (scripted policy, not human time);
> **BROWSER** = real Chromium interaction at mobile width; **RESEARCH** = see
> `docs/V5_MERGE_BENCHMARK_RESEARCH_2026-10-21.md` (search-result summaries only —
> page fetches failed in this environment, no gameplay footage was viewed).
> No human playtest was performed. Enjoyment is not claimed.

## 1. Diagnosis (ordered by player impact)

1. **The main story ran on gifts, not on the merge loop.** SIM: a story-first player
   reached the Tideglass Vault in **29–38 actions with 0 order deliveries and 0–1
   Survey Kite pulls** (`tests/v5-journey-metrics.mjs`, expedition/exploration styles).
   Following the visible objective, the game fired **8–11 different main objectives in
   the first 31 actions**; the whole Stone Lift → receiver → charge → ring-engine arc
   took ~10 actions with no producer taps. Cause: starter stock, milestone supply drops,
   first-craft "expedition supplies", cross-family discovery cases and machine rewards
   each hand over the next machine's parts (a designed domino).
2. **Orders were optional on the main path.** Crew orders only mattered for camp
   buildings; nothing in the story needed them before the Vault. RESEARCH: in the
   benchmarks the order → restoration loop *is* the progression.
3. **False finale.** BROWSER: after revealing the fleet signal the primary button was
   **PLAY FROM START** under "FINISHED / CHAPTER 1 COMPLETE", while the camp
   (Workshop, Bench, Pier) was hidden and orders collapsed — the real next objective sat
   under the board. The design gate forbids this.
4. **Story clue could be destroyed.** BROWSER: selecting the Reef Compass (the first
   clue) offered only "Recycle +2".
5. **Misleading guidance.** BROWSER: "MERGE THE HIGHLIGHTED PAIR → Split spanner"
   highlighted two Copper offcuts (which make a Grip tool).
6. **Energy never constrains** (SIM: never below its starting 32; capped at 120 by
   ~action 60) — order energy rewards are wasted. Not changed in this pass (see §6).
7. **Echo Crucible has no pre-Vault job** on most paths (SIM: 0 pulls before the Vault
   on several routes) because stage-2 rewards hand out Resonance parts.

## 2. Design decisions

- **Put existing, order-funded restorations on the critical path** (gate pillar:
  "orders funding visible coastline restoration as the single main loop").
  The crossing survey needs the restored **Coastal Workshop** (the UI already told
  players to do this; a ready crossing skipped it). Opening the Vault needs the
  **Supply Pier** ("the vault expedition sails from it"). No new currency, system,
  timer or tier requirement — both buildings and their costs already existed.
- **End the reveal on a question with a playable next step**, not a finale; keep
  replay one tap away.
- **Clue items always have a destination** (merge twins / tide order); never offer to
  destroy them.
- **Rejected after measurement:**
  - removing cross-family discovery cases (SIM: stage 2 still ~10 actions — redundant
    gift channels);
  - converting machine rewards to producer charges (SIM: +3–5 actions only, while
    rewriting the seals/finds economy and many tests);
  - "debut orders" for newly unlocked producers (SIM: no Crucible use before the Vault
    on the UI path; shifted early orders toward starter chart stock).
  These were reverted; §6 lists what a real fix needs.

## 3. Implemented (commits)

| Commit | Change |
|---|---|
| `ede0843` | `tests/v5-first-session-metrics.mjs`: objective-following timeline instrument (pulls, merges, orders, energy, supplies, occupancy, save/reload every 13 actions). |
| `0367647` | Workshop gates the crossing survey; Supply Pier gates the Vault. Atomic failures, objective/cue switch to the camp work, legacy pre-Vault saves fund it through normal orders. New `tests/v5-camp-critical-path.test.mjs`; simulation policy funds gates via the game's recommended order. |
| `03147d2` | Fleet reveal ends on "Someone answered the fleet signal"; the objective returns to the real next camp goal; camp and orders stay visible; secondary "Replay Chapter 1" button keeps the replay slot reachable. |
| `610b3f8` | Tide treasures can't be recycled (reducer + UI); merge hint names the actual result ("→ Grip tool · toward Split spanner"). |
| `77eda0f` | Objective-following test policy makes the glowing first merge first — fixes the pre-existing "Fresh coastal journey" CI failure (a test/UI mismatch, not a deadlock). |
| `bc9cf08` | Story policy follows the onboarding (pier → compass → Workshop) and only delivers visible orders; v5-browser/route-clarity tap-mappers learn order/camp actions. |
| `9979b21` | Story policy makes the glowing first merge; resonance browser test funds the Pier for legacy mid-optics saves through the real UI. |

## 4. Before / after metrics (SIM, same instruments, baseline `406863c` vs this branch)

Objective-following policy (`node tests/v5-first-session-metrics.mjs [root]`), three specialties:

| | rig | chart | flux |
|---|---|---|---|
| Objective changes in first 31 actions | 11 → 7 | 8 → 7 | 10 → 7 |
| Vault reached at action | 52 → 66 | 51 → 63 | 49 → 62 |
| Orders delivered before Vault | 4 → 6 | 4 → 6 | 4 → 6 |
| Pre-Vault pulls Rover/Kite/Crucible | 12/1/0 → 19/0/0 | 2/4/3 → 8/3/3 | 2/1/5 → 8/0/5 |
| Signal reveal (crown) at action | 135 → 142 | 126 → 132 | 126 → 129 |
| Min / max board occupancy | 20–32 → 16–32 | 19–30 → 14–29 | 19–29 → 20–31 |

Story-first policies (`tests/v5-journey-metrics.mjs`, 16 runs; baseline vs branch):

| Style | Vault at action | Kite pulls before Vault | Crucible pulls before Vault | Orders before Vault |
|---|---|---|---|---|
| expedition | 29–35 → 56–66 | 0–1 → 2–4 | 0–5 → 0–3 | 0 → 6–7 |
| exploration | 34–38 → 54–63 | 0–1 → 1–6 | 0–1 → 0–3 | 0 → 6–7 |
| contract | 51–58 → 59–67 | 1 → 1 | 0–3 → 0–3 | 5 → 6 |
| workshop | 61–70 → 65–79 | 6 → 6 | 0–5 → 0–5 | 10 → 11 |

Read honestly: the main path now requires the order loop and the climax arrives
~12–30 actions later for players who previously skipped orders, but the Survey Kite is
*not* used more on the objective-following path (starter chart stock covers it), Echo
Crucible use before the Vault did not improve on any path, and the post-Vault Deep Survey supply stretch can
thin the board to 14–17 occupied (actions ~92–110), below the 18–27 heuristic.

## 5. Verification

- `node --test tests/v5-*.test.mjs`: **183 pass / 0 fail** (baseline 177 + new tests).
- `v5-journey/seal/resonance-metrics.mjs`: complete (exit 0).
- BROWSER, Chromium (pre-installed build via a launch shim), 360/390/430px where the test
  covers them: `v5-coastal-browser` (full fresh journey through real taps),
  `v5-workshop-evolution-browser` (the original Spanner regression), `v5-camp-browser`,
  `v5-mobile`, `v5-replay-browser`, `v5-workshop-browser`, `v5-route-clarity-browser`,
  `v5-browser`, `v5-resonance-browser` — **all Chromium portions pass** in the final run
  (full fresh journey: 142/132/129 real UI actions at 360/390/430px, 0 rations needed).
- **WebKit not verified:** the WebKit build could not be downloaded in this container
  (network policy). Every WebKit-including test stops at WebKit launch here; CI on a
  PR would exercise it. `v5-continuation-browser` launches WebKit first, so it was not
  verified at all. `v5-requests-browser` fails identically on the untouched baseline
  ("there must be a working order" — the first visible order is already ready); not
  caused by this branch, left for a separate fix.
- **Previously hidden CI failures:** the CI browser step runs under `bash -e`, so after
  `v5-workshop-evolution-browser` failed nothing else ran. Running each test showed
  `v5-coastal-browser` and `v5-resonance-browser` failing on the baseline too (policies
  tapped "Clear path" before the UI's required first merge). Both now pass on Chromium.
- Saves: no state-shape change. Legacy pre-Vault saves load unchanged and can fund the
  Pier (node test + legacy mid-optics fixtures in the resonance browser test). Replay
  slot entry/return verified in `v5-replay-browser.cjs` (Chromium).

## 6. Remaining weaknesses and priorities

1. **Stage-2 reward domino (needs approval — reshapes the seals economy).** Machines,
   milestones and first crafts hand over the next machine's parts, so the Stone Lift →
   rings arc is ~10 actions and the Crucible has no pre-Vault job. Proposal: before the
   Vault, rewards grant capability (charges, improved pulls, cleared ground) and one
   Crucible-made part is genuinely required (e.g. the Loop Cell), with the
   Recover/Restore choice preserved. Needs a balance table first (Gate A).
2. **Energy has no role** — consider fewer energy rewards from orders before adding any
   cap; never an energy wall in the first session.
3. **Quick orders for raw starter parts** are instantly "COLLECT"-ready (free 1◆);
   they drain the board and teach little after the first one.
4. **Post-Vault supply stretch** (Loft 20◆ + Deep Survey 18◆) is order-grind heavy and
   thins the board.
5. **Identical buried-ground tiles** hide sites/routes/sealed ground behind one sprite.
6. **Human validation** per the design gate (5 first-time phone players) has not been
   done; nothing here proves the game is fun.

## 7. Ready for user playtesting?

Yes, for an **internal human playtest of the first session** on Chromium-class mobile
browsers, with two caveats: WebKit/iOS Safari was not verified in this environment, and
the stage-2 domino (§6.1) is unchanged, so testers will still move through the Stone
Lift → rings arc quickly. Use the design gate's protocol (5 first-time phone players,
unprompted). Not ready to merge into main V5 or ship: human comprehension and enjoyment
are unproven, and §6.1 needs a design decision.
