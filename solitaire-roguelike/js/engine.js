/* ============================================================
   PILE-DRIVER  ::  engine.js
   Run state, deck construction, the deal, and every solitaire rule.
   ============================================================ */

const Engine = (() => {
  let uid = 1;
  const nextId = () => 'c' + (uid++);

  function newCard(rank, suit, extra) {
    return Object.assign({
      id: nextId(), rank, suit,
      enhancement: 'none', finish: 'none', seal: 'none',
      faceUp: false
    }, extra || {});
  }

  function standardDeck() {
    const d = [];
    for (const s of SUIT_KEYS) for (let r = 1; r <= 13; r++) d.push(newCard(r, s));
    return d;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------------- run creation ---------------- */
  function newRun() {
    return {
      ante: 1,
      round: 1,
      anteScore: 0,
      money: 8,
      deck: standardDeck(),
      mantel: [],
      mantelSlots: TUNE.startingMantelSlots,
      houseRules: {},
      bonusPasses: 0,
      bonusUndos: 0,
      bonusMoney: 0,
      interestCap: TUNE.interestCap,
      discount: 0,
      markedDeck: false,
      headStart: 0,
      columns: 7,
      curioBonusMult: 0,
      luck: 1,
      quotaScale: 1,
      drawReduce: 0,
      counterBought: {},
      bonusStash: 0,
      stash: [],
      daresDone: 0,
      bonusReshuffles: 0,
      permaMult: 0,
      whim: null,
      banditPulls: 0,
      bonusSpins: 0,
      balls: ['house'],          // loaded in the case, thrown every spin
      ballBag: ['house'],        // everything you own, however much that is
      ballSlots: TUNE.startingBallSlots,
      wheelPaint: {},
      finalAnte: TUNE.finalAnte,
      shop: null,
      rerollCount: 0,
      history: [],
      stats: { roundsPlayed: 0, cardsScored: 0, best: 0, suitsDone: 0 }
    };
  }

  function quotaFor(run) {
    return Math.round(TUNE.baseQuota * Math.pow(TUNE.quotaGrowth, run.ante - 1) * run.quotaScale / 25) * 25;
  }

  /* ---------------- mantel helpers ---------------- */
  function mods(run) {
    const m = {
      cascadeMult: 1, suitRunMult: 1, stockPasses: 0, undos: 0,
      xray: false, anyIntoEmpty: false, firstRetrigger: 0,
      infinitePasses: false, wrapAround: false, noInterest: false, copyLeft: false,
      drawReduce: 0,
      counterBought: {},
      bonusStash: 0,
      stash: [],
      daresDone: 0,
      bonusReshuffles: 0,
      permaMult: 0,
      whim: null,
      banditPulls: 0, wasteAll: false, stackMult: 1,
      twinMult: 1, noRevealScore: false, banditLuck: false,
      reshuffles: 0, heatPer: 0,
      stashSlots: 0, stashCash: 0, stashPlayMult: 0, dareBonus: false, firstFlipSafe: false,
      potShare: 0,
      bountyMult: 0, bountyBonus: false,
      edgeCut: 0, bonusSpins: 0
    };
    const merge = src => {
      if (!src) return;
      for (const k in src) {
        const v = src[k];
        if (typeof v === 'number') m[k] = (k === 'stackMult' || k === 'twinMult' || k === 'cascadeMult' || k === 'suitRunMult')
          ? m[k] * v : m[k] + v;
        else m[k] = m[k] || v;
      }
    };
    run.mantel.forEach(inst => {
      const def = CURIO_BY_ID[inst.id];
      if (def) merge(def.mods);
    });
    if (run.whim && WHIM_BY_ID[run.whim]) merge(WHIM_BY_ID[run.whim].mods);
    return m;
  }

  function stashCapacity(run) {
    return TUNE.stashSlots + (run.bonusStash || 0) + mods(run).stashSlots;
  }

  /* how many cards come off the stock per draw (House Rules and Curios can lower it) */
  function drawCount(run) {
    const m = mods(run);
    return Math.max(1, TUNE.drawCount - (run.drawReduce || 0) - m.drawReduce);
  }

  /* the maximal face-up ordered run sitting at the bottom of a column */
  function runStart(board, col, m) {
    const pile = board.tableau[col];
    let i = pile.length - 1;
    if (i < 0 || !pile[i].faceUp) return -1;
    while (i > 0 && pile[i - 1].faceUp && canStack(pile[i - 1], pile[i], m)) i--;
    return i;
  }
  function runLength(board, col, m) {
    const s = runStart(board, col, m);
    return s < 0 ? 0 : board.tableau[col].length - s;
  }
  function runCards(board, col, m) {
    const s = runStart(board, col, m);
    return s < 0 ? [] : board.tableau[col].slice(s);
  }

  /* ---------------- the deal ---------------- */
  function deal(run) {
    /* whatever is in the Stash is being held back, so it is not dealt */
    const held = new Set((run.stash || []).map(c => c.id));
    const deck = shuffle(run.deck.filter(c => !held.has(c.id)).map(c => Object.assign({}, c, { faceUp: false })));
    const cols = run.columns;
    const tableau = [];
    let i = 0;
    for (let c = 0; c < cols; c++) tableau.push([]);
    for (let c = 0; c < cols; c++) {
      for (let r = c; r < cols; r++) {
        if (i >= deck.length) break;
        tableau[r].push(deck[i++]);
      }
    }
    tableau.forEach(p => { if (p.length) p[p.length - 1].faceUp = true; });
    const stock = deck.slice(i);
    stock.forEach(c => { c.faceUp = false; });

    const m = mods(run);
    return {
      tableau,
      foundations: { S: [], H: [], D: [], C: [] },
      twins: { S: [], H: [], D: [], C: [] },
      stock,
      waste: [],
      passesLeft: TUNE.startingStockPasses + run.bonusPasses + m.stockPasses,
      undos: TUNE.startingUndos + run.bonusUndos + m.undos,
      freeReshuffles: (run.bonusReshuffles || 0) + m.reshuffles,
      paidReshuffles: 0
    };
  }

  /* ---------------- THE WHEEL ----------------
     Pockets can be repainted permanently by the jewel balls, so nothing may read
     ROULETTE directly any more -- odds, payouts and the wheel itself all come
     from here. A payout is scaled by how common its colour has become, so
     painting the wheel buys you consistency rather than free money.
     ------------------------------------------------------------------------- */
  function wheelPockets(run) {
    const paint = (run && run.wheelPaint) || null;
    if (!paint) return ROULETTE;
    return ROULETTE.map((p, i) => (paint[i] ? { n: p.n, c: paint[i], painted: true } : p));
  }

  function wheelCounts(run) {
    const out = { red: 0, black: 0, green: 0 };
    wheelPockets(run).forEach(p => { out[p.c]++; });
    return out;
  }

  /* what a colour pays right now, given how much of the wheel wears it */
  function wheelPay(run, colour, cash) {
    const base = colour === 'green'
      ? (cash ? TUNE.cashPayGreen : TUNE.roulettePayGreen)
      : (cash ? TUNE.cashPayEven : TUNE.roulettePayEven);
    const was = ROULETTE_ODDS[colour].count;
    const now = wheelCounts(run)[colour];
    if (!now || now === was) return base;

    /* The price follows the odds. A cash bet is settled against the stake, so it
       scales straight; a pot bet also costs the same again off the ante when it
       misses, so it is priced on (rate + 1) to keep the same edge. Paint the
       wheel one colour and the table simply stops paying for it -- which is the
       honest outcome, and leaves the guaranteed HEAT as the real prize. */
    const ratio = was / now;
    const rate = cash ? base * ratio : (base + 1) * ratio - 1;
    const floor = colour === 'green' ? 1.5 : 1;
    return Math.max(floor, +rate.toFixed(3));
  }

  /* Can this pocket take paint at all? The zero is the house's own, a pocket is
     only ever painted once, the wheel takes so much paint and no more, and there
     is nothing to do to a pocket that already wears the colour. */
  function canPaint(run, index, colour) {
    if (index === 0) return false;                       // the zero is the house's own
    const paint = run.wheelPaint || {};
    if (paint[index]) return false;                      // a pocket is only painted once
    return ROULETTE[index].c !== colour;
  }

  /* Every pocket but the zero that could still take this colour. */
  function paintablePockets(run, colour) {
    const out = [];
    for (let i = 1; i < ROULETTE.length; i++) if (canPaint(run, i, colour)) out.push(i);
    return out;
  }

  /* Is the wheel finished -- every pocket but the zero wearing one colour? */
  function wheelTakenOver(run) {
    const counts = wheelCounts(run);
    for (const c of ['red', 'black']) if (counts[c] >= ROULETTE.length - 1) return c;
    if (counts.green >= ROULETTE.length) return 'green';
    return null;
  }

  /* A ball landing on a pocket that ALREADY wears its colour lets the colour
     bleed into the nearest pocket that does not. Without this the last few
     pockets are unreachable: with one left you would have to land on that exact
     pocket, which is a 1-in-19 shot on top of the paint roll. */
  function spreadTarget(run, index, colour) {
    const open = paintablePockets(run, colour);
    if (!open.length) return -1;
    let best = -1, bestDist = 1e9;
    open.forEach(i => {
      const raw = Math.abs(i - index);
      const d = Math.min(raw, ROULETTE.length - raw);    // the wheel wraps
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  /* paint one pocket for the rest of the run */
  function paintPocket(run, index, colour) {
    if (!canPaint(run, index, colour)) return false;
    run.wheelPaint = run.wheelPaint || {};
    run.wheelPaint[index] = colour;
    return true;
  }

  /* ---------------- THE BALL CASE ----------------
     You own as many balls as you care to buy, but only the ones LOADED in the
     case are thrown. The case starts at three seats and the Counter sells more.
     ------------------------------------------------------------------------- */
  function ballSlots(run) {
    return Math.max(1, (run && run.ballSlots) || TUNE.startingBallSlots);
  }

  /* every ball you own, loaded or benched */
  function ballBag(run) {
    const ids = (run && run.ballBag && run.ballBag.length) ? run.ballBag : ['house'];
    return ids.map(id => BALL_BY_ID[id]).filter(Boolean);
  }

  /* the ones actually in the case, never more than it seats */
  function ballsOf(run) {
    const ids = (run && run.balls && run.balls.length) ? run.balls : ['house'];
    return ids.slice(0, ballSlots(run)).map(id => BALL_BY_ID[id]).filter(Boolean);
  }

  /* Ghost balls are bonus throws -- they can hit for you but never raise the bar. */
  function ballsCounted(run) {
    return ballsOf(run).filter(b => !b.ghost).length;
  }

  /* The zero is all-or-nothing and always has been: ONE ball in a green pocket
     takes the whole stake at the full green price, however many balls you own.
     Every other colour splits the stake and needs half the case. */
  function greenIsAllIn(colour) { return colour === 'green'; }

  function ballThreshold(run, colour) {
    if (greenIsAllIn(colour)) return 1;
    return Math.max(1, Math.ceil(ballsCounted(run) / 2));
  }

  /* How likely each ball is to land on a given colour, on its own. */
  function ballHitChance(def, p) {
    if (def.bias) return def.bias + (1 - def.bias) * p;   // the Magnet leans on the roll
    if (def.reroll) return 1 - (1 - p) * (1 - p);          // the Loaded Ball gets thrown twice
    return p;
  }

  /* Exact odds of the whole case clearing its threshold, by walking the hit
     distribution ball by ball. Ghost balls add hits without raising the bar and
     the Clay Ball is worth two, so this handles every combination honestly. */
  function ballWinChance(run, colour) {
    const counts = wheelCounts(run);
    const total = wheelPockets(run).length;
    const p = counts[colour] / total;
    const balls = ballsOf(run);
    const need = ballThreshold(run, colour);
    let dist = [1];
    balls.forEach(def => {
      const hp = ballHitChance(def, p);
      const worth = def.double ? 2 : 1;
      const next = new Array(dist.length + worth).fill(0);
      dist.forEach((prob, hits) => {
        if (!prob) return;
        next[hits] += prob * (1 - hp);
        next[hits + worth] += prob * hp;
      });
      dist = next;
    });
    let win = 0;
    for (let h = need; h < dist.length; h++) win += dist[h];
    return { p, win, need };
  }

  /* The stake is split evenly across the balls in the case and each one rides its
     own share, so RED and BLACK pay a true 1:1 and the zero its full multiple no
     matter how many balls you own. More balls does not buy you a better price --
     it buys you far less variance, and the abilities. */
  /* how many trips to the wheel a round allows */
  function spinsAllowed(run) {
    return TUNE.spinsPerRound + ((run && run.bonusSpins) || 0) + (mods(run).bonusSpins || 0);
  }

  /* One share per ball, in case order, so a caller can index it by the ball it
     threw. A GHOST BALL stakes nothing -- it is a free throw that can still land
     on your colour -- so it takes a share of 0 and the stake splits across the
     rest. That also means the balls that ARE betting each bet more. */
  function ballShares(run, stake) {
    const balls = ballsOf(run);
    const betting = balls.filter(b => !b.ghost);
    const list = betting.length ? betting : balls;    // an all-ghost case has to carry it
    const n = list.length || 1;
    /* floor the shares and hand the remainder out a penny at a time, so they
       always sum to exactly the stake and none of them can go negative */
    const base = Math.floor(stake / n);
    let rem = stake - base * n;
    const pot = [];
    for (let i = 0; i < n; i++) pot.push(base + (rem-- > 0 ? 1 : 0));
    let k = 0;
    return balls.map(b => (betting.length && b.ghost) ? 0 : pot[k++]);
  }

  /* the rate a bet pays, paint included. Balls no longer touch it. */
  function betRate(run, colour, cash) {
    return wheelPay(run, colour, cash);
  }

  /* THE HOUSE EDGE. From Ante 4 the casino takes a percentage off every score
     you make, and another 6% of it every ante after that. It is the one thing
     that scales purely against you -- a Curio can halve it, nothing removes it. */
  function houseEdge(run) {
    if (!run || run.ante < TUNE.houseEdgeFromAnte) return 0;
    const steps = run.ante - TUNE.houseEdgeFromAnte + 1;
    const raw = Math.min(TUNE.houseEdgeCap, steps * TUNE.houseEdgePer);
    const cut = Math.min(0.9, mods(run).edgeCut || 0);
    return +(raw * (1 - cut)).toFixed(4);
  }

  function newRound(run) {
    run.mantel.forEach(inst => {
      const def = CURIO_BY_ID[inst.id];
      if (def && def.hooks && def.hooks.roundStart) def.hooks.roundStart(run, inst);
    });
    return {
      board: deal(run),
      round: {
        score: run.headStart,
        moves: 0,
        cascade: 0,
        suitRun: 0,
        lastSuit: null,
        scoredCards: 0,
        scoreEvents: 0,
        illegal: 0,
        money: 0,
        paidClears: [],
        wellMult: 0,
        blessing: 0,
        heat: 0,
        momentum: 0,
        reveals: 0,
        clears: 0,
        bigCashes: 0,
        bestSuitRun: 0,
        stashPlays: 0,
        pot: 0,
        potStreak: 0,
        usedSafeFlip: false,
        cuts: 0,
        cutsHit: 0,
        bounty: null,
        bountiesCollected: 0,
        cashSwing: 0,
        skimmed: 0,
        spins: 0,
        over: false,
        won: false
      }
    };
  }

  /* ---------------- rules ---------------- */
  const isRed = c => c.enhancement === 'wild' ? true : (SUITS[c.suit].color === 'red');
  const isBlack = c => c.enhancement === 'wild' ? true : (SUITS[c.suit].color === 'black');
  const suitsOf = c => c.enhancement === 'wild' ? SUIT_KEYS.slice() : [c.suit];

  function altColor(under, over) {
    // over goes on top of under -> colours must differ (chameleons satisfy anything)
    if (under.enhancement === 'wild' || over.enhancement === 'wild') return true;
    return SUITS[under.suit].color !== SUITS[over.suit].color;
  }

  function canStack(under, over, m) {
    /* Oddities are not real cards, so the rank ladder does not apply to them */
    if (over.oddity || under.oddity) return true;
    if (over.enhancement === 'phantom') return true;
    if (under.enhancement === 'phantom') return true;
    /* an exact duplicate sits on its twin -- two 2 of Clubs stack */
    if (under.rank === over.rank && under.suit === over.suit) return true;
    if (!altColor(under, over)) return false;
    if (under.rank === over.rank + 1) return true;
    if (m && m.wrapAround && under.rank === 1 && over.rank === 13) return true;
    return false;
  }

  function canPlaceOnFoundation(board, card, suit) {
    const f = board.foundations[suit];
    /* the Joker becomes whatever the pile is waiting for */
    if (card.oddity === 'joker') return f.length < 13;
    if (card.oddity) return false;
    if (!suitsOf(card).includes(suit)) return false;
    const need = f.length + 1;
    return card.rank === need;
  }

  function foundationTargetFor(board, card) {
    for (const s of suitsOf(card)) if (canPlaceOnFoundation(board, card, s)) return s;
    return null;
  }

  /* A duplicate card -- one whose rank the foundation has already passed --
     can be laid on top of its twin. It scores in full but does not advance
     the pile, so extra Aces and copied cards are never dead weight. */
  function canTwin(board, card, suit) {
    const f = board.foundations[suit];
    if (!f.length) return false;
    /* an Oddity can be laid on any started pile to cash its ability */
    if (card.oddity) return card.oddity !== 'joker';
    if (!suitsOf(card).includes(suit)) return false;
    return card.rank <= f.length;
  }
  function twinTargetFor(board, card) {
    for (const s of suitsOf(card)) if (canTwin(board, card, s)) return s;
    return null;
  }
  /* either kind of foundation play */
  function foundationAccepts(board, card, suit) {
    return canPlaceOnFoundation(board, card, suit) || canTwin(board, card, suit);
  }

  function canPlaceOnColumn(board, col, card, m) {
    const pile = board.tableau[col];
    if (!pile.length) return (card.rank === 13 || card.oddity || card.enhancement === 'phantom' || (m && m.anyIntoEmpty));
    const top = pile[pile.length - 1];
    if (!top.faceUp) return false;
    return canStack(top, card, m);
  }

  /* is the run starting at index i in column col a legal moveable sequence? */
  function isRunFrom(board, col, index, m) {
    const pile = board.tableau[col];
    if (index < 0 || index >= pile.length) return false;
    if (!pile[index].faceUp) return false;
    for (let i = index; i < pile.length - 1; i++) {
      if (!canStack(pile[i], pile[i + 1], m)) return false;
    }
    return true;
  }

  /* which waste cards the player may grab */
  function playableWaste(board, m) {
    if (!board.waste.length) return [];
    if (m && m.wasteAll) {
      const n = Math.min(board.waste.length, 3);
      return board.waste.slice(board.waste.length - n).map((c, k) => ({ card: c, index: board.waste.length - n + k }));
    }
    return [{ card: board.waste[board.waste.length - 1], index: board.waste.length - 1 }];
  }

  /* ---------------- move enumeration ---------------- */
  function anyMoveAvailable(state, run) {
    const b = state.board, m = mods(run);
    /* stashing, playing from the stash and reshuffling are all real moves */
    const stashRoom = (run.stash || []).length < stashCapacity(run);
    if (stashRoom && (b.waste.length || b.tableau.some(p => p.length && p[p.length - 1].faceUp))) return true;
    for (const c of (run.stash || [])) {
      if (foundationTargetFor(b, c) || twinTargetFor(b, c)) return true;
      for (let i = 0; i < b.tableau.length; i++) if (canPlaceOnColumn(b, i, c, m)) return true;
    }
    if ((b.stock.length || b.waste.length) && (b.freeReshuffles > 0 || b.passesLeft > 0)) return true;
    if (b.stock.length) return true;
    if (b.waste.length && (b.passesLeft > 0 || m.infinitePasses)) return true;
    for (const w of playableWaste(b, m)) {
      if (foundationTargetFor(b, w.card) || twinTargetFor(b, w.card)) return true;
      for (let c = 0; c < b.tableau.length; c++) if (canPlaceOnColumn(b, c, w.card, m)) return true;
    }
    for (let c = 0; c < b.tableau.length; c++) {
      const pile = b.tableau[c];
      if (!pile.length) continue;
      const top = pile[pile.length - 1];
      if (top.faceUp && (foundationTargetFor(b, top) || twinTargetFor(b, top))) return true;
      for (let i = 0; i < pile.length; i++) {
        if (!pile[i].faceUp) continue;
        if (!isRunFrom(b, c, i, m)) continue;
        const head = pile[i];
        // moving a whole face-up column to another empty column is pointless
        const movingWholePile = (i === 0);
        for (let d = 0; d < b.tableau.length; d++) {
          if (d === c) continue;
          if (!b.tableau[d].length && movingWholePile) continue;
          if (canPlaceOnColumn(b, d, head, m)) return true;
        }
      }
    }
    return false;
  }

  function isWon(state) {
    return SUIT_KEYS.every(s => state.board.foundations[s].length >= 13);
  }

  return {
    newCard, standardDeck, shuffle, newRun, quotaFor, mods, deal, newRound, houseEdge,
    wheelPockets, wheelCounts, wheelPay, paintPocket, canPaint,
    paintablePockets, spreadTarget, wheelTakenOver,
    ballsOf, ballBag, ballSlots, ballsCounted, ballThreshold, ballShares, ballWinChance, betRate, spinsAllowed,
    greenIsAllIn,
    isRed, isBlack, suitsOf, canStack, canPlaceOnFoundation, foundationTargetFor,
    canPlaceOnColumn, isRunFrom, anyMoveAvailable, isWon, nextId,
    drawCount, runStart, runLength, runCards, playableWaste, stashCapacity,
    canTwin, twinTargetFor, foundationAccepts
  };
})();
