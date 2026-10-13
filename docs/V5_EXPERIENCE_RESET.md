# Vaultwake V5 — Experience Reset

## Why this is a system redesign, not another tutorial popup

Real iPhone playtest uncovered problems in the *rules-to-UI contract*:

| Player experience | Root cause in implementation | Change |
| --- | --- | --- |
| Cannot tell what to do after the survey | Landing's second goal consumed **both** route tools and route choice required one of them again | Reserve both tools; spending exactly one becomes a real, immediate Ridge/Conduit decision |
| Unsure which of two tasks matters | Main mission and optional request competed in visual size and readiness color | Main mission uses primary cards; bonus initially collapsed with an intentional CLAIM button |
| Too much screen occupied by instructions | Full-screen fixed helper overlay consumed the lower half of the phone and blocked other actions | One brief inline action strip above the board, detailed help behind `?` |
| Merge rules not learned from gameplay | No visual highlight around the opening matching pair; prose and glossary as first experience | First two copper pieces highlight as a pair; later unlocked Survey Kite and routes highlight at the right moments |
| Stone and buried ground indistinguishable | Both rendered as natural rubble but had different mechanics | Saltstone = optional Split Spanner clearing, buried terrain = story progression; distinct texture, labels and action choices |
| Route choice appears cosmetic | Old mission had tiny identical round icons with vague benefits | Show Ridge/Conduit, outcomes, ingredient cost and readiness together |
| Later production feels repetitive | Some stage 3 sequences needed four or more producer taps without an immediate matching opportunity | Late-stage matching-part assistance after consecutive dry pulls; 9th-pull relic rule still takes precedence |

## Design rules

1. **One meaningful next action.** Every gameplay stage has a primary objective; bonus work is opt-in, not another equally prominent quest.
2. **Teach on the board.** Prefer a glowing matching pair and an actionable route button over a paragraph describing how to play.
3. **No UI occlusion.** Guide controls sit in document flow; they cannot cover board cells or intercept drags.
4. **Use actual inventory.** Task readiness, producer recommendations and next actions derive from the single reducer state.
5. **Preserve player investment.** New launch pages keep the `vaultwake-v5` save key. The stage-1 migration is idempotent and never resets inventory.
6. **Respect the original board.** Starting 6×6 world remains item-rich; environment objects are now visually differentiated.

## Functional acceptance checks

- First screen at 360 / 390 / 430 px: full-width 6×6 board begins on the first viewport without horizontal overflow.
- Stage 0 initial pair is visibly highlighted; first merge and first story milestone work using touch or drag.
- Stage 0 survey with Sight Lens and Split Spanner leaves those items in the board and makes both routes available.
- Route selection consumes only the chosen T3 ingredient, leaves the other, and opens the corresponding three terrain spaces.
- An old stage-1 save lacking `routePrepared` receives missing route equipment only once.
- Optional request starts collapsed; tapping it does **not** spend gear; explicit CLAIM does.
- Stone, buried ground, Echo, route, source and item each offer their own accurate action without blocking the board.
- Choice, save/load and rewards remain valid on mobile WebKit and Chromium.
- Four strategic play styles reach the Vault in deterministic simulation without extended empty-board or no-merge tap streaks.

## Further roadmap (not implied complete by this PR)

**Second experience slice:** simplify the family item hierarchy visually, improve context-sensitive placement and tap targets, give every major environment action a memorable world transformation, and tune soft-currency rewards.

**Third slice:** chapter arc, collection progression, meaningful upgrades, optional challenge types, analytics events and playtest-based retention validation.

Do not infer commercial readiness or player enjoyment solely from green CI. Require real-device player testing and measured confusion/dwell times.
