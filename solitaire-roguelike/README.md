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
- **Column Stack** — the big one, and it's a *cash-in*, not a passive bonus. The `RUN N` badge under
  a column shows what that face-up run is worth. You collect it by sending the run's **bottom card**
  to a foundation — the badge turns green and reads **CASH IN!** the moment that card can actually go.
  You get **+Chips equal to every rank in the run** and **+2 Mult per extra card**, all on that one play.
  Then the next card down is exposed with the run one shorter, so a long ladder like K-Q-J-10-9-8-7 pays
  out *again on every card* as you dismantle it upward. Cashing off a five-card run scores roughly 30x
  what the same card scores alone.

A card only pays once per round, and a column pays its clear bonus once per round, so shuffling
cards back and forth is a tactic for unblocking — never a score loop.

### Stuck cards: Twins and the Furnace

A duplicate card can never advance a foundation, since the pile only wants the *next* rank. Two exits:

- **Twins** — drop it on top of its match. Any card whose rank its foundation has already passed scores
  in full there (plus +3 Mult) without advancing the pile.
- **The Wishing Well** — the pool beside the waste. Drag any accessible card in and it always pays
  **rank × 18 Chips**, then the well rolls for what else you get: cash, a free reshuffle, +3 Mult for the
  rest of the round, a ×3 blessing on your next foundation play, more wishes, an overflow jackpot — or it
  hands the card back with a **new mark permanently printed on it**, so the dead Queen resurfaces next
  round Gilded. Sometimes you just get a frog. Three wishes a round (more from the Counter or The Well
  Witch; Wishbone rolls twice and keeps the better result).

New Cards are also weighted low on purpose — roughly 60% land between Ace and 5, only 8% are face cards —
and the shop preview shows the *exact* card you'll receive, rolled when the shop was stocked.

### The Cut — the gamble on the table

Below PASSES there's a **RED / BLACK** call on the next card off the stock. The cards turn over either way,
but the call has stakes:

- **Right** — your **HEAT** climbs a level, multiplying *every* score for the rest of the round (×1.5 at one
  level, ×3 at four). It shows in the combo readout.
- **Wrong** — the Heat is gone and it costs you a pass through the stock; with no passes left, 200 points.
- **BANK** — cash the streak straight into score for **Heat² × 250**, giving up the multiplier.

You never have to call — the normal deal is always there. **The Card Counter** curio shows you the colour in
advance; **Hot Hand** makes every level of Heat worth more.

### Reshuffling

A reshuffle throws the waste back in with the stock and shuffles it **without spending a pass** — the fix
for draw-3 burying what you need. The bar next to PASSES offers three ways to pay: a **free** one granted
by a Curio (The Croupier) or the Counter, **$3** cash, or **250 points** off your round score, each
escalating within the round. A card stamped with a **Riffle** reshuffles free whenever it scores. Hotkey `R`.

### The Dealer's Whim

From Ante 2, every round is dealt under a random house rule, shown as a badge in the header. Gold Rush
pays $1 a card; Butterfingers costs you a stock pass; Blood Moon doubles red suits and halves black;
High Stakes flips a coin on every score. Fourteen of them, good, bad and unhinged.

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
| **The Counter** (green) | Always in stock, never sells out: extra deck flips, mantel seats, undos, tableau columns. Each purchase raises that item's own price for the rest of the run. | Cash, escalating. |
| **The One-Armed Bandit** | Pull the lever and accept your fate. `777` a free Curio · `★★★` a Gilded Polychrome card · `$$$` +$35 · `♠♠♠` permanent +3 Mult · `♥♥♥` a seat and a pass · `☠☠☠` half your cash. Two of a kind returns $6. Each pull costs more; resets every shop. | Cash, and your dignity. |

Hovering a Curio on your mantel in the shop shows a red **SELL $X** band — clicking sells it for that.

**Looking things up:** hover any face-up card — on the table or in the deck viewer — for a full breakdown:
base rank, every mark with its long-form explanation, and the chips × mult it scores on its own.
Right-click pins the tooltip open. The **Almanac** (book icon, or `K`) lists every Curio, card mark, New Card,
House Rule, Whim, Well outcome and Bandit payout in the game, whether you own it or not.

## Controls

Drag a card or a sequence, or click one and click where it goes. Double-click sends a
card home. **HINT** ranks every option — a card that can go home, a move that uncovers a face-down card,
a build that lengthens a run, a deal, a reshuffle, or a wish when nothing else moves — then lights the
card and its destination and tells you why. `Space` deal · `R` reshuffle · `A` auto-collect · `U` undo · `H` hint · `D` deck · `Esc` menu.
There's a generated lounge soundtrack — the ♪ button in the header mutes it, 🔊 mutes effects.
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
