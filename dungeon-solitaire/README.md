# Dungeon Solitaire

A roguelike deckcrawl built on TriPeaks solitaire. One file, no dependencies,
no build step — open `index.html` in a browser and play.

```
open dungeon-solitaire/index.html          # macOS
xdg-open dungeon-solitaire/index.html      # Linux
```

## Start here

The title screen opens with **Learn to play** — a ten-step playable tutorial on
a scripted two-peak board. It gates input to one card at a time, glows the card
it is talking about, and walks you through the whole game: which cards are open,
the rank rule, chaining a combo, what a draw costs, and how a floor ends. The
deal is fixed and solvable in a single chain after one draw, so the last step
hands you the board to finish yourself:

```
7♦ · 6♣ 5♥ 4♠ 3♦ · [draw 8♦] · 9♠ 10♦ J♥ Q♠ K♦ A♠ K♥
```

Nothing in the tutorial can cost you anything: a dead end deals four more cards
and explains what it would have cost in a real run. Once you have a saved best
run the title screen leads with **Begin the descent** instead, and the tutorial
moves to a secondary button (it is also reachable mid-run from **Rules**).

## The loop

Each floor is a TriPeaks board. Play any uncovered card that is one rank above
or below the **active card** in the dock (Kings wrap to Aces); each card played
in a row raises your **combo**, and gold scales with it. Out of moves? Draw from
the **stock** — that card becomes the new active card and the combo resets.

- Empty the board → floor cleared, bonus gold for every unused stock card.
- Stock runs dry with cards still standing → you lose a **life** and a quarter
  of your purse. Three lives ends the run.
- Between floors, **The Landing** sells five slots' worth of permanent
  **relics** and a small satchel of one-shot **consumables**.
- Every fourth floor is a **boss** carrying one or more **curses**.
- Eight floors reach the surface. The stair keeps going down after that, and
  each endless floor is tighter than the last.

Keyboard: `Space` draw · `1` `2` `3` use item · `Esc` close a panel.

## Design notes

**Wider boards are easier, not harder.** The bottom row of a peak layout is
fully uncovered, so a 43-card board offers far more legal moves at any moment
than a 19-card one. Bot measurements over several hundred floors per shape:

| layout | cards | stock ≈ 0.8× | 1.0× | 1.2× | 1.4× |
|---|---|---|---|---|---|
| 2 peaks × 4 | 19 | 4% | 18% | 35% | 60% |
| 3 peaks × 4 | 28 | 45% | 70% | 78% | 91% |
| 4 peaks × 4 | 37 | 76% | 89% | 93% | 100% |
| 3 peaks × 5 | 43 | 64% | 89% | 97% | 98% |

So difficulty is carried by the **stock ratio** and by **curses**, not by card
count. The eight campaign floors were then tuned to this bot clear-rate curve:

| floor | 1 | 2 | 3 | 4 (boss) | 5 | 6 | 7 | 8 (boss) |
|---|---|---|---|---|---|---|---|---|
| clear rate | 93% | 95% | 77% | 54% | 73% | 51% | 61% | 38% |

A player with three lives and a shop usually reaches the surface; the score
chase is the endless descent below it, where a bot with a strong build lands
around floor 20–25 and a lucky one gets past 50.

**Relic slots (5) and a satchel cap (2 per consumable) exist because runs were
otherwise unkillable.** Unrestricted, a bot bought all thirteen relics and
cleared 200 floors without dying — Twin Blades and Ace of Spades together turn
almost every open card into a legal move, and Lucky Coin refunds the stock fast
enough to sustain it forever. Capping ownership turns the shop into a build
decision, which is the point.

## Layout geometry

Positions are half-card units on x, so a card is 2 units wide. A card at
`(row + 1, x ± 1)` overlaps — and therefore blocks — the card at `(row, x)`.
Peaks are generated from a peak count and height and deduplicated where their
bottom rows meet, which is what makes new shapes cheap to add: append to
`FLOORS` or `DEEP_SHAPES`.

## Testing

Play-tested with Playwright against the pre-installed Chromium: an interaction
suite (clicks, keyboard, joker arming, the stuck-with-items path, shop
purchases, resize), a tutorial suite that plays all ten steps end to end —
including refusing the wrong card, the dead-end path, and the seven-card ladder
that finishes the board — plus bot simulations for per-floor clear rates and whole-run
outcomes. The scripts live outside the repo; the numbers above are their output.
