# PILEDRIVER

A roguelike game of solitaire, greed, and small strange objects.

It is ordinary Klondike solitaire, except every card you send home explodes into
**Chips × Mult**, you have a quota to beat, and between rounds a back room sells you
things that break the rules.

**To play:** open `index.html` in any browser. No build step, no server, no dependencies.

---

## The loop

| | |
|---|---|
| **A round** | A normal game of solitaire. Play until you win the board, run out of moves, or decide to cash out. |
| **An ante** | Three rounds. Your scores from all three add up. |
| **The quota** | Beat the ante's quota with that combined total by the end of round 3 or the run is over. |
| **The shop** | Opens after *every* round — win or lose — because you get paid either way. |
| **Winning** | Clear ante 8. Then keep going in endless mode if you want. |

Beat the quota early and the summary screen offers to **bank the ante** — skip the
remaining rounds for cash and jump straight to the next ante. Or keep playing them
for more money and more shop trips.

## Scoring

Every one of these is a scoring event, and every one of them runs the full pipeline —
card, enhancement, finish, seal, combo, then each Curio on your mantel, left to right:

- **Sending a card to a foundation** — its rank in chips, plus 6 chips for every card already on that pile. Kings are worth a lot; empty foundations are worth little.
- **Flipping a face-down card** — 20 chips.
- **Emptying a column** — 120 chips × 3.
- **Completing a suit** — 400 chips × 5.

**Cascade:** foundation plays back-to-back build a Cascade, and each one adds Mult.
Drawing from the stock breaks it. **Suit Run:** consecutive plays of the *same* suit
stack a second bonus on top. A card only pays once per round, so pulling a card back
off a foundation to unblock a column is a legal tactic, not a money printer.

## The Mantel

Three slots (up to five), holding **Curios** — 40+ of them, from the Rubber Duck (+4 Mult)
to The House (permanently stronger every time you finish a suit). They fire **left to
right**, so ordering `+Mult` before `×Mult` matters. Drag them sideways to reorder.
Click one in the shop to sell it.

## The deck is yours to ruin

**Tinctures** mark individual cards for the rest of the run:

- **Enhancements** — Gilded, Voltaic, Glass, Chameleon (counts as every suit), Phantom (stacks onto any rank), Rabbit's, Steel, Fuse (detonates the card beneath it), Bullion
- **Finishes** — Foil, Holographic, Polychrome
- **Seals** — Red (scores twice), Gold (pays cash), Blue
- **Surgery** — duplicate a card, shred a card, or add strange new ones that were never in a real deck

**House Rules** are permanent run upgrades: an eighth tableau column, extra stock passes,
a bigger mantel, cheaper shops, smaller quotas.

## Controls

Drag a card or a sequence, or click one and click where it goes. Double-click sends a
card home. `Space` draw · `A` auto-collect · `U` undo · `H` hint · `D` deck · `Esc` menu.

Progress saves to `localStorage` after every move.

## Source

| file | what's in it |
|---|---|
| `js/data.js` | all content — Curios, House Rules, Tinctures, and the `TUNE` block where every balance number lives |
| `js/engine.js` | run state, the deal, and every solitaire rule |
| `js/score.js` | the Chips × Mult pipeline |
| `js/game.js` | move execution, round lifecycle, shop, saves |
| `js/ui.js` | board rendering, drag & drop, score animations |
| `js/overlays.js` | round summary, shop, deck viewer, run end |
| `js/audio.js` | a tiny Web Audio noise box |

Want it easier or harder? Everything is in `TUNE` at the top of `js/data.js` —
`baseQuota`, `quotaGrowth`, `roundsPerAnte`, `finalAnte`, and the per-event chip values.
