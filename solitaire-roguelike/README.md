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

Beat the quota early and the summary offers to **bank the ante** — skip the remaining rounds and jump to the
next one. The **Early Finish Bonus** is $8 per round skipped, plus $1 for every 25% you finished over quota
(up to $12), itemised on the panel — so it's worth more than the round you're giving up, but you still trade
away a shop trip.

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

### Oddities and spare cards

The shop sells cards that were never in a deck of 52, each with its own face and ability:

| | |
|---|---|
| **Joker** | Every rank and suit — sends home to *any* foundation as the exact card it needs |
| **Report Card** | +40 Chips for every card you've sent home this round. Graded on a curve |
| **Loyalty Card** | Gains +30 Chips permanently every time it's scored, forever |
| **Bus Transfer** | +1 pass through the stock |
| **Scratch Card** | Scratched the moment it scores — anywhere from $1 to $14 |
| **Lottery Ticket** | 1 in 6 it's worth **+2500 Chips**. The other five times it's a scrap of paper |
| **Fortune Cookie** | Cracks open for a random blessing that lasts the rest of the round |
| **Coupon** · **Credit Card** · **Business Card** · **Birthday Card** · **Punch Card** · **Get Out Of Jail Free** | cash, huge chips, mult per curio, a board-wide flip… |

Oddities stack onto anything in the tableau, and can be laid on any started foundation to cash their ability
without advancing it. Only the Joker actually advances a pile.

The **SPARE CARDS** shelf sells a second copy of any ordinary card, cheap. Duplicates **stack on each other in
a column** — two 2♣ sit together — and once a foundation has passed their rank they can be laid on their twin
for a full score.

### Stuck cards: Twins and the Stash

A duplicate card can never advance a foundation, since the pile only wants the *next* rank. Two answers:

- **Twins** — drop it on top of its match. Any card whose rank its foundation has already passed scores
  in full there (plus +3 Mult) without advancing the pile.
- **The Stash** — three slots beside the waste. Drag any face-up card you can reach into it and it's held
  out of play; it pays a little on the way in and stops clogging your columns. Held cards **survive between
  rounds and between antes**, and aren't dealt while they sit there. Play one back out **whenever you like** —
  onto a column, onto a foundation, or double-click to send it home — and it scores **+4 Mult** on top of
  everything else. The trick is holding a Gilded Ace until your Cascade, Heat and Tempo are all stacked, then
  dropping it. Spare Queens stop being a problem and become ammunition.

  Curios build on it: **Pickpocket** (+1 slot), **Full Pockets** (+6 Mult per held card), **The Fence** (paid
  for stashing), **Quick Draw** (stash plays ×3), plus **Bigger Pockets** at the Counter.

### Tempo

A bar in the header that fills every time you score and drains while you sit still. The fuller it is, the
more **every** score is worth — up to ×1.9 at a full bar. It is a bonus only: thinking never costs you
points, but playing fast pays. It also drives the soundtrack, which speeds up and adds layers as you heat up.

### The Bounty

One card is always posted **WANTED** on a poster beside the Stash. Send that exact card to a foundation
— off the tableau, out of the waste, or straight out of your Stash — and it pays **quota ÷ 10 in Chips**
plus **$3**, then a new face goes up immediately. The payout runs through the full Chips × Mult pipeline,
so Heat and Tempo apply to it.

Every bounty you collect in a round makes the next one **30% richer**, so chaining them is where a big
round actually comes from.

**RAISE** is the table's own gamble. It doubles the purse but starts a **12-move clock** — and drawing
counts as a move, so raising while the card is still face-down in the stock is a real bet. Bring it in
and you take the doubled purse; let it escape and **half the purse comes straight off your ante bar**
and your cascade breaks. You can raise twice, for a 4× purse.

**Bounty Hunter** makes every bounty worth 60% more. **Wanted Poster** doubles the cash and raises HEAT
on every collection, which turns the bounty chase into your main multiplier engine.

### The Side Pot and the Wheel

Every score drops **12%** of itself into a pot in the bottom-right corner (it costs you nothing — the points
still land on your score as normal). Then it's your call:

- **CASH IT** — the whole pot goes straight onto your round score. Safe.
- **SPIN THE WHEEL** — takes the pot to roulette. Nineteen pockets: nine red, nine black, one green zero.
  Back **RED** or **BLACK** (9 in 19) and the pot pays **3×**; back the green **0** (1 in 19) and it pays **20×**.
  Winning also raises your **HEAT**, which multiplies every score for the rest of the round.
- **If it misses**, the pot is gone *and the same amount again comes off your ante total* — this round's score
  first, then your banked rounds. The real stake is double the pot, so only take a big one to the wheel when
  you can afford to lose twice its size.

You can also put **actual money** on the same wheel. Switch the panel to **CASH**, pick a $5/$10/$25 stake
and a colour: red or black returns **2×** your stake, the green 0 returns **18×**, and a loss costs you the
stake and nothing else — honest casino odds, no ante bar involved. Win either way and a **LET IT RIDE**
button appears, which puts the whole payout back on the same colour.

**The Card Counter** makes your first spin each round unloseable, **The Daredevil** pays $5 a win, and
**The Skimmer** nearly doubles how fast the pot fills.

### Reshuffling

A reshuffle throws the waste back in with the stock and shuffles it — the fix for draw-3 burying what you
need. You start each round with **5 passes**, and a reshuffle **spends one**, so passes are the round's real
currency: work the stock, or re-order it. Out of passes you can still buy one for **300 points taken straight
off your ANTE total** (this round's score first, then banked rounds) — a genuine sacrifice of quota progress.
Curios and the Counter grant free reshuffles that cost no pass, and a **Riffle** card reshuffles free whenever
it scores. Hotkey `R`.

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
card and its destination and tells you why.

**AUTO** is a toggle, not a one-shot. It plays the board a move at a time — collect the bounty, free the
aces, dig out face-down cards, build with the waste, send home only what nothing can still need, open a
column, turn the stock — and flies each card across so you can watch it happen. Press it again (or touch
the board yourself) to stop. It stops on its own when the round ends or when it runs out of good moves,
and it never spends a pass or your ante score on your behalf.

`Space` deal · `R` reshuffle · `A` autoplay · `U` undo · `H` hint · `D` deck · `Esc` menu.
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
