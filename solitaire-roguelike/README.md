# PILEDRIVER

A roguelike game of solitaire, greed, and small strange objects.

It is ordinary Klondike solitaire, except every card you send home explodes into
**Chips × Mult**, you have a quota to beat, and between rounds a back room sells you
things that break the rules.

**To play:** open `index.html` in any browser. No build step, no server, no dependencies.

**Just want one file?** `piledriver-standalone.html` is the whole game — HTML, CSS and JS
inlined into a single document. Download it, double-click it, done. It works offline and
from a USB stick. Regenerate it after any source change with `python3 build.py`.

---

## The loop

| | |
|---|---|
| **A round** | A normal game of solitaire — the stock deals **3 at a time**, and only the top of the three is playable. Play until you win the board, run out of moves, or cash out. |
| **An ante** | Three rounds. Your scores from all three add up. |
| **The quota** | Beat the ante's quota with that combined total by the end of round 3 or the run is over. |
| **The shop** | Opens after *every* round — win or lose — because you get paid either way. |
| **Winning** | Clear ante 8. Then keep going in endless mode if you want. |

Beat the quota early and the summary screen offers to **bank the ante** — skip the
remaining rounds for cash and jump straight to the next ante. Or keep playing them
for more money and more shop trips.

## Scoring — what Chips actually do

    CHIPS  X  MULT  =  POINTS

Chips are the base value, Mult is the multiplier, and their **product** is what gets added
to your round score. Chips alone do nothing: a thousand Chips at 1 Mult is a thousand points,
the same thousand at 20 Mult is twenty thousand. Grow both, but grow Mult harder. The table
shows the equation resolving live as each trigger fires.

Every one of these is a scoring event, and every one runs the full pipeline —
card, enhancement, finish, seal, combo, then each Curio on your mantel, left to right:

- **Sending a card to a foundation** — its rank in chips, plus 6 chips for every card already on that pile. Kings are worth a lot; empty foundations are worth little.
- **Flipping a face-down card** — 20 chips.
- **Emptying a column** — 120 chips × 3.
- **Completing a suit** — 400 chips × 5.

### The three combos

- **Cascade** — foundation plays back-to-back. Each adds Mult; drawing from the stock resets it.
- **Suit Run** — consecutive plays of the *same* suit, stacked on top of the Cascade.
- **Column Stack** — the big one. Sending a card home *off a column* cashes in the face-up run
  you built underneath it: **+Chips equal to the ranks sitting in that run**, and **+2 Mult per
  extra card**. A `RUN xN` badge under each column shows the live payout. Cashing off a
  five-card run scores roughly 30x what the same card scores alone.

A card only pays once per round, and a column pays its clear bonus once per round, so shuffling
cards back and forth is a tactic for unblocking — never a score loop.

## Money

The **CASH OUT** button always shows exactly what the round would pay right now. It grows when you:

- finish the round at all — $3 flat
- **score hard** — a commission of $1 per *quota/8* points, up to $12. Measured against the quota,
  so it stays worth chasing at every Ante. Usually the biggest line on the payout.
- **combo mid-round** — every Cascade x5 pays $1 on the spot; cashing off a run of 5+ pays $1, 8+ pays $2
- leave columns empty ($1 each), complete suits ($2 each), clear the board ($8)
- hold savings — $1 interest per $5 banked, up to $5. Spending to zero every shop costs you.

## The shop's four shelves

They are deliberately kept distinct — colour-coded, badged, and separated:

| Shelf | What it is | Costs you |
|---|---|---|
| **Curios** (purple) | Objects. 45+ of them, from the Rubber Duck (+4 Mult) to The House (stronger every finished suit). | **A seat on your Mantel** — you only have 3, up to 5. They fire **left to right**, so put `+Mult` before `xMult`. Drag to reorder, click to sell. |
| **Card Mods** (green) | Permanently mark one card already in your deck: Gilded, Voltaic, Glass, Chameleon, Phantom, Rabbit's, Steel, Fuse, Bullion; Foil / Holographic / Polychrome finishes; Red / Gold / Blue seals; or the Shredder to burn a card out. | Nothing but cash — no seat, unlimited. |
| **New Cards** (blue) | Adds a whole new card to the deck, shown as a real card face: Spare Ace, The Wanderer (Chameleon + Polychrome), Poltergeist, Skeleton King, Double Agent, Powder Keg, Bullion Bar, Glass Slipper, Lucky Seven, or a copy of any card you own. | Cash. It changes the piles themselves. |
| **House Rules** (gold) | Permanent run rules: **Nimble Fingers** (deal 2 then 1 instead of 3), an 8th column, extra stock passes, a bigger mantel, cheaper shops, smaller quotas. | Cash. Forever. |

## Controls

Drag a card or a sequence, or click one and click where it goes. Double-click sends a
card home. `Space` deal · `A` auto-collect · `U` undo · `H` hint · `D` deck · `Esc` menu.
Acting during a score animation fast-forwards it rather than being ignored.

Progress saves to `localStorage` after every move.

## Source

| file | what's in it |
|---|---|
| `js/icons.js` | the 74-glyph line-art icon set every Curio, mod and rule draws from |
| `js/data.js` | all content — Curios, Card Mods, New Cards, House Rules, and the `TUNE` block where every balance number lives |
| `js/engine.js` | run state, the deal, and every solitaire rule |
| `js/score.js` | the Chips × Mult pipeline |
| `js/game.js` | move execution, round lifecycle, shop, saves |
| `js/ui.js` | board rendering, drag & drop, score animations |
| `js/overlays.js` | round summary, shop, deck viewer, run end |
| `js/audio.js` | a tiny Web Audio noise box |

Want it easier or harder? Everything is in `TUNE` at the top of `js/data.js` —
`baseQuota`, `quotaGrowth`, `roundsPerAnte`, `finalAnte`, and the per-event chip values.
