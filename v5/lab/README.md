# Vaultwake Coastal Lab — playable experiment
Route: `/v5/lab/`. This isolated vertical slice is intentionally *not* the existing V5 game. It never reads or overwrites the main `vaultwake-v5` save or the replay slot; only `vaultwake-coastal-lab-v1`.
## Experiment
One goal at a time: earn a first tool from a real merge → repair pier → chart an erased channel → charge the beacon → choose Northern Reef or Echo Cavern → earn a fleet message. A restoration changes the existing premium coastal scene and reveals a story beat. Each of the three producer families has a distinct role. No timers, currencies, or mandatory orders.
## Verification
`node --test tests/v5-lab.test.mjs` runs both routes using reducer actions and checks save isolation; `tests/v5-lab-browser.cjs` uses Chromium/WebKit to check first-touch guidance, playable merge, save/reload, journal, route selection, non-overflow and 44px board targets at 360/390/430px. `.github/workflows/v5-lab.yml` runs these checks.
Human evaluation remains essential. Do not interpret simulated actions as real minutes or proof of fun. Check comprehension, a visible rewarding change, producer differentiation, meaningful choice and whether the player wants to continue. The prototype intentionally ends at a first clue, not falsely at Chapter 1 completion.
