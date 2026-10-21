# TT-1C — discoveries that enable another action

Baseline: 6628ce2, existing PR #75. No V4 or optics changes.

## Audit and focused response

- Dense starting stock and recoverable devices let knowledgeable players bypass much production. Twelve receiver/repair policies opened the old vault in **14–29 actions**. This is not human playtime.
- First crafted tools mostly returned generic refill; their useful relationships were not celebrated. First crafted tier-2 equipment now has a brief, object-led use reveal. First crafted tier-3 equipment returns a cross-family find (Fieldworks → Survey, Wayfinding → Relic, Resonance → Salvage). Crowded trays receive usable loose gear instead of another container.
- Ring activation led to a free vault opening. Fresh expeditions now choose a salvage kit (spanner + route fold) or survey kit (lens + Loop Cell). Both open the same vault but bring different useful stock: a tier-2 object and two tier-1 objects in the chosen family. Cost, stock and readiness are on the existing mission surface. No new tiers or timers.
- Post-vault progression jumped to expensive collection goals. The vault now reveals a dormant star-ocean engine. A spanner, lens and coil restore it, returning a Loop Cell. Using a Loop Cell on a chosen producer buys three enriched normal pulls. Energy/charges still apply; ninth-pull rare finds do not consume the allowance. A paid run cannot be overwritten, and it does not consume shared Supply Surge. This gives Resonance a repeated cross-family purpose.
- Requests and Workshop were already useful optional routes. Preserve them, protect engine preparation stock, and test their interaction rather than adding another progression system.

## Persistence and capacity

Additive `journey` state uses the existing save key. Saves without this state already at Stage 2 or later retain earned vault access; no new kit is imposed. Inventory, seals, receiver rewards, Workshop and supplies remain untouched. Engine restoration and infusions are one-time/consumptive transactions; reload cannot duplicate the reward. Kit opening requires room for every promised object before spending anything. Full-board producer failure never spends the charged run.

## Observed policy comparison

Same four styles, both routes and both receivers; actual reducer actions with periodic save reloads. Workshop style completes ten orders, repairs/upgrades the Workshop and manufactures a spanner before continuing.

| Style | Old actions to vault | New actions to vault | New actions through engine + first enriched run |
|---|---:|---:|---:|
| Expedition | 17–26 | 22–27 | 27–35 |
| Exploration | 20–26 | 22–27 | 29–37 |
| Five camp requests | 40–47 | 42–51 | 48–56 |
| Workshop + Precision Bench | 49–61 | 51–62 | 56–67 |

Separate twelve-policy receiver/repair comparison: old shortest **14**, new shortest **16**; new maximum **29**. It is still a short expert path, not proof that Chapter 1 is now challenging. These policies are not an exhaustive search.

Minimum occupied cells across the sixteen full styles: **19–24**, minimum observed energy **32**. Requests remain generous: resource starvation is not a problem, but energy pressure is still weak. Discovery counts at the vault remain **9–12 / 24**; this pass improves the use/payoff of discoveries rather than inflating the collection. Traces record discovery action indices, milestones, inventory pressure, energy and actual choices. See `tests/v5-journey-metrics.mjs` and CI artifacts.

## Scope and remaining weaknesses

This is one playable reward/continuation slice, not a complete engagement overhaul. Existing crossing, receiver and Recover/Restore decisions remain. Two added allocation choices are which kit to spend and which source to enrich; automated choice counts do not measure whether a person finds those choices interesting. The late collection goals remain steep after the new capability; no Chapter 2 was built. Human iPhone playtesting must judge clarity, desire to continue and reward value. No retention or satisfaction claim is supported by these tests.
