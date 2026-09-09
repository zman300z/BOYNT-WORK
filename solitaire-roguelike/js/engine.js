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
      bountyMult: 0, bountyBonus: false
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
    newCard, standardDeck, shuffle, newRun, quotaFor, mods, deal, newRound,
    isRed, isBlack, suitsOf, canStack, canPlaceOnFoundation, foundationTargetFor,
    canPlaceOnColumn, isRunFrom, anyMoveAvailable, isWon, nextId,
    drawCount, runStart, runLength, runCards, playableWaste, stashCapacity,
    canTwin, twinTargetFor, foundationAccepts
  };
})();
