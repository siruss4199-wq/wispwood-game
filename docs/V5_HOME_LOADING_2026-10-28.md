# Vaultwake V5 Coast Camp — Build 46p: Home and Loading (2026-10-28)

- **Branch:** `claude/v5-home-loading`, from `claude/v5-board-crate` at `e22c6a3` (Build 46o, the
  head of #83).
- **Entry:** `v5/play.html`, and the CrazyGames page made from it.
- **Not changed:**
  - `v5/next/game.mjs` and the rules, economy, progression and item requirements;
  - the save key `vaultwake-v5-coast`;
  - `v4/`, `v5/lab/`, PR #75 and PR #77.
- **Dependencies:** none added.

## What the player sees

**Loading.** The coastal Vault picture and the logo are shown with a slim progress bar and live
text in place of the Home controls.
- While the game's code loads there is nothing to count, so the bar is indeterminate and the text
  reads "Loading the camp".
- While the Home pictures load, the bar shows a real count ("Loading the camp · 1 of 3 pictures",
  `aria-valuenow`).
- There is no minimum wait and no simulated progress.

**Home.** The same picture and logo, with:
- **One main button**, using the supplied skin with live HTML text: **Play** when there is no save,
  **Continue** when a save loaded.
- **Where the save stands**, read from the game state under the button: "Landing Beach · 3 of 21
  stages built" (the current area and its built stages). The game has no chapter data, so no
  chapter number is invented. A new camp shows no label.
- **Settings** (top right, 48×48), which opens the existing menu.
- **The collection book** (top left, 48×48), shown only when a save exists, because the book
  already exists as a screen.

**Back to Home.** The game menu has a new **Home** button. It saves, shows Home with Continue, and
leaves the board exactly as it was. Home is not part of the board/beach screens.

**Leaving Home.** A 0.22 s fade of Home only, with no fade under reduced motion. The Vault never
animates, and there are no particles.

## How loading works (`v5/next/boot.js`, `v5/next/home.mjs`)

1. **`boot.js`** is a plain script that runs while the page is still being read, before the game
   module. It:
   - starts counting the three Home pictures;
   - catches a failed load of this site's own scripts or styles, or an error while the game starts.
     The CrazyGames SDK is another site's script and never blocks the game.
   - shows Retry if nothing moves for 15 s, without stopping the load;
   - makes Retry reload the page, which never touches the save.
2. **The game module** sets up the board once, under Home. The board stays `inert` and cannot be
   reached until the player enters.
3. **Home becomes usable** when its own pictures are in. If one fails, it says so and offers Retry
   or "Continue without them".
4. **Board pictures.** While Home is up, the pictures the board screen actually shows (its `<img>`
   sprites and the CSS pictures of the HUD, cards and backdrop) load and are counted. Play waits
   only for what is still missing ("Getting the board ready · 22 of 23 pictures"), then goes in.
   If one fails, it offers Retry or going on.
5. **Optional pictures** (the coast screen's place art and other screens) load when those screens
   open, as before.
6. **Audio** is never waited on.
7. **CrazyGames:** loading stops when Home is usable. Gameplay starts only on the board and stops
   again on Home.

## Saves (`v5/next/app.mjs`)

- **Read once.** The save is read once at start; the game is never set up twice. Home only covers
  and uncovers the board, and three trips Home and back add no timers or listeners (tested).
- **New camp.** With no save, nothing is written until the player presses Play, so a visitor who
  only looks at Home leaves no save.
- **Continue** resumes the save as loaded. Coins, energy, level, places and the board are
  unchanged (tested).
- **A save that cannot be read.** `load()` in `game.mjs` answers such a save with a new camp. A new
  camp is the same for the same moment (`fresh(now)` is deterministic), so the app treats a save
  that loads as exactly `fresh(now)` as unreadable.
  - Nothing is written over it.
  - Home says so and offers **Try again** (reload) or **Start a new camp**.
  - A new camp needs a confirmation, and first copies the unreadable save to the new key
    `vaultwake-v5-coast-damaged`. The original key is not renamed or cleared.
  - Before this build, such a save was silently replaced by a new camp on load.
- **`?new=1`** (the playtest page's "start from the beginning" link) now shows Home with Play; the
  new camp is written when Play is pressed.

## Layout

**Portrait.** The picture covers the screen, centred on the Vault (`object-position: 47% 37%`).
From top to bottom:
1. the icon row;
2. the logo;
3. the Vault, left clear;
4. the button, then the place label.

All rows sit inside the safe areas (`env(safe-area-inset-*)`).

| Viewport | Logo | Button | Vault top | Logo bottom |
|---|---|---|---|---|
| 360×780 | 302 px (84 %) | 259×72 | 171 | 170 |
| 390×844 | 328 px (84 %) | 281×78 | 185 | 179 |
| 430×932 | 361 px (84 %) | 290×80 | 205 | 191 |

The Vault's top is measured from the picture. The button stays below the Vault at every width.

**Landscape (907×510, aspect ≥ 4:3).**
- The picture stands whole at full height on the left: 287 px wide, never stretched, with the Vault
  fully in view.
- A soft blur of the same picture fills the rest of the screen.
- The logo, button and label sit on the right, with the icons at its top corners.

## Assets

| Runtime file (`v5/assets/premium/coast/home/`) | Made from | Notes |
|---|---|---|
| `home-bg.webp` (941×1672, 364 KB) | the clean coastal Vault background | used as received |
| `logo.webp` (1200×435, 185 KB) | the transparent logo | cleaned |
| `button.webp` (900×249, 41 KB) | the blank button skin | cleaned |

Cleaning, for the logo and the button skin:
- Their edges were checked against dark and sand backgrounds. There is no white matte halo: the
  faint edge pixels are the logo's dark-brown drop shadow.
- Near-invisible WebP specks (alpha < 8) were spread over the whole canvas of both. They were
  cleared before trimming.
- Each is trimmed to its object plus 4 px and resized with Lanczos to WebP q90.

Masters are in `docs/art-source/coastal-home-2026-10-28/`, as received. The complete mockup was
not attached, so the hierarchy follows the brief. The earlier alternative background is not used.

## Tests

**New: `tests/v5-next-home-browser.cjs`** (Chromium and WebKit, added to CI). It covers:
- fresh save → Loading (real count, no Play) → Home (Play; nothing saved) → a playable board
  (generator tap, drag merge);
- reload from the board → Continue;
- existing save → Continue with coins, energy, level and places unchanged;
- Settings and the book from Home;
- Home and back three times with no new timers or listeners, and no state change;
- reload from Home;
- keyboard (Tab reaches the button, Enter enters);
- an unreadable save kept byte for byte, Retry, and a new camp only on request with a backup;
- a failed Home picture (Retry, or go on) and a failed game module (Retry loads the game; the camp
  is unchanged);
- Play waiting for a board picture with a real count;
- reduced motion (no fade, no moving bar);
- CrazyGames (loading stops on Home, gameplay starts only on the board).

**Existing tests.** The four Coast Camp browser tests go through Home, as a player does
(`tests/v5-next-home-helper.cjs` presses Play/Continue after each load). Their assertions are
unchanged.

**Local results:**
- `node --test tests/v5-*.test.mjs`: 295/295.
- The five Coast Camp browser tests pass in Chromium.

**Not tested:**
- WebKit is not installed here; CI runs it.
- Real Safari and iPhone have not been tested.
- Safe-area insets are set in CSS but were not tested on a notched device.
