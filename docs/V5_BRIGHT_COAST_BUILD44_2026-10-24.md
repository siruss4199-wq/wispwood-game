# Vaultwake V5 Coast Camp — Build 44, core play and bright coast pass (2026-10-24)

Branch `claude/v5-bright-coast`, from `claude/v5-autonomous-rebuild` e020a5f (the latest verified
gameplay build), with PR #78's painted Landing Beach map (Build 41n) merged in on 2026-10-25 after
the player saw the coast screen fall back to the old grey picture. PRs #79 and #80 are not included. Entry: `v5/play.html`. Review branch: not for
`main` or the gameplay branch.

**Presentation and feedback only.** No rule, economy, drop-rate, order-generation, progression
or save change: `v5/next/game.mjs`, `areas.mjs` and `guide.mjs` are untouched; save keys
`vaultwake-v5-coast` and `vaultwake-v5` are unchanged. The economy audit and the proposal that
waits for approval are in `docs/V5_ECONOMY_AUDIT_PROPOSAL_2026-10-24.md`.

## What changed, by the player's feedback

| Feedback | What Build 44 does | Where |
|---|---|---|
| 1. Board design is weak | Plain warm-sand cells in two shades with a hairline between them and a thin coral frame; no white cards, no coloured lower edges; objects a little larger with a soft ground shadow; same 7×7 board, same contents | `bright.css` "the board" |
| — container badges | No order star or energy tag on any cell; a cargo's key sits *inside* its own cell; a small static gleam (inside the cell) replaces the pulsing glow on cargo with something special; what is inside is told by the panel when it is tapped | `app.mjs` `renderBoard`, `bright.css` |
| — selection and targets | The selected cell gets a gold inner ring; only the parts it can merge with get a turquoise ring; the cell under a dragged part gets a solid ring | `bright.css` |
| — ice | Tideglass is a clear ice block with three looks for its three hits: intact, one clear crack, fractured with chipped corners; the third hit bursts into shards, then the part is free. Triggers and hit count unchanged; each cell's label says how many hits are left, the panel shows them as pips | `chains.mjs` `iceBlock`, `app.mjs` |
| 2. Orders too easy / repetitive | Not changed in code (needs approval): measured and proposed, see the economy document | — |
| 3. Merge sound unpleasant | New cues (below) | `sfx.mjs` |
| 4. Haptics | One short pulse on a merge; a different pattern for breaking ice and for a restoration; nothing while dragging; own setting | `haptics.mjs` |
| 5. Order cards weak | Each card: the crew member's face, name and role — or, for the gold order, the place's picture, its name and "Materials · stage N"; the parts with have/need counts (green when met); a progress bar; the coins; and DELIVER when ready (the one deliver button: the guidance line steps aside). Cards keep their lanes (they were re-sorted ready-first before, which moved them under the finger) and never bob. A tapped card is lifted and ringed, and shows the route of its missing parts: generator → each tier of the real chain → the part, with "Tap Rivet Rover, then merge up 2 times" | `app.mjs` `renderOrders`, `chainRoute` |
| 6. Craft → restoration unclear | The delivery plays in order: the parts fly from the board to the card; coins fly to the counter, which counts up; then the next-place chip (a compact preview of the next stage beside the guidance) updates, and says **Ready to build** only when materials and coins are both there. The chip opens the coast on that place: the picture starts close on it and pulls back. Build → the old stage fades and drops away while the new one settles in, with a little dust and light → the story → the card moves to the next objective and the reward line says "Next: …". The coast is never opened by itself. The way to the Vault is a small strip at the top of the coast screen | `app.mjs` `deliverSequence`, `renderNextPlace`, `showMap`, `buildFx`, `showBeat` |
| 7. Energy/effort/reward | Measured and proposed only (economy document) | — |
| 8. Bright, playful, coastal | The area's own picture (with the Vault door) at the top, softened, fading into sky, a turquoise band of sea and warm sand behind the board; white pills with dark ink; coral map button; light dialogs; the coast screen's unrestored picture is lighter (no storm-dark) | `bright.css` |

Layout: header and orders are compact; at 390×844 the whole board is on screen with the shed row,
the selected-thing panel and the dock under it. At 907×510 (landscape) the board takes the full
height on the right and everything else is a column on the left (before, the page scrolled and
the board was cut). The shed is one folded row ("Shed 1/4" with tiny previews); a tap, the Shed
button or dropping a part on the row uses it. Touch targets keep their size (cells ≥ 46 px at
360, chips 38 px, buttons 40–44 px).

## Sound (listened? — see the limits)

The old cues (`v5/feedback.mjs`, still used by Classic V5) were rendered offline in Chromium
through the game's own code and analysed:

- Every cue was two pure sine tones gliding **up** 9 % (1.5 semitones), 170 ms each, at −32 dBFS.
- The merge's two notes were `310+55·tier` and `470+55·tier` Hz: their interval shrinks with the
  tier from 7.2 to 3.6 semitones — microtonal, mostly between scale steps (tier 1: 6.3 semitones,
  a slightly flat tritone). Rising pitch plus off-scale intervals reads as a whiny "boop-boop".
