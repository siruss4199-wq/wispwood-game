# Vaultwake V5 Coast Camp — Build 42: the approved visual direction

Branch `claude/v5-visual-direction`, from `claude/v5-beach-place-art` (6b47b4d, which itself sits on
the latest verified `claude/v5-autonomous-rebuild` HEAD e020a5f). Review branch only: not for `main`
or the gameplay branch.

**Frontend only.** `v5/next/game.mjs`, every rule, price, requirement, unlock and both save keys
(`vaultwake-v5-coast`, `vaultwake-v5`) are untouched; V4, `v5/lab/`, PR #75 and PR #77 are untouched;
no dependencies were added. The mockups were used as visual direction only: no item, requirement,
value or control was copied from them.

## What changed

| Area | Change | Where |
|---|---|---|
| System | One token set: deep ocean teal background, ivory surfaces, turquoise for selection and primary actions, gold only for coins, rewards and ready states, ice blue only for frozen cells, coral only for "board full / out of energy". Thin borders, one radius scale, restrained shadows. The heavy brown/orange shadows and the blurred picture behind the board are gone. | `v5/next/vd.css` (loaded after `next.css` on `play.html` only) |
| Header | Smaller; the area button is turquoise with a round thumbnail of the area's own map (not a gate, so it never suggests the Vault is open). Fits 360 px. | `play.html`, `app.mjs` `render()` |
| Orders | Shorter cards, 24 px portraits, real `have/count` per part (a met part turns turquoise), the reward in gold. A ready card shows the one **Deliver** button; unready cards show no action. A tapped order is outlined turquoise and explained under the shelf: generator → each merge → the part wanted, with the real chain names (or "still sealed on the board"). | `app.mjs` `renderOrders`, `renderOrderTools`, `chainRoute` |
| Hint | The big banner is a compact one-line hint with a status dot; when an order is ready it points at the card. | `app.mjs` `renderHint`, `vd.css` |
| Board-full | No permanent "N spaces": a coral chip appears only at 2 or fewer free spaces ("Board full" at 0), and not when the hint already says so. | `app.mjs` `renderBoard`, `renderHint` |
| Board | As large as the column allows; on wide short screens (907×510) it stands on the right at full height with everything else on the left. Cells: ivory for parts, a turquoise floor for generators (no ϟ1 badge on each), sand for crates and cargo, ice for tideglass; wanted parts get a thin gold floor instead of a ★ badge. Selection is a turquoise ring, valid merge targets a dashed turquoise outline. | `vd.css` |
| Ice | Three looks from `x.cracks` (rules unchanged, `GLASS_HITS`=3): intact block → one crack → big fractures with chipped corners and chips; the third hit throws eight fragments and pops the freed part (a still ice-blue ring when motion is reduced). The dense white wireframe is gone; the part stays recognisable. The selection says "N hits left" with pips. | `chains.mjs` `iceBlock`, `app.mjs` `run`, `renderSelection` |
| Shed | A folded occupancy row (`Shed 1/4` + four mini spaces) under the board; a tap, a drag or the Shed button opens its four 44 px spaces; it folds when emptied. | `app.mjs` `renderShed` |
| Selection | One compact ivory row under the board (two lines at most). | `app.mjs`, `vd.css` |
| Beach | Same tokens: ivory card, turquoise Build, gold for ready markers and badges; markers are small drawn badges (no emoji); looping motion trimmed to what is ready. | `app.mjs` markers, `vd.css` |
| Vault | A sealed circular door (stone ring, brass, tideglass) as its own layer on the beach map and the worksite scene. State comes from the save: `sealed` on the beach; at the worksite `reached` → `surveyed` → `lit` → `mapped` as ws-door's real stages are built; it stays **Sealed** throughout. `open` is only drawn if a Vault Entrance area with places is built, which no build has. No keys, meters or currencies. | `app.mjs` `vaultState`, `vaultLayer` |
| Reveal | The real unlock in this build is the beach's last stage opening the cliff gate. A short card plays the gate swinging off the still-sealed door, says the Vault is still sealed, names the next objective, and is skipped with Continue or Esc; the worksite intro follows. It plays from the restore event, so a reload never replays it; reduced motion shows it still. | `app.mjs` `vaultReveal`, `showBeat` |
| Motion | Kept: ready Deliver glow, ready marker bob, selected-marker ring, merge/build/coin feedback. Removed: generator breathing, cargo nudge, ice glint, floating markers, build-button pulse, part wiggle, striped progress flow. | `vd.css` |

## Art

Reused: every painted item and generator icon, the four original Rover parts, the 21 beach stage
layers and the beach map, unchanged. New files are cut from existing paintings only:
`coast/vault-door-sealed.webp` and `coast/vault-door-open.webp` (circular cut-outs of the dial door in
`entrance-vibrant.webp` / `vault-open-vibrant.webp`).

**Missing art (not drawn here):**
1. **Painted crew portraits** for Ivo, Neri, Bram and Tamsin (`portrait()` in `v5/art.mjs` is a flat
   SVG face shared with Classic V5). Needed: four round head-and-shoulders portraits in the painted
   item style, about 256 px, transparent background. Until then they sit in one ivory frame.
2. **Painted Survey Worksite places** (`place-ws-*-{1,2,3}.webp` are still the Build 39 3D renders) and a
   painted top-down **Survey Worksite map** to match `landing-map.webp`.
3. **Dock icons** (Shop, Book, Gift) are still emoji in ivory circles.

## QA (2026-10-24, Chromium 1.62.1 via Playwright, isolated `?new=1` saves)

- `node --test tests/v5-*.test.mjs`: 281/281 pass.
- `node tests/v5-next-browser.cjs` (360/390/430): pass in Chromium (shed assertions updated to the
  folded row).
- `node tests/v5-next-playtest-browser.cjs` (360/390): pass in Chromium.
- New `node tests/v5-next-visual-browser.cjs` (360×780, 390×844, 430×932, 907×510, each with reduced
  motion on and off): the three ice looks, hits left, the break with/without fragments, no badge on
  every cell, compact hint, order emphasis and route, one Deliver button, board-full chip, the
  907×510 board fully on screen beside the header, Vault sealed on the beach, the reveal once (not
  after reload, skippable, no claim the Vault is open), the door's surveyed/lit/mapped looks. Added to
  `test.yml`.
- **Environment blocker:** WebKit is not installed in this container, so every WebKit pass of the
  browser tests stops at launch here; CI installs it.
