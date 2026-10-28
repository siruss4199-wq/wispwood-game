# Vaultwake V5 Coast Camp — Build 46q: first-play story intro (2026-10-28)

- **Branch:** `claude/v5-story-intro`, from `claude/v5-home-loading` at `f9dc476` (Build 46p).
  The intro sits between Home's Play and the board.
- **Not changed:**
  - `v5/next/game.mjs`, rules, rewards and progression;
  - the save key `vaultwake-v5-coast`;
  - `v4/`, `v5/lab/`, PR #75 and PR #77.

## Story check: what is already established, and where the draft meets it

**Established Coast Camp story** (`v5/next/areas.mjs`, the beach's `intro`). This beat shows on the
board at the start of a new camp, and still does:

- **Neri:** "The storm left us one beach and a lot of sand. Somewhere under the cliff is the
  Tideglass Vault."
- **Ivo:** "First we make this beach a camp. Bring me parts and I will put them to work."

The crew are Ivo (quartermaster), Neri (navigator), Tamsin (signal keeper) and Bram (expedition
lead), in `v5/crew.mjs`. Nothing in Coast Camp mentions a letter or a seal. Classic V5
(`v5/story.mjs`, context only) asks "Who closed the Tideglass Vault from outside?".

**Conflicts to decide.** These are reported, not resolved. Nothing established was replaced or
removed.

1. **Two introductions in a row.** After "Check supplies" the board opens with the existing beat
   above: Neri's storm line, then Ivo again. The player therefore hears Ivo twice ("clear the
   landing and sort our supplies", then "first we make this beach a camp"). Nothing contradicts,
   but it repeats. Options:
   - **(a)** keep both (current);
   - **(b)** show the existing beat only when the story was not shown (for example, saves from
     before the story);
   - **(c)** rewrite the beach intro to follow the letter.
   This needs the director's call.
2. **Why the player is here.** The draft says "An unsigned letter led you to this forgotten coast",
   and Bram asks "Who sent you this?": the player arrives alone, by boat, because of a letter. The
   established line "The storm left us one beach" speaks as if the player came with the crew and
   the storm stranded them. Both can be true (a storm-wrecked coast the letter points to), but the
   order of events is not settled anywhere.
3. **"Forgotten coast"** sits next to "storm-wrecked coast" (the page description). That is a tone
   difference, not a contradiction.
4. **The seal on the Vault.** The draft makes the wave seal on the Vault a new fact. The art shows
   it on the Vault's orb, and no Coast Camp text contradicts it.

## What the player sees

**When it shows.** The first time a new camp's **Play** is pressed, three full-screen illustrations
appear, each with a cream dialogue panel:

| # | Picture (by content) | Speaker | Line (exact) | Button |
|---|---|---|---|---|
| 1 | Arrival: from a boat toward the closed Vault | narration | An unsigned letter led you to this forgotten coast. | Next |
| 2 | Letter: envelope with the turquoise wave seal | Bram | That seal… it’s on the Vault, too. Who sent you this? | Next |
| 3 | Landing: broken wooden path, supply crates | Ivo | Answers can wait a moment. Let’s clear the landing and sort our supplies. | Check supplies |

**Presentation.**
- Bram and Ivo use the existing portraits (`crew-bram`, `crew-ivo`).
- All text and buttons are live HTML. The line is a polite live region, each picture has a text
  description, and Next takes focus.
- **Skip** (top right, 44 px tall) is on every scene, and Escape also skips. Skip and Check
  supplies lead to the same board.
- Scenes cross-fade over 0.45 s, with no fades under reduced motion. Nothing waits on a timer.
- The Vault never opens, and the story is silent.

**Framing.** Each scene's picture is anchored so its subject stays above the panel. This was
measured at 360, 390 and 430 px:
- the Vault door ends at 341–407 px, with the panel at 625 px or lower;
- the seal ends at 494–591 px, with the panel at 613–765 px;
- the broken path ends at 522–624 px, with the panel at 589–741 px.

In landscape (907×510) the portrait picture stands whole at full height on the left, over a blur
of itself, with the panel beside it. It is never stretched.

## State

- **When it shows.** On Home's Play for a new camp: there is no save, and the story has not been
  seen.
  - Never on Continue, including saves from before this build.
  - Never on a later new camp from the menu.
  - Never after a save that could not be read.
- **What is kept.** Only that the story was seen: `{intro:'done'|'skipped', scene, at}` under the
  new key `vaultwake-v5-coast-story`. The game save is not read or written by the story. The camp
  is first written when the player reaches the board, as with Play before.
- **Reload mid-story** writes nothing. Home offers Play again, and the story starts again from the
  first scene. The game is set up once per page; the story adds no timers (tested).
- **Rewards:** none. The camp after the story is exactly a new camp: 0 coins, 30 energy, no
  places, no moves (tested after Check supplies and after Skip from each scene).
- **On the board** nothing new is added. The existing guidance names an action that can be done
  right away ("Tap Rivet Rover for a Copper offcut"). The later restoration story beat is not
  added.
- **The pictures are story only.** The tents, piers and crates in them mark nothing as built.

## Files

- **New:**
  - `v5/next/story-intro.mjs` (scenes, lines, the seen key, playback);
  - `v5/next/story.css`;
  - `v5/assets/premium/coast/story/{arrival,letter,landing}.webp` (941×1672, WebP q84);
  - masters as received in `docs/art-source/coastal-story-2026-10-28/`;
  - `tests/v5-next-story-browser.cjs` (in CI).
- **Changed:**
  - `v5/next/home.mjs` (`beforeEnter`: Play can wait for the story);
  - `v5/next/app.mjs`;
  - `v5/play.html` (story markup, Build 46q);
  - `v5/coast-crazygames.html` (regenerated);
  - `tests/v5-next-home-helper.cjs` and `tests/v5-next-home-browser.cjs` (they skip the story);
  - `.github/workflows/test.yml`.

## Tests

**`tests/v5-next-story-browser.cjs`** covers:
- every scene's exact speaker, line and button, then Check supplies to the board;
- Skip from each of the three scenes;
- that the story gives nothing;
- a reload mid-story (nothing written, starts again, no extra timers), and Escape;
- Continue (including a save from before the story), Home and back, and a new camp from the menu,
  none of which show it;
- a generator tap and a drag merge on the board afterwards;
- reduced motion and keyboard (focus on Next, Enter).

**Local results:**
- `node --test tests/v5-*.test.mjs`: 295/295.
- All six Coast Camp browser tests pass in Chromium.

**Not tested here:** WebKit (not installed; CI runs it), real Safari and iPhone, and safe-area
insets on a notched device.