- No attack transient (12 ms fade-in), so nothing sounded like an impact.
- The generator, a refused action and the shed used one 240 Hz sine: 99 % of its energy under
  300 Hz, which a phone speaker barely reproduces. Producing a part made no sound at all; ice
  only sounded when it broke (the same chime as a shop purchase).

The new cues (`v5/next/sfx.mjs`, Coast Camp only), measured the same way:

| Cue | Peak dBFS | Spectral centroid | Audible | Attack |
|---|---|---|---|---|
| merge (any tier) | −11.1 | 500–640 Hz | 60 ms | 2.7 ms |
| first find / tier 4+ | −12.9 | 930 Hz | 240 ms | 2.7 ms |
| generator click | −15.2 | 2.8 kHz | 75 ms | 1.0 ms |
| ice crack / break | −15.5 | 4.4 / 3.7 kHz | 22 / 185 ms | 2.2 ms |
| delivery | −14.5 | 1.3 kHz | 150 ms | 3.2 ms |
| restoration / level | −17.2 | 835 Hz | 385 ms | 4.9 ms |

Merge = a short knock (400→240 Hz, pitched for phone speakers) with a woody contact and one bright
finish note from the C-major pentatonic scale chosen by tier (G5–E6), so no two notes clash and
nothing climbs shrill. Rapid play: the same cue within 45 ms is dropped; never more than six cues
in 250 ms; merges in a quick run get softer (peaks for ten merges in 1.4 s: −11.1, −14.5, −14.5,
−16.9, then about −20 dB). A `DynamicsCompressor` was tried first and measured making repeats
**twice as loud** as the first (its make-up gain), so the bus uses a stateless soft clipper.
Audio starts on the first touch (iOS needs a gesture) and resumes when the page comes back.
Muted while an ad plays or when CrazyGames mutes the game; the Sound setting is unchanged.

**Limit:** I cannot listen. "Pleasant" is not verified; the numbers above are measurements, and
the samples and the in-game comparison are for a person to judge: **menu → Sound and vibration
check** (`v5/next/sounds.html`) plays every old and new cue and the rapid-play test.

## Haptics

- Android Chrome and most browsers with `navigator.vibrate`: merge 12 ms; ice break 8-40-14 ms;
  restoration 16-60-28 ms. The phone's own vibration setting can still silence it.
- iPhone/iPad Safari: **no Vibration API.** From iOS 18, toggling an `<input type=checkbox switch>`
  gives the system's light tap; the game toggles a hidden one from the same touch. This is a side
  effect of a form control, not an API: it is offered as "may work" and needs a check on the
  player's iPhone (menu → Sound and vibration check → Try a merge pulse). On iOS < 18 or other
  browsers nothing is felt.
- The Vibration button appears only where one of the two exists; the menu says which.
- Verified here: Chromium has `navigator.vibrate` and the setting toggles and is saved
  (`vaultwake-haptics`); nothing could be felt in a headless browser.

## Tests and results

| Command | Result |
|---|---|
| `node --test tests/v5-*.test.mjs` | 281 pass, 0 fail |
| `node tests/v5-next-browser.cjs` (shed assertions updated to the folded row) | Chromium 360/390/430 pass; WebKit not installable here, run in CI |
| `node tests/v5-next-playtest-browser.cjs` | Chromium pass; WebKit in CI |
| `node tests/v5-next-bright-browser.cjs` (new) | Chromium 360×780, 390×844 (motion and reduced motion), 430×932, 907×510 pass; WebKit in CI |
| CI `test.yml` | Coast Camp browser tests now have their own step (`if: !cancelled()`), so a pre-existing Classic V5 failure no longer hides them |

The new browser test covers: no sideways scroll, the whole board on screen, touch sizes; cards
keep lanes, real counts, Deliver only when ready, one deliver button; the chain route; ice0/1/2
and hits left; merging next to last-hit ice frees the part; coins fly and count to the right
total; the chip says Ready only when buildable, survives a reload; the chip opens the coast on
the place with the focus move; the Vault in the journey strip; build → old stage fades → story →
next objective; folded shed takes a dragged part and folds again; a full board refuses a tap
without spending energy; sound and vibration settings are separate and saved; repeated sounds are
throttled; reduced motion has no flights or focus move and the same results.

Pre-existing, not from this branch: Classic V5 WebKit checks (`v5-coastal-browser.cjs`,
`v5-camp-browser.cjs:126`) fail on e020a5f too.

## Remaining issues and missing art

- Crew portraits are still the simple SVG faces; painted portraits matching the item art are
  needed (not invented here).
- No painted coastal scenery for the screen margins: the area picture at the top and CSS colour
  do that job; a light, low-detail margin painting (palms, sand, sea) would help.
- The beach path's stage art is a pale, thin strip that reads poorly at card size.
- The journey strip's area thumbnails are small crops of similar pictures.
- Order difficulty, repetition and the energy relationship: proposal only, waiting for approval.
- iPhone vibration needs confirming on the player's device; the sounds need a human listen.
